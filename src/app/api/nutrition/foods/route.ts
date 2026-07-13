import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import type { FoodSearchResult } from '@/lib/nutrition';

const FOOD_COLUMNS = [
  'id',
  'name',
  'kcal_per_100',
  'protein_per_100',
  'carb_per_100',
  'fat_per_100',
  'brand',
  'barcode',
  'source',
  'external_id',
  'verified',
  'fiber_per_100',
  'sugar_per_100',
  'sodium_mg_per_100',
  'nova_group',
  'nutriscore_grade',
  'image_url',
].join(', ');

const USER_AGENT = 'Woolves-Life-OS/1.0 (nutrition search; contact: app)';

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null, digits = 1): number | null {
  if (value == null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sourceRank(source: FoodSearchResult['source']) {
  switch (source) {
    case 'woolves_seed':
    case 'tbca':
    case 'taco':
      return 0;
    case 'manual':
    case 'user':
      return 1;
    case 'open_food_facts':
      return 2;
    case 'fatsecret':
      return 3;
    default:
      return 9;
  }
}

function dedupe(results: FoodSearchResult[]) {
  const seen = new Set<string>();
  return results
    .filter((food) => {
      const key = food.barcode
        ? `barcode:${food.barcode}`
        : `${food.source}:${food.external_id ?? food.name.toLowerCase()}:${food.brand ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rank = sourceRank(a.source) - sourceRank(b.source);
      if (rank !== 0) return rank;
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    })
    .slice(0, 30);
}

function mapLocalFood(row: Record<string, unknown>): FoodSearchResult {
  return {
    id: `local:${row.id}`,
    local_id: Number(row.id),
    name: String(row.name ?? 'Alimento'),
    kcal_per_100: Number(row.kcal_per_100 ?? 0),
    protein_per_100: Number(row.protein_per_100 ?? 0),
    carb_per_100: num(row.carb_per_100),
    fat_per_100: num(row.fat_per_100),
    brand: (row.brand as string | null) ?? null,
    barcode: (row.barcode as string | null) ?? null,
    source: (row.source as FoodSearchResult['source']) ?? 'manual',
    external_id: (row.external_id as string | null) ?? null,
    verified: Boolean(row.verified),
    fiber_per_100: num(row.fiber_per_100),
    sugar_per_100: num(row.sugar_per_100),
    sodium_mg_per_100: num(row.sodium_mg_per_100),
    nova_group: num(row.nova_group),
    nutriscore_grade: (row.nutriscore_grade as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
  };
}

function mapOpenFoodFactsProduct(product: Record<string, unknown>): FoodSearchResult | null {
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const name = String(product.product_name ?? '').trim();
  if (!name) return null;

  const kcal = num(nutriments['energy-kcal_100g']) ?? num(nutriments['energy-kcal']);
  const protein = num(nutriments.proteins_100g);
  if (kcal == null || protein == null) return null;

  const code = String(product.code ?? '').trim() || null;
  const sodiumG = num(nutriments.sodium_100g);

  return {
    id: `open_food_facts:${code ?? name}`,
    local_id: null,
    name,
    kcal_per_100: Math.round(kcal),
    protein_per_100: round(protein) ?? 0,
    carb_per_100: round(num(nutriments.carbohydrates_100g)),
    fat_per_100: round(num(nutriments.fat_100g)),
    brand: String(product.brands ?? '').trim() || null,
    barcode: code,
    source: 'open_food_facts',
    external_id: code,
    verified: false,
    fiber_per_100: round(num(nutriments.fiber_100g)),
    sugar_per_100: round(num(nutriments.sugars_100g)),
    sodium_mg_per_100: sodiumG == null ? null : Math.round(sodiumG * 1000),
    nova_group: num(product.nova_group),
    nutriscore_grade: String(product.nutriscore_grade ?? '').trim() || null,
    image_url: String(product.image_front_small_url ?? '').trim() || null,
  };
}

async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  if (query.length < 2) return [];
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '12',
    countries_tags_en: 'brazil',
    fields: [
      'code',
      'product_name',
      'brands',
      'nutriments',
      'image_front_small_url',
      'nutriscore_grade',
      'nova_group',
    ].join(','),
  });

  try {
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: Record<string, unknown>[] };
    return (json.products ?? [])
      .map(mapOpenFoodFactsProduct)
      .filter((food): food is FoodSearchResult => food != null);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const barcode = query.replace(/\D/g, '');

  let localQuery = supabase
    .from('foods')
    .select(FOOD_COLUMNS)
    .order('verified', { ascending: false })
    .order('name')
    .limit(24);

  if (barcode.length >= 6) {
    localQuery = localQuery.eq('barcode', barcode);
  } else if (query) {
    localQuery = localQuery.ilike('name', `%${query}%`);
  }

  const local = await localQuery;
  throwIfSupabaseError(local.error, 'nutrition foods search');

  const external = await Promise.all([searchOpenFoodFacts(query)]);

  const foods = dedupe([
    ...((local.data ?? []) as unknown as Record<string, unknown>[]).map(mapLocalFood),
    ...external.flat(),
  ]);

  return NextResponse.json({ foods });
}

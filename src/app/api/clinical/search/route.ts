import { NextResponse } from 'next/server';
import { fetchAnvisaCatalogResults } from '@/lib/clinical/anvisa-open-data';
import { fetchBularioResults } from '@/lib/clinical/bulario-api';
import { fetchClinicalCatalogResults } from '@/lib/clinical/catalog';
import {
  findBrazilianDrugAliases,
  isRelevantLiveDrugResult,
  type LiveDrugResult,
} from '@/lib/clinical/live-search';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type OpenFdaRecord = {
  effective_time?: string | string[];
  openfda?: {
    brand_name?: string[];
    dosage_form?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    pharm_class_epc?: string[];
    route?: string[];
    spl_id?: string[];
  };
  adverse_reactions?: string[];
  boxed_warning?: string[];
  contraindications?: string[];
  description?: string[];
  dosage_and_administration?: string[];
  drug_interactions?: string[];
  geriatric_use?: string[];
  mechanism_of_action?: string[];
  nursing_mothers?: string[];
  overdose?: string[];
  pediatric_use?: string[];
  pharmacology?: string[];
  pregnancy?: string[];
  storage_and_handling?: string[];
  warnings?: string[];
  warnings_and_precautions?: string[];
  indications_and_usage?: string[];
};

const OPENFDA_ENDPOINT = 'https://api.fda.gov/drug/label.json';
const MAX_QUERY_LENGTH = 80;

function first(values?: string | string[]): string | null {
  if (Array.isArray(values)) return values.find(Boolean)?.trim() || null;
  return values?.trim() || null;
}

function sanitizeQuery(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[^A-Za-zÀ-ɏ̀-ͯ0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function buildSearch(query: string): string {
  const escaped = query.replace(/([\\"])/g, '\\$1');
  return `(openfda.generic_name:"${escaped}" OR openfda.brand_name:"${escaped}")`;
}

function mapRecord(record: OpenFdaRecord, index: number): LiveDrugResult | null {
  const openfda = record.openfda;
  const genericName = first(openfda?.generic_name);
  const brandName = first(openfda?.brand_name);
  const splId = first(openfda?.spl_id);
  if (!genericName && !brandName) return null;

  const detailSearch = splId
    ? `openfda.spl_id:"${splId.replace(/([\\"])/g, '\\$1')}"`
    : buildSearch(brandName ?? genericName ?? '');

  return {
    id: splId ?? `${genericName ?? brandName}-${index}`,
    name: brandName ?? genericName ?? 'Medicamento sem nome',
    activeIngredient: genericName,
    manufacturer: first(openfda?.manufacturer_name),
    manufacturerDocument: null,
    presentation: first(openfda?.dosage_form),
    route: first(openfda?.route),
    className: first(openfda?.pharm_class_epc),
    regulatoryCategory: null,
    registrationNumber: null,
    processNumber: null,
    registrationStatus: null,
    registrationDate: null,
    registrationExpiry: null,
    updatedAt: first(record.effective_time),
    source: 'OpenFDA',
    sourceLabel: 'OpenFDA · referência internacional',
    sourceUrl: `${OPENFDA_ENDPOINT}?search=${encodeURIComponent(detailSearch)}&limit=1`,
    details: {
      description: first(record.description),
      indications: first(record.indications_and_usage),
      dosage: first(record.dosage_and_administration),
      contraindications: first(record.contraindications),
      warnings: first(record.boxed_warning) ?? first(record.warnings) ?? first(record.warnings_and_precautions),
      adverseReactions: first(record.adverse_reactions),
      interactions: first(record.drug_interactions),
      pregnancy: first(record.pregnancy),
      lactation: first(record.nursing_mothers),
      mechanism: first(record.mechanism_of_action),
      pharmacology: first(record.pharmacology),
      overdose: first(record.overdose),
      storage: first(record.storage_and_handling),
    },
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_clinician')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_clinician) return NextResponse.json({ error: 'Módulo clínico não autorizado.' }, { status: 403 });

  const query = sanitizeQuery(new URL(request.url).searchParams.get('q') ?? '');
  if (query.length < 3) {
    return NextResponse.json({ results: [], source: 'ANVISA' });
  }

  const cachedCatalogResults = await fetchClinicalCatalogResults(supabase, query);
  if (cachedCatalogResults.length > 0) {
    return NextResponse.json({
      results: cachedCatalogResults,
      source: 'ANVISA',
      catalog: 'SUPABASE_CLINICAL_CATALOG',
    });
  }

  // A base aberta oficial evita que a busca dependa de uma lista manual ou de
  // um provedor privado. O Bulário opcional complementa, quando configurado.
  const [catalogResults, bularioResults] = await Promise.all([
    fetchAnvisaCatalogResults(query),
    fetchBularioResults(query),
  ]);
  if (catalogResults.length > 0) {
    const seen = new Set(catalogResults.map((result) => `${result.name}|${result.activeIngredient ?? ''}|${result.registrationNumber ?? ''}`));
    const complementary = bularioResults.filter((result) => {
      const key = `${result.name}|${result.activeIngredient ?? ''}|${result.registrationNumber ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return NextResponse.json({
      results: [...catalogResults, ...complementary].slice(0, 8),
      source: 'ANVISA',
      catalog: 'DADOS_ABERTOS_MEDICAMENTOS',
      updatedAt: '2026-07-08',
    });
  }
  if (bularioResults.length > 0) {
    return NextResponse.json({ results: bularioResults, source: 'ANVISA', catalog: 'BULARIO' });
  }

  const brazilianResults = findBrazilianDrugAliases(query);
  // Abreviações curtas ficam restritas ao catálogo brasileiro local para
  // impedir que produtos sem relação sejam retornados pela fonte americana.
  if (query.length < 4 || brazilianResults.length > 0) {
    return NextResponse.json({ results: brazilianResults, source: 'ANVISA' });
  }

  const url = new URL(OPENFDA_ENDPOINT);
  url.searchParams.set('search', buildSearch(query));
  url.searchParams.set('limit', '8');

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (response.status === 404) return NextResponse.json({ results: brazilianResults, source: 'OpenFDA' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Fonte online indisponível no momento.' }, { status: 502 });
    }

    const payload = (await response.json()) as { results?: OpenFdaRecord[] };
    const results = (payload.results ?? [])
      .map(mapRecord)
      .filter((result): result is LiveDrugResult => result !== null)
      .filter((result) => isRelevantLiveDrugResult(query, result))
      .filter((result, index, list) => list.findIndex((item) => item.name === result.name && item.activeIngredient === result.activeIngredient) === index)
      .slice(0, 6);

    return NextResponse.json({ results: [...brazilianResults, ...results].slice(0, 6), source: 'OpenFDA' });
  } catch {
    if (brazilianResults.length > 0) {
      return NextResponse.json({ results: brazilianResults, source: 'ANVISA' });
    }
    return NextResponse.json({ error: 'Não foi possível consultar a fonte online.' }, { status: 502 });
  }
}

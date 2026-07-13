'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { MEALS, type Food, type FoodSearchResult, type FoodSource, type MealType } from '@/lib/nutrition';
import type { NewFood } from '@/hooks/useNutrition';

const PORTIONS = [50, 100, 150, 200, 250];
const SOURCE_LABELS: Record<FoodSource, string> = {
  manual: 'Manual',
  user: 'Meu alimento',
  woolves_seed: 'Woolves',
  open_food_facts: 'Open Food Facts BR',
  fatsecret: 'FatSecret',
  tbca: 'TBCA',
  taco: 'TACO',
};

function localFoodToSearchResult(food: Food): FoodSearchResult {
  return {
    ...food,
    id: `local:${food.id}`,
    local_id: food.id,
    source: food.source ?? 'user',
    external_id: food.external_id ?? null,
    verified: food.verified ?? false,
  };
}

export function FoodSheet({
  open,
  meal,
  onClose,
  onLog,
  onCreateFood,
  pending,
}: {
  open: boolean;
  meal: MealType;
  onClose: () => void;
  onLog: (foodId: number, grams: number, meal: MealType) => void;
  onCreateFood: (f: NewFood) => Promise<Food>;
  pending: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState('100');
  const [targetMeal, setTargetMeal] = useState<MealType>(meal);
  const [creating, setCreating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingExternal, setSavingExternal] = useState(false);

  useEffect(() => {
    if (open) setTargetMeal(meal);
  }, [open, meal]);

  useEffect(() => {
    if (!open || selected || creating) return;
    const q = query.trim();
    let active = true;
    setLoading(true);
    setSearchError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutrition/foods?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('food search failed');
        const data = (await res.json()) as { foods?: FoodSearchResult[] };
        if (active) {
          setResults(data.foods ?? []);
        }
      } catch {
        if (active) {
          setResults([]);
          setSearchError('Não foi possível buscar alimentos agora.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open, selected, creating]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const g = Number(grams) || 0;
    const f = (v: number | null) => Math.round(((v ?? 0) * g) / 100 * 10) / 10;
    return {
      kcal: Math.round((selected.kcal_per_100 * g) / 100),
      protein: f(selected.protein_per_100),
      carb: f(selected.carb_per_100),
      fat: f(selected.fat_per_100),
    };
  }, [selected, grams]);

  if (!open) return null;

  const close = () => {
    setSelected(null);
    setCreating(false);
    setQuery('');
    setSavingExternal(false);
    onClose();
  };

  const commitSelected = async () => {
    if (!selected || !(Number(grams) > 0)) return;
    setSearchError(null);

    if (selected.local_id != null) {
      onLog(selected.local_id, Number(grams), targetMeal);
      return;
    }

    setSavingExternal(true);
    try {
      const food = await onCreateFood({
        name: selected.brand ? `${selected.name} · ${selected.brand}` : selected.name,
        kcal_per_100: Math.round(selected.kcal_per_100),
        protein_per_100: selected.protein_per_100,
        carb_per_100: selected.carb_per_100,
        fat_per_100: selected.fat_per_100,
        brand: selected.brand,
        barcode: selected.barcode,
        source: selected.source,
        external_id: selected.external_id,
        verified: selected.verified,
        fiber_per_100: selected.fiber_per_100,
        sugar_per_100: selected.sugar_per_100,
        sodium_mg_per_100: selected.sodium_mg_per_100,
        nova_group: selected.nova_group,
        nutriscore_grade: selected.nutriscore_grade,
        image_url: selected.image_url,
      });
      onLog(food.id, Number(grams), targetMeal);
    } catch {
      setSearchError('Não foi possível salvar esse alimento agora.');
    } finally {
      setSavingExternal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="nutrition-sheet rise glass relative flex max-h-[88vh] w-full max-w-app flex-col rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {creating ? 'Novo alimento' : selected ? 'Adicionar' : 'Buscar alimento'}
          </h2>
          <button type="button" onClick={close} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {creating ? (
          <CreateFoodForm
            onCancel={() => setCreating(false)}
            onCreate={async (f) => {
              const food = await onCreateFood(f);
              setSelected(localFoodToSearchResult(food));
              setGrams('100');
              setCreating(false);
            }}
          />
        ) : selected ? (
          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => setSelected(null)} className="press flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Voltar
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/15 p-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <ThiingsAsset assetKey="alimentacao" size={30} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.kcal_per_100} kcal por 100g</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {SOURCE_LABELS[selected.source] ?? 'Base externa'}
              </span>
              {selected.verified && (
                <span className="rounded-full border border-status-ontrack/25 bg-status-ontrack/10 px-2.5 py-1 text-[11px] font-semibold text-status-ontrack">
                  verificado
                </span>
              )}
              {selected.barcode && (
                <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {selected.barcode}
                </span>
              )}
            </div>

            <label className="text-sm font-medium">Quantidade (g)</label>
            <input
              type="number"
              inputMode="numeric"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <div className="grid grid-cols-5 gap-1.5">
              {PORTIONS.map((portion) => (
                <button
                  key={portion}
                  type="button"
                  onClick={() => setGrams(String(portion))}
                  className={`press min-h-9 rounded-xl border text-xs font-semibold ${
                    Number(grams) === portion ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  {portion}g
                </button>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Refeição</p>
              <div className="grid grid-cols-4 gap-1.5">
                {MEALS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setTargetMeal(m.key)}
                    className={`press min-h-9 rounded-lg border text-[11px] font-medium ${
                      targetMeal === m.key ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {m.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {preview && (
              <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/5 bg-black/15 p-3 text-center text-xs text-muted-foreground">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold tabular-nums text-primary">{preview.kcal}</div>
                  kcal
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold tabular-nums text-sky-300">{preview.carb}</div>
                  carbo
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold tabular-nums text-status-ontrack">{preview.protein}</div>
                  prot
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold tabular-nums text-amber-300">{preview.fat}</div>
                  gord
                </div>
              </div>
            )}

            {searchError && (
              <p className="rounded-2xl border border-status-broken/25 bg-status-broken/10 px-3 py-2 text-xs text-status-broken">
                {searchError}
              </p>
            )}

            <button
              type="button"
              disabled={pending || savingExternal || !(Number(grams) > 0)}
              onClick={commitSelected}
              className="press min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending || savingExternal ? 'Registrando…' : 'Adicionar ao diário'}
            </button>
          </div>
        ) : (
          <>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar alimento (ex.: arroz, frango…)"
              className="mb-3 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <div className="-mx-1 flex-1 overflow-y-auto">
              {searchError ? (
                <p className="px-1 py-4 text-sm text-status-broken">{searchError}</p>
              ) : loading && results.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Nenhum alimento encontrado.</p>
              ) : (
                results.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelected(f);
                      setGrams('100');
                    }}
                    className="press flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <ThiingsAsset assetKey="alimentacao" size={24} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {f.brand ? `${f.brand} · ` : ''}{f.kcal_per_100} kcal · {f.protein_per_100}g proteína
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {SOURCE_LABELS[f.source] ?? 'Base'}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="press mt-3 min-h-11 w-full rounded-2xl border border-dashed border-primary/35 text-sm font-semibold text-primary"
            >
              + Criar alimento
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateFoodForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (f: NewFood) => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');

  const submit = () => {
    if (!name.trim() || !(Number(kcal) >= 0)) return;
    onCreate({
      name: name.trim(),
      kcal_per_100: Math.round(Number(kcal)),
      protein_per_100: Number(protein) || 0,
      carb_per_100: carb === '' ? null : Number(carb),
      fat_per_100: fat === '' ? null : Number(fat),
    });
  };

  const field = 'min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Valores por 100 g.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do alimento" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Calorias (kcal)
          <input type="number" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Proteína (g)
          <input type="number" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Carboidrato (g)
          <input type="number" inputMode="decimal" value={carb} onChange={(e) => setCarb(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Gordura (g)
          <input type="number" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} className={field} />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="press text-sm font-medium text-muted-foreground">Cancelar</button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || kcal === ''}
          className="press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Criar e usar
        </button>
      </div>
    </div>
  );
}

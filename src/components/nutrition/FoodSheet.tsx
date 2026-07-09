'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import { MEALS, type Food, type MealType } from '@/lib/nutrition';
import type { NewFood } from '@/hooks/useNutrition';

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
  const supabase = getSupabaseBrowserClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [targetMeal, setTargetMeal] = useState<MealType>(meal);
  const [creating, setCreating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
        const req = supabase
          .from('foods')
          .select('id, name, kcal_per_100, protein_per_100, carb_per_100, fat_per_100')
          .order('name')
          .limit(30);
        const { data, error } = q ? await req.ilike('name', `%${q}%`) : await req;
        throwIfSupabaseError(error, 'food search');
        if (active) {
          setResults((data ?? []) as Food[]);
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
  }, [query, open, supabase, selected, creating]);

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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[88vh] w-full max-w-app flex-col rounded-t-3xl border border-border p-5 sm:rounded-3xl">
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
              setSelected(food);
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
            <p className="text-sm font-semibold">{selected.name}</p>

            <label className="text-sm font-medium">Quantidade (g)</label>
            <input
              type="number"
              inputMode="numeric"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />

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
              <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/50 px-4 py-3 text-center text-xs">
                <div><div className="text-sm font-semibold text-primary">{preview.kcal}</div>kcal</div>
                <div><div className="text-sm font-semibold">{preview.carb}</div>carbo</div>
                <div><div className="text-sm font-semibold">{preview.protein}</div>prot</div>
                <div><div className="text-sm font-semibold">{preview.fat}</div>gord</div>
              </div>
            )}

            <button
              type="button"
              disabled={pending || !(Number(grams) > 0)}
              onClick={() => onLog(selected.id, Number(grams), targetMeal)}
              className="press min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? 'Registrando…' : 'Adicionar ao diário'}
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
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {f.kcal_per_100} kcal · {f.protein_per_100}g prot
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="press mt-3 min-h-11 w-full rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground"
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

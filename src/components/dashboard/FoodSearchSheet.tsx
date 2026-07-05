'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Food {
  id: number;
  name: string;
  kcal_per_100: number;
  protein_per_100: number;
}

export function FoodSearchSheet({
  open,
  onClose,
  onLog,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onLog: (foodId: number, grams: number) => void;
  pending: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');

  // Debounced search over seed + own foods (RLS-scoped).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const req = supabase
        .from('foods')
        .select('id, name, kcal_per_100, protein_per_100')
        .order('name')
        .limit(25);
      const { data } = q
        ? await req.ilike('name', `%${q}%`)
        : await req;
      if (active) {
        setResults((data ?? []) as Food[]);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open, supabase]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const g = Number(grams) || 0;
    return {
      kcal: Math.round((selected.kcal_per_100 * g) / 100),
      protein: Math.round((selected.protein_per_100 * g) / 100 * 10) / 10,
    };
  }, [selected, grams]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="rise glass relative flex max-h-[85vh] w-full max-w-app flex-col rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Registrar refeição</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="press cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {selected ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="press flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Voltar
            </button>
            <p className="text-sm font-semibold">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.kcal_per_100} kcal · {selected.protein_per_100}g proteína / 100g
            </p>

            <label className="text-sm font-medium">Quantidade (g)</label>
            <input
              type="number"
              inputMode="numeric"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />

            {preview ? (
              <div className="flex gap-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <span><span className="font-semibold text-primary">{preview.kcal}</span> kcal</span>
                <span><span className="font-semibold text-primary">{preview.protein}</span> g proteína</span>
              </div>
            ) : null}

            <button
              type="button"
              disabled={pending || !(Number(grams) > 0)}
              onClick={() => onLog(selected.id, Number(grams))}
              className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Registrando…' : 'Adicionar'}
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
              className="mb-3 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <div className="-mx-1 flex-1 overflow-y-auto">
              {loading && results.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">
                  Nenhum alimento encontrado.
                </p>
              ) : (
                results.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelected(f);
                      setGrams('100');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left',
                      'transition-colors hover:bg-muted/50',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {f.kcal_per_100} kcal · {f.protein_per_100}g
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

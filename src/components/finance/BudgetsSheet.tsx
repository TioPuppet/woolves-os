'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, categoryColor, type Budget } from '@/lib/finance';
import { ThiingsAsset } from '@/components/ThiingsAsset';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BudgetsSheet({
  open,
  budgets,
  spentByCategory,
  onSet,
  onDelete,
  onClose,
}: {
  open: boolean;
  budgets: Budget[];
  spentByCategory: Map<string, number>;
  onSet: (category: string, value: number) => void;
  onDelete: (category: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[85vh] w-full max-w-app flex-col rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Orçamento por categoria</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Defina um teto mensal por categoria. Deixe vazio para remover.</p>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {EXPENSE_CATEGORIES.map((c) => {
            const b = budgets.find((x) => x.category === c.key);
            const spent = spentByCategory.get(c.key) ?? 0;
            return (
              <BudgetRow
                key={c.key}
                catKey={c.key}
                label={c.label}
                icon={c.icon}
                spent={spent}
                initial={b?.monthly_limit_brl ?? null}
                onSet={onSet}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetRow({
  catKey,
  label,
  icon,
  spent,
  initial,
  onSet,
  onDelete,
}: {
  catKey: string;
  label: string;
  icon: Parameters<typeof ThiingsAsset>[0]['assetKey'];
  spent: number;
  initial: number | null;
  onSet: (category: string, value: number) => void;
  onDelete: (category: string) => void;
}) {
  const [val, setVal] = useState(initial != null ? String(initial) : '');
  const limit = initial;
  const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const over = limit != null && spent > limit;

  return (
    <div className="surface-1 flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `hsl(${categoryColor(catKey)} / 0.18)` }}>
          <ThiingsAsset assetKey={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
        <input
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const n = Number(val);
            if (val.trim() === '') {
              if (initial != null) onDelete(catKey);
            } else if (n > 0 && n !== initial) {
              onSet(catKey, n);
            }
          }}
          placeholder="Teto R$"
          className="min-h-9 w-24 shrink-0 rounded-lg border border-border bg-card px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
      </div>
      {limit != null ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: over ? 'hsl(var(--status-broken))' : `hsl(${categoryColor(catKey)})` }} />
          </div>
          <p className={`text-[11px] ${over ? 'text-status-broken' : 'text-muted-foreground'}`}>
            {brl(spent)} de {brl(limit)} {over ? '· estourou' : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, categoryColor, type Budget } from '@/lib/finance';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { CurrencyInput } from './CurrencyInput';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function budgetState(spent: number, limit: number | null) {
  if (limit == null) return { label: 'Sem teto', cls: 'border-border text-muted-foreground bg-card' };
  const used = limit > 0 ? spent / limit : 0;
  if (used >= 1) return { label: 'Estourou', cls: 'border-status-broken/40 bg-status-broken/10 text-status-broken' };
  if (used >= 0.8) return { label: 'Atenção', cls: 'border-amber-300/40 bg-amber-300/10 text-amber-300' };
  return { label: 'Seguro', cls: 'border-status-ontrack/40 bg-status-ontrack/10 text-status-ontrack' };
}

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
  const totalLimit = budgets.reduce((s, b) => s + Number(b.monthly_limit_brl), 0);
  const totalSpent = EXPENSE_CATEGORIES.reduce((s, c) => s + (spentByCategory.get(c.key) ?? 0), 0);
  const totalLeft = Math.max(0, totalLimit - totalSpent);
  const totalPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[85vh] w-full max-w-app flex-col gap-4 rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Controle de teto</p>
            <h2 className="mt-1 text-xl font-semibold">Orçamentos</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <section className="surface-2 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Teto</p>
              <p className="truncate text-sm font-bold tabular-nums">{brl(totalLimit)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Usado</p>
              <p className="truncate text-sm font-bold tabular-nums text-status-broken">{brl(totalSpent)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Livre</p>
              <p className="truncate text-sm font-bold tabular-nums text-status-ontrack">{brl(totalLeft)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </section>

        <p className="text-xs text-muted-foreground">Defina um teto mensal por categoria. Campo vazio remove o orçamento.</p>
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
  const [draft, setDraft] = useState<number | null>(initial);
  const limit = draft;
  const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const over = limit != null && spent > limit;
  const left = limit == null ? null : Math.max(0, limit - spent);
  const state = budgetState(spent, limit);

  return (
    <div className="surface-1 flex flex-col gap-3 rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `hsl(${categoryColor(catKey)} / 0.18)` }}>
          <ThiingsAsset assetKey={icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${state.cls}`}>
              {state.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {limit == null ? 'Sem limite definido' : `${brl(spent)} usados · ${brl(left ?? 0)} livres`}
          </p>
        </div>
        <CurrencyInput
          value={draft}
          onValueChange={setDraft}
          onBlur={() => {
            if (draft == null) {
              if (initial != null) onDelete(catKey);
            } else if (draft > 0 && draft !== initial) {
              onSet(catKey, draft);
            }
          }}
          placeholder="Teto R$"
          className="min-h-9 w-28 shrink-0 rounded-lg border border-border bg-card px-2 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
      </div>
      {limit != null ? (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: over ? 'hsl(var(--status-broken))' : `hsl(${categoryColor(catKey)})` }} />
          </div>
          <p className={`text-[11px] font-medium ${over ? 'text-status-broken' : 'text-muted-foreground'}`}>
            {pct}% do teto mensal {over ? `· passou ${brl(spent - limit)}` : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}

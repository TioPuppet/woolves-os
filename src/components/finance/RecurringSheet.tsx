'use client';

import { useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryMeta,
  type Recurring,
} from '@/lib/finance';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import type { RecurringDraft } from '@/hooks/useFinance';
import { cn } from '@/lib/utils';
import { CurrencyInput } from './CurrencyInput';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function daysUntilDue(day: number) {
  const today = new Date();
  const currentDay = today.getDate();
  return day >= currentDay ? day - currentDay : day + 30 - currentDay;
}

function nextDueLabel(day: number) {
  const days = daysUntilDue(day);
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  return `em ${days} dias`;
}

export function RecurringSheet({
  open,
  recurring,
  monthLabel,
  applying,
  onAdd,
  onToggle,
  onDelete,
  onApply,
  onClose,
}: {
  open: boolean;
  recurring: Recurring[];
  monthLabel: string;
  applying: boolean;
  onAdd: (d: RecurringDraft) => void;
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState('moradia');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('5');

  if (!open) return null;
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const field = 'min-h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60';
  const activeRecurring = recurring.filter((r) => r.active);
  const activeExpense = activeRecurring.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount_brl), 0);
  const activeIncome = activeRecurring.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount_brl), 0);
  const nextRecurring = [...activeRecurring].sort((a, b) => daysUntilDue(a.day_of_month) - daysUntilDue(b.day_of_month))[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[88vh] w-full max-w-app flex-col gap-4 overflow-y-auto rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Contas fixas</p>
            <h2 className="mt-1 text-xl font-semibold">Recorrentes</h2>
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
              <p className="text-[11px] text-muted-foreground">Saídas</p>
              <p className="truncate text-sm font-bold tabular-nums text-status-broken">{brl(activeExpense)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Entradas</p>
              <p className="truncate text-sm font-bold tabular-nums text-status-ontrack">{brl(activeIncome)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Ativas</p>
              <p className="truncate text-sm font-bold tabular-nums text-primary">{activeRecurring.length}</p>
            </div>
          </div>
          <p className="mt-3 truncate text-xs text-muted-foreground">
            Próximo: {nextRecurring ? `${nextRecurring.note || categoryMeta(nextRecurring.category).label} · ${nextDueLabel(nextRecurring.day_of_month)}` : 'nada no radar'}
          </p>
        </section>

        <button
          type="button"
          onClick={onApply}
          disabled={applying || recurring.filter((r) => r.active).length === 0}
          className="press min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {applying ? 'Lançando…' : `Lançar recorrentes em ${monthLabel}`}
        </button>

        {recurring.length > 0 && (
          <div className="flex flex-col gap-2">
            {recurring.map((r) => {
              const meta = categoryMeta(r.category);
              return (
                <div key={r.id} className={cn('surface-1 flex items-center gap-3 rounded-2xl p-3', !r.active && 'opacity-55')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card">
                    <ThiingsAsset assetKey={meta.icon} size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.note || meta.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Dia {r.day_of_month} · {nextDueLabel(r.day_of_month)} · {meta.label}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('text-sm font-semibold tabular-nums', r.type === 'expense' ? 'text-status-broken' : 'text-status-ontrack')}>
                      {r.type === 'expense' ? '-' : '+'}{brl(Number(r.amount_brl))}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onToggle(r.id, !r.active)} aria-label={r.active ? 'Pausar' : 'Ativar'} className="press text-xs text-muted-foreground hover:text-foreground">
                        {r.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button type="button" onClick={() => onDelete(r.id)} aria-label="Excluir" className="press text-muted-foreground hover:text-status-broken">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="surface-2 flex flex-col gap-2.5 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nova recorrência</p>
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'expense' ? 'moradia' : 'salario'); }} className={cn('press min-h-9 rounded-lg border text-xs font-medium', type === t ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
                {t === 'expense' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CurrencyInput value={amount} onValueChange={setAmount} placeholder="R$ 0,00" className={field} />
            <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Dia do mês" className={field} />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(field, 'text-foreground')}>
            {cats.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Descrição (ex.: Aluguel)" className={field} />
          <button
            type="button"
            disabled={!((amount ?? 0) > 0)}
            onClick={() => {
              onAdd({
                type,
                amount_brl: amount ?? 0,
                category,
                note: note.trim() || null,
                day_of_month: Math.min(31, Math.max(1, Number(day) || 1)),
                active: true,
              });
              setAmount(null);
              setNote('');
            }}
            className="press min-h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Adicionar recorrência
          </button>
        </div>
      </div>
    </div>
  );
}

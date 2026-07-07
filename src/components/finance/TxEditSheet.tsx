'use client';

import { useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
} from '@/lib/finance';
import type { TxPatch } from '@/hooks/useFinance';
import { cn } from '@/lib/utils';

export function TxEditSheet({
  tx,
  onSave,
  onDelete,
  onClose,
}: {
  tx: Transaction;
  onSave: (patch: TxPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>(tx.type);
  const [amount, setAmount] = useState(String(tx.amount_brl));
  const [category, setCategory] = useState(tx.category ?? 'outros');
  const [note, setNote] = useState(tx.note ?? '');
  const [date, setDate] = useState(tx.ref_date);

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const field = 'min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex w-full max-w-app flex-col gap-3 rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar lançamento</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); if (!cats.find((c) => c.key === category)) setCategory(t === 'expense' ? 'alimentacao' : 'salario'); }} className={cn('press min-h-9 rounded-lg border text-xs font-medium', type === t ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor R$" className={field} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(field, 'text-foreground')}>
          {cats.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" className={field} />

        <div className="mt-1 flex gap-2">
          <button type="button" onClick={onDelete} className="press min-h-11 flex-1 rounded-xl border border-status-broken/40 text-sm font-medium text-status-broken">
            Excluir
          </button>
          <button
            type="button"
            disabled={!(Number(amount) > 0)}
            onClick={() =>
              onSave({
                type,
                amount_brl: Number(amount),
                category,
                note: note.trim() || null,
                ref_date: date,
              })
            }
            className="press min-h-11 flex-[2] rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

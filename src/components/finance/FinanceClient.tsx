'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useFinance } from '@/hooks/useFinance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryMeta,
  categoryColor,
  summary,
  byCategory,
  byDay,
  dayLabel,
  monthLabel,
  shiftMonth,
  currentMonthKey,
  type MonthData,
  type Transaction,
  type MonthKey,
} from '@/lib/finance';
import { localDayString } from '@/lib/date';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { CountUp } from './CountUp';
import { CurrencyInput } from './CurrencyInput';
import { Donut } from './Donut';
import { TrendChart } from './TrendChart';
import { BudgetsSheet } from './BudgetsSheet';
import { RecurringSheet } from './RecurringSheet';
import { TxEditSheet } from './TxEditSheet';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FinanceClient({
  userId,
  timezone,
  dailyLimit,
  initial,
}: {
  userId: string;
  timezone: string;
  dailyLimit: number | null;
  initial: MonthData;
}) {
  const [monthKey, setMonthKey] = useState<MonthKey>(() => currentMonthKey(timezone));
  const fin = useFinance(userId, timezone, monthKey, initial);

  const today = localDayString(timezone);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState('alimentacao');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const cur = currentMonthKey(timezone);
  const isCurrent = monthKey.year === cur.year && monthKey.month === cur.month;
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const sum = useMemo(() => summary(fin.transactions), [fin.transactions]);
  const catData = useMemo(() => byCategory(fin.transactions), [fin.transactions]);
  const days = useMemo(() => byDay(fin.transactions), [fin.transactions]);
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catData) m.set(c.key, c.value);
    return m;
  }, [catData]);
  const todaySpent = fin.transactions
    .filter((t) => t.type === 'expense' && t.ref_date === today)
    .reduce((s, t) => s + Number(t.amount_brl), 0);

  const canAdd = (amount ?? 0) > 0;

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="finances" size={30} />
          <h1 className="text-xl font-semibold">Finanças</h1>
        </div>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonthKey((k) => shiftMonth(k, -1))} aria-label="Mês anterior" className="press rounded-lg bg-card px-3 py-1.5 text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold">{monthLabel(monthKey)}</span>
          {!isCurrent && (
            <button type="button" onClick={() => setMonthKey(cur)} className="press text-[11px] text-primary">
              voltar ao mês atual
            </button>
          )}
        </div>
        <button type="button" onClick={() => setMonthKey((k) => shiftMonth(k, 1))} aria-label="Próximo mês" className="press rounded-lg bg-card px-3 py-1.5 text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Month summary */}
      <section className="hero-mission anim-rise flex flex-col gap-4 rounded-3xl p-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-base font-bold tabular-nums text-status-ontrack"><CountUp value={sum.income} format={brl} /></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Despesa</p>
            <p className="text-base font-bold tabular-nums text-status-broken"><CountUp value={sum.expense} format={brl} /></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={cn('text-base font-bold tabular-nums', sum.balance >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
              <CountUp value={sum.balance} format={brl} />
            </p>
          </div>
        </div>
        {isCurrent && dailyLimit != null ? (
          <p className="border-t border-white/5 pt-3 text-center text-xs text-muted-foreground">
            Hoje:{' '}
            <span className={todaySpent > dailyLimit ? 'font-semibold text-status-broken' : 'font-semibold text-foreground'}>
              {brl(todaySpent)}
            </span>{' '}
            / {brl(dailyLimit)} (limite diário)
          </p>
        ) : null}
      </section>

      <TrendChart trend={fin.trend} />

      {/* Donut + budgets */}
      {catData.length > 0 ? (
        <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <Donut
              size={120}
              stroke={15}
              segments={catData.map((c) => ({ value: c.value, color: categoryColor(c.key) }))}
            >
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Gasto</span>
              <span className="text-sm font-bold tabular-nums"><CountUp value={sum.expense} format={brl} /></span>
            </Donut>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {catData.slice(0, 5).map((c) => {
                const meta = categoryMeta(c.key);
                const budget = fin.budgets.find((b) => b.category === c.key);
                const share = sum.expense > 0 ? Math.round((c.value / sum.expense) * 100) : 0;
                const over = budget != null && c.value > budget.monthly_limit_brl;
                const bpct = budget ? Math.min(100, Math.round((c.value / budget.monthly_limit_brl) * 100)) : 0;
                return (
                  <div key={c.key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `hsl(${categoryColor(c.key)})` }} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{meta.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{share}%</span>
                      <span className="shrink-0 font-medium tabular-nums">{brl(c.value)}</span>
                    </div>
                    {budget != null ? (
                      <div className="ml-4 h-1 w-full overflow-hidden rounded-full bg-card">
                        <div className="h-full rounded-full" style={{ width: `${bpct}%`, backgroundColor: over ? 'hsl(var(--status-broken))' : `hsl(${categoryColor(c.key)})` }} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Manage budgets / recurring */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setBudgetsOpen(true)} className="press surface-2 min-h-11 rounded-xl text-sm font-medium">
          Orçamentos
        </button>
        <button type="button" onClick={() => setRecurringOpen(true)} className="press surface-2 min-h-11 rounded-xl text-sm font-medium">
          Recorrentes
        </button>
      </div>

      {/* Quick add */}
      <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'expense' ? 'alimentacao' : 'salario'); }} className={cn('press min-h-10 rounded-xl border text-sm font-medium transition-colors', type === t ? (t === 'expense' ? 'border-status-broken/50 bg-status-broken/10 text-status-broken' : 'border-status-ontrack/50 bg-status-ontrack/10 text-status-ontrack') : 'border-border text-muted-foreground')}>
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CurrencyInput value={amount} onValueChange={setAmount} placeholder="R$ 0,00" className="min-h-11 rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={cn('press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', category === c.key ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
              <ThiingsAsset assetKey={c.icon} size={16} />
              {c.label}
            </button>
          ))}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <button
          type="button"
          disabled={!canAdd || fin.logTransaction.isPending}
          onClick={() => {
            fin.logTransaction.mutate({ type, amount: amount ?? 0, category, note: note.trim() || null, refDate: date });
            setAmount(null);
            setNote('');
          }}
          className="press min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Registrar
        </button>
      </section>

      {/* History by day */}
      {days.length > 0 ? (
        <section className="anim-rise flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lançamentos</h2>
          {days.map((d) => {
            const dayTotal = d.items.reduce((s, t) => s + (t.type === 'expense' ? -1 : 1) * Number(t.amount_brl), 0);
            return (
              <div key={d.date} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-muted-foreground">{dayLabel(d.date)}</span>
                  <span className={cn('text-xs font-semibold tabular-nums', dayTotal >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
                    {dayTotal >= 0 ? '+' : '-'}{brl(Math.abs(dayTotal))}
                  </span>
                </div>
                {d.items.map((t) => {
                  const meta = categoryMeta(t.category);
                  return (
                    <button key={t.id} type="button" onClick={() => setEditing(t)} className="press surface-1 flex items-center gap-3 rounded-xl p-3 text-left">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `hsl(${categoryColor(t.category)} / 0.18)` }}>
                        <ThiingsAsset assetKey={meta.icon} size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.note || meta.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{meta.label}</p>
                      </div>
                      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', t.type === 'expense' ? 'text-status-broken' : 'text-status-ontrack')}>
                        {t.type === 'expense' ? '-' : '+'}{brl(Number(t.amount_brl))}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum lançamento em {monthLabel(monthKey)}.</p>
      )}

      <BudgetsSheet
        open={budgetsOpen}
        budgets={fin.budgets}
        spentByCategory={spentByCat}
        onSet={(c, v) => fin.setBudget.mutate({ category: c, monthly_limit_brl: v })}
        onDelete={(c) => fin.deleteBudget.mutate(c)}
        onClose={() => setBudgetsOpen(false)}
      />

      <RecurringSheet
        open={recurringOpen}
        recurring={fin.recurring}
        monthLabel={monthLabel(monthKey)}
        applying={fin.applyRecurring.isPending}
        onAdd={(d) => fin.addRecurring.mutate(d)}
        onToggle={(id, active) => fin.updateRecurring.mutate({ id, active })}
        onDelete={(id) => fin.deleteRecurring.mutate(id)}
        onApply={() => fin.applyRecurring.mutate(monthKey)}
        onClose={() => setRecurringOpen(false)}
      />

      {editing ? (
        <TxEditSheet
          tx={editing}
          onSave={(patch) => {
            fin.updateTransaction.mutate({ id: editing.id, ...patch });
            setEditing(null);
          }}
          onDelete={() => {
            fin.deleteTransaction.mutate(editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </main>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useDeferredValue, useMemo, useState, useTransition } from 'react';
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

const BudgetsSheet = dynamic(() => import('./BudgetsSheet').then((mod) => mod.BudgetsSheet), { ssr: false });
const RecurringSheet = dynamic(() => import('./RecurringSheet').then((mod) => mod.RecurringSheet), { ssr: false });
const DreamGoalsSheet = dynamic(() => import('./DreamGoalsSheet').then((mod) => mod.DreamGoalsSheet), { ssr: false });
const TxEditSheet = dynamic(() => import('./TxEditSheet').then((mod) => mod.TxEditSheet), { ssr: false });

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (value: number, total: number) => (total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0);

const signedBrl = (value: number) => `${value >= 0 ? '+' : '-'}${brl(Math.abs(value))}`;

function moneySizeClass(value: number) {
  const len = brl(value).length;
  if (len >= 14) return 'text-[clamp(0.62rem,1.3vw,0.82rem)]';
  if (len >= 12) return 'text-[clamp(0.7rem,1.55vw,0.92rem)]';
  return 'text-[clamp(0.84rem,2vw,1.06rem)]';
}

function transactionTitle(tx: Transaction | null) {
  if (!tx) return 'Sem registro';
  return tx.note || categoryMeta(tx.category).label;
}

const metricValueClass = 'mt-2 whitespace-nowrap text-[clamp(0.84rem,2vw,1.06rem)] font-bold tabular-nums leading-none tracking-[-0.01em]';

const FILTER_CATEGORIES = [...new Map([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.key, c])).values()];

const FINANCE_VIEWS = [
  { key: 'overview', label: 'Visão' },
  { key: 'movement', label: 'Movimento' },
  { key: 'vault', label: 'Cofre' },
  { key: 'ledger', label: 'Livro' },
] as const;

type FinanceView = (typeof FINANCE_VIEWS)[number]['key'];

function daysInMonth(monthKey: MonthKey) {
  return new Date(monthKey.year, monthKey.month, 0).getDate();
}

function getCommandStatus({
  freeToday,
  dailyLimit,
  forecastExpense,
  income,
  budgetPace,
}: {
  freeToday: number | null;
  dailyLimit: number | null;
  forecastExpense: number;
  income: number;
  budgetPace: number;
}) {
  if ((dailyLimit != null && freeToday != null && freeToday < dailyLimit * -0.2) || budgetPace > 118) {
    return {
      label: 'Sangramento',
      tone: 'text-status-broken',
      border: 'border-status-broken/35',
      bg: 'bg-status-broken/10',
      line: 'O dinheiro abriu brecha. Corte o excesso antes que vire hábito.',
    };
  }
  if ((dailyLimit != null && freeToday != null && freeToday < 0) || (income > 0 && forecastExpense > income)) {
    return {
      label: 'Atenção',
      tone: 'text-amber-300',
      border: 'border-amber-300/35',
      bg: 'bg-amber-300/10',
      line: 'A rota ainda é sua, mas exige comando frio hoje.',
    };
  }
  if (income > 0 && forecastExpense <= income && budgetPace <= 92) {
    return {
      label: 'Dominando',
      tone: 'text-status-ontrack',
      border: 'border-status-ontrack/35',
      bg: 'bg-status-ontrack/10',
      line: 'O mês está obedecendo ao plano. Mantenha a lâmina firme.',
    };
  }
  return {
    label: 'No caminho',
    tone: 'text-primary',
    border: 'border-primary/35',
    bg: 'bg-primary/10',
    line: 'Sem glória em gastar sem olhar. Hoje é dia de vigiar a rota.',
  };
}

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
  const [dreamGoalsOpen, setDreamGoalsOpen] = useState(false);
  const [financeView, setFinanceView] = useState<FinanceView>('overview');
  const [, startFinanceTransition] = useTransition();
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'expense' | 'income'>('all');
  const [historyCategory, setHistoryCategory] = useState('all');
  const deferredHistoryQuery = useDeferredValue(historyQuery.trim().toLowerCase());

  const cur = currentMonthKey(timezone);
  const isCurrent = monthKey.year === cur.year && monthKey.month === cur.month;
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const sum = useMemo(() => summary(fin.transactions), [fin.transactions]);
  const catData = useMemo(() => byCategory(fin.transactions), [fin.transactions]);
  const days = useMemo(() => byDay(fin.transactions), [fin.transactions]);
  const filteredTransactions = useMemo(() => {
    return fin.transactions.filter((tx) => {
      if (historyType !== 'all' && tx.type !== historyType) return false;
      if (historyCategory !== 'all' && tx.category !== historyCategory) return false;
      if (!deferredHistoryQuery) return true;

      const meta = categoryMeta(tx.category);
      const haystack = [
        tx.note,
        meta.label,
        tx.ref_date,
        brl(Number(tx.amount_brl)),
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(deferredHistoryQuery);
    });
  }, [deferredHistoryQuery, fin.transactions, historyCategory, historyType]);
  const filteredDays = useMemo(() => byDay(filteredTransactions), [filteredTransactions]);
  const filteredSummary = useMemo(() => summary(filteredTransactions), [filteredTransactions]);
  const expenseTxs = useMemo(() => fin.transactions.filter((t) => t.type === 'expense'), [fin.transactions]);
  const incomeTxs = useMemo(() => fin.transactions.filter((t) => t.type === 'income'), [fin.transactions]);
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catData) m.set(c.key, c.value);
    return m;
  }, [catData]);
  const todaySpent = fin.transactions
    .filter((t) => t.type === 'expense' && t.ref_date === today)
    .reduce((s, t) => s + Number(t.amount_brl), 0);
  const pendingScheduled = fin.scheduled.filter((s) => s.status === 'pending');
  const dueScheduled = pendingScheduled.filter((s) => s.due_date <= today);
  const futureScheduled = pendingScheduled.filter((s) => s.due_date > today);
  const pendingScheduledExpense = pendingScheduled
    .filter((s) => s.type === 'expense')
    .reduce((acc, s) => acc + Number(s.amount_brl), 0);
  const dreamTarget = fin.dreamGoals.reduce((acc, goal) => acc + Number(goal.target_amount_brl), 0);
  const dreamCurrent = fin.dreamGoals.reduce((acc, goal) => acc + Number(goal.current_amount_brl), 0);
  const dreamPct = dreamTarget > 0 ? Math.min(100, Math.round((dreamCurrent / dreamTarget) * 100)) : 0;
  const mainDream = [...fin.dreamGoals]
    .sort((a, b) => (Number(b.current_amount_brl) / Number(b.target_amount_brl)) - (Number(a.current_amount_brl) / Number(a.target_amount_brl)))[0];
  const selectedDays = daysInMonth(monthKey);
  const selectedOrdinal = monthKey.year * 12 + monthKey.month;
  const currentOrdinal = cur.year * 12 + cur.month;
  const elapsedDays = selectedOrdinal < currentOrdinal ? selectedDays : selectedOrdinal === currentOrdinal ? Number(today.slice(8, 10)) : 0;
  const todayDay = elapsedDays || selectedDays;
  const remainingDays = Math.max(1, selectedDays - todayDay + 1);
  const budgetTotal = fin.budgets.reduce((s, b) => s + Number(b.monthly_limit_brl), 0);
  const monthProgress = pct(todayDay, selectedDays);
  const budgetPace = budgetTotal > 0 ? Math.round((sum.expense / budgetTotal) * 100) : monthProgress;
  const inferredDailyLimit = dailyLimit ?? (budgetTotal > 0 ? Math.max(0, (budgetTotal - sum.expense) / remainingDays) : null);
  const freeToday = inferredDailyLimit != null ? inferredDailyLimit - todaySpent : null;
  const recurringExpense = fin.recurring.filter((r) => r.active && r.type === 'expense').reduce((s, r) => s + Number(r.amount_brl), 0);
  const biggestExpense = useMemo(
    () => expenseTxs.reduce<Transaction | null>((best, tx) => (best == null || Number(tx.amount_brl) > Number(best.amount_brl) ? tx : best), null),
    [expenseTxs],
  );
  const biggestIncome = useMemo(
    () => incomeTxs.reduce<Transaction | null>((best, tx) => (best == null || Number(tx.amount_brl) > Number(best.amount_brl) ? tx : best), null),
    [incomeTxs],
  );
  const expenseDays = useMemo(() => new Set(expenseTxs.map((t) => t.ref_date)), [expenseTxs]);
  const movementDays = useMemo(() => new Set(fin.transactions.map((t) => t.ref_date)), [fin.transactions]);
  const quietDays = Math.max(0, elapsedDays - expenseDays.size);
  const biggestPending = pendingScheduled
    .filter((s) => s.type === 'expense')
    .sort((a, b) => Number(b.amount_brl) - Number(a.amount_brl))[0] ?? null;
  const dailyBurn = elapsedDays > 0 ? sum.expense / elapsedDays : sum.expense;
  const ledgerSignal = biggestPending
    ? `Prepare ${brl(Number(biggestPending.amount_brl))} para ${biggestPending.note || categoryMeta(biggestPending.category).label}.`
    : biggestExpense
      ? `${transactionTitle(biggestExpense)} foi a maior saída. O comando começa por ali.`
      : 'Sem sangria registrada. A primeira moeda do mês ainda está sob seu comando.';
  const nextRecurring = fin.recurring
    .filter((r) => r.active)
    .sort((a, b) => a.day_of_month - b.day_of_month)
    .find((r) => r.day_of_month >= todayDay) ?? fin.recurring.filter((r) => r.active).sort((a, b) => a.day_of_month - b.day_of_month)[0];
  const dailyAverage = todayDay > 0 ? sum.expense / todayDay : sum.expense;
  const forecastExpense = Math.max(sum.expense + pendingScheduledExpense, dailyAverage * selectedDays);
  const forecastBalance = sum.income - forecastExpense;
  const planBase = budgetTotal > 0 ? budgetTotal : sum.income;
  const committedExpense = sum.expense + pendingScheduledExpense;
  const monthShield = planBase > 0 ? planBase - committedExpense : sum.balance - pendingScheduledExpense;
  const safeDaily = Math.max(0, monthShield / remainingDays);
  const planUsage = planBase > 0 ? pct(committedExpense, planBase) : 0;
  const cutNeeded = planBase > 0 ? Math.max(0, committedExpense - planBase) : Math.max(0, forecastExpense - sum.income);
  const planLine = cutNeeded > 0
    ? `Corte ${brl(cutNeeded)} para fechar o mês sem entregar território.`
    : monthShield > 0
      ? `${brl(monthShield)} ainda protege sua rota este mês.`
      : 'O mês está no fio. Registre entradas ou pause novas despesas.';
  const topCategory = catData[0];
  const topMeta = categoryMeta(topCategory?.key ?? null);
  const score = Math.max(
    0,
    Math.min(
      100,
      62
        + (sum.balance >= 0 ? 12 : -14)
        + (budgetTotal > 0 && sum.expense <= budgetTotal ? 12 : -8)
        + (freeToday != null && freeToday >= 0 ? 8 : -8)
        + (recurringExpense <= sum.income * 0.35 ? 6 : -6),
    ),
  );
  const command = getCommandStatus({ freeToday, dailyLimit: inferredDailyLimit, forecastExpense, income: sum.income, budgetPace });
  const missionText = freeToday != null && freeToday < 0
    ? `Recupere ${brl(Math.abs(freeToday))} hoje. Nenhum gasto fora da missão.`
    : topCategory
      ? `Vigie ${topMeta.label.toLowerCase()}. É onde o mês está mais barulhento.`
      : 'Registre o primeiro movimento do dia e assuma o comando.';

  const canAdd = (amount ?? 0) > 0;
  const isFutureMovement = date > today;
  const submitLabel = isFutureMovement
    ? type === 'expense' ? 'Agendar pendência' : 'Agendar entrada'
    : 'Registrar';

  return (
    <main className="finance-world flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
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
        <button type="button" onClick={() => startFinanceTransition(() => setMonthKey((k) => shiftMonth(k, -1)))} aria-label="Mês anterior" className="press rounded-lg bg-card px-3 py-1.5 text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold">{monthLabel(monthKey)}</span>
          {!isCurrent && (
            <button type="button" onClick={() => startFinanceTransition(() => setMonthKey(cur))} className="press text-[11px] text-primary">
              voltar ao mês atual
            </button>
          )}
        </div>
        <button type="button" onClick={() => startFinanceTransition(() => setMonthKey((k) => shiftMonth(k, 1)))} aria-label="Próximo mês" className="press rounded-lg bg-card px-3 py-1.5 text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Command center */}
      <section className="finance-command anim-rise flex flex-col gap-4 rounded-[1.75rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">Cofre Woolves</p>
          <span className={cn('shrink-0 rounded-full border px-3 py-1 text-xs font-bold sm:text-sm', command.border, command.bg, command.tone)}>
            {command.label}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="finance-coin flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <ThiingsAsset assetKey="finances" size={38} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{monthLabel(monthKey)}</p>
            <h2 className="mt-1 text-3xl font-semibold leading-none tracking-[-0.01em] sm:text-4xl">
              <CountUp value={sum.balance} format={brl} />
            </h2>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">Controle a moeda antes que ela controle você.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5 sm:p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">Livre hoje</p>
            <p className={cn('mt-2 whitespace-nowrap font-bold tabular-nums leading-none tracking-[-0.01em]', freeToday == null ? 'text-[clamp(0.84rem,2vw,1.06rem)]' : moneySizeClass(freeToday), (freeToday ?? 0) >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
              {freeToday == null ? '—' : <CountUp value={freeToday} format={brl} />}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5 sm:p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">Hoje</p>
            <p className={cn('mt-2 whitespace-nowrap font-bold tabular-nums leading-none tracking-[-0.01em] text-status-broken', moneySizeClass(todaySpent))}><CountUp value={todaySpent} format={brl} /></p>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5 sm:p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">Score</p>
            <p className={cn(metricValueClass, 'text-primary')}>{score}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className={cn('whitespace-nowrap font-bold tabular-nums leading-tight tracking-[-0.01em] text-status-ontrack', moneySizeClass(sum.income))}><CountUp value={sum.income} format={brl} /></p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Despesa</p>
            <p className={cn('whitespace-nowrap font-bold tabular-nums leading-tight tracking-[-0.01em] text-status-broken', moneySizeClass(sum.expense))}><CountUp value={sum.expense} format={brl} /></p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={cn('whitespace-nowrap font-bold tabular-nums leading-tight tracking-[-0.01em]', moneySizeClass(sum.balance), sum.balance >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
              <CountUp value={sum.balance} format={brl} />
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{command.line}</p>
      </section>

      <nav className="finance-tabs anim-rise grid grid-cols-4 gap-1 rounded-2xl p-1" aria-label="Áreas de finanças">
        {FINANCE_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            onClick={() => startFinanceTransition(() => setFinanceView(view.key))}
            className={cn(
              'press min-h-10 rounded-xl text-xs font-semibold transition-colors',
              financeView === view.key
                ? 'bg-primary text-primary-foreground shadow-[0_10px_30px_-18px_hsl(var(--primary))]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {view.label}
          </button>
        ))}
      </nav>

      {financeView === 'overview' ? (
      <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Plano do mês</p>
            <h2 className="mt-1 text-lg font-semibold">Sobreviver com margem</h2>
          </div>
          <span className={cn('shrink-0 rounded-full border px-3 py-1 text-xs font-semibold', monthShield >= 0 ? 'border-status-ontrack/30 bg-status-ontrack/10 text-status-ontrack' : 'border-status-broken/30 bg-status-broken/10 text-status-broken')}>
            {planUsage}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-card">
          <div
            className={cn('h-full rounded-full transition-all', planUsage > 100 ? 'bg-status-broken' : planUsage > 82 ? 'bg-amber-300' : 'bg-status-ontrack')}
            style={{ width: `${Math.min(100, planUsage)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5">
            <p className="text-[10px] text-muted-foreground">Margem</p>
            <p className={cn('mt-1 whitespace-nowrap font-bold tabular-nums', moneySizeClass(monthShield), monthShield >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
              <CountUp value={monthShield} format={brl} />
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5">
            <p className="text-[10px] text-muted-foreground">Seguro/dia</p>
            <p className={cn('mt-1 whitespace-nowrap font-bold tabular-nums text-primary', moneySizeClass(safeDaily))}>
              <CountUp value={safeDaily} format={brl} />
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5">
            <p className="text-[10px] text-muted-foreground">Restam</p>
            <p className="mt-1 font-bold tabular-nums">{remainingDays}d</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{planLine}</p>
      </section>
      ) : null}

      {/* Quick action */}
      {financeView === 'movement' ? (
      <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Movimento</p>
            <h2 className="mt-1 text-lg font-semibold">Registrar agora</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setBudgetsOpen(true)} className="press rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Orçamentos
            </button>
            <button type="button" onClick={() => setRecurringOpen(true)} className="press rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Recorrentes
            </button>
            <button type="button" onClick={() => setDreamGoalsOpen(true)} className="press rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Sonhos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'expense' ? 'alimentacao' : 'salario'); }} className={cn('press min-h-10 rounded-xl border text-sm font-semibold transition-colors', type === t ? (t === 'expense' ? 'border-status-broken/50 bg-status-broken/10 text-status-broken' : 'border-status-ontrack/50 bg-status-ontrack/10 text-status-ontrack') : 'border-border text-muted-foreground')}>
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CurrencyInput value={amount} onValueChange={setAmount} placeholder="R$ 0,00" className="min-h-11 rounded-xl border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={cn('press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', category === c.key ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
              <ThiingsAsset assetKey={c.icon} size={16} />
              {c.label}
            </button>
          ))}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <button
          type="button"
          disabled={!canAdd || fin.logTransaction.isPending || fin.addScheduled.isPending}
          onClick={() => {
            if (isFutureMovement) {
              fin.addScheduled.mutate({
                type,
                amount_brl: amount ?? 0,
                category,
                note: note.trim() || null,
                due_date: date,
              });
            } else {
              fin.logTransaction.mutate({ type, amount: amount ?? 0, category, note: note.trim() || null, refDate: date });
            }
            setAmount(null);
            setNote('');
          }}
          className="press min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </section>
      ) : null}

      {financeView === 'movement' && pendingScheduled.length > 0 ? (
        <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">A vencer</p>
              <h2 className="mt-1 text-lg font-semibold">Pendências do mês</h2>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {brl(pendingScheduledExpense)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {[...dueScheduled, ...futureScheduled].slice(0, 5).map((item) => {
              const meta = categoryMeta(item.category);
              const due = item.due_date <= today;
              return (
                <div key={item.id} className="surface-1 flex items-center gap-3 rounded-2xl p-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', due ? 'bg-status-broken/10' : 'bg-card')}>
                    <ThiingsAsset assetKey={meta.icon} size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.note || meta.label}</p>
                    <p className={cn('text-[11px]', due ? 'text-status-broken' : 'text-muted-foreground')}>
                      {due ? 'Vence hoje ou atrasada' : `Vence em ${dayLabel(item.due_date)}`} · {meta.label}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('text-sm font-bold tabular-nums', item.type === 'expense' ? 'text-status-broken' : 'text-status-ontrack')}>
                      {item.type === 'expense' ? '-' : '+'}{brl(Number(item.amount_brl))}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => fin.payScheduled.mutate(item.id)} className="press text-xs font-semibold text-primary">
                        Pagar
                      </button>
                      <button type="button" onClick={() => fin.cancelScheduled.mutate(item.id)} className="press text-xs text-muted-foreground hover:text-status-broken">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {financeView === 'vault' ? (
      <>
      <section className="surface-2 anim-rise grid grid-cols-3 gap-2 rounded-3xl p-4">
        <button type="button" onClick={() => setDreamGoalsOpen(true)} className="press flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-primary/20 bg-primary/10 text-center text-xs font-semibold text-primary">
          <ThiingsAsset assetKey="finances" size={24} />
          Sonhos
        </button>
        <button type="button" onClick={() => setBudgetsOpen(true)} className="press flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-black/15 text-center text-xs font-semibold text-muted-foreground">
          <ThiingsAsset assetKey="investimentos" size={24} />
          Orçamentos
        </button>
        <button type="button" onClick={() => setRecurringOpen(true)} className="press flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-black/15 text-center text-xs font-semibold text-muted-foreground">
          <ThiingsAsset assetKey="outros" size={24} />
          Recorrentes
        </button>
      </section>

      <section className="surface-2 anim-rise overflow-hidden rounded-3xl">
        {mainDream?.image_url ? (
          <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url("${mainDream.image_url}")` }} />
        ) : null}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Meta dos sonhos</p>
              <h2 className="mt-1 truncate text-lg font-semibold">
                {mainDream ? mainDream.title : 'Crie o próximo destino'}
              </h2>
            </div>
            <button type="button" onClick={() => setDreamGoalsOpen(true)} className="press shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              Abrir
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Guardado</p>
              <p className={cn('whitespace-nowrap font-bold tabular-nums text-status-ontrack', moneySizeClass(dreamCurrent))}>{brl(dreamCurrent)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Alvo</p>
              <p className={cn('whitespace-nowrap font-bold tabular-nums', moneySizeClass(dreamTarget))}>{brl(dreamTarget)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Progresso</p>
              <p className="font-bold tabular-nums text-primary">{dreamPct}%</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${dreamPct}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {mainDream ? `${brl(Math.max(0, Number(mainDream.target_amount_brl) - Number(mainDream.current_amount_brl)))} para conquistar este sonho.` : 'Paris, Porsche, liberdade, família. Dê um alvo para o dinheiro.'}
          </p>
        </div>
      </section>
      </>
      ) : null}

      {financeView === 'overview' ? (
      <section className="grid grid-cols-2 gap-3">
        <div className="surface-2 anim-rise flex min-h-32 flex-col justify-between rounded-2xl p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Missão de hoje</p>
            <p className="mt-2 text-sm font-semibold leading-snug">{missionText}</p>
          </div>
          <span className="mt-3 text-xs text-primary">Disciplina rende EXP.</span>
        </div>
        <div className="surface-2 anim-rise flex min-h-32 flex-col justify-between rounded-2xl p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previsão</p>
            <p className={cn('mt-2 text-lg font-bold tabular-nums', forecastBalance >= 0 ? 'text-status-ontrack' : 'text-status-broken')}>
              <CountUp value={forecastBalance} format={brl} />
            </p>
          </div>
          <span className="mt-3 text-xs text-muted-foreground">Saldo provável no fim do mês</span>
        </div>
      </section>
      ) : null}

      {financeView === 'vault' ? (
      <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Radar Maquiavel</p>
            <h2 className="mt-1 text-lg font-semibold">Antecipe a próxima saída.</h2>
          </div>
          <button type="button" onClick={() => setRecurringOpen(true)} className="press rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary">
            Recorrentes
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-black/15 p-3">
            <p className="text-[11px] text-muted-foreground">Recorrências ativas</p>
            <p className="mt-1 text-base font-bold tabular-nums">{brl(recurringExpense)}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/15 p-3">
            <p className="text-[11px] text-muted-foreground">Próximo movimento</p>
            <p className="mt-1 truncate text-sm font-semibold">
              {nextRecurring ? `${nextRecurring.note || categoryMeta(nextRecurring.category).label} · dia ${nextRecurring.day_of_month}` : 'Nada no radar'}
            </p>
          </div>
        </div>
      </section>
      ) : null}

      {financeView === 'ledger' ? (
      <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Livro de comando</p>
            <h2 className="mt-1 text-lg font-semibold">Leitura do mês</h2>
          </div>
          <span className={cn('shrink-0 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums', sum.balance >= 0 ? 'border-status-ontrack/30 bg-status-ontrack/10 text-status-ontrack' : 'border-status-broken/30 bg-status-broken/10 text-status-broken')}>
            {signedBrl(sum.balance)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{ledgerSignal}</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/5 bg-black/15 p-3">
            <p className="text-[11px] text-muted-foreground">Maior saída</p>
            <p className="mt-1 truncate text-sm font-semibold">{transactionTitle(biggestExpense)}</p>
            <p className={cn('mt-1 whitespace-nowrap font-bold tabular-nums text-status-broken', biggestExpense ? moneySizeClass(Number(biggestExpense.amount_brl)) : metricValueClass)}>
              {biggestExpense ? brl(Number(biggestExpense.amount_brl)) : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/15 p-3">
            <p className="text-[11px] text-muted-foreground">Maior entrada</p>
            <p className="mt-1 truncate text-sm font-semibold">{transactionTitle(biggestIncome)}</p>
            <p className={cn('mt-1 whitespace-nowrap font-bold tabular-nums text-status-ontrack', biggestIncome ? moneySizeClass(Number(biggestIncome.amount_brl)) : metricValueClass)}>
              {biggestIncome ? brl(Number(biggestIncome.amount_brl)) : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Ritmo diário</p>
            <p className={cn('whitespace-nowrap font-bold tabular-nums text-status-broken', moneySizeClass(dailyBurn))}>{brl(dailyBurn)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Dias sem gasto</p>
            <p className="font-bold tabular-nums text-primary">{quietDays}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Dias ativos</p>
            <p className="font-bold tabular-nums">{movementDays.size}</p>
          </div>
        </div>
      </section>
      ) : null}

      {financeView === 'overview' ? <TrendChart trend={fin.trend} /> : null}

      {/* Donut + budgets */}
      {financeView === 'overview' && catData.length > 0 ? (
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

      {/* History by day */}
      {financeView === 'ledger' && days.length > 0 ? (
        <section className="anim-rise flex flex-col gap-3">
          <div className="surface-2 flex flex-col gap-3 rounded-3xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Livro aberto</p>
                <h2 className="mt-1 text-lg font-semibold">Lançamentos</h2>
              </div>
              <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold tabular-nums', filteredSummary.balance >= 0 ? 'border-status-ontrack/30 bg-status-ontrack/10 text-status-ontrack' : 'border-status-broken/30 bg-status-broken/10 text-status-broken')}>
                {signedBrl(filteredSummary.balance)}
              </span>
            </div>

            <input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Buscar por nota, categoria, data ou valor"
              className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />

            <div className="grid grid-cols-3 gap-2">
              {(['all', 'expense', 'income'] as const).map((filterType) => (
                <button
                  key={filterType}
                  type="button"
                  onClick={() => {
                    setHistoryType(filterType);
                    setHistoryCategory('all');
                  }}
                  className={cn('press min-h-10 rounded-xl border text-xs font-semibold transition-colors', historyType === filterType ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}
                >
                  {filterType === 'all' ? 'Tudo' : filterType === 'expense' ? 'Despesas' : 'Receitas'}
                </button>
              ))}
            </div>

            <select
              value={historyCategory}
              onChange={(e) => setHistoryCategory(e.target.value)}
              className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <option value="all">Todas as categorias</option>
              {FILTER_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Itens</p>
                <p className="font-bold tabular-nums">{filteredTransactions.length}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Saídas</p>
                <p className={cn('whitespace-nowrap font-bold tabular-nums text-status-broken', moneySizeClass(filteredSummary.expense))}>{brl(filteredSummary.expense)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Entradas</p>
                <p className={cn('whitespace-nowrap font-bold tabular-nums text-status-ontrack', moneySizeClass(filteredSummary.income))}>{brl(filteredSummary.income)}</p>
              </div>
            </div>
          </div>

          {filteredDays.length > 0 ? (
            filteredDays.map((d) => {
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
            })
          ) : (
            <p className="surface-1 rounded-2xl p-4 text-sm text-muted-foreground">Nenhum lançamento encontrado com esses filtros.</p>
          )}
        </section>
      ) : financeView === 'ledger' ? (
        <p className="text-sm text-muted-foreground">Nenhum lançamento em {monthLabel(monthKey)}.</p>
      ) : null}

      {budgetsOpen ? <BudgetsSheet
        open={budgetsOpen}
        budgets={fin.budgets}
        spentByCategory={spentByCat}
        onSet={(c, v) => fin.setBudget.mutate({ category: c, monthly_limit_brl: v })}
        onDelete={(c) => fin.deleteBudget.mutate(c)}
        onClose={() => setBudgetsOpen(false)}
      /> : null}

      {recurringOpen ? <RecurringSheet
        open={recurringOpen}
        recurring={fin.recurring}
        monthLabel={monthLabel(monthKey)}
        applying={fin.applyRecurring.isPending}
        onAdd={(d) => fin.addRecurring.mutate(d)}
        onToggle={(id, active) => fin.updateRecurring.mutate({ id, active })}
        onDelete={(id) => fin.deleteRecurring.mutate(id)}
        onApply={() => fin.applyRecurring.mutate(monthKey)}
        onClose={() => setRecurringOpen(false)}
      /> : null}

      {dreamGoalsOpen ? <DreamGoalsSheet
        open={dreamGoalsOpen}
        goals={fin.dreamGoals}
        saving={fin.addDreamGoal.isPending}
        contributing={fin.contributeDreamGoal.isPending}
        onAdd={(goal) => fin.addDreamGoal.mutate(goal)}
        onContribute={(id, amount) => fin.contributeDreamGoal.mutate({ id, amount })}
        onArchive={(id) => fin.updateDreamGoal.mutate({ id, archived: true })}
        onClose={() => setDreamGoalsOpen(false)}
      /> : null}

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

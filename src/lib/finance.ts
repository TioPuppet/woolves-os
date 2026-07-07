import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString } from '@/lib/date';
import type { ThiingsAssetKey } from '@/lib/thiings-registry';

export interface Transaction {
  id: number;
  ref_date: string;
  type: 'expense' | 'income';
  amount_brl: number;
  category: string | null;
  note: string | null;
}

export interface FinanceToday {
  spent: number;
  income: number;
  limit: number | null;
  transactions: Transaction[];
}

export interface Category {
  key: string;
  label: string;
  icon: ThiingsAssetKey;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'alimentacao', label: 'Alimentação', icon: 'alimentacao' },
  { key: 'transporte', label: 'Transporte', icon: 'transporte' },
  { key: 'moradia', label: 'Moradia', icon: 'moradia' },
  { key: 'saude', label: 'Saúde', icon: 'saude' },
  { key: 'lazer', label: 'Lazer', icon: 'lazer' },
  { key: 'educacao', label: 'Educação', icon: 'educacao' },
  { key: 'roupas', label: 'Roupas', icon: 'roupas' },
  { key: 'tecnologia', label: 'Tecnologia', icon: 'tecnologia' },
  { key: 'outros', label: 'Outros', icon: 'outros' },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salario', label: 'Salário', icon: 'salario' },
  { key: 'freelance', label: 'Freelance', icon: 'freelance' },
  { key: 'investimentos', label: 'Investimentos', icon: 'investimentos' },
  { key: 'outros', label: 'Outros', icon: 'outros' },
];

export function categoryMeta(key: string | null): Category {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.key === key) ?? { key: 'outros', label: 'Outros', icon: 'outros' };
}

/** HSL triplet per category (Mobills-style distinct colors) for the donut/legend. */
export const CATEGORY_COLOR: Record<string, string> = {
  alimentacao: '25 90% 58%',
  transporte: '211 90% 58%',
  moradia: '265 70% 65%',
  saude: '350 80% 62%',
  lazer: '175 70% 48%',
  educacao: '145 60% 50%',
  roupas: '320 72% 64%',
  tecnologia: '190 80% 55%',
  investimentos: '46 67% 52%',
  salario: '145 63% 49%',
  freelance: '175 70% 48%',
  outros: '240 5% 55%',
};

export function categoryColor(key: string | null): string {
  return CATEGORY_COLOR[key ?? 'outros'] ?? '240 5% 55%';
}


export async function fetchFinanceToday(
  client: SupabaseClient,
  timezone: string,
  limit: number | null,
): Promise<FinanceToday> {
  const date = localDayString(timezone);
  const { data } = await client
    .from('transactions')
    .select('id, ref_date, type, amount_brl, category, note')
    .eq('ref_date', date)
    .order('created_at', { ascending: false });
  const txs = (data ?? []) as Transaction[];
  const spent = txs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount_brl), 0);
  const income = txs
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount_brl), 0);
  return { spent, income, limit, transactions: txs };
}

/* ===================== Finanças v2: mês, orçamento, recorrentes ===================== */

export interface Budget {
  category: string;
  monthly_limit_brl: number;
}

export interface Recurring {
  id: number;
  type: 'expense' | 'income';
  amount_brl: number;
  category: string | null;
  note: string | null;
  day_of_month: number;
  active: boolean;
}

export interface MonthKey {
  year: number;
  month: number; // 1-12
}

export interface TrendPoint {
  ym: string;
  label: string;
  income: number;
  expense: number;
}

export interface MonthData {
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  trend: TrendPoint[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function monthKeyFromDate(dateStr: string): MonthKey {
  return { year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) };
}
export function currentMonthKey(timezone: string): MonthKey {
  return monthKeyFromDate(localDayString(timezone));
}
export function shiftMonth(k: MonthKey, delta: number): MonthKey {
  const idx = k.year * 12 + (k.month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
export function monthLabel(k: MonthKey): string {
  return `${MONTHS[k.month - 1] ?? ''} ${k.year}`;
}
export function monthRange(k: MonthKey): { first: string; last: string } {
  const mm = String(k.month).padStart(2, '0');
  const lastDay = new Date(k.year, k.month, 0).getDate();
  return { first: `${k.year}-${mm}-01`, last: `${k.year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}
export function dayLabel(dateStr: string): string {
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

export async function fetchMonth(client: SupabaseClient, k: MonthKey): Promise<Transaction[]> {
  const { first, last } = monthRange(k);
  const { data } = await client
    .from('transactions')
    .select('id, ref_date, type, amount_brl, category, note')
    .gte('ref_date', first)
    .lte('ref_date', last)
    .order('ref_date', { ascending: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as Transaction[];
}

export async function fetchBudgets(client: SupabaseClient): Promise<Budget[]> {
  const { data } = await client.from('category_budgets').select('category, monthly_limit_brl');
  return (data ?? []) as Budget[];
}

export async function fetchRecurring(client: SupabaseClient): Promise<Recurring[]> {
  const { data } = await client
    .from('recurring_transactions')
    .select('id, type, amount_brl, category, note, day_of_month, active')
    .order('day_of_month');
  return (data ?? []) as Recurring[];
}

export async function fetchTrend(
  client: SupabaseClient,
  timezone: string,
  monthsBack = 6,
): Promise<TrendPoint[]> {
  const now = currentMonthKey(timezone);
  const start = shiftMonth(now, -(monthsBack - 1));
  const { first } = monthRange(start);
  const { data } = await client
    .from('transactions')
    .select('ref_date, type, amount_brl')
    .gte('ref_date', first);
  const rows = (data ?? []) as { ref_date: string; type: string; amount_brl: number }[];
  const map = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < monthsBack; i++) {
    const k = shiftMonth(start, i);
    map.set(`${k.year}-${String(k.month).padStart(2, '0')}`, { income: 0, expense: 0 });
  }
  for (const r of rows) {
    const e = map.get(r.ref_date.slice(0, 7));
    if (!e) continue;
    if (r.type === 'expense') e.expense += Number(r.amount_brl);
    else e.income += Number(r.amount_brl);
  }
  return [...map.entries()].map(([ym, v]) => ({
    ym,
    label: (MONTHS[Number(ym.slice(5, 7)) - 1] ?? '').slice(0, 3),
    income: v.income,
    expense: v.expense,
  }));
}

export function summary(txs: Transaction[]): { expense: number; income: number; balance: number } {
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount_brl), 0);
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount_brl), 0);
  return { expense, income, balance: income - expense };
}

export function byCategory(txs: Transaction[]): { key: string; value: number }[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const k = t.category ?? 'outros';
    map.set(k, (map.get(k) ?? 0) + Number(t.amount_brl));
  }
  return [...map.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}

export function byDay(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const arr = map.get(t.ref_date) ?? [];
    arr.push(t);
    map.set(t.ref_date, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

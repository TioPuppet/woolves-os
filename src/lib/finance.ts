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

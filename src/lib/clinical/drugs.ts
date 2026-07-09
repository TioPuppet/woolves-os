import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export type Severity = 'contraindicada' | 'grave' | 'moderada' | 'leve';

export interface Drug {
  id: number;
  name: string;
  brand: string | null;
  therapeutic_class: string | null;
  presentation: string | null;
  indications: string | null;
  posology: string | null;
  contraindications: string | null;
  adverse_reactions: string | null;
  interactions_notes: string | null;
  pregnancy_risk: string | null;
  lactation: string | null;
  mechanism: string | null;
  source: string | null;
  source_url: string | null;
  updated_at: string;
}

export type DrugDraft = Omit<Drug, 'id' | 'updated_at'>;

export interface DrugInteraction {
  id: number;
  drug_a: string;
  drug_b: string;
  severity: Severity;
  effect: string | null;
  management: string | null;
  source: string | null;
  source_url: string | null;
}

export type InteractionDraft = Omit<DrugInteraction, 'id'>;

export const DRUG_FIELDS =
  'id, name, brand, therapeutic_class, presentation, indications, posology, contraindications, adverse_reactions, interactions_notes, pregnancy_risk, lactation, mechanism, source, source_url, updated_at';

export const INTERACTION_FIELDS =
  'id, drug_a, drug_b, severity, effect, management, source, source_url';

export async function fetchDrugs(client: SupabaseClient): Promise<Drug[]> {
  const { data, error } = await client.from('drugs').select(DRUG_FIELDS).order('name');
  throwIfSupabaseError(error, 'fetchDrugs');
  return (data ?? []) as Drug[];
}

export async function fetchInteractions(
  client: SupabaseClient,
): Promise<DrugInteraction[]> {
  const { data, error } = await client
    .from('drug_interactions')
    .select(INTERACTION_FIELDS)
    .order('severity');
  throwIfSupabaseError(error, 'fetchInteractions');
  return (data ?? []) as DrugInteraction[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Filtra fármacos por nome/marca/classe. */
export function searchDrugs(drugs: Drug[], query: string): Drug[] {
  const q = norm(query);
  if (!q) return drugs;
  return drugs.filter(
    (d) =>
      norm(d.name).includes(q) ||
      (d.brand ? norm(d.brand).includes(q) : false) ||
      (d.therapeutic_class ? norm(d.therapeutic_class).includes(q) : false),
  );
}

/**
 * Dado um conjunto de nomes de fármacos selecionados, retorna as interações
 * curadas em que AMBOS os fármacos do par estão presentes na seleção.
 * Correspondência por inclusão normalizada (ignora acentos/caixa).
 */
export function checkInteractions(
  interactions: DrugInteraction[],
  selected: string[],
): DrugInteraction[] {
  const set = selected.map(norm).filter(Boolean);
  const present = (name: string) => set.some((s) => norm(name).includes(s) || s.includes(norm(name)));
  return interactions.filter((it) => present(it.drug_a) && present(it.drug_b));
}

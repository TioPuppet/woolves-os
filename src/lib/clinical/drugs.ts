import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export type Severity = 'contraindicada' | 'grave' | 'moderada' | 'leve';

export interface Drug {
  id: number;
  name: string;
  active_ingredient: string | null;
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
  anvisa_company: string | null;
  anvisa_registration: string | null;
  anvisa_published_at: string | null;
  anvisa_professional_url: string | null;
  anvisa_patient_url: string | null;
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
  'id, name, active_ingredient, brand, therapeutic_class, presentation, indications, posology, contraindications, adverse_reactions, interactions_notes, pregnancy_risk, lactation, mechanism, source, source_url, anvisa_company, anvisa_registration, anvisa_published_at, anvisa_professional_url, anvisa_patient_url, updated_at';

export const LEGACY_DRUG_FIELDS =
  'id, name, brand, therapeutic_class, presentation, indications, posology, contraindications, adverse_reactions, interactions_notes, pregnancy_risk, lactation, mechanism, source, source_url, updated_at';

export function hasMissingAnvisaColumns(error: { code?: string; message?: string } | null): boolean {
  if (error?.code === '42703') return true;
  return [
    'active_ingredient',
    'anvisa_company',
    'anvisa_registration',
    'anvisa_published_at',
    'anvisa_professional_url',
    'anvisa_patient_url',
  ].some((column) => error?.message?.includes(column));
}

export function legacyDrugDraft(draft: DrugDraft): Omit<DrugDraft, 'active_ingredient' | 'anvisa_company' | 'anvisa_registration' | 'anvisa_published_at' | 'anvisa_professional_url' | 'anvisa_patient_url'> {
  const {
    active_ingredient: _activeIngredient,
    anvisa_company: _company,
    anvisa_registration: _registration,
    anvisa_published_at: _publishedAt,
    anvisa_professional_url: _professionalUrl,
    anvisa_patient_url: _patientUrl,
    ...legacyDraft
  } = draft;
  return legacyDraft;
}

export function legacyDrugPatch(patch: Partial<DrugDraft>): Partial<Omit<DrugDraft, 'active_ingredient' | 'anvisa_company' | 'anvisa_registration' | 'anvisa_published_at' | 'anvisa_professional_url' | 'anvisa_patient_url'>> {
  const {
    active_ingredient: _activeIngredient,
    anvisa_company: _company,
    anvisa_registration: _registration,
    anvisa_published_at: _publishedAt,
    anvisa_professional_url: _professionalUrl,
    anvisa_patient_url: _patientUrl,
    ...legacyPatch
  } = patch;
  return legacyPatch;
}

export const INTERACTION_FIELDS =
  'id, drug_a, drug_b, severity, effect, management, source, source_url';

export async function fetchDrugs(client: SupabaseClient): Promise<Drug[]> {
  const current = await client.from('drugs').select(DRUG_FIELDS).order('name');
  if (!current.error) return (current.data ?? []) as Drug[];
  if (!hasMissingAnvisaColumns(current.error)) {
    throwIfSupabaseError(current.error, 'fetchDrugs');
  }

  // Keeps the module usable while a new schema migration is being applied.
  const legacy = await client.from('drugs').select(LEGACY_DRUG_FIELDS).order('name');
  throwIfSupabaseError(legacy.error, 'fetchDrugs legacy');
  return (legacy.data ?? []).map((drug) => ({
    ...(drug as Omit<Drug, 'active_ingredient' | 'anvisa_company' | 'anvisa_registration' | 'anvisa_published_at' | 'anvisa_professional_url' | 'anvisa_patient_url'>),
    active_ingredient: null,
    anvisa_company: null,
    anvisa_registration: null,
    anvisa_published_at: null,
    anvisa_professional_url: null,
    anvisa_patient_url: null,
  }));
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

function searchFields(drug: Drug): string[] {
  return [
    drug.name,
    drug.active_ingredient,
    drug.brand,
    drug.therapeutic_class,
    drug.presentation,
    drug.anvisa_company,
    drug.anvisa_registration,
    drug.anvisa_published_at,
    drug.source,
  ]
    .filter((value): value is string => Boolean(value))
    .map(norm);
}

/** Busca por termos do catálogo, priorizando DCB/nome e aceitando metadados ANVISA. */
export function searchDrugs(drugs: Drug[], query: string): Drug[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return drugs;

  return drugs
    .map((drug, index) => {
      const fields = searchFields(drug);
      const name = norm(drug.name);
      const matches = terms.every((term) => fields.some((field) => field.includes(term)));
      if (!matches) return null;

      const score = terms.reduce((total, term) => {
        if (name === term) return total + 12;
        if (name.startsWith(term)) return total + 8;
        if (name.includes(term)) return total + 5;
        return total + 2;
      }, 0);

      return { drug, score, index };
    })
    .filter((result): result is { drug: Drug; score: number; index: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ drug }) => drug);
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

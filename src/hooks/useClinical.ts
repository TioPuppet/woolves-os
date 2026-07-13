'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchDrugs,
  fetchInteractions,
  DRUG_FIELDS,
  LEGACY_DRUG_FIELDS,
  INTERACTION_FIELDS,
  hasMissingAnvisaColumns,
  legacyDrugDraft,
  legacyDrugPatch,
  type Drug,
  type DrugDraft,
  type DrugInteraction,
  type InteractionDraft,
} from '@/lib/clinical/drugs';

export function useDrugs(userId: string, initial: Drug[]) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['drugs', userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDrugs(supabase),
    initialData: initial,
    staleTime: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createDrug = useMutation({
    mutationFn: async (draft: DrugDraft) => {
      const current = await supabase
        .from('drugs')
        .insert({ user_id: userId, ...draft })
        .select(DRUG_FIELDS)
        .single();
      if (!current.error) return current.data as Drug;
      if (!hasMissingAnvisaColumns(current.error)) throw current.error;

      const legacy = await supabase
        .from('drugs')
        .insert({ user_id: userId, ...legacyDrugDraft(draft) })
        .select(LEGACY_DRUG_FIELDS)
        .single();
      if (legacy.error) throw legacy.error;
      return {
        ...(legacy.data as Omit<Drug, 'active_ingredient' | 'anvisa_company' | 'anvisa_registration' | 'anvisa_published_at' | 'anvisa_professional_url' | 'anvisa_patient_url'>),
        active_ingredient: null,
        anvisa_company: null,
        anvisa_registration: null,
        anvisa_published_at: null,
        anvisa_professional_url: null,
        anvisa_patient_url: null,
      };
    },
    onSuccess: invalidate,
  });

  const updateDrug = useMutation({
    mutationFn: async (v: { id: number } & Partial<DrugDraft>) => {
      const { id, ...patch } = v;
      const current = await supabase.from('drugs').update(patch).eq('id', id);
      if (!current.error) return;
      if (!hasMissingAnvisaColumns(current.error)) throw current.error;

      const legacy = await supabase.from('drugs').update(legacyDrugPatch(patch)).eq('id', id);
      if (legacy.error) throw legacy.error;
    },
    onSuccess: invalidate,
  });

  const deleteDrug = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('drugs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { drugs: query.data ?? initial, createDrug, updateDrug, deleteDrug };
}

export function useInteractions(userId: string, initial: DrugInteraction[]) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['interactions', userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchInteractions(supabase),
    initialData: initial,
    staleTime: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createInteraction = useMutation({
    mutationFn: async (draft: InteractionDraft) => {
      const { data, error } = await supabase
        .from('drug_interactions')
        .insert({ user_id: userId, ...draft })
        .select(INTERACTION_FIELDS)
        .single();
      if (error) throw error;
      return data as DrugInteraction;
    },
    onSuccess: invalidate,
  });

  const deleteInteraction = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('drug_interactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    interactions: query.data ?? initial,
    createInteraction,
    deleteInteraction,
  };
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchDrugs,
  fetchInteractions,
  DRUG_FIELDS,
  INTERACTION_FIELDS,
  type Drug,
  type DrugDraft,
  type DrugInteraction,
  type InteractionDraft,
} from '@/lib/clinical/drugs';

export function useDrugs(userId: string, initial: Drug[]) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const KEY = ['drugs'] as const;

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchDrugs(supabase),
    initialData: initial,
    staleTime: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const createDrug = useMutation({
    mutationFn: async (draft: DrugDraft) => {
      const { data, error } = await supabase
        .from('drugs')
        .insert({ user_id: userId, ...draft })
        .select(DRUG_FIELDS)
        .single();
      if (error) throw error;
      return data as Drug;
    },
    onSuccess: invalidate,
  });

  const updateDrug = useMutation({
    mutationFn: async (v: { id: number } & Partial<DrugDraft>) => {
      const { id, ...patch } = v;
      const { error } = await supabase.from('drugs').update(patch).eq('id', id);
      if (error) throw error;
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
  const KEY = ['interactions'] as const;

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchInteractions(supabase),
    initialData: initial,
    staleTime: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

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

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchDiary, type Diary, type MealType } from '@/lib/nutrition';

const KEY = ['diary'] as const;

export interface NewFood {
  name: string;
  kcal_per_100: number;
  protein_per_100: number;
  carb_per_100: number | null;
  fat_per_100: number | null;
}

export function useNutrition(userId: string, timezone: string, initial: Diary) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchDiary(supabase, timezone),
    initialData: initial,
    staleTime: 10_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ['today'] }); // keep dashboard macros/EXP fresh
  };

  const logFood = useMutation({
    mutationFn: async (v: { foodId: number; grams: number; meal: MealType }) => {
      const { error } = await supabase.rpc('log_food', {
        p_food_id: v.foodId,
        p_grams: v.grams,
        p_meal_type: v.meal,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeEntry = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createFood = useMutation({
    mutationFn: async (f: NewFood) => {
      const { data, error } = await supabase
        .from('foods')
        .insert({
          user_id: userId,
          name: f.name.trim(),
          kcal_per_100: f.kcal_per_100,
          protein_per_100: f.protein_per_100,
          carb_per_100: f.carb_per_100,
          fat_per_100: f.fat_per_100,
          is_seed: false,
        })
        .select('id, name, kcal_per_100, protein_per_100, carb_per_100, fat_per_100')
        .single();
      if (error) throw error;
      return data;
    },
  });

  return {
    diary: query.data ?? initial,
    logFood,
    removeEntry,
    createFood,
  };
}

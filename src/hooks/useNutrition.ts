'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchDiary,
  fetchNutritionHistory,
  type Diary,
  type FoodSource,
  type MealType,
  type NutritionDay,
  type NutritionMeasurement,
} from '@/lib/nutrition';

export interface NewFood {
  name: string;
  kcal_per_100: number;
  protein_per_100: number;
  carb_per_100: number | null;
  fat_per_100: number | null;
  brand?: string | null;
  barcode?: string | null;
  source?: FoodSource;
  external_id?: string | null;
  verified?: boolean;
  fiber_per_100?: number | null;
  sugar_per_100?: number | null;
  sodium_mg_per_100?: number | null;
  nova_group?: number | null;
  nutriscore_grade?: string | null;
  image_url?: string | null;
}

export interface SavedMeal {
  id: number;
  name: string;
  items: { id: number; foodId: number; grams: number; name: string }[];
}

export interface NutritionGoal {
  id: number;
  goalType: 'lose' | 'maintain' | 'gain' | 'recomposition';
  targetWeightKg: number | null;
  targetDate: string | null;
  calorieGoal: number | null;
  proteinGoalG: number | null;
  notes: string | null;
}

export interface NutritionMealPlan {
  id: number;
  planDate: string;
  mealType: MealType;
  title: string;
  notes: string | null;
  savedMealId: number | null;
  servings: number;
  isDone: boolean;
}

export interface NutritionShoppingItem {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  source: 'manual' | 'plano';
  planDate: string | null;
  isChecked: boolean;
}

export type HealthProvider = 'apple_health' | 'health_connect' | 'garmin' | 'withings' | 'manual_import';

export interface HealthConnection {
  id: number;
  provider: HealthProvider;
  status: 'available' | 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export interface ImportedHealthRecord {
  dataType: string;
  observedAt: string;
  value: number;
  unit: string;
  sourceRecordId: string;
  rawPayload?: Record<string, unknown>;
}

export interface HealthRecord {
  id: number;
  provider: HealthProvider;
  dataType: string;
  observedAt: string;
  value: number;
  unit: string;
  sourceRecordId: string;
}

export type NutritionDataView = 'command' | 'meals' | 'fasting' | 'analysis' | 'plan' | 'shopping' | 'integrations' | 'ledger';

export function useNutrition(
  userId: string,
  timezone: string,
  initial: Diary,
  activeView: NutritionDataView = 'command',
) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['diary', userId, timezone] as const;
  const mealsKey = ['nutrition-meals', userId] as const;
  const historyKey = ['nutrition-history', userId, timezone] as const;
  const measurementsKey = ['nutrition-measurements', userId] as const;
  const goalsKey = ['nutrition-goals', userId] as const;
  const plansKey = ['nutrition-plans', userId] as const;
  const shoppingKey = ['nutrition-shopping', userId] as const;
  const healthConnectionsKey = ['health-connections', userId] as const;
  const healthRecordsKey = ['health-records', userId] as const;
  const analysisEnabled = activeView === 'analysis';
  const mealsEnabled = activeView === 'meals' || activeView === 'plan' || activeView === 'shopping';
  const goalsEnabled = activeView === 'command';
  const plansEnabled = activeView === 'plan' || activeView === 'shopping';
  const shoppingEnabled = activeView === 'shopping';
  const integrationsEnabled = activeView === 'integrations';

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDiary(supabase, timezone),
    initialData: initial,
    staleTime: 10_000,
  });

  const historyQuery = useQuery<NutritionDay[]>({
    queryKey: historyKey,
    queryFn: () => fetchNutritionHistory(supabase, timezone),
    staleTime: 30_000,
    enabled: analysisEnabled,
  });

  const measurementsQuery = useQuery({
    queryKey: measurementsKey,
    queryFn: async (): Promise<NutritionMeasurement[]> => {
      const { data, error } = await supabase
        .from('nutrition_measurements')
        .select('id, measured_at, weight_kg, body_fat_pct, waist_cm, hip_cm, height_cm, body_water_pct, muscle_mass_kg, bone_mass_kg, visceral_fat_level, neck_cm, chest_cm, abdomen_cm, right_arm_cm, left_arm_cm, right_thigh_cm, left_thigh_cm, right_calf_cm, left_calf_cm, skinfold_triceps_mm, skinfold_biceps_mm, skinfold_subscapular_mm, skinfold_suprailiac_mm, skinfold_abdominal_mm, skinfold_thigh_mm, skinfold_calf_mm, measurement_context, measurement_source, note')
        .order('measured_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as NutritionMeasurement[];
    },
    staleTime: 30_000,
    enabled: analysisEnabled,
  });

  const savedMealsQuery = useQuery({
    queryKey: mealsKey,
    queryFn: async (): Promise<SavedMeal[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select('id, name, meal_items(id, food_id, grams, foods(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((row) => {
        const rawItems = Array.isArray(row.meal_items) ? row.meal_items : [];
        return {
          id: Number(row.id),
          name: String(row.name ?? 'Refeição salva'),
          items: rawItems.map((item) => {
            const value = item as Record<string, unknown>;
            const food = value.foods as { name?: string } | { name?: string }[] | null;
            return {
              id: Number(value.id),
              foodId: Number(value.food_id),
              grams: Number(value.grams ?? 0),
              name: Array.isArray(food) ? String(food[0]?.name ?? 'Alimento') : String(food?.name ?? 'Alimento'),
            };
          }),
        };
      });
    },
    staleTime: 30_000,
    enabled: mealsEnabled,
  });

  const goalsQuery = useQuery({
    queryKey: goalsKey,
    queryFn: async (): Promise<NutritionGoal | null> => {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('id, goal_type, target_weight_kg, target_date, calorie_goal, protein_goal_g, notes')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: Number(data.id),
        goalType: data.goal_type as NutritionGoal['goalType'],
        targetWeightKg: data.target_weight_kg == null ? null : Number(data.target_weight_kg),
        targetDate: data.target_date,
        calorieGoal: data.calorie_goal == null ? null : Number(data.calorie_goal),
        proteinGoalG: data.protein_goal_g == null ? null : Number(data.protein_goal_g),
        notes: data.notes,
      };
    },
    staleTime: 30_000,
    enabled: goalsEnabled,
  });

  const plansQuery = useQuery({
    queryKey: plansKey,
    queryFn: async (): Promise<NutritionMealPlan[]> => {
      const { data, error } = await supabase
        .from('nutrition_meal_plans')
        .select('id, plan_date, meal_type, title, notes, saved_meal_id, servings, is_done')
        .order('plan_date', { ascending: true })
        .order('meal_type', { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: Number(row.id),
        planDate: row.plan_date,
        mealType: row.meal_type as MealType,
        title: row.title,
        notes: row.notes,
        savedMealId: row.saved_meal_id == null ? null : Number(row.saved_meal_id),
        servings: Number(row.servings ?? 1),
        isDone: Boolean(row.is_done),
      }));
    },
    staleTime: 30_000,
    enabled: plansEnabled,
  });

  const shoppingQuery = useQuery({
    queryKey: shoppingKey,
    queryFn: async (): Promise<NutritionShoppingItem[]> => {
      const { data, error } = await supabase
        .from('nutrition_shopping_items')
        .select('id, name, quantity, unit, category, source, plan_date, is_checked')
        .order('is_checked', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: Number(row.id),
        name: row.name,
        quantity: row.quantity == null ? null : Number(row.quantity),
        unit: row.unit,
        category: row.category,
        source: row.source as NutritionShoppingItem['source'],
        planDate: row.plan_date,
        isChecked: Boolean(row.is_checked),
      }));
    },
    staleTime: 30_000,
    enabled: shoppingEnabled,
  });

  const healthConnectionsQuery = useQuery({
    queryKey: healthConnectionsKey,
    queryFn: async (): Promise<HealthConnection[]> => {
      const { data, error } = await supabase
        .from('health_connections')
        .select('id, provider, status, last_synced_at, error_message')
        .order('provider');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: Number(row.id),
        provider: row.provider as HealthProvider,
        status: row.status as HealthConnection['status'],
        lastSyncedAt: row.last_synced_at,
        errorMessage: row.error_message,
      }));
    },
    staleTime: 30_000,
    enabled: integrationsEnabled,
  });

  const healthRecordsQuery = useQuery({
    queryKey: healthRecordsKey,
    queryFn: async (): Promise<HealthRecord[]> => {
      const { data, error } = await supabase
        .from('health_records')
        .select('id, provider, data_type, observed_at, value, unit, source_record_id')
        .order('observed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: Number(row.id),
        provider: row.provider as HealthProvider,
        dataType: row.data_type,
        observedAt: row.observed_at,
        value: Number(row.value),
        unit: row.unit,
        sourceRecordId: row.source_record_id,
      }));
    },
    staleTime: 30_000,
    enabled: integrationsEnabled,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
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
          brand: f.brand ?? null,
          barcode: f.barcode ?? null,
          source: f.source ?? 'user',
          external_id: f.external_id ?? null,
          verified: f.verified ?? false,
          fiber_per_100: f.fiber_per_100 ?? null,
          sugar_per_100: f.sugar_per_100 ?? null,
          sodium_mg_per_100: f.sodium_mg_per_100 ?? null,
          nova_group: f.nova_group ?? null,
          nutriscore_grade: f.nutriscore_grade ?? null,
          image_url: f.image_url ?? null,
          is_seed: false,
        })
        .select('id, name, kcal_per_100, protein_per_100, carb_per_100, fat_per_100, brand, barcode, source, external_id, verified, fiber_per_100, sugar_per_100, sodium_mg_per_100, nova_group, nutriscore_grade, image_url')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const logMeasurement = useMutation({
    mutationFn: async (value: {
      measuredAt: string;
      weightKg: number;
      bodyFatPct: number | null;
      waistCm: number | null;
      hipCm: number | null;
      heightCm: number | null;
      bodyWaterPct: number | null;
      muscleMassKg: number | null;
      boneMassKg: number | null;
      visceralFatLevel: number | null;
      neckCm: number | null;
      chestCm: number | null;
      abdomenCm: number | null;
      rightArmCm: number | null;
      leftArmCm: number | null;
      rightThighCm: number | null;
      leftThighCm: number | null;
      rightCalfCm: number | null;
      leftCalfCm: number | null;
      skinfoldTricepsMm: number | null;
      skinfoldBicepsMm: number | null;
      skinfoldSubscapularMm: number | null;
      skinfoldSuprailiacMm: number | null;
      skinfoldAbdominalMm: number | null;
      skinfoldThighMm: number | null;
      skinfoldCalfMm: number | null;
      measurementContext: string;
      measurementSource: string;
    }) => {
      const { error } = await supabase.from('nutrition_measurements').upsert(
        {
          user_id: userId,
          measured_at: value.measuredAt,
          weight_kg: value.weightKg,
          body_fat_pct: value.bodyFatPct,
          waist_cm: value.waistCm,
          hip_cm: value.hipCm,
          height_cm: value.heightCm,
          body_water_pct: value.bodyWaterPct,
          muscle_mass_kg: value.muscleMassKg,
          bone_mass_kg: value.boneMassKg,
          visceral_fat_level: value.visceralFatLevel,
          neck_cm: value.neckCm,
          chest_cm: value.chestCm,
          abdomen_cm: value.abdomenCm,
          right_arm_cm: value.rightArmCm,
          left_arm_cm: value.leftArmCm,
          right_thigh_cm: value.rightThighCm,
          left_thigh_cm: value.leftThighCm,
          right_calf_cm: value.rightCalfCm,
          left_calf_cm: value.leftCalfCm,
          skinfold_triceps_mm: value.skinfoldTricepsMm,
          skinfold_biceps_mm: value.skinfoldBicepsMm,
          skinfold_subscapular_mm: value.skinfoldSubscapularMm,
          skinfold_suprailiac_mm: value.skinfoldSuprailiacMm,
          skinfold_abdominal_mm: value.skinfoldAbdominalMm,
          skinfold_thigh_mm: value.skinfoldThighMm,
          skinfold_calf_mm: value.skinfoldCalfMm,
          measurement_context: value.measurementContext,
          measurement_source: value.measurementSource,
        },
        { onConflict: 'user_id,measured_at' },
      );
      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ weight_kg: value.weightKg })
        .eq('id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: measurementsKey });
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });

  const saveMeal = useMutation({
    mutationFn: async (value: { name: string; entries: Diary['entries'] }) => {
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({ user_id: userId, name: value.name.trim() })
        .select('id, name')
        .single();
      if (mealError) throw mealError;

      const items = value.entries
        .filter((entry) => entry.food_id != null && entry.grams > 0)
        .map((entry) => ({ meal_id: meal.id, food_id: entry.food_id, grams: entry.grams }));
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('meal_items').insert(items);
        if (itemsError) throw itemsError;
      }
      return meal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mealsKey }),
  });

  const logSavedMeal = useMutation({
    mutationFn: async (meal: SavedMeal) => {
      await Promise.all(
        meal.items.map(async (item) => {
          const { error } = await supabase.rpc('log_food', {
            p_food_id: item.foodId,
            p_grams: item.grams,
            p_meal_type: 'almoco',
          });
          if (error) throw error;
        }),
      );
    },
    onSuccess: invalidate,
  });

  const saveGoal = useMutation({
    mutationFn: async (value: Omit<NutritionGoal, 'id'>) => {
      const { error: archiveError } = await supabase
        .from('nutrition_goals')
        .update({ is_active: false })
        .eq('is_active', true);
      if (archiveError) throw archiveError;

      const { error: goalError } = await supabase.from('nutrition_goals').insert({
        user_id: userId,
        goal_type: value.goalType,
        target_weight_kg: value.targetWeightKg,
        target_date: value.targetDate,
        calorie_goal: value.calorieGoal,
        protein_goal_g: value.proteinGoalG,
        notes: value.notes,
        is_active: true,
      });
      if (goalError) throw goalError;

      const { error: profileError } = await supabase.from('profiles').update({
        goal_kcal: value.calorieGoal,
        goal_protein_g: value.proteinGoalG,
      }).eq('id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsKey });
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });

  const savePlan = useMutation({
    mutationFn: async (value: Omit<NutritionMealPlan, 'id' | 'isDone'> & { isDone?: boolean }) => {
      const { error } = await supabase.from('nutrition_meal_plans').upsert({
        user_id: userId,
        plan_date: value.planDate,
        meal_type: value.mealType,
        title: value.title.trim(),
        notes: value.notes?.trim() || null,
        saved_meal_id: value.savedMealId,
        servings: value.servings,
        is_done: value.isDone ?? false,
      }, { onConflict: 'user_id,plan_date,meal_type' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey }),
  });

  const togglePlan = useMutation({
    mutationFn: async (value: { id: number; isDone: boolean }) => {
      const { error } = await supabase.from('nutrition_meal_plans').update({ is_done: value.isDone }).eq('id', value.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey }),
  });

  const removePlan = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('nutrition_meal_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey }),
  });

  const addShoppingItem = useMutation({
    mutationFn: async (value: { name: string; quantity: number | null; unit: string | null; category: string; source?: 'manual' | 'plano'; planDate?: string | null }) => {
      const { error } = await supabase.from('nutrition_shopping_items').insert({
        user_id: userId,
        name: value.name.trim(),
        quantity: value.quantity,
        unit: value.unit,
        category: value.category,
        source: value.source ?? 'manual',
        plan_date: value.planDate ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKey }),
  });

  const toggleShoppingItem = useMutation({
    mutationFn: async (value: { id: number; isChecked: boolean }) => {
      const { error } = await supabase.from('nutrition_shopping_items').update({ is_checked: value.isChecked }).eq('id', value.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKey }),
  });

  const removeShoppingItem = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('nutrition_shopping_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKey }),
  });

  const importHealthRecords = useMutation({
    mutationFn: async (value: { records: ImportedHealthRecord[] }) => {
      if (value.records.length === 0) return 0;
      const { data: run, error: runError } = await supabase
        .from('health_sync_runs')
        .insert({ user_id: userId, provider: 'manual_import', status: 'started' })
        .select('id')
        .single();
      if (runError) throw runError;

      const rows = value.records.map((record) => ({
        user_id: userId,
        provider: 'manual_import',
        data_type: record.dataType,
        observed_at: record.observedAt,
        value: record.value,
        unit: record.unit,
        source_record_id: record.sourceRecordId,
        sync_run_id: run.id,
        raw_payload: record.rawPayload ?? {},
      }));
      const { error: recordsError } = await supabase
        .from('health_records')
        .upsert(rows, { onConflict: 'user_id,provider,data_type,source_record_id' });
      if (recordsError) {
        await supabase.from('health_sync_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: recordsError.message }).eq('id', run.id);
        throw recordsError;
      }

      const { error: finishError } = await supabase.from('health_sync_runs').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        records_imported: rows.length,
      }).eq('id', run.id);
      if (finishError) throw finishError;

      const { error: connectionError } = await supabase.from('health_connections').upsert({
        user_id: userId,
        provider: 'manual_import',
        status: 'connected',
        last_synced_at: new Date().toISOString(),
        error_message: null,
      }, { onConflict: 'user_id,provider' });
      if (connectionError) throw connectionError;
      return rows.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthConnectionsKey });
      qc.invalidateQueries({ queryKey: healthRecordsKey });
      qc.invalidateQueries({ queryKey: measurementsKey });
    },
  });

  const disconnectHealthProvider = useMutation({
    mutationFn: async (provider: HealthProvider) => {
      const { error } = await supabase.from('health_connections').update({ status: 'disconnected', last_synced_at: null }).eq('user_id', userId).eq('provider', provider);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: healthConnectionsKey }),
  });

  return {
    diary: query.data ?? initial,
    logFood,
    removeEntry,
    createFood,
    savedMeals: savedMealsQuery.data ?? [],
    saveMeal,
    logSavedMeal,
    history: historyQuery.data ?? [],
    measurements: measurementsQuery.data ?? [],
    logMeasurement,
    goal: goalsQuery.data ?? null,
    saveGoal,
    plans: plansQuery.data ?? [],
    savePlan,
    togglePlan,
    removePlan,
    shoppingItems: shoppingQuery.data ?? [],
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    healthConnections: healthConnectionsQuery.data ?? [],
    healthRecords: healthRecordsQuery.data ?? [],
    importHealthRecords,
    disconnectHealthProvider,
  };
}

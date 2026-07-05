/**
 * M1 — Goal calculation (pure, testable, no I/O).
 *
 * kcal:    Mifflin-St Jeor BMR × activity factor
 * protein: 1.8 g/kg (default)
 * water:   35 ml/kg
 *
 * All outputs are user-overridable in onboarding.
 */

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

/** Standard activity multipliers applied to BMR. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const DEFAULT_PROTEIN_G_PER_KG = 1.8;
export const DEFAULT_WATER_ML_PER_KG = 35;

export interface GoalInput {
  sex: Sex;
  ageYears: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  /** Optional overrides for the per-kg coefficients. */
  proteinPerKg?: number;
  waterPerKg?: number;
}

export interface GoalResult {
  bmr: number;
  kcal: number;
  proteinG: number;
  waterMl: number;
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function mifflinStJeorBmr(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  return input.sex === 'male' ? base + 5 : base - 161;
}

/** Full goal derivation. Values are rounded to whole numbers for display. */
export function calculateGoals(input: GoalInput): GoalResult {
  const bmr = mifflinStJeorBmr(input);
  const kcal = bmr * ACTIVITY_FACTORS[input.activityLevel];
  const proteinG =
    input.weightKg * (input.proteinPerKg ?? DEFAULT_PROTEIN_G_PER_KG);
  const waterMl =
    input.weightKg * (input.waterPerKg ?? DEFAULT_WATER_ML_PER_KG);

  return {
    bmr: Math.round(bmr),
    kcal: Math.round(kcal),
    proteinG: Math.round(proteinG),
    waterMl: Math.round(waterMl),
  };
}

/** Whole years between a birth date and a reference date (default: today). */
export function ageFromBirthDate(birthDate: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const monthDiff = ref.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

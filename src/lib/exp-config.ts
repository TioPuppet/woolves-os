/**
 * R2 — EXP baseline (TUNABLE CONSTANTS). Single source of truth.
 *
 * EXP itself is server-authoritative: grants happen ONLY via Postgres RPC
 * (append-only `exp_events` ledger, added in M3). These constants are shared
 * between client (display/estimates) and the eventual RPC/seed so tuning is
 * centralized. Level and totals are DERIVED, never stored as source of truth.
 */

/** Canonical EXP-granting sources. UNIQUE(user_id, source, ref_date) on ledger. */
export type ExpSource =
  | 'workout_completed'
  | 'protein_target'
  | 'kcal_within_target'
  | 'water_goal'
  | 'sleep_goal'
  | 'spend_within_limit'
  | 'required_habit'
  | 'optional_habit'
  | 'night_checkin'
  | 'streak_bonus';

/** Base EXP awarded per source (before streak bonus). */
export const EXP_VALUES: Record<Exclude<ExpSource, 'streak_bonus'>, number> = {
  workout_completed: 50,
  protein_target: 30,
  kcal_within_target: 20,
  water_goal: 15,
  sleep_goal: 15,
  spend_within_limit: 25,
  required_habit: 20,
  optional_habit: 5,
  night_checkin: 25,
};

/** Optional habits cap: max 3 grants/day at 5 EXP each. */
export const OPTIONAL_HABIT_MAX_PER_DAY = 3;

/** Streak bonus: +10 EXP per consecutive day, capped at +50. */
export const STREAK_BONUS_PER_DAY = 10;
export const STREAK_BONUS_CAP = 50;

/** Compute the streak bonus for a given streak length (days). */
export function streakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return Math.min(streakDays * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
}

/**
 * Level curve: cumulative EXP required to REACH level N is 100 * N^1.6.
 * Level 1 requires 100 EXP cumulative baseline; level 0 is the pre-start floor.
 */
export const LEVEL_CURVE_BASE = 100;
export const LEVEL_CURVE_EXPONENT = 1.6;

/**
 * Cumulative EXP required to *be at* a given level.
 * Level 1 (Cub) starts at 0 EXP; each subsequent level needs 100 × (N-1)^1.6
 * more cumulative EXP. This keeps a brand-new (0 EXP) user at Level 1 with a
 * 0→100 progress bar, instead of negative progress.
 */
export function expRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(
    LEVEL_CURVE_BASE * Math.pow(level - 1, LEVEL_CURVE_EXPONENT),
  );
}

export interface LevelInfo {
  level: number;
  title: string;
  /** Cumulative EXP where this level starts. */
  floor: number;
  /** Cumulative EXP where the next level starts (Infinity at max). */
  ceil: number;
  /** EXP accumulated within the current level. */
  intoLevel: number;
  /** EXP span of the current level (Infinity at max). */
  span: number;
  /** 0..1 progress toward next level. */
  progress: number;
}

/**
 * Level evolution icon — the identity asset changes as the wolf ranks up.
 * Interim 4-stage evolution using existing thiings assets; swap to 8 dedicated
 * rank icons later by editing this map (and dropping the PNGs in).
 * Levels: 1 Cub · 2 Rookie · 3 Hunter · 4 Iron · 5 Alpha · 6 Warlord · 7 Legend · 8 Mythic
 */
import type { ThiingsAssetKey } from '@/lib/thiings-registry';

export const LEVEL_ASSET_BY_LEVEL: readonly ThiingsAssetKey[] = [
  'wolf', // 1 Cub
  'wolf', // 2 Rookie Wolf
  'wolf-obsidian', // 3 Hunter
  'wolf-obsidian', // 4 Iron Wolf
  'pack', // 5 Alpha
  'pack', // 6 Warlord
  'award', // 7 Legend
  'award', // 8 Mythic Wolf
];

/** The evolving identity asset for a given level. */
export function levelAssetKey(level: number): ThiingsAssetKey {
  const idx = Math.min(Math.max(level, 1), 8) - 1;
  return LEVEL_ASSET_BY_LEVEL[idx] ?? 'wolf';
}

/** Levels 1–8 (index 0 unused floor). UI copy in pt-BR-friendly names. */
export const LEVEL_TITLES: readonly string[] = [
  'Cub',
  'Rookie Wolf',
  'Hunter',
  'Iron Wolf',
  'Alpha',
  'Warlord',
  'Legend',
  'Mythic Wolf',
] as const;

export const MAX_DEFINED_LEVEL = LEVEL_TITLES.length; // 8

/** Derive full level info from a cumulative EXP total. */
export function levelFromExp(totalExp: number): LevelInfo {
  const exp = Math.max(0, Math.floor(totalExp));

  let level = 1;
  while (level < MAX_DEFINED_LEVEL && exp >= expRequiredForLevel(level + 1)) {
    level += 1;
  }

  const floor = expRequiredForLevel(level);
  const atMax = level >= MAX_DEFINED_LEVEL;
  const ceil = atMax ? Infinity : expRequiredForLevel(level + 1);
  const span = atMax ? Infinity : ceil - floor;
  const intoLevel = exp - floor;
  const progress = atMax ? 1 : span > 0 ? intoLevel / span : 0;

  return {
    level,
    title: LEVEL_TITLES[level - 1] ?? 'Cub',
    floor,
    ceil,
    intoLevel,
    span,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

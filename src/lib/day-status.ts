/**
 * Deterministic day-status engine (PRD rule). Pure — no I/O, fully testable.
 *
 *   on_track  : no failed targets so far today
 *   at_risk   : ≥1 target trending to fail (e.g. >80% of spend limit,
 *               evening with protein <60% of goal)
 *   broken    : main mission target definitively failed
 *   recovery  : day after a broken day (reduced recovery mission)
 *   completed : check-in done with the mission accomplished
 *
 * Precedence (first match wins):
 *   completed → broken → recovery → at_risk → on_track
 */

export type DayStatus =
  | 'on_track'
  | 'at_risk'
  | 'broken'
  | 'recovery'
  | 'completed';

/** Centralized thresholds so day-status tuning lives in one place. */
export const DAY_STATUS_THRESHOLDS = {
  /** Spend at or above this fraction of the daily limit → at_risk. */
  spendAtRiskRatio: 0.8,
  /** Local hour (24h) from which "evening" rules apply. */
  eveningHour: 18,
  /** In the evening, protein below this fraction of goal → at_risk. */
  eveningProteinRatio: 0.6,
} as const;

export interface TargetProgress {
  current: number;
  goal: number;
}

export interface DaySnapshot {
  /** Local wall-clock hour (0–23), from the user's timezone (R3). */
  localHour: number;
  /** Night check-in submitted. */
  checkinDone: boolean;
  /** The day's mission success condition is met. */
  missionAccomplished: boolean;
  /** The main mission target has definitively failed today. */
  missionFailed: boolean;
  /** Yesterday ended in the `broken` status. */
  yesterdayBroken: boolean;
  /** Spending vs the daily limit (BRL). Optional until finance (M6). */
  spend?: TargetProgress;
  /** Protein vs goal (g). Optional until nutrition (M4). */
  protein?: TargetProgress;
}

function ratio(t: TargetProgress | undefined): number | null {
  if (!t || t.goal <= 0) return null;
  return t.current / t.goal;
}

/** Whether any target is trending to fail (at_risk signals). */
export function hasAtRiskSignal(snap: DaySnapshot): boolean {
  const t = DAY_STATUS_THRESHOLDS;

  const spendRatio = ratio(snap.spend);
  if (spendRatio !== null && spendRatio >= t.spendAtRiskRatio) return true;

  const proteinRatio = ratio(snap.protein);
  if (
    proteinRatio !== null &&
    snap.localHour >= t.eveningHour &&
    proteinRatio < t.eveningProteinRatio
  ) {
    return true;
  }

  return false;
}

/** Compute the deterministic day status from a snapshot. */
export function computeDayStatus(snap: DaySnapshot): DayStatus {
  if (snap.checkinDone && snap.missionAccomplished) return 'completed';
  if (snap.missionFailed) return 'broken';
  if (snap.yesterdayBroken) return 'recovery';
  if (hasAtRiskSignal(snap)) return 'at_risk';
  return 'on_track';
}

/** UI metadata (pt-BR label + status token key) for a status. */
export const DAY_STATUS_META: Record<
  DayStatus,
  { label: string; token: string }
> = {
  on_track: { label: 'No caminho', token: 'status-ontrack' },
  at_risk: { label: 'Em risco', token: 'status-atrisk' },
  broken: { label: 'Quebrado', token: 'status-broken' },
  recovery: { label: 'Recuperação', token: 'status-recovery' },
  completed: { label: 'Concluído', token: 'status-completed' },
};

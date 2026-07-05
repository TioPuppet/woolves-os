/**
 * R3 — Timezone-correct "day" logic.
 *
 * All day boundaries (streaks, missions, day status, check-in) use the user's
 * local date, never raw UTC. These helpers derive the local calendar day for a
 * given IANA timezone and the UTC instant bounds of that local day.
 */

/** Local calendar date as YYYY-MM-DD for an IANA timezone (default: now). */
export function localDayString(timezone: string, at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(at);
}

/** Local wall-clock hour (0–23) in the given timezone (default: now). */
export function localHour(timezone: string, at: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  });
  // "24" can appear at midnight in some environments; normalize to 0.
  const h = Number(fmt.format(at));
  return h === 24 ? 0 : h;
}

/** The local day string shifted by `deltaDays` (e.g. -1 = yesterday). */
export function shiftLocalDay(dayString: string, deltaDays: number): string {
  const [y, m, d] = dayString.split('-').map(Number) as [number, number, number];
  // Use UTC math on a date-only value to avoid DST drift on the calendar date.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

/** True if two local-day strings are consecutive calendar days (a before b). */
export function isConsecutiveDay(earlier: string, later: string): boolean {
  return shiftLocalDay(earlier, 1) === later;
}

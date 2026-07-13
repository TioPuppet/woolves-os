import { describe, expect, it } from 'vitest';
import { formatFocusMinutes, formatFocusTime, sumFocusSeconds } from './focus';

describe('focus formatting and totals', () => {
  it('formats timer values with stable two-digit fields', () => {
    expect(formatFocusTime(0)).toBe('00:00');
    expect(formatFocusTime(154)).toBe('02:34');
  });

  it('formats focus minutes without fractional output', () => {
    expect(formatFocusMinutes(149)).toBe('2 min');
    expect(formatFocusMinutes(150)).toBe('3 min');
  });

  it('sums completed focus sessions', () => {
    expect(sumFocusSeconds([
      { focus_seconds: 1500 },
      { focus_seconds: 600 },
    ])).toBe(2100);
  });
});

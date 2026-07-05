import { describe, it, expect } from 'vitest';
import {
  computeDayStatus,
  hasAtRiskSignal,
  type DaySnapshot,
} from './day-status';

const base: DaySnapshot = {
  localHour: 10,
  checkinDone: false,
  missionAccomplished: false,
  missionFailed: false,
  yesterdayBroken: false,
};

describe('computeDayStatus', () => {
  it('on_track when nothing has failed', () => {
    expect(computeDayStatus(base)).toBe('on_track');
  });

  it('completed when check-in done and mission accomplished', () => {
    expect(
      computeDayStatus({
        ...base,
        checkinDone: true,
        missionAccomplished: true,
      }),
    ).toBe('completed');
  });

  it('broken when the main mission definitively failed', () => {
    expect(computeDayStatus({ ...base, missionFailed: true })).toBe('broken');
  });

  it('broken takes precedence over recovery', () => {
    expect(
      computeDayStatus({ ...base, missionFailed: true, yesterdayBroken: true }),
    ).toBe('broken');
  });

  it('recovery the day after a broken day', () => {
    expect(computeDayStatus({ ...base, yesterdayBroken: true })).toBe(
      'recovery',
    );
  });

  it('at_risk when spending is above 80% of the limit', () => {
    expect(
      computeDayStatus({ ...base, spend: { current: 45, goal: 50 } }),
    ).toBe('at_risk');
  });

  it('at_risk in the evening with protein below 60% of goal', () => {
    expect(
      computeDayStatus({
        ...base,
        localHour: 20,
        protein: { current: 50, goal: 120 },
      }),
    ).toBe('at_risk');
  });

  it('NOT at_risk for low protein earlier in the day', () => {
    expect(
      computeDayStatus({
        ...base,
        localHour: 12,
        protein: { current: 10, goal: 120 },
      }),
    ).toBe('on_track');
  });

  it('completed wins even if a target is at risk', () => {
    expect(
      computeDayStatus({
        ...base,
        checkinDone: true,
        missionAccomplished: true,
        spend: { current: 60, goal: 50 },
      }),
    ).toBe('completed');
  });
});

describe('hasAtRiskSignal', () => {
  it('ignores missing targets', () => {
    expect(hasAtRiskSignal(base)).toBe(false);
  });

  it('ignores zero-goal targets (no divide-by-zero)', () => {
    expect(hasAtRiskSignal({ ...base, spend: { current: 10, goal: 0 } })).toBe(
      false,
    );
  });
});

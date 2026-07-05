import { describe, it, expect } from 'vitest';
import { levelFromExp, expRequiredForLevel, streakBonus } from './exp-config';

describe('level curve', () => {
  it('a new user (0 EXP) is Level 1 with non-negative progress', () => {
    const l = levelFromExp(0);
    expect(l.level).toBe(1);
    expect(l.title).toBe('Cub');
    expect(l.intoLevel).toBe(0);
    expect(l.progress).toBe(0);
    expect(l.intoLevel).toBeGreaterThanOrEqual(0);
  });

  it('level 1 floor is 0, level 2 needs 100 cumulative', () => {
    expect(expRequiredForLevel(1)).toBe(0);
    expect(expRequiredForLevel(2)).toBe(100);
  });

  it('advances to level 2 at 100 EXP', () => {
    expect(levelFromExp(99).level).toBe(1);
    expect(levelFromExp(100).level).toBe(2);
  });

  it('caps at the max defined level', () => {
    expect(levelFromExp(10_000_000).level).toBe(8);
    expect(levelFromExp(10_000_000).progress).toBe(1);
  });
});

describe('streakBonus', () => {
  it('is +10/day capped at +50', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(3)).toBe(30);
    expect(streakBonus(5)).toBe(50);
    expect(streakBonus(9)).toBe(50);
  });
});

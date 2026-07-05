import { describe, it, expect } from 'vitest';
import { mifflinStJeorBmr, calculateGoals, ageFromBirthDate } from './goals';

describe('mifflinStJeorBmr', () => {
  it('male formula', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(
      mifflinStJeorBmr({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 }),
    ).toBe(1780);
  });

  it('female formula', () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 1320.25
    expect(
      mifflinStJeorBmr({ sex: 'female', weightKg: 60, heightCm: 165, ageYears: 30 }),
    ).toBeCloseTo(1320.25, 2);
  });
});

describe('calculateGoals', () => {
  it('applies activity factor, 1.8 g/kg protein and 35 ml/kg water', () => {
    const g = calculateGoals({
      sex: 'male',
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: 'moderate',
    });
    expect(g.bmr).toBe(1780);
    expect(g.kcal).toBe(Math.round(1780 * 1.55)); // 2759
    expect(g.proteinG).toBe(144);
    expect(g.waterMl).toBe(2800);
  });
});

describe('ageFromBirthDate', () => {
  it('computes whole years, respecting month/day', () => {
    const ref = new Date('2026-07-04');
    expect(ageFromBirthDate(new Date('1996-07-04'), ref)).toBe(30);
    expect(ageFromBirthDate(new Date('1996-07-05'), ref)).toBe(29);
  });
});

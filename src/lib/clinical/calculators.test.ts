import { describe, it, expect } from 'vitest';
import {
  cockcroftGault,
  renalStage,
  bsaMosteller,
  doseByWeight,
  infusionRate,
  ckdEpi2021,
  correctedCalcium,
  correctedSodium,
  anionGap,
  meanArterialPressure,
  qtc,
  bmi,
  idealBodyWeight,
  adjustedBodyWeight,
  maintenanceFluids,
} from './calculators';

describe('cockcroftGault', () => {
  it('homem 60a, 70kg, Cr 1.0 → ~78 mL/min', () => {
    expect(cockcroftGault({ ageYears: 60, weightKg: 70, serumCreatinineMgDl: 1, sex: 'M' })).toBe(78);
  });
  it('mulher aplica fator 0,85', () => {
    expect(cockcroftGault({ ageYears: 60, weightKg: 70, serumCreatinineMgDl: 1, sex: 'F' })).toBe(66);
  });
  it('entradas inválidas → null', () => {
    expect(cockcroftGault({ ageYears: 60, weightKg: 0, serumCreatinineMgDl: 1, sex: 'M' })).toBeNull();
    expect(cockcroftGault({ ageYears: 60, weightKg: 70, serumCreatinineMgDl: 0, sex: 'M' })).toBeNull();
  });
});

describe('renalStage', () => {
  it('classifica faixas', () => {
    expect(renalStage(95).code).toBe('G1');
    expect(renalStage(70).code).toBe('G2');
    expect(renalStage(50).code).toBe('G3a');
    expect(renalStage(35).code).toBe('G3b');
    expect(renalStage(20).code).toBe('G4');
    expect(renalStage(10).code).toBe('G5');
  });
});

describe('bsaMosteller', () => {
  it('170cm, 70kg → 1.82 m²', () => {
    expect(bsaMosteller({ heightCm: 170, weightKg: 70 })).toBe(1.82);
  });
  it('inválido → null', () => {
    expect(bsaMosteller({ heightCm: 0, weightKg: 70 })).toBeNull();
  });
});

describe('doseByWeight', () => {
  it('10 mg/kg × 8 kg = 80 mg', () => {
    expect(doseByWeight({ mgPerKg: 10, weightKg: 8 })).toEqual({ dose: 80, capped: false });
  });
  it('respeita a dose máxima', () => {
    expect(doseByWeight({ mgPerKg: 10, weightKg: 8, maxMg: 60 })).toEqual({ dose: 60, capped: true });
  });
});

describe('infusionRate', () => {
  it('1000 mL em 8h → 125 mL/h e 42 gtt/min (macro)', () => {
    expect(infusionRate({ volumeMl: 1000, hours: 8 })).toEqual({ mlPerHour: 125, dropsPerMin: 42 });
  });
  it('microgotas (60) dobra as gotas', () => {
    const r = infusionRate({ volumeMl: 1000, hours: 8, dropFactor: 60 });
    expect(r?.dropsPerMin).toBe(125);
  });
});

describe('ckdEpi2021', () => {
  it('60a, Cr 1.0, masc → ~86 mL/min/1,73m²', () => {
    const e = ckdEpi2021({ ageYears: 60, serumCreatinineMgDl: 1, sex: 'M' })!;
    expect(e).toBeGreaterThan(80);
    expect(e).toBeLessThan(92);
  });
  it('inválido → null', () => {
    expect(ckdEpi2021({ ageYears: 60, serumCreatinineMgDl: 0, sex: 'M' })).toBeNull();
  });
});

describe('correctedCalcium', () => {
  it('Ca 8.0, alb 2.0 → 9.6', () => {
    expect(correctedCalcium({ calciumMgDl: 8, albuminGDl: 2 })).toBe(9.6);
  });
});

describe('correctedSodium', () => {
  it('Na 130, glicose 600 → 138', () => {
    expect(correctedSodium({ sodium: 130, glucoseMgDl: 600 })).toBe(138);
  });
});

describe('anionGap', () => {
  it('140/100/24 → 16; corrigido (alb 2.0) → 21', () => {
    expect(anionGap({ sodium: 140, chloride: 100, bicarbonate: 24 })).toEqual({ gap: 16, corrected: null });
    expect(anionGap({ sodium: 140, chloride: 100, bicarbonate: 24, albuminGDl: 2 })).toEqual({ gap: 16, corrected: 21 });
  });
});

describe('meanArterialPressure', () => {
  it('120/80 → 93', () => {
    expect(meanArterialPressure({ systolic: 120, diastolic: 80 })).toBe(93);
  });
});

describe('qtc', () => {
  it('QT 400ms, FC 60 → Bazett e Fridericia 400', () => {
    expect(qtc({ qtMs: 400, heartRate: 60 })).toEqual({ bazett: 400, fridericia: 400 });
  });
});

describe('bmi', () => {
  it('70kg, 170cm → 24.2 Eutrofia', () => {
    const r = bmi({ weightKg: 70, heightCm: 170 })!;
    expect(r.value).toBe(24.2);
    expect(r.category.label).toBe('Eutrofia');
  });
});

describe('idealBodyWeight / adjustedBodyWeight', () => {
  it('170cm masc → IBW 65.9', () => {
    expect(idealBodyWeight({ heightCm: 170, sex: 'M' })).toBe(65.9);
  });
  it('90kg, 170cm masc → AdjBW ~75.5', () => {
    expect(adjustedBodyWeight({ weightKg: 90, heightCm: 170, sex: 'M' })).toBe(75.5);
  });
});

describe('maintenanceFluids', () => {
  it('25kg → 1600 mL/dia, 67 mL/h', () => {
    expect(maintenanceFluids({ weightKg: 25 })).toEqual({ mlPerDay: 1600, mlPerHour: 67 });
  });
});

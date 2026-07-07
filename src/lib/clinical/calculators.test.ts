import { describe, it, expect } from 'vitest';
import {
  cockcroftGault,
  renalStage,
  bsaMosteller,
  doseByWeight,
  infusionRate,
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

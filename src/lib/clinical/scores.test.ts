import { describe, it, expect } from 'vitest';
import { SCORES, scoreTotal } from './scores';

function score(key: string) {
  const s = SCORES.find((x) => x.key === key)!;
  return s;
}

describe('CHA₂DS₂-VASc', () => {
  const s = score('cha2ds2vasc');
  it('HTN + DM + feminino = 3 → alto risco', () => {
    const total = scoreTotal(s.items, new Set(['htn', 'dm', 'female']));
    expect(total).toBe(3);
    expect(s.interpret(total).tone).toBe('0 74% 56%');
  });
  it('0 → baixo', () => {
    expect(s.interpret(0).note).toContain('não indicada');
  });
});

describe('CURB-65', () => {
  const s = score('curb65');
  it('confusão + idade = 2 → internação', () => {
    const total = scoreTotal(s.items, new Set(['confusion', 'age65']));
    expect(total).toBe(2);
    expect(s.interpret(total).note).toContain('internação');
  });
});

describe('Wells (TVP)', () => {
  const s = score('wells_dvt');
  it('câncer + TVP prévia = 2 → provável', () => {
    const total = scoreTotal(s.items, new Set(['cancer', 'prevdvt']));
    expect(total).toBe(2);
    expect(s.interpret(total).note).toContain('provável');
  });
  it('diagnóstico alternativo subtrai 2', () => {
    const total = scoreTotal(s.items, new Set(['cancer', 'altdx']));
    expect(total).toBe(-1);
    expect(s.interpret(total).note).toContain('improvável');
  });
});

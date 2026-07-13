import { describe, expect, it } from 'vitest';
import { findBrazilianDrugAliases, isRelevantLiveDrugResult } from './live-search';

describe('clinical live search', () => {
  it('reconhece dipirona pela referência brasileira', () => {
    const results = findBrazilianDrugAliases('dipirona');
    expect(results).toHaveLength(1);
    expect(results[0]?.activeIngredient).toBe('Dipirona monoidratada');
    expect(results[0]?.source).toBe('ANVISA');
  });

  it('aceita a abreviação DIP apenas quando ela inicia um medicamento conhecido', () => {
    expect(findBrazilianDrugAliases('DIP').map((result) => result.name)).toEqual(['Dipirona']);
  });

  it('rejeita falso positivo no meio do nome do produto', () => {
    expect(
      isRelevantLiveDrugResult('DIP', {
        name: 'Skinny Dip SPF-50',
        activeIngredient: 'Zinc oxide',
      }),
    ).toBe(false);
  });

  it('mantém buscas internacionais relevantes', () => {
    expect(
      isRelevantLiveDrugResult('amox', {
        name: 'Amoxicillin',
        activeIngredient: 'Amoxicillin trihydrate',
      }),
    ).toBe(true);
  });
});

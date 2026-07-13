import { describe, expect, it } from 'vitest';
import { searchDrugs, type Drug } from './drugs';

const drug = (overrides: Partial<Drug>): Drug => ({
  id: 1,
  name: 'Amoxicilina',
  active_ingredient: 'amoxicilina tri-hidratada',
  brand: 'Amoxil',
  therapeutic_class: 'Antibacteriano',
  presentation: 'Suspensão oral 250 mg/5 mL',
  indications: null,
  posology: null,
  contraindications: null,
  adverse_reactions: null,
  interactions_notes: null,
  pregnancy_risk: null,
  lactation: null,
  mechanism: null,
  source: 'ANVISA — Bula do Profissional',
  source_url: null,
  anvisa_company: 'Empresa exemplo',
  anvisa_registration: '1.0000.0000.000-0',
  anvisa_published_at: null,
  anvisa_professional_url: null,
  anvisa_patient_url: null,
  updated_at: '2026-07-12T00:00:00.000Z',
  ...overrides,
});

describe('searchDrugs', () => {
  it('encontra por princípio ativo sem exigir acentos ou caixa', () => {
    const result = searchDrugs([drug({ id: 1 })], 'AMOXICILINA TRI HIDRATADA');
    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it('aceita múltiplos termos em campos diferentes', () => {
    const result = searchDrugs([drug({ id: 1 })], 'suspensão 250');
    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it('prioriza o nome que começa com o termo buscado', () => {
    const result = searchDrugs(
      [
        drug({ id: 1, name: 'Cloridrato de outro fármaco', active_ingredient: 'amoxicilina' }),
        drug({ id: 2, name: 'Amoxicilina' }),
      ],
      'amox',
    );
    expect(result.map((item) => item.id)).toEqual([2, 1]);
  });
});

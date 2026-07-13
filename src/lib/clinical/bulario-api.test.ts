import { describe, expect, it } from 'vitest';
import { mapBularioRecord } from './bulario-api';

describe('bulario-api adapter', () => {
  it('normaliza o retorno da API em uma ficha interna', () => {
    const result = mapBularioRecord({
      numProcesso: '25351.123456/2026-01',
      nomeProduto: 'Dipirona monoidratada',
      principioAtivo: 'Dipirona monoidratada',
      nomeEmpresa: 'Empresa brasileira',
      formaFarmaceutica: 'Comprimido',
      indicacoes: 'Analgésico e antitérmico.',
      posologia: 'Conforme bula profissional vigente.',
      idBulaProfissionalProtegido: 'hash-profissional',
    }, 0);

    expect(result?.name).toBe('Dipirona monoidratada');
    expect(result?.activeIngredient).toBe('Dipirona monoidratada');
    expect(result?.manufacturer).toBe('Empresa brasileira');
    expect(result?.details.indications).toBe('Analgésico e antitérmico.');
    expect(result?.source).toBe('ANVISA');
    expect(result?.sourceUrl).toContain('hash-profissional');
  });

  it('ignora itens sem identificação de medicamento', () => {
    expect(mapBularioRecord({ nomeEmpresa: 'Sem medicamento' }, 0)).toBeNull();
  });
});

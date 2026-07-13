import { describe, expect, it } from 'vitest';
import { parseAnvisaCsv, searchAnvisaRows } from './anvisa-open-data';

const csv = [
  'NOME_PRODUTO;PRINCIPIO_ATIVO;EMPRESA_DETENTORA;CATEGORIA_REGULATORIA;NUMERO_REGISTRO;SITUACAO',
  'DIPIRONA 500 MG;DIPIRONA MONOIDRATADA;Laboratório Brasil;Genérico;1.2345.6789.001-1;Válido',
  'NEO DIP;DIPIRONA MONOIDRATADA;Outro Laboratório;Similar;1.2345.6789.002-1;Válido',
  'SKINNY DIP SPF-50;ÓXIDO DE ZINCO;Cove Suncare;Cosmético;;Válido',
].join('\n');

describe('ANVISA open data adapter', () => {
  it('lê CSV delimitado por ponto e vírgula com campos acentuados', () => {
    const rows = parseAnvisaCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.PRINCIPIO_ATIVO).toBe('DIPIRONA MONOIDRATADA');
  });

  it('prioriza princípio ativo e não retorna falsos positivos comerciais', () => {
    const results = searchAnvisaRows(parseAnvisaCsv(csv), 'DIP', 8);
    expect(results.map((result) => result.name)).toEqual(['DIPIRONA 500 MG', 'NEO DIP']);
    expect(results.every((result) => result.source === 'ANVISA')).toBe(true);
    expect(results[0]?.regulatoryCategory).toBe('Genérico');
  });

  it('aceita busca completa por nome do produto', () => {
    const results = searchAnvisaRows(parseAnvisaCsv(csv), 'dipirona 500 mg');
    expect(results[0]?.registrationNumber).toBe('1.2345.6789.001-1');
  });
});

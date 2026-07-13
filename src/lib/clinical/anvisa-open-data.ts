import { CLINICAL_SOURCES } from '@/lib/clinical/sources';
import { normalizeLiveSearch, type LiveDrugResult } from '@/lib/clinical/live-search';

/**
 * Publica a base oficial de medicamentos registrados sem exigir uma lista
 * manual dentro do aplicativo. A ANVISA atualiza este arquivo no portal de
 * dados abertos; o cache do Next evita baixá-lo a cada caractere digitado.
 */
export const ANVISA_MEDICINES_DATASET_URL = 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv';
export const ANVISA_MEDICINES_QUERY_DATASET_URL = 'https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV';
export const ANVISA_MEDICINES_DATASET_UPDATED_AT = '2026-07-08';

type CsvRow = Record<string, string>;

type AnvisaMedicationRecord = {
  name: string;
  activeIngredient: string | null;
  manufacturer: string | null;
  manufacturerDocument: string | null;
  presentation: string | null;
  route: string | null;
  className: string | null;
  regulatoryCategory: string | null;
  registrationNumber: string | null;
  processNumber: string | null;
  registrationStatus: string | null;
  registrationDate: string | null;
  registrationExpiry: string | null;
};

function decodeCsv(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes).replace(/^\uFEFF/, '');
  }
}

/** Parser pequeno e tolerante para os CSVs públicos da ANVISA (aspas e ;). */
export function parseAnvisaCsv(text: string): CsvRow[] {
  const firstLine = text.slice(0, text.indexOf('\n') >= 0 ? text.indexOf('\n') : text.length);
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((header, index) => header || `COLUNA_${index + 1}`);
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function canonicalKey(value: string): string {
  return normalizeLiveSearch(value).replace(/[^a-z0-9]/g, '');
}

function getField(row: CsvRow, names: string[]): string | null {
  const entries = Object.entries(row);
  const wanted = names.map(canonicalKey);
  const found = entries.find(([key, value]) => wanted.includes(canonicalKey(key)) && value.trim());
  return found?.[1]?.trim() || null;
}

function getFieldByHint(row: CsvRow, hints: string[]): string | null {
  const entries = Object.entries(row);
  const normalizedHints = hints.map(canonicalKey);
  const found = entries.find(([key, value]) => {
    const normalized = canonicalKey(key);
    return value.trim() && normalizedHints.some((hint) => normalized.includes(hint));
  });
  return found?.[1]?.trim() || null;
}

function recordFromRow(row: CsvRow): AnvisaMedicationRecord | null {
  const name = getField(row, ['NOME_PRODUTO', 'NOME_MEDICAMENTO', 'NOME DO PRODUTO', 'PRODUTO'])
    ?? getFieldByHint(row, ['nomeproduto', 'nomemedicamento', 'produto']);
  if (!name) return null;

  return {
    name,
    activeIngredient: getField(row, ['PRINCIPIO_ATIVO', 'PRINCÍPIO_ATIVO', 'PRINCIPIO ATIVO', 'SUBSTANCIA', 'SUBSTÂNCIA'])
      ?? getFieldByHint(row, ['principioativo', 'substancia']),
    manufacturer: getField(row, ['EMPRESA_DETENTORA', 'EMPRESA DETENTORA', 'EMPRESA'])
      ?? getFieldByHint(row, ['empresadetentora', 'razaosocial', 'empresa']),
    manufacturerDocument: getField(row, ['CNPJ', 'CNPJ_EMPRESA', 'CNPJ EMPRESA'])
      ?? getFieldByHint(row, ['cnpj']),
    presentation: getField(row, ['APRESENTACAO', 'APRESENTAÇÃO', 'DESCRICAO_APRESENTACAO', 'DESCRIÇÃO_APRESENTAÇÃO'])
      ?? getFieldByHint(row, ['apresentacao', 'descricaodapresentacao']),
    route: getField(row, ['VIA_ADMINISTRACAO', 'VIA ADMINISTRAÇÃO', 'VIA DE ADMINISTRACAO'])
      ?? getFieldByHint(row, ['viaadministracao']),
    className: getField(row, ['CLASSE_TERAPEUTICA', 'CLASSE TERAPÊUTICA', 'CLASSE TERAPEUTICA'])
      ?? getFieldByHint(row, ['classeterapeutica']),
    regulatoryCategory: getField(row, ['CATEGORIA_REGULATORIA', 'CATEGORIA REGULATÓRIA', 'CATEGORIA'])
      ?? getFieldByHint(row, ['categoriaregulatoria']),
    registrationNumber: getField(row, ['NUMERO_REGISTRO', 'NÚMERO_REGISTRO', 'NUMERO REGISTRO', 'REGISTRO'])
      ?? getFieldByHint(row, ['numeroregistro']),
    processNumber: getField(row, ['NUMERO_PROCESSO', 'NÚMERO_PROCESSO', 'NUMERO PROCESSO', 'PROCESSO'])
      ?? getFieldByHint(row, ['numeroprocesso']),
    registrationStatus: getField(row, ['SITUACAO', 'SITUAÇÃO', 'SITUACAO_REGISTRO'])
      ?? getFieldByHint(row, ['situacao']),
    registrationDate: getField(row, ['DATA_REGISTRO', 'DATA REGISTRO'])
      ?? getFieldByHint(row, ['dataregistro']),
    registrationExpiry: getField(row, ['DATA_VENCIMENTO', 'DATA VENCIMENTO', 'DATA_VALIDADE'])
      ?? getFieldByHint(row, ['datavencimento', 'datavalidade']),
  };
}

function statusRank(status: string | null): number {
  const value = normalizeLiveSearch(status ?? '');
  if (value.includes('valido') || value.includes('ativo')) return 4;
  if (value.includes('caduc')) return 2;
  if (value.includes('cancel')) return 1;
  return 3;
}

function isMedicineRecord(record: AnvisaMedicationRecord): boolean {
  const category = normalizeLiveSearch(record.regulatoryCategory ?? '');
  return !['cosmetico', 'cosmeticos', 'alimento', 'suplemento', 'saneante'].some((term) => category.includes(term));
}

function mapRecord(record: AnvisaMedicationRecord, index: number): LiveDrugResult {
  const identifier = record.registrationNumber ?? record.processNumber ?? `${record.name}-${index}`;
  const category = record.regulatoryCategory;
  return {
    id: `anvisa-registro-${normalizeLiveSearch(identifier).replace(/\s+/g, '-')}`,
    name: record.name,
    activeIngredient: record.activeIngredient,
    manufacturer: record.manufacturer,
    manufacturerDocument: record.manufacturerDocument,
    presentation: record.presentation,
    route: record.route,
    className: record.className,
    regulatoryCategory: category,
    registrationNumber: record.registrationNumber,
    processNumber: record.processNumber,
    registrationStatus: record.registrationStatus,
    registrationDate: record.registrationDate,
    registrationExpiry: record.registrationExpiry,
    updatedAt: ANVISA_MEDICINES_DATASET_UPDATED_AT,
    source: 'ANVISA',
    sourceLabel: `ANVISA · Registro de medicamentos${category ? ` · ${category}` : ''}`,
    sourceUrl: CLINICAL_SOURCES.anvisaMedicamentos,
    details: {
      description: 'Registro sanitário brasileiro encontrado na base aberta oficial da ANVISA. A bula vigente deve ser consultada antes de qualquer conduta.',
      indications: null,
      dosage: null,
      contraindications: null,
      warnings: null,
      adverseReactions: null,
      interactions: null,
      pregnancy: null,
      lactation: null,
      mechanism: null,
      pharmacology: null,
      overdose: null,
      storage: null,
    },
  };
}

export function searchAnvisaRows(rows: CsvRow[], query: string, limit = 8): LiveDrugResult[] {
  const normalizedQuery = normalizeLiveSearch(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);
  if (terms.length === 0) return [];

  return rows
    .map(recordFromRow)
    .filter((record): record is AnvisaMedicationRecord => record !== null)
    .filter(isMedicineRecord)
    .map((record, index) => {
      const fields = [record.name, record.activeIngredient, record.manufacturer, record.className, record.regulatoryCategory]
        .filter((field): field is string => Boolean(field))
        .map(normalizeLiveSearch);
      const name = normalizeLiveSearch(record.name);
      const active = normalizeLiveSearch(record.activeIngredient ?? '');
      const matches = terms.every((term) => fields.some((field) => field.includes(term)));
      if (!matches) return null;

      const score = terms.reduce((total, term) => {
        if (active === term) return total + 80;
        if (active.startsWith(term)) return total + 55;
        if (name === term) return total + 52;
        if (name.startsWith(term)) return total + 42;
        if (name.includes(term)) return total + 24;
        return total + 8;
      }, statusRank(record.registrationStatus));
      return { record, index, score };
    })
    .filter((result): result is { record: AnvisaMedicationRecord; index: number; score: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ record, index }) => mapRecord(record, index))
    .filter((result, index, list) => list.findIndex((item) => item.name === result.name && item.registrationNumber === result.registrationNumber) === index)
    .slice(0, limit);
}

export async function fetchAnvisaCatalogResults(query: string): Promise<LiveDrugResult[]> {
  for (const datasetUrl of [ANVISA_MEDICINES_DATASET_URL, ANVISA_MEDICINES_QUERY_DATASET_URL]) {
    try {
      const response = await fetch(datasetUrl, {
        next: { revalidate: 86_400 },
        headers: { Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8' },
      });
      if (!response.ok) continue;
      const rows = parseAnvisaCsv(decodeCsv(await response.arrayBuffer()));
      const results = searchAnvisaRows(rows, query);
      if (results.length > 0) return results;
    } catch {
      // Tenta a consulta consolidada da ANVISA antes de usar outros provedores.
    }
  }
  return [];
}

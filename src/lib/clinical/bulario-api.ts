import { CLINICAL_SOURCES } from '@/lib/clinical/sources';
import type { LiveDrugDetails, LiveDrugResult } from '@/lib/clinical/live-search';

type JsonRecord = Record<string, unknown>;

const ANVISA_BULA_ENDPOINT = 'https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/parecer';

function text(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim() || null;
  if (Array.isArray(value)) {
    const values = value.map(text).filter((item): item is string => Boolean(item));
    return values.length > 0 ? values.join(' · ') : null;
  }
  return null;
}

function pick(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return null;
}

function extractItems(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object'));
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as JsonRecord;
  for (const key of ['content', 'results', 'data', 'medicamentos', 'listaResultados']) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object'));
  }
  return [];
}

function directBulaUrl(id: string): string {
  return `${ANVISA_BULA_ENDPOINT}/${encodeURIComponent(id)}/?Authorization=`;
}

export function mapBularioRecord(record: JsonRecord, index: number): LiveDrugResult | null {
  const name = pick(record, ['nomeProduto', 'nomeMedicamento', 'nomeComercial', 'medicamento', 'nome']);
  if (!name) return null;

  const processNumber = pick(record, ['numProcesso', 'numeroProcesso', 'processo']);
  const professionalBulaId = pick(record, ['idBulaProfissionalProtegido', 'idBulaProfissional', 'bulaProfissional']);
  const activeIngredient = pick(record, ['principioAtivo', 'principiosAtivos', 'substanciaAtiva', 'activeIngredient']);
  const className = pick(record, ['classeTerapeutica', 'categoriaRegulatoria', 'categoria']);

  const details: LiveDrugDetails = {
    description: pick(record, ['descricao', 'description']),
    indications: pick(record, ['indicacoes', 'indicação', 'indications']),
    dosage: pick(record, ['posologia', 'modoUso', 'comoUsar', 'dose']),
    contraindications: pick(record, ['contraindicacoes', 'contraindicações', 'contraindications']),
    warnings: pick(record, ['advertencias', 'advertências', 'precaucoes', 'precauções', 'warnings']),
    adverseReactions: pick(record, ['reacoesAdversas', 'reaçõesAdversas', 'efeitosAdversos', 'adverseReactions']),
    interactions: pick(record, ['interacoesMedicamentosas', 'interaçõesMedicamentosas', 'interacoes', 'interactions']),
    pregnancy: pick(record, ['gravidez', 'gestacao', 'gestação', 'pregnancy']),
    lactation: pick(record, ['lactacao', 'lactação', 'amamentacao', 'amamentação', 'lactation']),
    mechanism: pick(record, ['mecanismoAcao', 'mecanismoDeAcao', 'mecanismo de ação', 'mechanism']),
    pharmacology: pick(record, ['farmacologia', 'pharmacology']),
    overdose: pick(record, ['superdose', 'superdosagem', 'overdose']),
    storage: pick(record, ['armazenamento', 'conservacao', 'conservação', 'storage']),
  };

  return {
    id: `anvisa-${processNumber ?? index}`,
    name,
    activeIngredient,
    manufacturer: pick(record, ['nomeEmpresa', 'nomeEmpresaDetentora', 'empresa', 'razaoSocial']),
    manufacturerDocument: pick(record, ['cnpj', 'cnpjEmpresa', 'documentoEmpresa']),
    presentation: pick(record, ['apresentacoes', 'apresentação', 'apresentacao', 'formaFarmaceutica', 'concentracao', 'concentração']),
    route: pick(record, ['viaAdministracao', 'via de administração', 'via']),
    className,
    regulatoryCategory: pick(record, ['categoriaRegulatoria', 'categoria regulatória', 'categoria']),
    registrationNumber: pick(record, ['numeroRegistro', 'númeroRegistro', 'registro', 'numRegistro']),
    processNumber,
    registrationStatus: pick(record, ['situacaoRegistro', 'situaçãoRegistro', 'situacao', 'situação']),
    registrationDate: pick(record, ['dataRegistro', 'data de registro']),
    registrationExpiry: pick(record, ['dataVencimento', 'data de vencimento']),
    updatedAt: pick(record, ['dataPublicacao', 'dataPublicacaoBula', 'dataAtualizacao', 'dataAtualização']),
    source: 'ANVISA',
    sourceLabel: 'ANVISA · Bulário Eletrônico',
    sourceUrl: professionalBulaId ? directBulaUrl(professionalBulaId) : CLINICAL_SOURCES.anvisaBulario,
    details,
  };
}

export async function fetchBularioResults(query: string): Promise<LiveDrugResult[]> {
  const baseUrl = process.env.BULARIO_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) return [];

  const url = new URL(`${baseUrl}/pesquisar/v2`);
  url.searchParams.set('nome', query);
  url.searchParams.set('pagina', '1');
  url.searchParams.set('counte', '6');

  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) return [];
    const payload = (await response.json()) as unknown;
    return extractItems(payload)
      .map(mapBularioRecord)
      .filter((result): result is LiveDrugResult => result !== null)
      .slice(0, 6);
  } catch {
    return [];
  }
}

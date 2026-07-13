import { CLINICAL_SOURCES } from '@/lib/clinical/sources';

export type LiveDrugSource = 'ANVISA' | 'OpenFDA';

export type LiveDrugDetails = {
  description: string | null;
  indications: string | null;
  dosage: string | null;
  contraindications: string | null;
  warnings: string | null;
  adverseReactions: string | null;
  interactions: string | null;
  pregnancy: string | null;
  lactation: string | null;
  mechanism: string | null;
  pharmacology: string | null;
  overdose: string | null;
  storage: string | null;
};

export type LiveDrugResult = {
  id: string;
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
  updatedAt: string | null;
  source: LiveDrugSource;
  sourceLabel: string;
  sourceUrl: string;
  details: LiveDrugDetails;
};

type BrazilianDrugAlias = Omit<LiveDrugResult, 'id'> & {
  aliases: string[];
};

const BRAZILIAN_DRUG_ALIASES: BrazilianDrugAlias[] = [
  {
    aliases: ['dipirona', 'dipirona monoidratada', 'metamizol', 'metamizole'],
    name: 'Dipirona',
    activeIngredient: 'Dipirona monoidratada',
    manufacturer: null,
    manufacturerDocument: null,
    presentation: null,
    route: null,
    className: null,
    regulatoryCategory: null,
    registrationNumber: null,
    processNumber: null,
    registrationStatus: null,
    registrationDate: null,
    registrationExpiry: null,
    updatedAt: null,
    source: 'ANVISA',
    sourceLabel: 'ANVISA · Bulário Eletrônico',
    sourceUrl: CLINICAL_SOURCES.anvisaBulario,
    details: {
      description: 'Ficha de substância. A apresentação, concentração e o registro devem ser selecionados conforme o produto brasileiro consultado.',
      indications: 'Analgésico e antitérmico.',
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
  },
];

export function normalizeLiveSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBrazilianDrugAliases(query: string): LiveDrugResult[] {
  const normalizedQuery = normalizeLiveSearch(query);
  if (normalizedQuery.length < 3) return [];

  return BRAZILIAN_DRUG_ALIASES
    .filter((drug) =>
      drug.aliases.some((alias) => {
        const normalizedAlias = normalizeLiveSearch(alias);
        return normalizedAlias.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedAlias);
      }),
    )
    .map((drug) => ({
      ...drug,
      id: `anvisa-${normalizeLiveSearch(drug.name).replace(/\s+/g, '-')}`,
    }));
}

export function isRelevantLiveDrugResult(query: string, result: Pick<LiveDrugResult, 'name' | 'activeIngredient'>): boolean {
  const normalizedQuery = normalizeLiveSearch(query);
  const fields = [result.name, result.activeIngredient]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLiveSearch);
  if (!normalizedQuery || fields.length === 0) return false;

  if (normalizedQuery.length < 4) {
    return fields.some((field) => field.startsWith(normalizedQuery));
  }

  const terms = normalizedQuery.split(' ').filter(Boolean);
  return fields.some((field) => terms.every((term) => field.includes(term)));
}

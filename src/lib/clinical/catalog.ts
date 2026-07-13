import type { SupabaseClient } from '@supabase/supabase-js';
import { CLINICAL_SOURCES } from '@/lib/clinical/sources';
import type { LiveDrugResult } from '@/lib/clinical/live-search';

export type ClinicalCatalogRow = {
  id: number;
  commercial_name: string;
  dcb_name: string | null;
  active_ingredient: string | null;
  regulatory_category: string | null;
  company_name: string | null;
  company_document: string | null;
  therapeutic_class: string | null;
  pharmaceutical_form: string | null;
  presentation: string | null;
  administration_route: string | null;
  process_number: string | null;
  registration_number: string | null;
  registration_status: string | null;
  registration_date: string | null;
  registration_expiry: string | null;
  source_name: string;
  source_url: string;
  source_version: string | null;
  source_updated_at: string | null;
};

export function mapClinicalCatalogRow(row: ClinicalCatalogRow): LiveDrugResult {
  const identifier = row.registration_number ?? row.process_number ?? String(row.id);
  return {
    id: `catalog-${row.id}`,
    name: row.commercial_name,
    activeIngredient: row.dcb_name ?? row.active_ingredient,
    manufacturer: row.company_name,
    manufacturerDocument: row.company_document,
    presentation: row.presentation ?? row.pharmaceutical_form,
    route: row.administration_route,
    className: row.therapeutic_class,
    regulatoryCategory: row.regulatory_category,
    registrationNumber: row.registration_number,
    processNumber: row.process_number,
    registrationStatus: row.registration_status,
    registrationDate: row.registration_date,
    registrationExpiry: row.registration_expiry,
    updatedAt: row.source_updated_at ?? row.source_version,
    source: 'ANVISA',
    sourceLabel: `${row.source_name}${row.regulatory_category ? ` · ${row.regulatory_category}` : ''}`,
    sourceUrl: row.source_url || CLINICAL_SOURCES.anvisaMedicamentos,
    details: {
      description: `Registro brasileiro ${identifier}. Consulte a bula profissional vigente para as informações clínicas completas.`,
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

export async function fetchClinicalCatalogResults(
  client: SupabaseClient,
  query: string,
): Promise<LiveDrugResult[]> {
  try {
    const { data, error } = await client.rpc('search_clinical_drug_catalog', {
      query,
      max_results: 8,
    });
    if (error || !Array.isArray(data)) return [];
    return (data as ClinicalCatalogRow[]).map(mapClinicalCatalogRow);
  } catch {
    // The fallback source keeps the app usable while the catalog migration or
    // the first synchronization is still pending.
    return [];
  }
}

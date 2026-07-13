'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { searchDrugs, type Drug } from '@/lib/clinical/drugs';
import type { LiveDrugDetails, LiveDrugResult } from '@/lib/clinical/live-search';
import { CLINICAL_SOURCES } from '@/lib/clinical/sources';

type ClinicalTab = 'farmacos' | 'calc' | 'interacoes';

const ACTIONS: {
  key: ClinicalTab;
  label: string;
  note: string;
  icon: 'article' | 'target' | 'life_exp';
}[] = [
  { key: 'farmacos', label: 'Bulário pessoal', note: 'Monografias e fontes', icon: 'article' },
  { key: 'interacoes', label: 'Interações', note: 'Combinações e alertas', icon: 'target' },
  { key: 'calc', label: 'Calculadoras', note: 'Cálculos à beira-leito', icon: 'life_exp' },
];

const DETAIL_SECTIONS: { key: keyof LiveDrugDetails; label: string }[] = [
  { key: 'description', label: 'Descrição' },
  { key: 'indications', label: 'Indicações' },
  { key: 'dosage', label: 'Posologia e administração' },
  { key: 'contraindications', label: 'Contraindicações' },
  { key: 'warnings', label: 'Advertências e precauções' },
  { key: 'adverseReactions', label: 'Reações adversas' },
  { key: 'interactions', label: 'Interações medicamentosas' },
  { key: 'pregnancy', label: 'Gestação' },
  { key: 'lactation', label: 'Lactação' },
  { key: 'mechanism', label: 'Mecanismo de ação' },
  { key: 'pharmacology', label: 'Farmacologia' },
  { key: 'overdose', label: 'Superdose' },
  { key: 'storage', label: 'Armazenamento' },
];

function LiveDrugMonograph({ drug, onBack }: { drug: LiveDrugResult; onBack: () => void }) {
  const availableSections = DETAIL_SECTIONS.filter(({ key }) => Boolean(drug.details[key]));

  return (
    <section className="surface-1 mt-3 rounded-2xl p-4" aria-label={`Ficha de ${drug.name}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onBack} className="press inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar à busca
        </button>
        <span className="max-w-[10rem] text-right text-[10px] font-semibold leading-snug text-primary">{drug.sourceLabel}</span>
      </div>

      <div className="mt-4 border-b border-border pb-4">
        <h3 className="text-xl font-semibold leading-tight">{drug.name}</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {drug.activeIngredient && <span className="rounded-lg border border-border px-2.5 py-1">{drug.activeIngredient}</span>}
          {drug.regulatoryCategory && <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">{drug.regulatoryCategory}</span>}
          {drug.className && <span className="rounded-lg border border-border px-2.5 py-1">{drug.className}</span>}
          {drug.presentation && <span className="rounded-lg border border-border px-2.5 py-1">{drug.presentation}</span>}
          {drug.route && <span className="rounded-lg border border-border px-2.5 py-1">{drug.route}</span>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ['Fabricante', drug.manufacturer],
          ['Registro ANVISA', drug.registrationNumber],
          ['Processo', drug.processNumber],
          ['Situação', drug.registrationStatus],
          ['Registro em', drug.registrationDate],
          ['Vencimento', drug.registrationExpiry],
          ['Atualização da fonte', drug.updatedAt],
        ].map(([label, value]) => value && (
          <div key={label} className="rounded-xl border border-border bg-card/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {availableSections.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {availableSections.map(({ key, label }) => (
            <details key={key} open={key === 'indications' || key === 'contraindications'} className="rounded-xl border border-border bg-card/30">
              <summary className="press cursor-pointer list-none px-3 py-3 text-sm font-semibold">{label}</summary>
              <p className="whitespace-pre-wrap border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">{drug.details[key]}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">Esta fonte não retornou conteúdo clínico estruturado para esta apresentação.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <a href={drug.sourceUrl} target="_blank" rel="noreferrer" className="press inline-flex min-h-9 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary">Documento da fonte</a>
        {drug.source === 'ANVISA' && <a href={CLINICAL_SOURCES.anvisaBulario} target="_blank" rel="noreferrer" className="press inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground">Bula profissional ANVISA</a>}
        <span className="self-center text-[11px] leading-relaxed text-muted-foreground">Confira a bula vigente antes de qualquer conduta.</span>
      </div>
    </section>
  );
}

export function ClinicalCockpit({
  drugs,
  query,
  onQueryChange,
  onOpenTab,
  onOpenDrug,
}: {
  drugs: Drug[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpenTab: (tab: ClinicalTab) => void;
  onOpenDrug: (id: number) => void;
}) {
  const matches = useMemo(
    () => (query.trim() ? searchDrugs(drugs, query).slice(0, 6) : []),
    [drugs, query],
  );
  const [liveResults, setLiveResults] = useState<LiveDrugResult[]>([]);
  const [selectedLiveDrug, setSelectedLiveDrug] = useState<LiveDrugResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setLiveResults([]);
      setLiveLoading(false);
      setLiveError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLiveLoading(true);
      setLiveError(null);
      try {
        const response = await fetch(`/api/clinical/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const payload = (await response.json()) as { results?: LiveDrugResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Fonte online indisponível.');
        setLiveResults(payload.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLiveResults([]);
        setLiveError(error instanceof Error ? error.message : 'Não foi possível consultar a fonte online.');
      } finally {
        if (!controller.signal.aborted) setLiveLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    setSelectedLiveDrug(null);
  }, [query]);

  const externalQuery = encodeURIComponent(query.trim());
  const drugsSearchUrl = `https://www.drugs.com/search.php?searchterm=${externalQuery}`;

  return (
    <div className="flex flex-col gap-4">
      <section className="clinical-command anim-rise rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cockpit clínico</p>
            <h2 className="mt-2 text-[1.7rem] font-semibold leading-tight sm:text-3xl">Decida com precisão.</h2>
            <p className="mt-2 max-w-[36rem] text-sm leading-relaxed text-muted-foreground">Uma busca para chegar à fonte certa antes da próxima conduta.</p>
          </div>
          <div className="clinical-command-mark hidden shrink-0 items-center justify-center rounded-2xl sm:flex">
            <ThiingsAsset assetKey="saude" size={54} />
          </div>
        </div>

        <label className="mt-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Busca clínica</span>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted-foreground">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Nome genérico, comercial ou classe"
              className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => onQueryChange('')} aria-label="Limpar busca" className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground">
                <span aria-hidden>×</span>
              </button>
            )}
          </div>
        </label>

        {matches.length > 0 && (
          <div className="mt-3 flex flex-col gap-2" aria-label="Resultados de medicamentos">
            {matches.map((drug) => (
              <button key={drug.id} type="button" onClick={() => onOpenDrug(drug.id)} className="press surface-1 flex items-center gap-3 rounded-2xl p-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                  <ThiingsAsset assetKey="article" size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{drug.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[drug.active_ingredient, drug.brand, drug.therapeutic_class].filter(Boolean).join(' · ') || 'Abrir ficha pessoal'}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">Abrir</span>
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 3 && (
          <section className="surface-1 mt-3 rounded-2xl p-3" aria-live="polite" aria-label="Resultados online">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Catálogo oficial consultado automaticamente</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">ANVISA priorizada para nomes comerciais, DCB/princípios ativos, genéricos, similares e registros brasileiros.</p>
              </div>
              {liveLoading && <span className="shrink-0 text-xs font-semibold text-primary">Consultando…</span>}
            </div>
            {liveError && <p className="mt-3 text-xs text-status-broken">{liveError}</p>}
            {!liveLoading && !liveError && liveResults.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Nenhum medicamento correspondente foi encontrado. Confira o nome genérico ou comercial.</p>}
            {selectedLiveDrug ? (
              <LiveDrugMonograph drug={selectedLiveDrug} onBack={() => setSelectedLiveDrug(null)} />
            ) : liveResults.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {liveResults.map((result) => (
                  <button key={result.id} type="button" onClick={() => setSelectedLiveDrug(result)} className="press surface-2 flex min-w-0 items-start gap-3 rounded-xl p-3 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-status-ontrack/10 text-status-ontrack">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 3v18M7 7h7a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold">{result.name}</span>
                      <span className="mt-1 block break-words text-xs leading-relaxed text-muted-foreground">
                        {[result.activeIngredient, result.regulatoryCategory, result.manufacturer, result.presentation, result.route].filter(Boolean).join(' · ') || 'Abrir registro da fonte'}
                      </span>
                    </span>
                    <span className="max-w-[7rem] shrink-0 text-right text-[10px] font-semibold leading-snug text-primary">{result.sourceLabel}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              <a href={CLINICAL_SOURCES.anvisaBulario} target="_blank" rel="noreferrer" className="press inline-flex min-h-9 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary">Buscar na ANVISA</a>
              <a href={drugsSearchUrl} target="_blank" rel="noreferrer" className="press inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground">Buscar no Drugs.com</a>
            </div>
          </section>
        )}

        {query.trim() && matches.length === 0 && query.trim().length < 3 && <p className="mt-3 text-xs text-muted-foreground">Digite pelo menos 3 caracteres para consultar a fonte online.</p>}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((action) => (
          <button key={action.key} type="button" onClick={() => onOpenTab(action.key)} className="press surface-2 flex min-h-24 min-w-0 items-center gap-3 overflow-hidden rounded-2xl p-4 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card">
              <ThiingsAsset assetKey={action.icon} size={28} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[13px] font-semibold sm:text-sm">{action.label}</span>
              <span className="mt-1 block break-words text-[11px] leading-snug text-muted-foreground">{action.note}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="clinical-source-panel anim-rise rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-ontrack/10">
            <ThiingsAsset assetKey="saude" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fonte prioritária</p>
            <h3 className="mt-1 text-sm font-semibold">Catálogo regulatório ANVISA</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Nomes comerciais, princípios ativos, genéricos, similares, empresas e registros brasileiros em uma busca automática.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={CLINICAL_SOURCES.anvisaBulario} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">Abrir Bulário ANVISA</a>
          <a href={CLINICAL_SOURCES.anvisaMedicamentos} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">Registros ANVISA</a>
          <a href={CLINICAL_SOURCES.anvisaDcb} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">Lista DCB vigente</a>
          <a href={CLINICAL_SOURCES.anvisaBularioGuide} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">Página oficial ANVISA</a>
          <a href={CLINICAL_SOURCES.drugsInteractionChecker} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">Consulta Drugs.com</a>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { searchDrugs, type Drug, type DrugDraft } from '@/lib/clinical/drugs';
import { ANVISA_SOURCE_LABEL, CLINICAL_SOURCES } from '@/lib/clinical/sources';

const FAVORITES_STORAGE_PREFIX = 'woolves:clinical:drug-favorites:';
const RECENTS_STORAGE_PREFIX = 'woolves:clinical:drug-recents:';

const FIELDS: { key: keyof DrugDraft; label: string; area?: boolean }[] = [
  { key: 'active_ingredient', label: 'Princípio ativo (DCB)' },
  { key: 'brand', label: 'Nome de referência / comercial' },
  { key: 'therapeutic_class', label: 'Classe terapêutica' },
  { key: 'presentation', label: 'Apresentações' },
  { key: 'indications', label: 'Indicações', area: true },
  { key: 'posology', label: 'Posologia', area: true },
  { key: 'contraindications', label: 'Contraindicações', area: true },
  { key: 'adverse_reactions', label: 'Reações adversas', area: true },
  { key: 'interactions_notes', label: 'Interações (notas)', area: true },
  { key: 'pregnancy_risk', label: 'Risco na gravidez (A/B/C/D/X)' },
  { key: 'lactation', label: 'Lactação' },
  { key: 'mechanism', label: 'Mecanismo de ação', area: true },
  { key: 'source', label: 'Fonte' },
  { key: 'source_url', label: 'Link da fonte' },
  { key: 'anvisa_company', label: 'Empresa detentora do registro' },
  { key: 'anvisa_registration', label: 'Registro ANVISA' },
  { key: 'anvisa_published_at', label: 'Data da bula ANVISA' },
  { key: 'anvisa_professional_url', label: 'URL da bula profissional ANVISA' },
  { key: 'anvisa_patient_url', label: 'URL da bula do paciente ANVISA' },
];

function emptyForm(drug?: Drug): Record<string, string> {
  const base: Record<string, string> = { name: drug?.name ?? '' };
  for (const f of FIELDS) base[f.key] = (drug?.[f.key] as string | null) ?? '';
  return base;
}

function DrugForm({
  drug,
  onCancel,
  onSave,
}: {
  drug?: Drug;
  onCancel: () => void;
  onSave: (draft: DrugDraft) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(drug));
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!form.name?.trim()) return;
    const draft: DrugDraft = {
      name: form.name.trim(),
      active_ingredient: form.active_ingredient?.trim() || null,
      brand: form.brand?.trim() || null,
      therapeutic_class: form.therapeutic_class?.trim() || null,
      presentation: form.presentation?.trim() || null,
      indications: form.indications?.trim() || null,
      posology: form.posology?.trim() || null,
      contraindications: form.contraindications?.trim() || null,
      adverse_reactions: form.adverse_reactions?.trim() || null,
      interactions_notes: form.interactions_notes?.trim() || null,
      pregnancy_risk: form.pregnancy_risk?.trim() || null,
      lactation: form.lactation?.trim() || null,
      mechanism: form.mechanism?.trim() || null,
      source: form.source?.trim() || 'ANVISA — Bula do Profissional',
      source_url: form.source_url?.trim() || null,
      anvisa_company: form.anvisa_company?.trim() || null,
      anvisa_registration: form.anvisa_registration?.trim() || null,
      anvisa_published_at: form.anvisa_published_at?.trim() || null,
      anvisa_professional_url: form.anvisa_professional_url?.trim() || null,
      anvisa_patient_url: form.anvisa_patient_url?.trim() || null,
    };
    onSave(draft);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onCancel} className="press text-sm font-medium text-primary">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!form.name?.trim()}
          className="press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Salvar
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Fármaco (DCB / genérico) *</span>
        <input
          value={form.name ?? ''}
          onChange={(e) => set('name', e.target.value)}
          className="min-h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </label>

      {FIELDS.map((f) => {
        const section = f.key === 'active_ingredient'
          ? 'Identificação'
          : f.key === 'indications'
            ? 'Conteúdo clínico'
            : f.key === 'pregnancy_risk'
              ? 'Segurança'
              : f.key === 'source'
                ? 'Rastreabilidade'
                : null;

        return (
          <div key={f.key} className="flex flex-col gap-1">
            {section && <p className="mb-1 mt-3 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section}</p>}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
              {f.area ? (
                <textarea
                  value={form[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={3}
                  className="resize-none rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="min-h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
}

function Monograph({
  drug,
  onBack,
  onEdit,
  onDelete,
  isFavorite,
  onToggleFavorite,
}: {
  drug: Drug;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="press flex items-center gap-1 text-sm font-medium text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Fármacos
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground transition-colors aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden>
              <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">{isFavorite ? 'Favorito' : 'Favoritar'}</span>
          </button>
          <button type="button" onClick={onEdit} className="press text-sm font-medium text-primary">
            Editar
          </button>
          <button type="button" onClick={onDelete} className="press text-sm font-medium text-status-broken">
            Excluir
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">{drug.name}</h2>
        {drug.brand && <p className="text-sm text-muted-foreground">{drug.brand}</p>}
        {drug.therapeutic_class && (
          <span className="mt-1 inline-block rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {drug.therapeutic_class}
          </span>
        )}
      </div>

      {FIELDS.filter((f) => !['active_ingredient', 'brand', 'therapeutic_class', 'source', 'source_url', 'anvisa_company', 'anvisa_registration', 'anvisa_published_at', 'anvisa_professional_url', 'anvisa_patient_url'].includes(f.key)).map((f) => {
        const val = drug[f.key] as string | null;
        if (!val) return null;
        return (
          <div key={f.key}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{val}</p>
          </div>
        );
      })}

      <section className="clinical-source-panel border-t border-border pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rastreabilidade</p>
            <p className="mt-1 text-sm font-semibold">{drug.source ?? ANVISA_SOURCE_LABEL}</p>
          </div>
          {drug.anvisa_registration && (
            <span className="shrink-0 rounded-full border border-status-ontrack/30 bg-status-ontrack/10 px-2.5 py-1 text-[10px] font-semibold text-status-ontrack">
              Registro ANVISA
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
          {drug.active_ingredient && <p>DCB: <span className="text-foreground">{drug.active_ingredient}</span></p>}
          {drug.anvisa_company && <p>Empresa: <span className="text-foreground">{drug.anvisa_company}</span></p>}
          {drug.anvisa_registration && <p>Registro: <span className="text-foreground">{drug.anvisa_registration}</span></p>}
          {drug.anvisa_published_at && <p>Publicação da bula: <span className="text-foreground">{drug.anvisa_published_at}</span></p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={drug.anvisa_professional_url ?? drug.source_url ?? CLINICAL_SOURCES.anvisaBulario}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex min-h-10 items-center rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary"
          >
            Bula profissional
          </a>
          <a href={CLINICAL_SOURCES.anvisaBularioGuide} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
            Página oficial ANVISA
          </a>
          {drug.anvisa_patient_url && (
            <a href={drug.anvisa_patient_url} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
              Bula do paciente
            </a>
          )}
          {drug.source_url && !drug.anvisa_professional_url && (
            <a href={drug.source_url} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
              Fonte original
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

export function DrugsTab({
  userId,
  drugs,
  onCreate,
  onUpdate,
  onDelete,
  focusDrugId,
}: {
  userId: string;
  drugs: Drug[];
  onCreate: (d: DrugDraft) => void;
  onUpdate: (id: number, patch: Partial<DrugDraft>) => void;
  onDelete: (id: number) => void;
  focusDrugId?: number | null;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Drug | null>(null);
  const [formFor, setFormFor] = useState<Drug | 'new' | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [recentsReady, setRecentsReady] = useState(false);

  const favoritesStorageKey = `${FAVORITES_STORAGE_PREFIX}${userId}`;
  const recentsStorageKey = `${RECENTS_STORAGE_PREFIX}${userId}`;

  useEffect(() => {
    setFavoritesReady(false);
    try {
      const stored = window.localStorage.getItem(favoritesStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setFavoriteIds(Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : []);
    } catch {
      setFavoriteIds([]);
    } finally {
      setFavoritesReady(true);
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    setRecentsReady(false);
    try {
      const stored = window.localStorage.getItem(recentsStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setRecentIds(Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)).slice(0, 5) : []);
    } catch {
      setRecentIds([]);
    } finally {
      setRecentsReady(true);
    }
  }, [recentsStorageKey]);

  useEffect(() => {
    if (!favoritesReady) return;
    try {
      window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds));
    } catch {
      // Favoritos continuam disponíveis durante a sessão quando o armazenamento está bloqueado.
    }
  }, [favoriteIds, favoritesReady, favoritesStorageKey]);

  useEffect(() => {
    if (!recentsReady) return;
    try {
      window.localStorage.setItem(recentsStorageKey, JSON.stringify(recentIds));
    } catch {
      // O histórico continua disponível durante a sessão quando o armazenamento está bloqueado.
    }
  }, [recentIds, recentsReady, recentsStorageKey]);

  const searched = useMemo(() => searchDrugs(drugs, query), [drugs, query]);
  const filtered = useMemo(
    () => (favoriteOnly ? searched.filter((drug) => favoriteIds.includes(drug.id)) : searched),
    [favoriteIds, favoriteOnly, searched],
  );
  const current = selected ? drugs.find((d) => d.id === selected.id) ?? null : null;
  const recentDrugs = useMemo(
    () => recentIds.map((id) => drugs.find((drug) => drug.id === id)).filter((drug): drug is Drug => Boolean(drug)),
    [drugs, recentIds],
  );

  const toggleFavorite = (id: number) => {
    setFavoriteIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((favoriteId) => favoriteId !== id) : [...currentIds, id],
    );
  };

  const openDrug = (drug: Drug) => {
    setSelected(drug);
    setRecentIds((currentIds) => [drug.id, ...currentIds.filter((id) => id !== drug.id)].slice(0, 5));
  };

  useEffect(() => {
    if (focusDrugId == null) return;
    const target = drugs.find((drug) => drug.id === focusDrugId);
    if (target) setSelected(target);
  }, [drugs, focusDrugId]);

  if (formFor) {
    const editing = formFor === 'new' ? undefined : formFor;
    return (
      <DrugForm
        drug={editing}
        onCancel={() => setFormFor(null)}
        onSave={(draft) => {
          if (editing) onUpdate(editing.id, draft);
          else onCreate(draft);
          setFormFor(null);
        }}
      />
    );
  }

  if (current) {
    return (
      <Monograph
        drug={current}
        onBack={() => setSelected(null)}
        onEdit={() => setFormFor(current)}
        isFavorite={favoriteIds.includes(current.id)}
        onToggleFavorite={() => toggleFavorite(current.id)}
        onDelete={() => {
          onDelete(current.id);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Referência rápida</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Fármacos</h2>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {drugs.length} {drugs.length === 1 ? 'cadastrado' : 'cadastrados'}
        </span>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, princípio ativo, classe ou apresentação"
          aria-label="Buscar fármacos"
          className="min-h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFavoriteOnly(false)}
          aria-pressed={!favoriteOnly}
          className="press min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFavoriteOnly(true)}
          aria-pressed={favoriteOnly}
          className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-muted-foreground transition-colors aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteOnly ? 'currentColor' : 'none'} aria-hidden>
            <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Favoritos{favoriteIds.length > 0 ? ` · ${favoriteIds.length}` : ''}
        </button>
        <span className="text-xs text-muted-foreground">Busca sem acentos e por múltiplos termos.</span>
        <button
          type="button"
          onClick={() => setFormFor('new')}
          aria-label="Adicionar fármaco"
          className="press ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!query && !favoriteOnly && recentDrugs.length > 0 && (
        <section aria-label="Fármacos consultados recentemente" className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recentes</p>
          <div className="flex flex-wrap gap-2">
            {recentDrugs.map((drug) => (
              <button key={drug.id} type="button" onClick={() => openDrug(drug)} className="press max-w-full truncate rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/35 hover:text-primary">
                {drug.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {drugs.length === 0 ? (
        <div className="surface-2 rounded-2xl p-5 text-center">
          <p className="text-sm font-medium">Nenhum fármaco cadastrado.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre suas monografias a partir da bula do profissional (ANVISA). Você é a fonte.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-2 rounded-2xl p-5 text-center">
          <p className="text-sm font-medium">{favoriteOnly ? 'Nenhum favorito nesta visão.' : 'Nada encontrado.'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {favoriteOnly ? 'Marque uma monografia para encontrá-la aqui.' : `Revise os termos da busca${query ? ` por “${query}”` : ''}.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => (
            <div key={d.id} className="surface-2 flex items-center gap-2 rounded-2xl p-3">
              <button type="button" onClick={() => openDrug(d)} className="press min-w-0 flex-1 rounded-xl p-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">{d.name}</span>
                  {(d.anvisa_registration || d.anvisa_professional_url || d.source?.toLowerCase().includes('anvisa')) && (
                    <span className="rounded-full border border-status-ontrack/30 bg-status-ontrack/10 px-2 py-0.5 text-[10px] font-semibold text-status-ontrack">ANVISA</span>
                  )}
                </div>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {[d.active_ingredient, d.brand, d.therapeutic_class].filter(Boolean).join(' · ') || 'Sem detalhes'}
                </span>
                {d.presentation && <span className="mt-1 block truncate text-[11px] text-muted-foreground/80">{d.presentation}</span>}
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(d.id)}
                aria-label={favoriteIds.includes(d.id) ? `Remover ${d.name} dos favoritos` : `Favoritar ${d.name}`}
                aria-pressed={favoriteIds.includes(d.id)}
                className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors aria-pressed:bg-primary/10 aria-pressed:text-primary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={favoriteIds.includes(d.id) ? 'currentColor' : 'none'} aria-hidden>
                  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

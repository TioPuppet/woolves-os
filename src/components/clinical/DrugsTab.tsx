'use client';

import { useMemo, useState } from 'react';
import { searchDrugs, type Drug, type DrugDraft } from '@/lib/clinical/drugs';

const FIELDS: { key: keyof DrugDraft; label: string; area?: boolean }[] = [
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

      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
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
      ))}
    </div>
  );
}

function Monograph({
  drug,
  onBack,
  onEdit,
  onDelete,
}: {
  drug: Drug;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
        <div className="flex gap-3">
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

      {FIELDS.filter((f) => !['brand', 'therapeutic_class', 'source', 'source_url'].includes(f.key)).map((f) => {
        const val = drug[f.key] as string | null;
        if (!val) return null;
        return (
          <div key={f.key}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{val}</p>
          </div>
        );
      })}

      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Fonte: {drug.source ?? '—'}
          {drug.source_url && (
            <>
              {' · '}
              <a href={drug.source_url} target="_blank" rel="noreferrer" className="text-primary underline">
                abrir
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function DrugsTab({
  drugs,
  onCreate,
  onUpdate,
  onDelete,
}: {
  drugs: Drug[];
  onCreate: (d: DrugDraft) => void;
  onUpdate: (id: number, patch: Partial<DrugDraft>) => void;
  onDelete: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Drug | null>(null);
  const [formFor, setFormFor] = useState<Drug | 'new' | null>(null);

  const filtered = useMemo(() => searchDrugs(drugs, query), [drugs, query]);
  const current = selected ? drugs.find((d) => d.id === selected.id) ?? null : null;

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
        onDelete={() => {
          onDelete(current.id);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar fármaco…"
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => setFormFor('new')}
          aria-label="Adicionar fármaco"
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {drugs.length === 0 ? (
        <div className="surface-2 rounded-2xl p-5 text-center">
          <p className="text-sm font-medium">Nenhum fármaco cadastrado.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre suas monografias a partir da bula do profissional (ANVISA). Você é a fonte.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada encontrado para “{query}”.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelected(d)}
              className="press surface-2 flex flex-col gap-0.5 rounded-2xl p-4 text-left"
            >
              <span className="text-sm font-semibold">{d.name}</span>
              <span className="text-xs text-muted-foreground">
                {[d.brand, d.therapeutic_class].filter(Boolean).join(' · ') || 'Sem detalhes'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

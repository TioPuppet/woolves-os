'use client';

import { useMemo, useState } from 'react';
import { SEVERITY_META } from '@/lib/clinical/calculators';
import {
  checkInteractions,
  type Drug,
  type DrugInteraction,
  type InteractionDraft,
  type Severity,
} from '@/lib/clinical/drugs';
import { CLINICAL_SOURCES } from '@/lib/clinical/sources';

const SEVERITIES: Severity[] = ['contraindicada', 'grave', 'moderada', 'leve'];

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ color: `hsl(${m.tone})`, backgroundColor: `hsl(${m.tone} / 0.15)` }}
    >
      {m.label}
    </span>
  );
}

function InteractionRow({ it, onDelete }: { it: DrugInteraction; onDelete?: () => void }) {
  return (
    <div className="surface-1 flex flex-col gap-1.5 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {it.drug_a} <span className="text-muted-foreground">×</span> {it.drug_b}
        </span>
        <SeverityBadge severity={it.severity} />
        {onDelete && (
          <button type="button" onClick={onDelete} aria-label="Excluir" className="press shrink-0 text-muted-foreground hover:text-status-broken">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {it.effect && <p className="text-xs text-muted-foreground">{it.effect}</p>}
      {it.management && (
        <p className="text-xs">
          <span className="font-medium text-muted-foreground">Conduta: </span>
          {it.management}
        </p>
      )}
      {it.source && (
        <p className="text-[11px] text-muted-foreground">
          Fonte: {it.source}
          {it.source_url && (
            <>
              {' · '}
              <a href={it.source_url} target="_blank" rel="noreferrer" className="text-primary underline">abrir</a>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function InteractionsTab({
  drugs,
  interactions,
  onCreate,
  onDelete,
}: {
  drugs: Drug[];
  interactions: DrugInteraction[];
  onCreate: (d: InteractionDraft) => void;
  onDelete: (id: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [entry, setEntry] = useState('');
  const [showForm, setShowForm] = useState(false);

  const results = useMemo(
    () => checkInteractions(interactions, selected),
    [interactions, selected],
  );

  const addChip = (name: string) => {
    const v = name.trim();
    if (selected.length >= 10) return;
    if (v && !selected.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSelected((s) => [...s, v]);
    }
    setEntry('');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Verificador */}
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Verificar interações</h3>
            <p className="mt-1 text-xs text-muted-foreground">Base local de curadoria. A consulta ampliada fica no Drugs.com.</p>
          </div>
          <a href={CLINICAL_SOURCES.drugsInteractionChecker} target="_blank" rel="noreferrer" className="press shrink-0 text-xs font-semibold text-primary">Abrir fonte</a>
        </div>
        <div className="flex gap-2">
          <input
            list="drug-names"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addChip(entry)}
            placeholder="Adicionar fármaco…"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <datalist id="drug-names">
            {drugs.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => addChip(entry)}
            disabled={!entry.trim()}
            className="press rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span key={s} className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs">
                {s}
                <button type="button" onClick={() => setSelected((arr) => arr.filter((x) => x !== s))} aria-label="Remover">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">{selected.length}/10 medicamentos selecionados</p>

        {selected.length >= 2 && (
          results.length > 0 ? (
            <div className="flex flex-col gap-2">
              {results.map((it) => (
                <InteractionRow key={it.id} it={it} />
              ))}
            </div>
          ) : (
            <div className="surface-2 rounded-xl p-3 text-xs text-muted-foreground">
              Nenhuma interação na sua base para esses fármacos. Isso <strong>não</strong> garante ausência de
              interação — a base é de curadoria e não exaustiva.
            </div>
          )
        )}
      </section>

      {/* Autoria */}
      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Minha base de interações</h3>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="press text-sm font-medium text-primary">
            {showForm ? 'Fechar' : '+ Adicionar'}
          </button>
        </div>

        {showForm && (
          <InteractionForm
            onCancel={() => setShowForm(false)}
            onSave={(draft) => {
              onCreate(draft);
              setShowForm(false);
            }}
          />
        )}

        {interactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum par cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {interactions.map((it) => (
              <InteractionRow key={it.id} it={it} onDelete={() => onDelete(it.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InteractionForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (d: InteractionDraft) => void;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [severity, setSeverity] = useState<Severity>('moderada');
  const [effect, setEffect] = useState('');
  const [management, setManagement] = useState('');
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('');

  const submit = () => {
    if (!a.trim() || !b.trim()) return;
    onSave({
      drug_a: a.trim(),
      drug_b: b.trim(),
      severity,
      effect: effect.trim() || null,
      management: management.trim() || null,
      source: source.trim() || null,
      source_url: url.trim() || null,
    });
  };

  const input = 'min-h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-2">
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Fármaco A" className={input} />
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Fármaco B" className={input} />
      </div>
      <div className="flex flex-wrap gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className="press rounded-md px-3 py-1 text-xs font-semibold"
            style={{
              color: severity === s ? 'white' : `hsl(${SEVERITY_META[s].tone})`,
              backgroundColor: `hsl(${SEVERITY_META[s].tone} / ${severity === s ? 1 : 0.15})`,
            }}
          >
            {SEVERITY_META[s].label}
          </button>
        ))}
      </div>
      <textarea value={effect} onChange={(e) => setEffect(e.target.value)} rows={2} placeholder="Efeito da interação" className={`${input} resize-none py-2`} />
      <textarea value={management} onChange={(e) => setManagement(e.target.value)} rows={2} placeholder="Conduta / manejo" className={`${input} resize-none py-2`} />
      <div className="grid grid-cols-2 gap-2">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Fonte" className={input} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" className={input} />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="press text-sm font-medium text-muted-foreground">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!a.trim() || !b.trim()}
          className="press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

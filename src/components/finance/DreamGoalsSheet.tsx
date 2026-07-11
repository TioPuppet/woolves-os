'use client';

import { useState } from 'react';
import type { DreamGoal, DreamGoalCategory } from '@/lib/finance';
import { cn } from '@/lib/utils';
import { CurrencyInput } from './CurrencyInput';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORIES: { key: DreamGoalCategory; label: string }[] = [
  { key: 'viagem', label: 'Viagem' },
  { key: 'carro', label: 'Carro' },
  { key: 'casa', label: 'Casa' },
  { key: 'negocio', label: 'Negócio' },
  { key: 'liberdade', label: 'Liberdade' },
  { key: 'familia', label: 'Família' },
  { key: 'produto', label: 'Produto' },
  { key: 'outro', label: 'Outro' },
];

function dreamStatus(progress: number) {
  if (progress >= 100) return 'Conquistado';
  if (progress >= 75) return 'Quase lá';
  if (progress > 0) return 'Em construção';
  return 'Sonho criado';
}

export function DreamGoalsSheet({
  open,
  goals,
  saving,
  contributing,
  onAdd,
  onContribute,
  onArchive,
  onClose,
}: {
  open: boolean;
  goals: DreamGoal[];
  saving: boolean;
  contributing: boolean;
  onAdd: (goal: {
    title: string;
    category: DreamGoalCategory;
    target_amount_brl: number;
    current_amount_brl: number;
    image_url: string | null;
    external_url: string | null;
    notes: string | null;
  }) => void;
  onContribute: (id: number, amount: number) => void;
  onArchive: (id: number) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DreamGoalCategory>('viagem');
  const [target, setTarget] = useState<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [contributions, setContributions] = useState<Record<number, number | null>>({});

  if (!open) return null;

  const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target_amount_brl), 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + Number(goal.current_amount_brl), 0);
  const totalPct = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;
  const canAdd = title.trim().length >= 2 && (target ?? 0) > 0;
  const field = 'min-h-11 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[90vh] w-full max-w-app flex-col gap-4 overflow-y-auto rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Meta dos sonhos</p>
            <h2 className="mt-1 text-xl font-semibold">Fortalezas futuras</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <section className="surface-2 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Guardado</p>
              <p className="truncate text-sm font-bold tabular-nums text-status-ontrack">{brl(totalCurrent)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Alvo</p>
              <p className="truncate text-sm font-bold tabular-nums">{brl(totalTarget)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Progresso</p>
              <p className="truncate text-sm font-bold tabular-nums text-primary">{totalPct}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </section>

        {goals.length > 0 ? (
          <div className="flex flex-col gap-3">
            {goals.map((goal) => {
              const currentAmount = Number(goal.current_amount_brl);
              const targetAmount = Number(goal.target_amount_brl);
              const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
              const contribution = contributions[goal.id] ?? null;

              return (
                <article key={goal.id} className="surface-1 overflow-hidden rounded-2xl">
                  {goal.image_url ? (
                    <div className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url("${goal.image_url}")` }} />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-primary/10 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Sonho em construção
                    </div>
                  )}
                  <div className="flex flex-col gap-3 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dreamStatus(progress)} · {CATEGORIES.find((c) => c.key === goal.category)?.label ?? 'Outro'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-card">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{brl(currentAmount)} guardados</span>
                      <span>{brl(Math.max(0, targetAmount - currentAmount))} faltam</span>
                    </div>
                    {goal.external_url ? (
                      <a href={goal.external_url} target="_blank" rel="noreferrer" className="press text-xs font-semibold text-primary">
                        Abrir referência
                      </a>
                    ) : null}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <CurrencyInput
                        value={contribution}
                        onValueChange={(value) => setContributions((prev) => ({ ...prev, [goal.id]: value }))}
                        placeholder="Aporte"
                        className={cn(field, 'min-w-0')}
                      />
                      <button
                        type="button"
                        disabled={!((contribution ?? 0) > 0) || contributing}
                        onClick={() => {
                          onContribute(goal.id, contribution ?? 0);
                          setContributions((prev) => ({ ...prev, [goal.id]: null }));
                        }}
                        className="press min-h-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                      >
                        Aportar
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchive(goal.id)}
                        className="press min-h-11 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground hover:text-status-broken"
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <section className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Criar sonho</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Viagem a Paris" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <CurrencyInput value={target} onValueChange={setTarget} placeholder="Valor alvo" className={field} />
            <CurrencyInput value={current} onValueChange={setCurrent} placeholder="Já guardado" className={field} />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as DreamGoalCategory)} className={field}>
            {CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL da imagem (opcional)" className={field} />
          <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Link de referência (opcional)" className={field} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação (opcional)" className={cn(field, 'min-h-20 py-3')} />
          <button
            type="button"
            disabled={!canAdd || saving}
            onClick={() => {
              onAdd({
                title: title.trim(),
                category,
                target_amount_brl: target ?? 0,
                current_amount_brl: current ?? 0,
                image_url: imageUrl.trim() || null,
                external_url: externalUrl.trim() || null,
                notes: notes.trim() || null,
              });
              setTitle('');
              setCategory('viagem');
              setTarget(null);
              setCurrent(null);
              setImageUrl('');
              setExternalUrl('');
              setNotes('');
            }}
            className="press min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Criar meta dos sonhos
          </button>
        </section>
      </div>
    </div>
  );
}

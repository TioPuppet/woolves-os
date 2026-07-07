'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { useDrugs, useInteractions } from '@/hooks/useClinical';
import { type Drug, type DrugInteraction } from '@/lib/clinical/drugs';
import { DrugsTab } from './DrugsTab';
import { CalculatorsTab } from './CalculatorsTab';
import { InteractionsTab } from './InteractionsTab';

type Tab = 'farmacos' | 'calc' | 'interacoes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'farmacos', label: 'Fármacos' },
  { key: 'calc', label: 'Calculadoras' },
  { key: 'interacoes', label: 'Interações' },
];

export function ClinicaClient({
  userId,
  initialDrugs,
  initialInteractions,
}: {
  userId: string;
  initialDrugs: Drug[];
  initialInteractions: DrugInteraction[];
}) {
  const [tab, setTab] = useState<Tab>('farmacos');
  const { drugs, createDrug, updateDrug, deleteDrug } = useDrugs(userId, initialDrugs);
  const { interactions, createInteraction, deleteInteraction } = useInteractions(
    userId,
    initialInteractions,
  );

  return (
    <main className="flex min-h-screen flex-col gap-4 px-5 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="saude" size={30} />
          <h1 className="text-xl font-semibold">Clínica</h1>
        </div>
        <Link href="/" className="press text-sm text-muted-foreground">
          Fechar
        </Link>
      </header>

      {/* Disclaimer permanente */}
      <div className="rounded-xl border border-[hsl(var(--ia)/0.35)] bg-[hsl(var(--ia)/0.1)] p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Referência profissional.</strong> Não substitui a bula
          oficial nem o julgamento clínico. Conteúdo de curadoria própria — confirme sempre a fonte antes
          de qualquer conduta. A IA não é fonte de dose, interação ou contraindicação.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'press min-h-10 rounded-xl border text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'farmacos' && (
        <DrugsTab
          drugs={drugs}
          onCreate={(d) => createDrug.mutate(d)}
          onUpdate={(id, patch) => updateDrug.mutate({ id, ...patch })}
          onDelete={(id) => deleteDrug.mutate(id)}
        />
      )}
      {tab === 'calc' && <CalculatorsTab />}
      {tab === 'interacoes' && (
        <InteractionsTab
          drugs={drugs}
          interactions={interactions}
          onCreate={(d) => createInteraction.mutate(d)}
          onDelete={(id) => deleteInteraction.mutate(id)}
        />
      )}
    </main>
  );
}

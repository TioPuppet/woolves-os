'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { useDrugs, useInteractions } from '@/hooks/useClinical';
import { type Drug, type DrugInteraction } from '@/lib/clinical/drugs';
import { DrugsTab } from './DrugsTab';
import { InteractionsTab } from './InteractionsTab';
import { ClinicalCockpit } from './ClinicalCockpit';

const CalculatorsTab = dynamic(() => import('./CalculatorsTab').then((mod) => mod.CalculatorsTab), { ssr: false });

type Tab = 'cockpit' | 'farmacos' | 'calc' | 'interacoes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'cockpit', label: 'Comando' },
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
  const [tab, setTab] = useState<Tab>('cockpit');
  const [clinicalQuery, setClinicalQuery] = useState('');
  const [focusDrugId, setFocusDrugId] = useState<number | null>(null);
  const { drugs, createDrug, updateDrug, deleteDrug } = useDrugs(userId, initialDrugs);
  const { interactions, createInteraction, deleteInteraction } = useInteractions(
    userId,
    initialInteractions,
  );

  return (
    <main className="clinical-world flex min-h-screen flex-col gap-4 px-5 pb-28 pt-10">
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

      <nav className="clinical-tabs grid grid-cols-2 gap-2 rounded-2xl p-1 sm:grid-cols-4" aria-label="Áreas da Clínica">
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
      </nav>

      {tab === 'cockpit' && (
        <ClinicalCockpit
          drugs={drugs}
          query={clinicalQuery}
          onQueryChange={setClinicalQuery}
          onOpenTab={(nextTab) => setTab(nextTab)}
          onOpenDrug={(id) => {
            setFocusDrugId(id);
            setTab('farmacos');
          }}
        />
      )}
      {tab === 'farmacos' && (
        <DrugsTab
          userId={userId}
          drugs={drugs}
          onCreate={(d) => createDrug.mutate(d)}
          onUpdate={(id, patch) => updateDrug.mutate({ id, ...patch })}
          onDelete={(id) => deleteDrug.mutate(id)}
          focusDrugId={focusDrugId}
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

'use client';

import { useState, type ReactNode } from 'react';
import {
  oralDrops,
  pediatricAntibioticDose,
  syrupVolume,
} from '@/lib/clinical/calculators';
import { CLINICAL_SOURCES } from '@/lib/clinical/sources';

type CalculatorView = 'syrup' | 'drops' | 'antibiotic';

const ANTIBIOTICS = [
  'Amoxicilina',
  'Amoxicilina + clavulanato',
  'Azitromicina',
  'Cefalexina',
  'Cefuroxima',
  'Claritromicina',
  'Clindamicina',
  'Sulfametoxazol + trimetoprima',
  'Outro protocolo',
];

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card px-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        list="clinical-antibiotics"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-border bg-card px-3 text-base outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
        placeholder="Selecione ou digite"
      />
    </label>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="surface-2 rounded-2xl p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Output({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-4">{children}</div>;
}

function SourceLinks() {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      <a href={CLINICAL_SOURCES.anvisaBulario} target="_blank" rel="noreferrer" className="press rounded-xl border border-border px-3 py-2 font-semibold text-muted-foreground hover:text-foreground">
        Abrir Bulário ANVISA
      </a>
      <a href={CLINICAL_SOURCES.anvisaBularioGuide} target="_blank" rel="noreferrer" className="press rounded-xl border border-border px-3 py-2 font-semibold text-muted-foreground hover:text-foreground">
        Fonte oficial
      </a>
    </div>
  );
}

export function CalculatorsTab() {
  const [view, setView] = useState<CalculatorView>('syrup');

  return (
    <section className="anim-rise flex flex-col gap-4">
      <header className="surface-1 rounded-2xl p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dose e conversão</p>
        <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Calculadoras clínicas</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Converta a prescrição para a apresentação disponível, com controle manual do protocolo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card/50 p-1.5 sm:grid-cols-3" role="tablist" aria-label="Tipo de calculadora">
        {([
          ['syrup', 'Xarope'],
          ['drops', 'Gotas'],
          ['antibiotic', 'Antibiótico infantil'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`press min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
              view === key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'syrup' && <SyrupCalculator />}
      {view === 'drops' && <DropsCalculator />}
      {view === 'antibiotic' && <AntibioticCalculator />}
    </section>
  );
}

function SyrupCalculator() {
  const [dose, setDose] = useState('');
  const [concentration, setConcentration] = useState('');
  const [volume, setVolume] = useState('');
  const result = syrupVolume({
    doseMg: Number(dose),
    concentrationMg: Number(concentration),
    concentrationMl: Number(volume),
  });

  return (
    <Panel title="Conversão de xarope" subtitle="Informe a dose prescrita e a concentração da apresentação em mãos.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Dose prescrita" value={dose} onChange={setDose} suffix="mg" />
        <Field label="Concentração" value={concentration} onChange={setConcentration} suffix="mg" placeholder="ex.: 250" />
        <Field label="Volume da apresentação" value={volume} onChange={setVolume} suffix="mL" placeholder="ex.: 5" />
      </div>
      {result != null && (
        <Output>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Resultado</p>
          <p className="mt-1 text-2xl font-bold text-primary">{result} mL</p>
          <p className="mt-1 text-xs text-muted-foreground">por administração</p>
        </Output>
      )}
      <SourceLinks />
    </Panel>
  );
}

function DropsCalculator() {
  const [dose, setDose] = useState('');
  const [concentration, setConcentration] = useState('');
  const [dropsPerMl, setDropsPerMl] = useState('20');
  const result = oralDrops({
    doseMg: Number(dose),
    concentrationMgPerMl: Number(concentration),
    dropsPerMl: Number(dropsPerMl),
  });

  return (
    <Panel title="Conversão de gotas" subtitle="Confira na bula quantas gotas correspondem a 1 mL na apresentação utilizada.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Dose prescrita" value={dose} onChange={setDose} suffix="mg" />
        <Field label="Concentração" value={concentration} onChange={setConcentration} suffix="mg/mL" />
        <Field label="Gotas por mL" value={dropsPerMl} onChange={setDropsPerMl} suffix="gotas" />
      </div>
      {result != null && (
        <Output>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Resultado</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-2xl font-bold text-primary">{result.drops} gotas</span>
            <span className="text-sm text-muted-foreground">({result.volumeMl} mL)</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">por administração</p>
        </Output>
      )}
      <SourceLinks />
    </Panel>
  );
}

function AntibioticCalculator() {
  const [drug, setDrug] = useState('');
  const [weight, setWeight] = useState('');
  const [dosePerKg, setDosePerKg] = useState('');
  const [frequency, setFrequency] = useState('');
  const [concentration, setConcentration] = useState('');
  const [volume, setVolume] = useState('');
  const [maxPerDose, setMaxPerDose] = useState('');
  const [maxPerDay, setMaxPerDay] = useState('');
  const result = pediatricAntibioticDose({
    weightKg: Number(weight),
    doseMgKgPerDose: Number(dosePerKg),
    dosesPerDay: Number(frequency),
    concentrationMg: Number(concentration),
    concentrationMl: Number(volume),
    maxMgPerDose: maxPerDose ? Number(maxPerDose) : null,
    maxMgPerDay: maxPerDay ? Number(maxPerDay) : null,
  });

  return (
    <Panel title="Antibiótico infantil" subtitle="Escolha o fármaco e informe manualmente o esquema da bula profissional ou da sua conduta.">
      <datalist id="clinical-antibiotics">
        {ANTIBIOTICS.map((name) => <option key={name} value={name} />)}
      </datalist>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Fármaco" value={drug} onChange={setDrug} />
        <Field label="Peso" value={weight} onChange={setWeight} suffix="kg" />
        <Field label="Dose por administração" value={dosePerKg} onChange={setDosePerKg} suffix="mg/kg/dose" />
        <Field label="Frequência" value={frequency} onChange={setFrequency} suffix="doses/dia" />
        <Field label="Concentração" value={concentration} onChange={setConcentration} suffix="mg" />
        <Field label="Volume da apresentação" value={volume} onChange={setVolume} suffix="mL" />
        <Field label="Máximo por dose (opcional)" value={maxPerDose} onChange={setMaxPerDose} suffix="mg" />
        <Field label="Máximo por dia (opcional)" value={maxPerDay} onChange={setMaxPerDay} suffix="mg" />
      </div>
      {result != null && (
        <Output>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Resultado{drug ? ` · ${drug}` : ''}</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Dose</p><p className="text-lg font-bold text-primary">{result.doseMg} mg</p></div>
            <div><p className="text-xs text-muted-foreground">Volume</p><p className="text-lg font-bold text-primary">{result.volumeMl} mL</p></div>
            <div><p className="text-xs text-muted-foreground">Total diário</p><p className="text-lg font-bold text-primary">{result.dailyMg} mg</p></div>
          </div>
          {result.capped && <p className="mt-3 text-xs font-semibold text-status-warning">Resultado limitado pelo teto informado.</p>}
        </Output>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        O Woolves não sugere dose terapêutica automaticamente. Preencha dose, frequência, concentração e limites conforme a bula profissional e a conduta escolhida.
      </p>
      <SourceLinks />
    </Panel>
  );
}

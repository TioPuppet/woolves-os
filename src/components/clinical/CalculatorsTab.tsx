'use client';

import { useState } from 'react';
import {
  cockcroftGault,
  renalStage,
  bsaMosteller,
  doseByWeight,
  infusionRate,
  type Sex,
} from '@/lib/clinical/calculators';

function Field({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step={step ?? 'any'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 text-sm">{children}</div>
  );
}

function CockcroftGault() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [cr, setCr] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const crcl = cockcroftGault({
    ageYears: Number(age),
    weightKg: Number(weight),
    serumCreatinineMgDl: Number(cr),
    sex,
  });
  return (
    <Card title="Clearance de creatinina" subtitle="Cockcroft-Gault (mL/min)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade" value={age} onChange={setAge} suffix="anos" />
        <Field label="Peso" value={weight} onChange={setWeight} suffix="kg" />
        <Field label="Creatinina" value={cr} onChange={setCr} suffix="mg/dL" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Sexo</span>
          <div className="flex gap-2">
            {(['M', 'F'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`press min-h-10 flex-1 rounded-lg border text-sm font-medium ${
                  sex === s ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {s === 'M' ? 'Masc.' : 'Fem.'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {crcl != null && (
        <Result>
          {(() => {
            const st = renalStage(crcl);
            return (
              <div className="flex items-center justify-between">
                <span>
                  <span className="text-lg font-bold">{crcl}</span> mL/min
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ color: `hsl(${st.tone})`, backgroundColor: `hsl(${st.tone} / 0.15)` }}
                >
                  {st.code} · {st.label}
                </span>
              </div>
            );
          })()}
        </Result>
      )}
    </Card>
  );
}

function Bsa() {
  const [h, setH] = useState('');
  const [w, setW] = useState('');
  const bsa = bsaMosteller({ heightCm: Number(h), weightKg: Number(w) });
  return (
    <Card title="Superfície corporal" subtitle="Mosteller (m²)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Altura" value={h} onChange={setH} suffix="cm" />
        <Field label="Peso" value={w} onChange={setW} suffix="kg" />
      </div>
      {bsa != null && (
        <Result>
          <span className="text-lg font-bold">{bsa}</span> m²
        </Result>
      )}
    </Card>
  );
}

function DoseWeight() {
  const [mgkg, setMgkg] = useState('');
  const [w, setW] = useState('');
  const [max, setMax] = useState('');
  const res = doseByWeight({
    mgPerKg: Number(mgkg),
    weightKg: Number(w),
    maxMg: max ? Number(max) : null,
  });
  return (
    <Card title="Dose por peso" subtitle="mg/kg × peso (com teto opcional)">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Dose" value={mgkg} onChange={setMgkg} suffix="mg/kg" />
        <Field label="Peso" value={w} onChange={setW} suffix="kg" />
        <Field label="Máx." value={max} onChange={setMax} suffix="mg" />
      </div>
      {res && (
        <Result>
          <span className="text-lg font-bold">{res.dose}</span> mg
          {res.capped && (
            <span className="ml-2 rounded-md bg-status-broken/15 px-2 py-0.5 text-xs font-semibold text-status-broken">
              limitado pelo teto
            </span>
          )}
        </Result>
      )}
    </Card>
  );
}

function Infusion() {
  const [vol, setVol] = useState('');
  const [hours, setHours] = useState('');
  const [micro, setMicro] = useState(false);
  const res = infusionRate({
    volumeMl: Number(vol),
    hours: Number(hours),
    dropFactor: micro ? 60 : 20,
  });
  return (
    <Card title="Velocidade de infusão" subtitle="mL/h e gotas/min">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Volume" value={vol} onChange={setVol} suffix="mL" />
        <Field label="Tempo" value={hours} onChange={setHours} suffix="h" />
      </div>
      <div className="flex gap-2">
        {[
          { k: false, label: 'Macrogotas (20)' },
          { k: true, label: 'Microgotas (60)' },
        ].map((o) => (
          <button
            key={String(o.k)}
            type="button"
            onClick={() => setMicro(o.k)}
            className={`press min-h-9 flex-1 rounded-lg border text-xs font-medium ${
              micro === o.k ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {res && (
        <Result>
          <div className="flex items-center justify-between">
            <span>
              <span className="text-lg font-bold">{res.mlPerHour}</span> mL/h
            </span>
            <span>
              <span className="text-lg font-bold">{res.dropsPerMin}</span> gtt/min
            </span>
          </div>
        </Result>
      )}
    </Card>
  );
}

export function CalculatorsTab() {
  return (
    <div className="flex flex-col gap-3">
      <CockcroftGault />
      <Bsa />
      <DoseWeight />
      <Infusion />
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  cockcroftGault,
  renalStage,
  ckdEpi2021,
  correctedCalcium,
  correctedSodium,
  anionGap,
  meanArterialPressure,
  qtc,
  bmi,
  bsaMosteller,
  idealBodyWeight,
  adjustedBodyWeight,
  doseByWeight,
  maintenanceFluids,
  infusionRate,
  type Sex,
} from '@/lib/clinical/calculators';

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function SexToggle({ sex, onChange }: { sex: Sex; onChange: (s: Sex) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">Sexo</span>
      <div className="flex gap-2">
        {(['M', 'F'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`press min-h-10 flex-1 rounded-lg border text-sm font-medium ${
              sex === s ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {s === 'M' ? 'Masc.' : 'Fem.'}
          </button>
        ))}
      </div>
    </div>
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
  return <div className="rounded-xl bg-card px-4 py-3 text-sm">{children}</div>;
}

function Big({ v, unit, tone }: { v: number | string; unit?: string; tone?: string }) {
  return (
    <span>
      <span className="text-lg font-bold" style={tone ? { color: `hsl(${tone})` } : undefined}>
        {v}
      </span>
      {unit ? <span className="text-muted-foreground"> {unit}</span> : null}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------- Renal ---- */

function CockcroftGault() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [cr, setCr] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const crcl = cockcroftGault({ ageYears: Number(age), weightKg: Number(weight), serumCreatinineMgDl: Number(cr), sex });
  return (
    <Card title="Clearance de creatinina" subtitle="Cockcroft-Gault (mL/min)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade" value={age} onChange={setAge} suffix="anos" />
        <Field label="Peso" value={weight} onChange={setWeight} suffix="kg" />
        <Field label="Creatinina" value={cr} onChange={setCr} suffix="mg/dL" />
        <SexToggle sex={sex} onChange={setSex} />
      </div>
      {crcl != null && (
        <Result>
          {(() => {
            const st = renalStage(crcl);
            return (
              <div className="flex items-center justify-between">
                <Big v={crcl} unit="mL/min" />
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: `hsl(${st.tone})`, backgroundColor: `hsl(${st.tone} / 0.15)` }}>
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

function CkdEpi() {
  const [age, setAge] = useState('');
  const [cr, setCr] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const e = ckdEpi2021({ ageYears: Number(age), serumCreatinineMgDl: Number(cr), sex });
  return (
    <Card title="TFG estimada" subtitle="CKD-EPI 2021 (mL/min/1,73m²)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade" value={age} onChange={setAge} suffix="anos" />
        <Field label="Creatinina" value={cr} onChange={setCr} suffix="mg/dL" />
        <SexToggle sex={sex} onChange={setSex} />
      </div>
      {e != null && (
        <Result>
          {(() => {
            const st = renalStage(e);
            return (
              <div className="flex items-center justify-between">
                <Big v={e} unit="mL/min/1,73m²" />
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: `hsl(${st.tone})`, backgroundColor: `hsl(${st.tone} / 0.15)` }}>
                  {st.code}
                </span>
              </div>
            );
          })()}
        </Result>
      )}
    </Card>
  );
}

function CorrectedCa() {
  const [ca, setCa] = useState('');
  const [alb, setAlb] = useState('');
  const r = correctedCalcium({ calciumMgDl: Number(ca), albuminGDl: Number(alb) });
  return (
    <Card title="Cálcio corrigido" subtitle="pela albumina (mg/dL)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cálcio" value={ca} onChange={setCa} suffix="mg/dL" />
        <Field label="Albumina" value={alb} onChange={setAlb} suffix="g/dL" />
      </div>
      {r != null && <Result><Big v={r} unit="mg/dL" /></Result>}
    </Card>
  );
}

function CorrectedNa() {
  const [na, setNa] = useState('');
  const [glu, setGlu] = useState('');
  const r = correctedSodium({ sodium: Number(na), glucoseMgDl: Number(glu) });
  return (
    <Card title="Sódio corrigido" subtitle="pela glicemia (mEq/L)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sódio" value={na} onChange={setNa} suffix="mEq/L" />
        <Field label="Glicemia" value={glu} onChange={setGlu} suffix="mg/dL" />
      </div>
      {r != null && <Result><Big v={r} unit="mEq/L" /></Result>}
    </Card>
  );
}

function AnionGap() {
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');
  const [alb, setAlb] = useState('');
  const r = anionGap({ sodium: Number(na), chloride: Number(cl), bicarbonate: Number(hco3), albuminGDl: alb ? Number(alb) : null });
  return (
    <Card title="Ânion gap" subtitle="Na − (Cl + HCO₃); corrigido opcional">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sódio" value={na} onChange={setNa} suffix="mEq/L" />
        <Field label="Cloro" value={cl} onChange={setCl} suffix="mEq/L" />
        <Field label="Bicarbonato" value={hco3} onChange={setHco3} suffix="mEq/L" />
        <Field label="Albumina" value={alb} onChange={setAlb} suffix="g/dL" />
      </div>
      {r != null && (
        <Result>
          <div className="flex items-center justify-between">
            <Big v={r.gap} unit="mEq/L" />
            {r.corrected != null && <span className="text-xs text-muted-foreground">corrigido: <span className="font-semibold text-foreground">{r.corrected}</span></span>}
          </div>
        </Result>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- Cardio ------ */

function Map() {
  const [sbp, setSbp] = useState('');
  const [dbp, setDbp] = useState('');
  const r = meanArterialPressure({ systolic: Number(sbp), diastolic: Number(dbp) });
  return (
    <Card title="Pressão arterial média (PAM)" subtitle="(PAS + 2×PAD) / 3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="PAS" value={sbp} onChange={setSbp} suffix="mmHg" />
        <Field label="PAD" value={dbp} onChange={setDbp} suffix="mmHg" />
      </div>
      {r != null && (
        <Result>
          <div className="flex items-center justify-between">
            <Big v={r} unit="mmHg" />
            {r < 65 ? <span className="text-xs font-semibold text-status-broken">abaixo de 65 — hipoperfusão</span> : null}
          </div>
        </Result>
      )}
    </Card>
  );
}

function Qtc() {
  const [qt, setQt] = useState('');
  const [hr, setHr] = useState('');
  const r = qtc({ qtMs: Number(qt), heartRate: Number(hr) });
  return (
    <Card title="QT corrigido (QTc)" subtitle="Bazett e Fridericia (ms)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="QT" value={qt} onChange={setQt} suffix="ms" />
        <Field label="FC" value={hr} onChange={setHr} suffix="bpm" />
      </div>
      {r != null && (
        <Result>
          <div className="flex items-center justify-between">
            <span>Bazett: <Big v={r.bazett} unit="ms" /></span>
            <span>Fridericia: <Big v={r.fridericia} unit="ms" /></span>
          </div>
        </Result>
      )}
    </Card>
  );
}

/* -------------------------------------------------- Antropometria & dose --- */

function Bmi() {
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const r = bmi({ weightKg: Number(w), heightCm: Number(h) });
  return (
    <Card title="IMC" subtitle="Índice de massa corporal (kg/m²)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso" value={w} onChange={setW} suffix="kg" />
        <Field label="Altura" value={h} onChange={setH} suffix="cm" />
      </div>
      {r != null && (
        <Result>
          <div className="flex items-center justify-between">
            <Big v={r.value} unit="kg/m²" />
            <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: `hsl(${r.category.tone})`, backgroundColor: `hsl(${r.category.tone} / 0.15)` }}>
              {r.category.label}
            </span>
          </div>
        </Result>
      )}
    </Card>
  );
}

function BodyWeight() {
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const ibw = idealBodyWeight({ heightCm: Number(h), sex });
  const adj = adjustedBodyWeight({ weightKg: Number(w), heightCm: Number(h), sex });
  const bsa = bsaMosteller({ heightCm: Number(h), weightKg: Number(w) });
  return (
    <Card title="Pesos e superfície" subtitle="Ideal (Devine), ajustado e BSA (Mosteller)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso" value={w} onChange={setW} suffix="kg" />
        <Field label="Altura" value={h} onChange={setH} suffix="cm" />
        <SexToggle sex={sex} onChange={setSex} />
      </div>
      {(ibw != null || bsa != null) && (
        <Result>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><Big v={ibw ?? '—'} /><div className="text-muted-foreground">ideal kg</div></div>
            <div><Big v={adj ?? '—'} /><div className="text-muted-foreground">ajustado kg</div></div>
            <div><Big v={bsa ?? '—'} /><div className="text-muted-foreground">BSA m²</div></div>
          </div>
        </Result>
      )}
    </Card>
  );
}

function DoseWeight() {
  const [mgkg, setMgkg] = useState('');
  const [w, setW] = useState('');
  const [max, setMax] = useState('');
  const res = doseByWeight({ mgPerKg: Number(mgkg), weightKg: Number(w), maxMg: max ? Number(max) : null });
  return (
    <Card title="Dose por peso" subtitle="mg/kg × peso (com teto opcional)">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Dose" value={mgkg} onChange={setMgkg} suffix="mg/kg" />
        <Field label="Peso" value={w} onChange={setW} suffix="kg" />
        <Field label="Máx." value={max} onChange={setMax} suffix="mg" />
      </div>
      {res && (
        <Result>
          <Big v={res.dose} unit="mg" />
          {res.capped && <span className="ml-2 rounded-md bg-status-broken/15 px-2 py-0.5 text-xs font-semibold text-status-broken">limitado pelo teto</span>}
        </Result>
      )}
    </Card>
  );
}

function Maintenance() {
  const [w, setW] = useState('');
  const r = maintenanceFluids({ weightKg: Number(w) });
  return (
    <Card title="Hidratação de manutenção" subtitle="Holliday-Segar (100-50-20)">
      <Field label="Peso" value={w} onChange={setW} suffix="kg" />
      {r != null && (
        <Result>
          <div className="flex items-center justify-between">
            <span><Big v={r.mlPerDay} unit="mL/dia" /></span>
            <span><Big v={r.mlPerHour} unit="mL/h" /></span>
          </div>
        </Result>
      )}
    </Card>
  );
}

function Infusion() {
  const [vol, setVol] = useState('');
  const [hours, setHours] = useState('');
  const [micro, setMicro] = useState(false);
  const res = infusionRate({ volumeMl: Number(vol), hours: Number(hours), dropFactor: micro ? 60 : 20 });
  return (
    <Card title="Velocidade de infusão" subtitle="mL/h e gotas/min">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Volume" value={vol} onChange={setVol} suffix="mL" />
        <Field label="Tempo" value={hours} onChange={setHours} suffix="h" />
      </div>
      <div className="flex gap-2">
        {[{ k: false, label: 'Macrogotas (20)' }, { k: true, label: 'Microgotas (60)' }].map((o) => (
          <button key={String(o.k)} type="button" onClick={() => setMicro(o.k)} className={`press min-h-9 flex-1 rounded-lg border text-xs font-medium ${micro === o.k ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>
            {o.label}
          </button>
        ))}
      </div>
      {res && (
        <Result>
          <div className="flex items-center justify-between">
            <span><Big v={res.mlPerHour} unit="mL/h" /></span>
            <span><Big v={res.dropsPerMin} unit="gtt/min" /></span>
          </div>
        </Result>
      )}
    </Card>
  );
}

export function CalculatorsTab() {
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Renal &amp; eletrólitos</SectionTitle>
      <CockcroftGault />
      <CkdEpi />
      <CorrectedCa />
      <CorrectedNa />
      <AnionGap />

      <SectionTitle>Cardiovascular</SectionTitle>
      <Map />
      <Qtc />

      <SectionTitle>Antropometria &amp; dose</SectionTitle>
      <Bmi />
      <BodyWeight />
      <DoseWeight />
      <Maintenance />
      <Infusion />
    </div>
  );
}

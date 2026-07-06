'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  calculateGoals,
  ageFromBirthDate,
  type ActivityLevel,
  type Sex,
} from '@/lib/goals';
import {
  completeOnboardingAction,
  type OnboardingState,
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { TITLES } from '@/lib/greeting';

const initial: OnboardingState = {};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário',
  light: 'Leve',
  moderate: 'Moderado',
  active: 'Ativo',
  very_active: 'Muito ativo',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Concluir e entrar'}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState(
    completeOnboardingAction,
    initial,
  );

  // How the user wants to be addressed.
  const [title, setTitle] = useState('Sr.');
  const [displayName, setDisplayName] = useState('');

  // Body inputs drive the live goal preview.
  const [sex, setSex] = useState<Sex>('male');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  // Goal fields — prefilled from the calculation, but editable (override).
  const [goalKcal, setGoalKcal] = useState('');
  const [goalProtein, setGoalProtein] = useState('');
  const [goalWater, setGoalWater] = useState('');
  const [touchedGoals, setTouchedGoals] = useState(false);

  const suggested = useMemo(() => {
    const w = Number(weightKg);
    const h = Number(heightCm);
    if (!w || !h || !birthDate) return null;
    const age = ageFromBirthDate(new Date(birthDate));
    if (age <= 0 || age > 120) return null;
    return calculateGoals({
      sex,
      ageYears: age,
      weightKg: w,
      heightCm: h,
      activityLevel: activity,
    });
  }, [sex, birthDate, heightCm, weightKg, activity]);

  // Auto-fill goals from the suggestion until the user edits them.
  const applySuggestion = () => {
    if (!suggested) return;
    setGoalKcal(String(suggested.kcal));
    setGoalProtein(String(suggested.proteinG));
    setGoalWater(String(suggested.waterMl));
    setTouchedGoals(true);
  };

  const kcalValue = goalKcal || (suggested ? String(suggested.kcal) : '');
  const proteinValue =
    goalProtein || (suggested ? String(suggested.proteinG) : '');
  const waterValue = goalWater || (suggested ? String(suggested.waterMl) : '');

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1 · Como quer ser chamado?
        </h2>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <select
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Tratamento"
            className="min-h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            {TITLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Input
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Ex.: {title ? `${title} ` : ''}
          {displayName.trim().split(/\s+/)[0] || 'Cleomárcio'}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          2 · Seu corpo
        </h2>

        <Field label="Sexo biológico">
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`min-h-11 rounded-md border text-sm font-medium ${
                  sex === s
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {s === 'male' ? 'Masculino' : 'Feminino'}
              </button>
            ))}
          </div>
          <input type="hidden" name="sex" value={sex} />
        </Field>

        <Field label="Data de nascimento" htmlFor="birth_date">
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Altura (cm)" htmlFor="height_cm">
            <Input
              id="height_cm"
              name="height_cm"
              type="number"
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
            />
          </Field>
          <Field label="Peso (kg)" htmlFor="weight_kg">
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Nível de atividade">
          <select
            name="activity_level"
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3 · Suas metas
          </h2>
          <button
            type="button"
            onClick={applySuggestion}
            disabled={!suggested}
            className="text-xs font-medium text-primary disabled:opacity-40"
          >
            Calcular sugestão
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Calculadas por Mifflin-St Jeor (kcal), 1,8 g/kg (proteína) e 35 ml/kg
          (água). Ajuste como quiser.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Field label="kcal" htmlFor="goal_kcal">
            <Input
              id="goal_kcal"
              name="goal_kcal"
              type="number"
              inputMode="numeric"
              value={kcalValue}
              onChange={(e) => {
                setGoalKcal(e.target.value);
                setTouchedGoals(true);
              }}
              required
            />
          </Field>
          <Field label="Proteína (g)" htmlFor="goal_protein_g">
            <Input
              id="goal_protein_g"
              name="goal_protein_g"
              type="number"
              inputMode="numeric"
              value={proteinValue}
              onChange={(e) => {
                setGoalProtein(e.target.value);
                setTouchedGoals(true);
              }}
              required
            />
          </Field>
          <Field label="Água (ml)" htmlFor="goal_water_ml">
            <Input
              id="goal_water_ml"
              name="goal_water_ml"
              type="number"
              inputMode="numeric"
              value={waterValue}
              onChange={(e) => {
                setGoalWater(e.target.value);
                setTouchedGoals(true);
              }}
              required
            />
          </Field>
        </div>

        <Field label="Limite de gasto diário (R$)" htmlFor="goal_spend_limit_brl">
          <Input
            id="goal_spend_limit_brl"
            name="goal_spend_limit_brl"
            type="number"
            inputMode="decimal"
            placeholder="Ex.: 50"
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          4 · Hábito obrigatório
        </h2>
        <Field
          label="Um hábito inegociável por dia"
          htmlFor="required_habit"
          hint="Ex.: Ler 10 páginas, meditar 5 min, treinar."
        >
          <Input
            id="required_habit"
            name="required_habit"
            type="text"
            maxLength={80}
            required
          />
        </Field>
      </section>

      {state.error ? (
        <p className="text-sm text-status-broken">{state.error}</p>
      ) : null}
      {!touchedGoals && suggested ? (
        <p className="text-xs text-status-atrisk">
          Toque em “Calcular sugestão” ou preencha as metas manualmente.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

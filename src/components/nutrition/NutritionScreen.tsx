'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CountUp } from '@/components/finance/CountUp';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { useNutrition, type NutritionGoal } from '@/hooks/useNutrition';
import { localDayString, shiftLocalDay } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  MEALS,
  entriesOf,
  macroPercents,
  type Diary,
  type FoodEntry,
  type MacroTotals,
  type MealType,
} from '@/lib/nutrition';

const FoodSheet = dynamic(() => import('./FoodSheet').then((mod) => mod.FoodSheet), { ssr: false });
const IntegrationHub = dynamic(() => import('./IntegrationHub').then((mod) => mod.IntegrationHub), { ssr: false });

type NutritionView = 'command' | 'meals' | 'fasting' | 'analysis' | 'plan' | 'shopping' | 'integrations' | 'ledger';
const SHOW_V2_INTEGRATIONS = false;

const NUTRITION_VIEWS: { key: NutritionView; label: string }[] = [
  { key: 'command', label: 'Comando' },
  { key: 'meals', label: 'Refeições' },
  { key: 'fasting', label: 'Jejum' },
  { key: 'analysis', label: 'Análise' },
  { key: 'plan', label: 'Plano' },
  { key: 'shopping', label: 'Compras' },
  { key: 'ledger', label: 'Diário' },
];

const FAST_PRESETS = [
  { key: '14:10', fast: 14, eat: 10 },
  { key: '16:8', fast: 16, eat: 8 },
  { key: '18:6', fast: 18, eat: 6 },
  { key: '20:4', fast: 20, eat: 4 },
] as const;

type MeasurementDraft = {
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  bodyWaterPct: string;
  muscleMassKg: string;
  boneMassKg: string;
  visceralFatLevel: string;
  neckCm: string;
  chestCm: string;
  waistCm: string;
  abdomenCm: string;
  hipCm: string;
  rightArmCm: string;
  leftArmCm: string;
  rightThighCm: string;
  leftThighCm: string;
  rightCalfCm: string;
  leftCalfCm: string;
  skinfoldTricepsMm: string;
  skinfoldBicepsMm: string;
  skinfoldSubscapularMm: string;
  skinfoldSuprailiacMm: string;
  skinfoldAbdominalMm: string;
  skinfoldThighMm: string;
  skinfoldCalfMm: string;
};

const emptyMeasurement = (): MeasurementDraft => ({
  weightKg: '', heightCm: '', bodyFatPct: '', bodyWaterPct: '', muscleMassKg: '', boneMassKg: '', visceralFatLevel: '',
  neckCm: '', chestCm: '', waistCm: '', abdomenCm: '', hipCm: '', rightArmCm: '', leftArmCm: '', rightThighCm: '',
  leftThighCm: '', rightCalfCm: '', leftCalfCm: '', skinfoldTricepsMm: '', skinfoldBicepsMm: '', skinfoldSubscapularMm: '',
  skinfoldSuprailiacMm: '', skinfoldAbdominalMm: '', skinfoldThighMm: '', skinfoldCalfMm: '',
});

const GOAL_TYPES: { key: NutritionGoal['goalType']; label: string }[] = [
  { key: 'lose', label: 'Reduzir gordura' },
  { key: 'maintain', label: 'Manter' },
  { key: 'gain', label: 'Ganhar massa' },
  { key: 'recomposition', label: 'Recomposição' },
];

const SHOPPING_CATEGORIES = [
  { key: 'proteinas', label: 'Proteínas' },
  { key: 'carboidratos', label: 'Carboidratos' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'verduras', label: 'Verduras' },
  { key: 'laticinios', label: 'Laticínios' },
  { key: 'despensa', label: 'Despensa' },
  { key: 'outros', label: 'Outros' },
];

const mealLabel = (meal: MealType) => MEALS.find((item) => item.key === meal)?.label ?? meal;
const shortDayLabel = (day: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
const measurementDayLabel = (day: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
const shoppingCategory = (name: string) => {
  const value = name.toLocaleLowerCase('pt-BR');
  if (/frango|carne|bife|peixe|atum|ovo|whey|prote[ií]na/.test(value)) return 'proteinas';
  if (/arroz|aveia|p[aã]o|massa|macarr[aã]o|batata|mandioca|tapioca/.test(value)) return 'carboidratos';
  if (/banana|ma[cç][aã]|laranja|uva|mam[aã]o|abacate|fruta/.test(value)) return 'frutas';
  if (/salada|alface|tomate|br[oó]colis|cenoura|folha|legume|verdura/.test(value)) return 'verduras';
  if (/leite|iogurte|queijo|requeij[aã]o/.test(value)) return 'laticinios';
  if (/feij[aã]o|azeite|[oó]leo|castanha|amendoim|farinha|sal|a[cç][uú]car/.test(value)) return 'despensa';
  return 'outros';
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const kcal = (value: number) => `${Math.round(value)} kcal`;
const grams = (value: number) => `${Math.round(value * 10) / 10}g`;

function metricSize(value: number | null) {
  const abs = Math.abs(value ?? 0);
  if (abs >= 10000) return 'text-[0.72rem] sm:text-[0.88rem]';
  if (abs >= 1000) return 'text-[0.8rem] sm:text-[1rem]';
  return 'text-[0.94rem] sm:text-[1.2rem]';
}

function hoursLabel(value: number | null) {
  if (value == null) return 'Aguardando';
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  if (h <= 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function sumEntries(entries: FoodEntry[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (total, entry) => ({
      kcal: total.kcal + entry.kcal,
      protein: Math.round((total.protein + entry.protein_g) * 10) / 10,
      carb: Math.round((total.carb + entry.carb_g) * 10) / 10,
      fat: Math.round((total.fat + entry.fat_g) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
}

function MetricTile({
  label,
  value,
  tone = 'text-foreground',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5 sm:p-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={cn('mt-2 max-w-full overflow-hidden whitespace-nowrap pb-0.5 font-bold tabular-nums leading-[1.15] tracking-tight', tone)}>
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProgressLine({
  label,
  value,
  max,
  tone,
  right,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
  right: string;
}) {
  const pct = max > 0 ? clamp((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">{right}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/25">
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MacroPill({ label, gramsValue, pct, tone }: { label: string; gramsValue: number; pct: number; tone: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-black/15 p-2.5 sm:p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-semibold text-muted-foreground">{label}</span>
        <span className={cn('text-sm font-bold tabular-nums', tone)}>{pct}%</span>
      </div>
      <p className="mt-2 whitespace-nowrap pb-0.5 text-base font-bold tabular-nums leading-[1.2] tracking-tight sm:text-lg">{grams(gramsValue)}</p>
    </div>
  );
}

function MeasurementField({
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
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60"
      />
    </label>
  );
}

function MeasurementChart({
  title,
  unit,
  points,
  tone,
}: {
  title: string;
  unit: string;
  points: { date: string; value: number }[];
  tone: string;
}) {
  const values = points.map((point) => point.value);
  const min = values.length > 1 ? Math.min(...values) : (values[0] ?? 0) - 1;
  const max = values.length > 1 ? Math.max(...values) : (values[0] ?? 1) + 1;
  const range = Math.max(0.1, max - min);
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 180 : (index / (points.length - 1)) * 320 + 20;
    const y = 118 - ((point.value - min) / range) * 88;
    return { ...point, x, y };
  });

  return (
    <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Evolução</p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {points.length > 0 ? (
        <>
          <svg viewBox="0 0 360 150" className="mt-3 h-36 w-full overflow-visible" role="img" aria-label={`Evolução de ${title}`}>
            <path d="M20 118H340M20 74H340M20 30H340" stroke="currentColor" strokeOpacity="0.08" />
            {chartPoints.length > 1 && (
              <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" className={tone} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {chartPoints.map((point) => (
              <g key={point.date}>
                <circle cx={point.x} cy={point.y} r="4" className={tone} fill="currentColor" />
                <text x={point.x} y="143" textAnchor="middle" fill="currentColor" className="fill-muted-foreground text-[9px]">{measurementDayLabel(point.date)}</text>
              </g>
            ))}
          </svg>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{min.toFixed(1)} {unit}</span>
            <span className="font-semibold text-foreground">{values[values.length - 1]?.toFixed(1)} {unit}</span>
            <span>{max.toFixed(1)} {unit}</span>
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Registre pelo menos uma medição para ver a evolução.</p>
      )}
    </div>
  );
}

function MealCard({
  meal,
  entries,
  onAdd,
  onRemove,
  removing,
}: {
  meal: (typeof MEALS)[number];
  entries: FoodEntry[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  removing: boolean;
}) {
  const total = sumEntries(entries);

  return (
    <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{meal.label}</h2>
          <p className="text-xs text-muted-foreground">{entries.length} registro{entries.length === 1 ? '' : 's'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums">{kcal(total.kcal)}</p>
          <p className="text-[11px] text-muted-foreground">{grams(total.protein)} proteína</p>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-col divide-y divide-border/60">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <ThiingsAsset assetKey="alimentacao" size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{entry.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {grams(entry.grams)} · {kcal(entry.kcal)} · C{grams(entry.carb_g)} P{grams(entry.protein_g)} G{grams(entry.fat_g)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                disabled={removing}
                aria-label="Remover alimento"
                className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-status-broken disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          Nenhum alimento registrado.
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="press flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Adicionar alimento
      </button>
    </section>
  );
}

export function NutritionScreen({
  userId,
  timezone,
  initial,
  goalKcal,
  goalProteinG,
}: {
  userId: string;
  timezone: string;
  initial: Diary;
  goalKcal: number | null;
  goalProteinG: number | null;
}) {
  const [view, setView] = useState<NutritionView>('command');
  const [isViewPending, startViewTransition] = useTransition();
  const {
    diary,
    logFood,
    removeEntry,
    createFood,
    savedMeals,
    saveMeal,
    logSavedMeal,
    history,
    measurements,
    logMeasurement,
    goal,
    saveGoal,
    plans,
    savePlan,
    togglePlan,
    removePlan,
    shoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    healthConnections,
    healthRecords,
    importHealthRecords,
    disconnectHealthProvider,
  } = useNutrition(userId, timezone, initial, view);
  const [sheet, setSheet] = useState<{ open: boolean; meal: MealType }>({ open: false, meal: 'cafe' });
  const [fastPresetKey, setFastPresetKey] = useState<(typeof FAST_PRESETS)[number]['key']>('16:8');
  const [mealName, setMealName] = useState('');
  const [measurement, setMeasurement] = useState<MeasurementDraft>(() => emptyMeasurement());
  const [measurementDate, setMeasurementDate] = useState(() => localDayString(timezone));
  const [goalType, setGoalType] = useState<NutritionGoal['goalType']>('recomposition');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalCalories, setGoalCalories] = useState(goalKcal?.toString() ?? '');
  const [goalProtein, setGoalProtein] = useState(goalProteinG?.toString() ?? '');
  const [planDate, setPlanDate] = useState(() => localDayString(timezone));
  const [planMeal, setPlanMeal] = useState<MealType>('cafe');
  const [planTitle, setPlanTitle] = useState('');
  const [planNote, setPlanNote] = useState('');
  const [planSavedMealId, setPlanSavedMealId] = useState('');
  const [planServings, setPlanServings] = useState('1');
  const [shoppingName, setShoppingName] = useState('');
  const [shoppingQuantity, setShoppingQuantity] = useState('');
  const [shoppingUnit, setShoppingUnit] = useState('');
  const [shoppingCategoryValue, setShoppingCategoryValue] = useState('outros');
  const [generatingShopping, setGeneratingShopping] = useState(false);
  const [clockMs, setClockMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!goal) return;
    setGoalType(goal.goalType);
    setTargetWeight(goal.targetWeightKg?.toString() ?? '');
    setTargetDate(goal.targetDate ?? '');
    setGoalCalories(goal.calorieGoal?.toString() ?? '');
    setGoalProtein(goal.proteinGoalG?.toString() ?? '');
  }, [goal]);

  useEffect(() => {
    if (!SHOW_V2_INTEGRATIONS && view === 'integrations') setView('command');
  }, [view]);

  const totals = diary.totals;
  const macroPct = macroPercents(totals);
  const consumedPct = goalKcal ? clamp((totals.kcal / goalKcal) * 100) : 0;
  const remaining = goalKcal != null ? goalKcal - totals.kcal : null;
  const proteinPct = goalProteinG ? clamp((totals.protein / goalProteinG) * 100) : null;
  const proteinScore = Math.round(proteinPct ?? 0);
  const activePreset = FAST_PRESETS.find((preset) => preset.key === fastPresetKey) ?? FAST_PRESETS[1];

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone }),
    [timezone],
  );

  const timeline = useMemo(
    () =>
      [...diary.entries].sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return at - bt;
      }),
    [diary.entries],
  );

  const firstEntry = timeline[0] ?? null;
  const lastEntry = timeline[timeline.length - 1] ?? null;
  const nowMs = clockMs;
  const fastingHours =
    lastEntry?.created_at != null ? Math.max(0, (nowMs - new Date(lastEntry.created_at).getTime()) / 3_600_000) : null;
  const eatingWindowHours =
    firstEntry?.created_at != null
      ? Math.max(0, (nowMs - new Date(firstEntry.created_at).getTime()) / 3_600_000)
      : null;
  const fastElapsedHours = fastingHours ?? 0;
  const fastProgress = activePreset.fast > 0 ? clamp((fastElapsedHours / activePreset.fast) * 100) : 0;
  const fastRemainingHours = lastEntry ? Math.max(0, activePreset.fast - fastElapsedHours) : null;
  const nextWindowAt = lastEntry?.created_at
    ? new Date(lastEntry.created_at).getTime() + activePreset.fast * 3_600_000
    : null;
  const fastStage =
    !lastEntry ? 'Aguardando o primeiro registro' : fastElapsedHours >= activePreset.fast ? 'Janela liberada' : fastElapsedHours < 4 ? 'Início do jejum' : fastElapsedHours < activePreset.fast * 0.65 ? 'Transição' : 'Reta final';
  const fastStatus = !lastEntry ? 'Pronto para começar' : fastElapsedHours >= activePreset.fast ? 'Janela aberta' : 'Em jejum';

  const command = useMemo(() => {
    if (timeline.length === 0) {
      return {
        label: 'Em jejum',
        tone: 'text-primary',
        border: 'border-primary/35',
        bg: 'bg-primary/10',
        line: 'Abra a janela com proteína, água e calma. Rei que vence o prato vence o dia.',
      };
    }
    if (remaining != null && remaining < 0) {
      return {
        label: 'Excesso',
        tone: 'text-status-broken',
        border: 'border-status-broken/35',
        bg: 'bg-status-broken/10',
        line: 'A moeda calórica abriu brecha. A próxima refeição precisa ser limpa e estratégica.',
      };
    }
    if (proteinPct != null && proteinPct >= 100 && (remaining == null || remaining >= 0)) {
      return {
        label: 'Domínio',
        tone: 'text-status-ontrack',
        border: 'border-status-ontrack/35',
        bg: 'bg-status-ontrack/10',
        line: 'Proteína no trono. Agora preserve a rota e não venda a vitória por impulso.',
      };
    }
    if (proteinPct != null && proteinPct < 45) {
      return {
        label: 'Caçar proteína',
        tone: 'text-amber-300',
        border: 'border-primary/35',
        bg: 'bg-primary/10',
        line: 'A alcateia cresce com músculo, não com migalhas. A próxima escolha decide o ritmo.',
      };
    }
    return {
      label: 'No caminho',
      tone: 'text-status-ontrack',
      border: 'border-status-ontrack/35',
      bg: 'bg-status-ontrack/10',
      line: 'O dia está sob comando. Ajuste o prato antes que a fome negocie por você.',
    };
  }, [proteinPct, remaining, timeline.length]);

  const mealSummaries = MEALS.map((meal) => ({ meal, entries: entriesOf(diary, meal.key) }));
  const largestMealKcal = Math.max(1, ...mealSummaries.map(({ entries }) => sumEntries(entries).kcal));
  const canSaveMeal = diary.entries.some((entry) => entry.food_id != null && entry.grams > 0);
  const latestMeasurement = measurements[0] ?? null;
  const previousMeasurement = measurements[1] ?? null;
  const weightDelta = latestMeasurement && previousMeasurement ? latestMeasurement.weight_kg - previousMeasurement.weight_kg : null;
  const recentHistory = history.slice(-7);
  const maxHistoryKcal = Math.max(1, ...recentHistory.map((day) => day.kcal));
  const activeGoal = goal ?? {
    id: 0,
    goalType: 'recomposition' as const,
    targetWeightKg: null,
    targetDate: null,
    calorieGoal: goalKcal,
    proteinGoalG: goalProteinG,
    notes: null,
  };
  const measurementPoints = [...measurements].reverse();
  const weightPoints = measurementPoints.map((item) => ({ date: item.measured_at, value: Number(item.weight_kg) })).filter((item) => item.value > 0);
  const waistPoints = measurementPoints.map((item) => ({ date: item.measured_at, value: Number(item.waist_cm) })).filter((item) => item.value > 0);
  const bodyFatPoints = measurementPoints.map((item) => ({ date: item.measured_at, value: Number(item.body_fat_pct) })).filter((item) => item.value > 0);
  const bmi = latestMeasurement?.height_cm ? latestMeasurement.weight_kg / ((latestMeasurement.height_cm / 100) ** 2) : null;
  const waistHipRatio = latestMeasurement?.waist_cm && latestMeasurement.hip_cm ? latestMeasurement.waist_cm / latestMeasurement.hip_cm : null;
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftLocalDay(planDate, index - 3));
  const plansForDate = plans.filter((item) => item.planDate === planDate);
  const openShoppingItems = shoppingItems.filter((item) => !item.isChecked);
  const checkedShoppingItems = shoppingItems.filter((item) => item.isChecked);
  const openMeal = (meal: MealType) => setSheet({ open: true, meal });
  const formatTime = (entry: FoodEntry | null) => (entry?.created_at ? timeFormatter.format(new Date(entry.created_at)) : 'Aguardando');
  const updateMeasurement = (key: keyof MeasurementDraft, value: string) => {
    setMeasurement((current) => ({ ...current, [key]: value }));
  };
  const handleGenerateShopping = async () => {
    const planned = plans.filter((item) => weekDays.includes(item.planDate) && item.savedMealId != null);
    const aggregate = new Map<string, number>();
    planned.forEach((item) => {
      const saved = savedMeals.find((meal) => meal.id === item.savedMealId);
      saved?.items.forEach((food) => aggregate.set(food.name, (aggregate.get(food.name) ?? 0) + food.grams * item.servings));
    });
    if (aggregate.size === 0) return;
    setGeneratingShopping(true);
    try {
      await Promise.all([...aggregate.entries()].map(([name, quantity]) => addShoppingItem.mutateAsync({
        name,
        quantity: Math.round(quantity),
        unit: 'g',
        category: shoppingCategory(name),
        source: 'plano',
        planDate,
      })));
    } finally {
      setGeneratingShopping(false);
    }
  };

  return (
    <main className="nutrition-world flex min-h-screen flex-col gap-4 px-4 pb-28 pt-8 sm:gap-5 sm:px-5 sm:pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="alimentacao" size={30} />
          <h1 className="text-xl font-semibold">Nutrição</h1>
        </div>
      </header>

      <section className="nutrition-command anim-rise flex flex-col gap-3 rounded-[1.5rem] p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-[11px] font-semibold uppercase text-muted-foreground sm:text-xs">Comando metabólico</p>
          <span className={cn('shrink-0 rounded-full border px-3 py-1 text-xs font-bold sm:text-sm', command.border, command.bg, command.tone)}>
            {command.label}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="nutrition-orbit flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl">
            <ThiingsAsset assetKey="alimentacao" size={44} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{timeline.length > 0 ? `${timeline.length} alimento${timeline.length === 1 ? '' : 's'} hoje` : 'Janela ainda fechada'}</p>
            <h2 className="mt-1 max-w-[18ch] text-[1.7rem] font-semibold leading-[1.08] tracking-tight sm:text-[2.05rem]">Proteína no trono</h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">O prato obedece ao plano. O plano obedece ao rei.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricTile
            label={remaining != null ? 'Livre hoje' : 'Consumido'}
            tone={remaining == null || remaining >= 0 ? 'text-status-ontrack' : 'text-status-broken'}
            value={
              <span className={metricSize(remaining ?? totals.kcal)}>
                <CountUp value={remaining ?? totals.kcal} format={kcal} />
              </span>
            }
            hint={goalKcal ? `${Math.round(consumedPct)}% da meta` : undefined}
          />
          <MetricTile
            label="Proteína"
            tone="text-primary"
            value={
              <span className={metricSize(totals.protein)}>
                <CountUp value={totals.protein} format={grams} />
              </span>
            }
            hint={goalProteinG ? `de ${goalProteinG}g` : undefined}
          />
          <MetricTile
            label="Score"
            tone={proteinScore >= 80 ? 'text-status-ontrack' : proteinScore >= 45 ? 'text-primary' : 'text-amber-300'}
            value={<span className={metricSize(proteinScore)}>{proteinScore}</span>}
            hint="proteína"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MacroPill label="Carbo" gramsValue={totals.carb} pct={macroPct.carb} tone="text-sky-300" />
          <MacroPill label="Proteína" gramsValue={totals.protein} pct={macroPct.protein} tone="text-status-ontrack" />
          <MacroPill label="Gordura" gramsValue={totals.fat} pct={macroPct.fat} tone="text-amber-300" />
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{command.line}</p>
      </section>

      <nav className="nutrition-tabs anim-rise flex gap-1 overflow-x-auto rounded-2xl p-1" aria-busy={isViewPending} aria-label="Áreas de nutrição">
        {NUTRITION_VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => startViewTransition(() => setView(item.key))}
            className={cn(
              'press min-h-10 min-w-[4.6rem] shrink-0 rounded-xl px-2 text-xs font-semibold transition-colors',
              view === item.key
                ? 'bg-primary text-primary-foreground shadow-[0_10px_30px_-18px_hsl(var(--primary))]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {view === 'command' && (
        <>
          <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Plano de hoje</p>
                <h2 className="text-xl font-semibold">Rota nutricional</h2>
              </div>
              <ThiingsAsset assetKey="target" size={34} />
            </div>

            <div className="flex flex-col gap-4">
              <ProgressLine
                label="Proteína"
                value={totals.protein}
                max={goalProteinG ?? Math.max(totals.protein, 1)}
                tone="bg-status-ontrack"
                right={goalProteinG ? `${grams(totals.protein)} / ${goalProteinG}g` : grams(totals.protein)}
              />
              <ProgressLine
                label="Calorias"
                value={totals.kcal}
                max={goalKcal ?? Math.max(totals.kcal, 1)}
                tone={remaining != null && remaining < 0 ? 'bg-status-broken' : 'bg-primary'}
                right={goalKcal ? `${kcal(totals.kcal)} / ${goalKcal}` : kcal(totals.kcal)}
              />
            </div>
          </section>

          <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Objetivo corporal</p>
                <h2 className="text-lg font-semibold">Meta ativa</h2>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {GOAL_TYPES.find((item) => item.key === activeGoal.goalType)?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_TYPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGoalType(item.key)}
                  className={cn(
                    'press min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors',
                    goalType === item.key ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Peso-alvo (kg)</span>
                <input type="number" min="0" step="0.1" inputMode="decimal" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Prazo</span>
                <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Calorias (kcal)</span>
                <input type="number" min="1" step="1" value={goalCalories} onChange={(event) => setGoalCalories(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Proteína (g)</span>
                <input type="number" min="1" step="1" value={goalProtein} onChange={(event) => setGoalProtein(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
            </div>
            <button
              type="button"
              onClick={() => saveGoal.mutate({
                goalType,
                targetWeightKg: targetWeight ? Number(targetWeight) : null,
                targetDate: targetDate || null,
                calorieGoal: goalCalories ? Number(goalCalories) : null,
                proteinGoalG: goalProtein ? Number(goalProtein) : null,
                notes: null,
              })}
              disabled={saveGoal.isPending}
              className="press min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saveGoal.isPending ? 'Salvando...' : 'Salvar meta'}
            </button>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="surface-2 anim-rise flex min-h-32 flex-col justify-between rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Janela</p>
                <ThiingsAsset assetKey="fire" size={26} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{hoursLabel(eatingWindowHours)}</p>
                <p className="mt-1 text-xs text-muted-foreground">primeira refeição {formatTime(firstEntry)}</p>
              </div>
            </div>
            <div className="surface-2 anim-rise flex min-h-32 flex-col justify-between rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Jejum</p>
                <ThiingsAsset assetKey="water" size={26} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{hoursLabel(fastingHours)}</p>
                <p className="mt-1 text-xs text-muted-foreground">última refeição {formatTime(lastEntry)}</p>
              </div>
            </div>
          </section>

          <section className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Entrada rápida</p>
                <h2 className="text-lg font-semibold">Registrar refeição</h2>
              </div>
              <ThiingsAsset assetKey="journal" size={32} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MEALS.map((meal) => (
                <button
                  key={meal.key}
                  type="button"
                  onClick={() => openMeal(meal.key)}
                  className="press min-h-12 rounded-2xl border border-border bg-black/10 px-3 text-sm font-semibold text-foreground"
                >
                  {meal.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {view === 'meals' && (
        <div className="flex flex-col gap-4">
          {mealSummaries.map(({ meal, entries }) => (
            <MealCard
              key={meal.key}
              meal={meal}
              entries={entries}
              onAdd={() => openMeal(meal.key)}
              onRemove={(id) => removeEntry.mutate(id)}
              removing={removeEntry.isPending}
            />
          ))}
        </div>
      )}

      {view === 'fasting' && (
        <section className="surface-2 anim-rise flex flex-col gap-5 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Jejum intermitente</p>
              <h2 className="text-xl font-semibold">Seu ritmo {activePreset.key}</h2>
            </div>
            <div className="nutrition-orbit flex h-14 w-14 items-center justify-center rounded-2xl">
              <ThiingsAsset assetKey="fire" size={34} />
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{fastStatus}</p>
                <p className="mt-2 text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-5xl">{hoursLabel(fastingHours)}</p>
                <p className="mt-2 text-sm text-muted-foreground">de {activePreset.fast}h de jejum</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-primary">{fastStage}</p>
                <p className="mt-1 text-sm text-muted-foreground">{fastRemainingHours == null ? 'aguardando refeição' : fastRemainingHours > 0 ? `faltam ${hoursLabel(fastRemainingHours)}` : 'você venceu a janela'}</p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/25" aria-label={`Progresso do jejum: ${Math.round(fastProgress)}%`}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${fastProgress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Última refeição {formatTime(lastEntry)}</span>
              <span>{nextWindowAt ? `Libera às ${timeFormatter.format(new Date(nextWindowAt))}` : 'Registre uma refeição para iniciar'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Em jejum" tone="text-primary" value={<span className="text-lg sm:text-xl">{hoursLabel(fastingHours)}</span>} />
            <MetricTile label="Janela aberta" tone="text-status-ontrack" value={<span className="text-lg sm:text-xl">{hoursLabel(eatingWindowHours)}</span>} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {FAST_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setFastPresetKey(preset.key)}
                className={cn(
                  'press min-h-16 rounded-2xl border px-2 text-center transition-colors',
                  fastPresetKey === preset.key
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                <span className="block text-sm font-bold">{preset.key}</span>
                <span className="mt-1 block text-[10px]">{preset.fast}h jejum</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Jejum</span>
              <span>Alimentação</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-black/30">
              <div className="bg-primary" style={{ width: `${(activePreset.fast / 24) * 100}%` }} />
              <div className="bg-status-ontrack" style={{ width: `${(activePreset.eat / 24) * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <p>Última refeição: <span className="font-semibold text-foreground">{formatTime(lastEntry)}</span></p>
              <p>Primeira refeição: <span className="font-semibold text-foreground">{formatTime(firstEntry)}</span></p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openMeal('lanche')}
            className="press flex min-h-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary"
          >
            Registrar próxima refeição
          </button>
        </section>
      )}

      {view === 'analysis' && (
        <section className="surface-2 anim-rise flex flex-col gap-5 rounded-3xl p-4 sm:p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Análise do dia</p>
            <h2 className="text-xl font-semibold">Leia sua rota</h2>
            <p className="mt-1 text-sm text-muted-foreground">Uma leitura simples para ajustar a próxima escolha.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="Calorias" tone="text-primary" value={<span className="text-base sm:text-lg">{kcal(totals.kcal)}</span>} />
            <MetricTile label="Proteína" tone="text-status-ontrack" value={<span className="text-base sm:text-lg">{grams(totals.protein)}</span>} />
            <MetricTile label="Gordura" tone="text-amber-300" value={<span className="text-base sm:text-lg">{grams(totals.fat)}</span>} />
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/15 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Distribuição por refeição</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            {mealSummaries.map(({ meal, entries }) => {
              const total = sumEntries(entries);
              const pct = total.kcal > 0 ? Math.max(4, (total.kcal / largestMealKcal) * 100) : 0;
              return (
                <div key={meal.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-muted-foreground">{meal.label}</span>
                    <span className="font-semibold tabular-nums">{Math.round(total.kcal)} kcal</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/25">
                    <div className="h-full rounded-full bg-primary/80 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Meta calórica</p>
              <p className="mt-2 text-lg font-bold tabular-nums">{goalKcal ? `${Math.round(consumedPct)}%` : '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{remaining != null ? `${kcal(Math.max(0, remaining))} restantes` : 'Defina uma meta'}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Proteína</p>
              <p className="mt-2 text-lg font-bold tabular-nums">{proteinPct != null ? `${Math.round(proteinPct)}%` : '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{goalProteinG ? `${grams(Math.max(0, goalProteinG - totals.protein))} para a meta` : 'Defina uma meta'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MeasurementChart title="Peso" unit="kg" points={weightPoints} tone="text-primary" />
            <MeasurementChart title="Cintura" unit="cm" points={waistPoints} tone="text-status-ontrack" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="IMC" tone="text-primary" value={<span className="text-base sm:text-lg">{bmi ? bmi.toFixed(1) : '—'}</span>} hint="com altura registrada" />
            <MetricTile label="Cintura/quadril" tone="text-status-ontrack" value={<span className="text-base sm:text-lg">{waistHipRatio ? waistHipRatio.toFixed(2) : '—'}</span>} hint="relação atual" />
            <MetricTile label="Gordura" tone="text-amber-300" value={<span className="text-base sm:text-lg">{bodyFatPoints.at(-1)?.value ? `${bodyFatPoints.at(-1)?.value.toFixed(1)}%` : '—'}</span>} hint="último registro" />
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Tendência</p>
                <h3 className="mt-1 text-base font-semibold">Calorias dos últimos 7 dias</h3>
              </div>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            <div className="mt-5 grid h-32 grid-cols-7 items-end gap-2">
              {recentHistory.map((day) => {
                const height = day.kcal > 0 ? Math.max(8, (day.kcal / maxHistoryKcal) * 100) : 4;
                return (
                  <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="flex h-full w-full items-end rounded-t-xl bg-white/[0.03]">
                      <div
                        className="w-full rounded-t-xl bg-primary/80 transition-[height] duration-500"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.kcal} kcal`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Medidas corporais</p>
                <h3 className="mt-1 text-base font-semibold">Registre sua evolução</h3>
              </div>
              {latestMeasurement && (
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-primary">{latestMeasurement.weight_kg} kg</p>
                  {weightDelta != null && <p className="text-xs text-muted-foreground">{weightDelta > 0 ? '+' : ''}{Math.round(weightDelta * 10) / 10} kg</p>}
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Registro diário</p>
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    Data
                    <input type="date" value={measurementDate} onChange={(event) => setMeasurementDate(event.target.value)} className="min-h-9 rounded-lg border border-border bg-black/10 px-2 text-xs text-foreground" />
                  </label>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Peso e composição podem acompanhar cada dia. Circunferências e dobras ficam aqui para avaliações periódicas, mantendo o histórico no mesmo protocolo.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MeasurementField label="Peso (kg) *" value={measurement.weightKg} onChange={(value) => updateMeasurement('weightKg', value)} />
                  <MeasurementField label="Altura (cm)" value={measurement.heightCm} onChange={(value) => updateMeasurement('heightCm', value)} />
                  <MeasurementField label="Gordura corporal (%)" value={measurement.bodyFatPct} onChange={(value) => updateMeasurement('bodyFatPct', value)} />
                  <MeasurementField label="Água corporal (%)" value={measurement.bodyWaterPct} onChange={(value) => updateMeasurement('bodyWaterPct', value)} />
                  <MeasurementField label="Massa muscular (kg)" value={measurement.muscleMassKg} onChange={(value) => updateMeasurement('muscleMassKg', value)} />
                  <MeasurementField label="Massa óssea (kg)" value={measurement.boneMassKg} onChange={(value) => updateMeasurement('boneMassKg', value)} />
                  <MeasurementField label="Gordura visceral" value={measurement.visceralFatLevel} onChange={(value) => updateMeasurement('visceralFatLevel', value)} />
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Circunferências</p>
                <div className="grid grid-cols-2 gap-3">
                  <MeasurementField label="Pescoço (cm)" value={measurement.neckCm} onChange={(value) => updateMeasurement('neckCm', value)} />
                  <MeasurementField label="Peito (cm)" value={measurement.chestCm} onChange={(value) => updateMeasurement('chestCm', value)} />
                  <MeasurementField label="Cintura (cm)" value={measurement.waistCm} onChange={(value) => updateMeasurement('waistCm', value)} />
                  <MeasurementField label="Abdômen (cm)" value={measurement.abdomenCm} onChange={(value) => updateMeasurement('abdomenCm', value)} />
                  <MeasurementField label="Quadril (cm)" value={measurement.hipCm} onChange={(value) => updateMeasurement('hipCm', value)} />
                  <MeasurementField label="Braço direito (cm)" value={measurement.rightArmCm} onChange={(value) => updateMeasurement('rightArmCm', value)} />
                  <MeasurementField label="Braço esquerdo (cm)" value={measurement.leftArmCm} onChange={(value) => updateMeasurement('leftArmCm', value)} />
                  <MeasurementField label="Coxa direita (cm)" value={measurement.rightThighCm} onChange={(value) => updateMeasurement('rightThighCm', value)} />
                  <MeasurementField label="Coxa esquerda (cm)" value={measurement.leftThighCm} onChange={(value) => updateMeasurement('leftThighCm', value)} />
                  <MeasurementField label="Panturrilha direita (cm)" value={measurement.rightCalfCm} onChange={(value) => updateMeasurement('rightCalfCm', value)} />
                  <MeasurementField label="Panturrilha esquerda (cm)" value={measurement.leftCalfCm} onChange={(value) => updateMeasurement('leftCalfCm', value)} />
                </div>
              </div>

              <details className="rounded-2xl border border-white/5 bg-black/10 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Dobras cutâneas · avaliação avançada</summary>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Use apenas quando a medida for feita com adipômetro e, idealmente, pelo mesmo avaliador.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MeasurementField label="Tríceps (mm)" value={measurement.skinfoldTricepsMm} onChange={(value) => updateMeasurement('skinfoldTricepsMm', value)} />
                  <MeasurementField label="Bíceps (mm)" value={measurement.skinfoldBicepsMm} onChange={(value) => updateMeasurement('skinfoldBicepsMm', value)} />
                  <MeasurementField label="Subescapular (mm)" value={measurement.skinfoldSubscapularMm} onChange={(value) => updateMeasurement('skinfoldSubscapularMm', value)} />
                  <MeasurementField label="Suprailíaca (mm)" value={measurement.skinfoldSuprailiacMm} onChange={(value) => updateMeasurement('skinfoldSuprailiacMm', value)} />
                  <MeasurementField label="Abdominal (mm)" value={measurement.skinfoldAbdominalMm} onChange={(value) => updateMeasurement('skinfoldAbdominalMm', value)} />
                  <MeasurementField label="Coxa (mm)" value={measurement.skinfoldThighMm} onChange={(value) => updateMeasurement('skinfoldThighMm', value)} />
                  <MeasurementField label="Panturrilha (mm)" value={measurement.skinfoldCalfMm} onChange={(value) => updateMeasurement('skinfoldCalfMm', value)} />
                </div>
              </details>
            </div>
            <button
              type="button"
              onClick={() => logMeasurement.mutate(
                {
                  measuredAt: measurementDate || localDayString(timezone),
                  weightKg: Number(measurement.weightKg),
                  heightCm: measurement.heightCm ? Number(measurement.heightCm) : null,
                  bodyFatPct: measurement.bodyFatPct ? Number(measurement.bodyFatPct) : null,
                  bodyWaterPct: measurement.bodyWaterPct ? Number(measurement.bodyWaterPct) : null,
                  muscleMassKg: measurement.muscleMassKg ? Number(measurement.muscleMassKg) : null,
                  boneMassKg: measurement.boneMassKg ? Number(measurement.boneMassKg) : null,
                  visceralFatLevel: measurement.visceralFatLevel ? Number(measurement.visceralFatLevel) : null,
                  neckCm: measurement.neckCm ? Number(measurement.neckCm) : null,
                  chestCm: measurement.chestCm ? Number(measurement.chestCm) : null,
                  waistCm: measurement.waistCm ? Number(measurement.waistCm) : null,
                  abdomenCm: measurement.abdomenCm ? Number(measurement.abdomenCm) : null,
                  hipCm: measurement.hipCm ? Number(measurement.hipCm) : null,
                  rightArmCm: measurement.rightArmCm ? Number(measurement.rightArmCm) : null,
                  leftArmCm: measurement.leftArmCm ? Number(measurement.leftArmCm) : null,
                  rightThighCm: measurement.rightThighCm ? Number(measurement.rightThighCm) : null,
                  leftThighCm: measurement.leftThighCm ? Number(measurement.leftThighCm) : null,
                  rightCalfCm: measurement.rightCalfCm ? Number(measurement.rightCalfCm) : null,
                  leftCalfCm: measurement.leftCalfCm ? Number(measurement.leftCalfCm) : null,
                  skinfoldTricepsMm: measurement.skinfoldTricepsMm ? Number(measurement.skinfoldTricepsMm) : null,
                  skinfoldBicepsMm: measurement.skinfoldBicepsMm ? Number(measurement.skinfoldBicepsMm) : null,
                  skinfoldSubscapularMm: measurement.skinfoldSubscapularMm ? Number(measurement.skinfoldSubscapularMm) : null,
                  skinfoldSuprailiacMm: measurement.skinfoldSuprailiacMm ? Number(measurement.skinfoldSuprailiacMm) : null,
                  skinfoldAbdominalMm: measurement.skinfoldAbdominalMm ? Number(measurement.skinfoldAbdominalMm) : null,
                  skinfoldThighMm: measurement.skinfoldThighMm ? Number(measurement.skinfoldThighMm) : null,
                  skinfoldCalfMm: measurement.skinfoldCalfMm ? Number(measurement.skinfoldCalfMm) : null,
                  measurementContext: 'morning',
                  measurementSource: 'manual',
                },
                { onSuccess: () => {
                  setMeasurement(emptyMeasurement());
                } },
              )}
              disabled={!Number(measurement.weightKg) || logMeasurement.isPending}
              className="press mt-3 min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Salvar medição
            </button>
          </div>
        </section>
      )}

      {view === 'plan' && (
        <section className="surface-2 anim-rise flex flex-col gap-5 rounded-3xl p-4 sm:p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Plano alimentar</p>
            <h2 className="text-xl font-semibold">Suas refeições salvas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Monte uma vez. Registre de novo quando a rotina pedir.</p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Salvar o diário de hoje</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie uma refeição reutilizável a partir dos alimentos registrados hoje.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                placeholder="Ex.: Bowl de frango"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                type="button"
                onClick={() => saveMeal.mutate({ name: mealName || 'Refeição salva', entries: diary.entries }, { onSuccess: () => setMealName('') })}
                disabled={!canSaveMeal || saveMeal.isPending}
                className="press min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>

          {savedMeals.length > 0 ? (
            <div className="flex flex-col gap-3">
              {savedMeals.map((meal) => (
                <div key={meal.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/15 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <ThiingsAsset assetKey="journal" size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{meal.name}</p>
                    <p className="text-xs text-muted-foreground">{meal.items.length} alimento{meal.items.length === 1 ? '' : 's'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => logSavedMeal.mutate(meal)}
                    disabled={logSavedMeal.isPending || meal.items.length === 0}
                    className="press min-h-10 rounded-xl border border-primary/25 px-3 text-xs font-semibold text-primary disabled:opacity-50"
                  >
                    Registrar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma refeição salva ainda.
            </div>
          )}

          <div className="rounded-2xl border border-white/5 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Agenda semanal</p>
                <h3 className="mt-1 text-lg font-semibold">Planeje antes da fome decidir</h3>
              </div>
              <ThiingsAsset assetKey="journal" size={30} />
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setPlanDate(day)}
                  className={cn(
                    'press min-h-14 rounded-xl border px-1 text-center text-[10px] font-semibold transition-colors',
                    planDate === day ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  {shortDayLabel(day)}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Refeição</span>
                <select value={planMeal} onChange={(event) => setPlanMeal(event.target.value as MealType)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                  {MEALS.map((meal) => <option key={meal.key} value={meal.key}>{meal.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Refeição salva</span>
                <select value={planSavedMealId} onChange={(event) => setPlanSavedMealId(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                  <option value="">Sem refeição salva</option>
                  {savedMeals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Nome do plano</span>
                <input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} placeholder="Ex.: Frango, arroz e salada" className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Porções</span>
                <input type="number" min="0.25" step="0.25" value={planServings} onChange={(event) => setPlanServings(event.target.value)} className="min-h-11 rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </label>
            </div>
            <input value={planNote} onChange={(event) => setPlanNote(event.target.value)} placeholder="Observação opcional" className="mt-3 min-h-11 w-full rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
            <button
              type="button"
              onClick={() => savePlan.mutate({ planDate, mealType: planMeal, title: planTitle || savedMeals.find((meal) => meal.id === Number(planSavedMealId))?.name || mealLabel(planMeal), notes: planNote || null, savedMealId: planSavedMealId ? Number(planSavedMealId) : null, servings: Number(planServings) || 1 })}
              disabled={savePlan.isPending}
              className="press mt-3 min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savePlan.isPending ? 'Salvando...' : `Salvar ${mealLabel(planMeal).toLocaleLowerCase('pt-BR')}`}
            </button>

            <div className="mt-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Plano de {shortDayLabel(planDate)}</p>
              {plansForDate.length > 0 ? plansForDate.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 p-3">
                  <button type="button" onClick={() => togglePlan.mutate({ id: item.id, isDone: !item.isDone })} className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm', item.isDone ? 'border-status-ontrack/40 bg-status-ontrack/10 text-status-ontrack' : 'border-border text-muted-foreground')} aria-label={item.isDone ? 'Reabrir refeição planejada' : 'Concluir refeição planejada'}>
                    {item.isDone ? '✓' : '○'}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-semibold', item.isDone && 'text-muted-foreground line-through')}>{mealLabel(item.mealType)} · {item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.servings} porção{item.servings === 1 ? '' : 'ões'}{item.notes ? ` · ${item.notes}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => removePlan.mutate(item.id)} className="press text-xs font-semibold text-muted-foreground hover:text-status-broken" aria-label="Excluir refeição planejada">Excluir</button>
                </div>
              )) : <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">Nenhuma refeição planejada para este dia.</p>}
            </div>
          </div>
        </section>
      )}

      {view === 'shopping' && (
        <section className="surface-2 anim-rise flex flex-col gap-5 rounded-3xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Abastecimento</p>
              <h2 className="text-xl font-semibold">Lista de compras</h2>
              <p className="mt-1 text-sm text-muted-foreground">O plano vira ação. Marque o que já está na despensa.</p>
            </div>
            <ThiingsAsset assetKey="journal" size={32} />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Adicionar item</p>
              <span className="text-xs text-muted-foreground">{openShoppingItems.length} pendentes</span>
            </div>
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_5rem]">
              <input value={shoppingName} onChange={(event) => setShoppingName(event.target.value)} placeholder="Ex.: peito de frango" className="min-h-11 min-w-0 w-full rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
              <input type="number" min="0" step="0.1" value={shoppingQuantity} onChange={(event) => setShoppingQuantity(event.target.value)} placeholder="Qtd." className="min-h-11 min-w-0 w-full rounded-xl border border-border bg-black/10 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/60" />
              <input value={shoppingUnit} onChange={(event) => setShoppingUnit(event.target.value)} placeholder="un" className="min-h-11 min-w-0 w-full rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
            </div>
            <div className="mt-3 flex gap-2">
              <select value={shoppingCategoryValue} onChange={(event) => setShoppingCategoryValue(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-black/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                {SHOPPING_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!shoppingName.trim()) return;
                  addShoppingItem.mutate({ name: shoppingName, quantity: shoppingQuantity ? Number(shoppingQuantity) : null, unit: shoppingUnit || null, category: shoppingCategoryValue }, { onSuccess: () => { setShoppingName(''); setShoppingQuantity(''); setShoppingUnit(''); } });
                }}
                disabled={!shoppingName.trim() || addShoppingItem.isPending}
                className="press min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateShopping}
            disabled={generatingShopping || plans.length === 0 || savedMeals.length === 0}
            className="press flex min-h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {generatingShopping ? 'Gerando lista...' : 'Gerar a partir do plano semanal'}
          </button>

          <div className="flex flex-col gap-4">
            {SHOPPING_CATEGORIES.map((category) => {
              const items = openShoppingItems.filter((item) => item.category === category.key);
              if (items.length === 0) return null;
              return (
                <div key={category.key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{category.label}</p>
                  <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-white/5 bg-black/10 px-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <button type="button" onClick={() => toggleShoppingItem.mutate({ id: item.id, isChecked: true })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground" aria-label={`Marcar ${item.name} como comprado`}>○</button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity != null ? `${item.quantity} ${item.unit ?? ''}` : 'Quantidade livre'}{item.source === 'plano' ? ' · plano' : ''}</p>
                        </div>
                        <button type="button" onClick={() => removeShoppingItem.mutate(item.id)} className="press text-xs font-semibold text-muted-foreground hover:text-status-broken" aria-label={`Excluir ${item.name}`}>Excluir</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {checkedShoppingItems.length > 0 && (
            <details className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Comprados ({checkedShoppingItems.length})</summary>
              <div className="mt-2 flex flex-col divide-y divide-border/60">
                {checkedShoppingItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <button type="button" onClick={() => toggleShoppingItem.mutate({ id: item.id, isChecked: false })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-status-ontrack/40 bg-status-ontrack/10 text-status-ontrack" aria-label={`Desmarcar ${item.name}`}>✓</button>
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">{item.name}</p>
                    <button type="button" onClick={() => removeShoppingItem.mutate(item.id)} className="press text-xs font-semibold text-muted-foreground hover:text-status-broken" aria-label={`Excluir ${item.name}`}>Excluir</button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {shoppingItems.length === 0 && <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Sua lista está vazia. Adicione um item ou gere pelo plano.</div>}
        </section>
      )}

      {SHOW_V2_INTEGRATIONS && view === 'integrations' && (
        <IntegrationHub
          connections={healthConnections}
          records={healthRecords}
          importing={importHealthRecords.isPending}
          onImport={async (records) => { await importHealthRecords.mutateAsync({ records }); }}
          onDisconnect={(provider) => disconnectHealthProvider.mutate(provider)}
        />
      )}

      {view === 'ledger' && (
        <section className="surface-2 anim-rise flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Diário</p>
              <h2 className="text-xl font-semibold">Registros de hoje</h2>
            </div>
            <button
              type="button"
              onClick={() => openMeal('almoco')}
              className="press flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
              aria-label="Adicionar alimento"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {timeline.length > 0 ? (
            <div className="flex flex-col divide-y divide-border/60">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{formatTime(entry)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{entry.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{kcal(entry.kcal)} · {grams(entry.protein_g)} proteína</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry.mutate(entry.id)}
                    disabled={removeEntry.isPending}
                    aria-label="Remover alimento"
                    className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-status-broken disabled:opacity-40"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum registro hoje.
            </div>
          )}
        </section>
      )}

      {sheet.open ? <FoodSheet
        open={sheet.open}
        meal={sheet.meal}
        onClose={() => setSheet((state) => ({ ...state, open: false }))}
        onLog={(foodId, amount, meal) => {
          logFood.mutate(
            { foodId, grams: amount, meal },
            { onSuccess: () => setSheet((state) => ({ ...state, open: false })) },
          );
        }}
        onCreateFood={(food) => createFood.mutateAsync(food)}
        pending={logFood.isPending}
      /> : null}
    </main>
  );
}

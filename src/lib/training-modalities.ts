import type { ThiingsAssetKey } from '@/lib/thiings-registry';

export type ActivityMetric = 'duration' | 'distance' | 'rounds' | 'rpe' | 'poolLength' | 'notes';

export interface TrainingModality {
  label: string;
  icon: ThiingsAssetKey;
  metrics: ActivityMetric[];
  hint: string;
}

export const activityMetricLabels: Record<ActivityMetric, string> = {
  duration: 'duração',
  distance: 'distância',
  rounds: 'rounds',
  rpe: 'intensidade',
  poolLength: 'piscina',
  notes: 'observações',
};

const distanceAndDuration: ActivityMetric[] = ['duration', 'distance', 'rpe'];
const durationAndIntensity: ActivityMetric[] = ['duration', 'rpe'];
const combatMetrics: ActivityMetric[] = ['duration', 'rounds', 'rpe', 'notes'];

const definitions: Record<string, TrainingModality> = {
  caminhada: { label: 'Caminhada', icon: 'cardio-caminhada', metrics: distanceAndDuration, hint: 'Registre o percurso e o tempo total.' },
  'caminhada rapida': { label: 'Caminhada rápida', icon: 'cardio-caminhada-rapida', metrics: distanceAndDuration, hint: 'Registre o percurso e o tempo total.' },
  'caminhada inclinada': { label: 'Caminhada inclinada', icon: 'cardio-caminhada-inclinada', metrics: ['duration', 'distance', 'rpe', 'notes'], hint: 'Inclua distância, tempo e como foi a inclinação.' },
  'trilha/hiking': { label: 'Trilha/Hiking', icon: 'cardio-trilha-hiking', metrics: ['duration', 'distance', 'rpe', 'notes'], hint: 'Registre distância, duração e condições da trilha.' },
  corrida: { label: 'Corrida', icon: 'cardio-corrida', metrics: distanceAndDuration, hint: 'O ritmo será calculado automaticamente.' },
  'corrida intervalada': { label: 'Corrida intervalada', icon: 'cardio-corrida-intervalada', metrics: ['duration', 'distance', 'rounds', 'rpe'], hint: 'Use rounds para os blocos de esforço.' },
  esteira: { label: 'Esteira', icon: 'cardio-esteira', metrics: ['duration', 'distance', 'rpe', 'notes'], hint: 'Registre distância, tempo e observações da sessão.' },
  ciclismo: { label: 'Ciclismo', icon: 'cardio-ciclismo', metrics: distanceAndDuration, hint: 'Registre distância e tempo em movimento.' },
  'bike indoor': { label: 'Bike indoor', icon: 'cardio-bike-indoor', metrics: ['duration', 'distance', 'rpe'], hint: 'A distância pode ser informada se o equipamento exibir.' },
  spinning: { label: 'Spinning', icon: 'cardio-bike-indoor', metrics: durationAndIntensity, hint: 'Registre o tempo e a intensidade percebida.' },
  natacao: { label: 'Natação', icon: 'cardio-natacao', metrics: ['duration', 'distance', 'poolLength', 'rpe'], hint: 'Informe a distância e, se desejar, o tamanho da piscina.' },
  remo: { label: 'Remo', icon: 'cardio-remo', metrics: distanceAndDuration, hint: 'Registre distância e tempo total.' },
  eliptico: { label: 'Elíptico', icon: 'cardio-eliptico', metrics: durationAndIntensity, hint: 'Registre o tempo e a intensidade percebida.' },
  'escada/stepper': { label: 'Escada/Stepper', icon: 'cardio-escada-stepper', metrics: durationAndIntensity, hint: 'Registre o tempo e a intensidade percebida.' },
  hiit: { label: 'HIIT', icon: 'cardio-hiit', metrics: combatMetrics, hint: 'Use rounds para blocos ou circuitos.' },
  funcional: { label: 'Funcional', icon: 'cardio-funcional', metrics: ['duration', 'rounds', 'rpe', 'notes'], hint: 'Registre blocos, duração e intensidade.' },
  'pular corda': { label: 'Pular corda', icon: 'cardio-pular-corda', metrics: ['duration', 'rounds', 'rpe'], hint: 'Use rounds para as sequências realizadas.' },
  danca: { label: 'Dança', icon: 'cardio-danca', metrics: durationAndIntensity, hint: 'Registre o tempo e a intensidade percebida.' },
  yoga: { label: 'Yoga', icon: 'cardio-yoga', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo, intensidade e foco da prática.' },
  pilates: { label: 'Pilates', icon: 'cardio-pilates', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo, intensidade e foco da prática.' },
  mobilidade: { label: 'Mobilidade', icon: 'cardio-mobilidade', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo e a região trabalhada.' },
  alongamento: { label: 'Alongamento', icon: 'cardio-alongamento', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo e o foco da sessão.' },
  boxe: { label: 'Boxe', icon: 'cardio-boxe', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  kickboxing: { label: 'Kickboxing', icon: 'cardio-kickboxing', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  'muay thai': { label: 'Muay Thai', icon: 'cardio-muay-thai', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  'jiu-jitsu': { label: 'Jiu-jitsu', icon: 'cardio-jiu-jitsu', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  judo: { label: 'Judô', icon: 'cardio-judo', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  mma: { label: 'MMA', icon: 'cardio-mma', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  'karate shotokan': { label: 'Karatê Shotokan', icon: 'cardio-karate-shotokan', metrics: combatMetrics, hint: 'Registre rounds, tempo e intensidade.' },
  futebol: { label: 'Futebol', icon: 'cardio-futebol', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo jogado e a intensidade.' },
  basquete: { label: 'Basquete', icon: 'cardio-basquete', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo jogado e a intensidade.' },
  tenis: { label: 'Tênis', icon: 'cardio-tenis', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo jogado e a intensidade.' },
  volei: { label: 'Vôlei', icon: 'cardio-voley', metrics: ['duration', 'rpe', 'notes'], hint: 'Registre o tempo jogado e a intensidade.' },
  skate: { label: 'Skate', icon: 'cardio-skate', metrics: ['duration', 'distance', 'rpe'], hint: 'Registre distância, tempo e intensidade.' },
  patins: { label: 'Patins', icon: 'cardio-patins', metrics: ['duration', 'distance', 'rpe'], hint: 'Registre distância, tempo e intensidade.' },
};

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function getTrainingModality(name: string): TrainingModality {
  const normalized = normalize(name);
  return definitions[normalized] ?? {
    label: name,
    icon: 'cardio',
    metrics: ['duration', 'distance', 'rpe', 'notes'],
    hint: 'Registre as métricas disponíveis para esta atividade.',
  };
}

export function describeActivityMetrics(modality: TrainingModality): string {
  const labels = modality.metrics.map((metric) => activityMetricLabels[metric]);
  if (labels.length <= 1) return labels[0] ?? 'métricas';
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

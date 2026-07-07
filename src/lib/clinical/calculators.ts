// Calculadoras clínicas determinísticas.
// Fórmulas consagradas (matemáticas), testáveis. NÃO substituem julgamento
// clínico. Toda entrada é validada; retornos nulos indicam entrada inválida.

export type Sex = 'M' | 'F';

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

const pos = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Clearance de creatinina — Cockcroft-Gault (mL/min).
 * CrCl = ((140 - idade) × peso × fatorSexo) / (72 × creatinina sérica mg/dL)
 * fatorSexo: 0,85 para mulheres.
 */
export function cockcroftGault(input: {
  ageYears: number;
  weightKg: number;
  serumCreatinineMgDl: number;
  sex: Sex;
}): number | null {
  const { ageYears, weightKg, serumCreatinineMgDl, sex } = input;
  if (!pos(weightKg) || !pos(serumCreatinineMgDl)) return null;
  if (!Number.isFinite(ageYears) || ageYears <= 0 || ageYears > 120) return null;
  const sexFactor = sex === 'F' ? 0.85 : 1;
  const crcl = ((140 - ageYears) * weightKg * sexFactor) / (72 * serumCreatinineMgDl);
  if (crcl <= 0) return null;
  return round(crcl, 0);
}

/** Faixa de função renal (referência categorias KDIGO de TFG). */
export function renalStage(crcl: number): { code: string; label: string; tone: string } {
  if (crcl >= 90) return { code: 'G1', label: 'Normal ou alta', tone: '145 63% 45%' };
  if (crcl >= 60) return { code: 'G2', label: 'Redução leve', tone: '145 55% 48%' };
  if (crcl >= 45) return { code: 'G3a', label: 'Leve a moderada', tone: '46 96% 45%' };
  if (crcl >= 30) return { code: 'G3b', label: 'Moderada a grave', tone: '28 92% 52%' };
  if (crcl >= 15) return { code: 'G4', label: 'Grave', tone: '0 74% 56%' };
  return { code: 'G5', label: 'Falência renal', tone: '0 74% 45%' };
}

/**
 * Superfície corporal — fórmula de Mosteller (m²).
 * BSA = √((altura_cm × peso_kg) / 3600)
 */
export function bsaMosteller(input: {
  heightCm: number;
  weightKg: number;
}): number | null {
  const { heightCm, weightKg } = input;
  if (!pos(heightCm) || !pos(weightKg)) return null;
  return round(Math.sqrt((heightCm * weightKg) / 3600), 2);
}

/**
 * Dose por peso (mg). doseTotal = mgPorKg × peso, opcionalmente limitada por
 * uma dose máxima. Retorna também se a dose foi limitada pelo teto.
 */
export function doseByWeight(input: {
  mgPerKg: number;
  weightKg: number;
  maxMg?: number | null;
}): { dose: number; capped: boolean } | null {
  const { mgPerKg, weightKg, maxMg } = input;
  if (!pos(mgPerKg) || !pos(weightKg)) return null;
  const raw = mgPerKg * weightKg;
  if (pos(maxMg) && raw > maxMg) return { dose: round(maxMg, 2), capped: true };
  return { dose: round(raw, 2), capped: false };
}

/**
 * Velocidade de infusão.
 * mL/h = volume / tempo(h);  gotas/min = (volume × fator gotejo) / tempo(min).
 * Fator de gotejo: 20 (macrogotas, padrão) ou 60 (microgotas).
 */
export function infusionRate(input: {
  volumeMl: number;
  hours: number;
  dropFactor?: number;
}): { mlPerHour: number; dropsPerMin: number } | null {
  const { volumeMl, hours, dropFactor = 20 } = input;
  if (!pos(volumeMl) || !pos(hours) || !pos(dropFactor)) return null;
  const minutes = hours * 60;
  return {
    mlPerHour: round(volumeMl / hours, 1),
    dropsPerMin: round((volumeMl * dropFactor) / minutes, 0),
  };
}

export const SEVERITY_META: Record<
  'contraindicada' | 'grave' | 'moderada' | 'leve',
  { label: string; tone: string; rank: number }
> = {
  contraindicada: { label: 'Contraindicada', tone: '0 74% 45%', rank: 4 },
  grave: { label: 'Grave', tone: '0 74% 56%', rank: 3 },
  moderada: { label: 'Moderada', tone: '28 92% 52%', rank: 2 },
  leve: { label: 'Leve', tone: '46 96% 45%', rank: 1 },
};

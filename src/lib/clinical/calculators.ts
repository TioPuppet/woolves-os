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

/* ===================== Clínica+: calculadoras expandidas ===================== */

/**
 * TFG estimada — CKD-EPI 2021 (sem raça), creatinina (mL/min/1,73m²).
 * eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^-1.200 × 0.9938^idade × (1.012 se F)
 */
export function ckdEpi2021(input: {
  ageYears: number;
  serumCreatinineMgDl: number;
  sex: Sex;
}): number | null {
  const { ageYears, serumCreatinineMgDl: scr, sex } = input;
  if (!pos(scr) || !Number.isFinite(ageYears) || ageYears <= 0) return null;
  const kappa = sex === 'F' ? 0.7 : 0.9;
  const alpha = sex === 'F' ? -0.241 : -0.302;
  const r = scr / kappa;
  const egfr =
    142 *
    Math.min(r, 1) ** alpha *
    Math.max(r, 1) ** -1.2 *
    0.9938 ** ageYears *
    (sex === 'F' ? 1.012 : 1);
  return round(egfr, 0);
}

/** Cálcio corrigido pela albumina (mg/dL). Ca + 0,8 × (4,0 − albumina). */
export function correctedCalcium(input: {
  calciumMgDl: number;
  albuminGDl: number;
}): number | null {
  const { calciumMgDl, albuminGDl } = input;
  if (!pos(calciumMgDl) || !pos(albuminGDl)) return null;
  return round(calciumMgDl + 0.8 * (4.0 - albuminGDl), 1);
}

/** Sódio corrigido pela glicemia (mEq/L). Na + 0,016 × (glicose − 100). */
export function correctedSodium(input: {
  sodium: number;
  glucoseMgDl: number;
}): number | null {
  const { sodium, glucoseMgDl } = input;
  if (!pos(sodium) || !pos(glucoseMgDl)) return null;
  return round(sodium + 0.016 * (glucoseMgDl - 100), 1);
}

/** Ânion gap (mEq/L) e, opcionalmente, corrigido pela albumina. */
export function anionGap(input: {
  sodium: number;
  chloride: number;
  bicarbonate: number;
  albuminGDl?: number | null;
}): { gap: number; corrected: number | null } | null {
  const { sodium, chloride, bicarbonate, albuminGDl } = input;
  if (!pos(sodium) || !pos(chloride) || !pos(bicarbonate)) return null;
  const gap = round(sodium - (chloride + bicarbonate), 1);
  const corrected = pos(albuminGDl)
    ? round(gap + 2.5 * (4.0 - albuminGDl), 1)
    : null;
  return { gap, corrected };
}

/** Pressão arterial média (mmHg). MAP = (PAS + 2×PAD) / 3. */
export function meanArterialPressure(input: {
  systolic: number;
  diastolic: number;
}): number | null {
  const { systolic, diastolic } = input;
  if (!pos(systolic) || !pos(diastolic)) return null;
  return round((systolic + 2 * diastolic) / 3, 0);
}

/** QTc por Bazett e Fridericia (ms). QT em ms, FC em bpm. */
export function qtc(input: {
  qtMs: number;
  heartRate: number;
}): { bazett: number; fridericia: number } | null {
  const { qtMs, heartRate } = input;
  if (!pos(qtMs) || !pos(heartRate)) return null;
  const rr = 60 / heartRate; // segundos
  return {
    bazett: round(qtMs / Math.sqrt(rr), 0),
    fridericia: round(qtMs / Math.cbrt(rr), 0),
  };
}

export function bmiCategory(bmi: number): { label: string; tone: string } {
  if (bmi < 18.5) return { label: 'Baixo peso', tone: '46 96% 45%' };
  if (bmi < 25) return { label: 'Eutrofia', tone: '145 63% 45%' };
  if (bmi < 30) return { label: 'Sobrepeso', tone: '46 96% 45%' };
  if (bmi < 35) return { label: 'Obesidade grau I', tone: '28 92% 52%' };
  if (bmi < 40) return { label: 'Obesidade grau II', tone: '0 74% 56%' };
  return { label: 'Obesidade grau III', tone: '0 74% 45%' };
}

/** IMC (kg/m²) + classificação. */
export function bmi(input: { weightKg: number; heightCm: number }):
  | { value: number; category: { label: string; tone: string } }
  | null {
  const { weightKg, heightCm } = input;
  if (!pos(weightKg) || !pos(heightCm)) return null;
  const m = heightCm / 100;
  const value = round(weightKg / (m * m), 1);
  return { value, category: bmiCategory(value) };
}

/** Peso ideal — Devine (kg). Homem 50 + 2,3×(pol−60); mulher 45,5 + 2,3×(pol−60). */
export function idealBodyWeight(input: {
  heightCm: number;
  sex: Sex;
}): number | null {
  const { heightCm, sex } = input;
  if (!pos(heightCm)) return null;
  const inches = heightCm / 2.54;
  const base = sex === 'F' ? 45.5 : 50;
  const ibw = base + 2.3 * (inches - 60);
  return round(Math.max(ibw, 0), 1);
}

/** Peso ajustado (kg). IBW + 0,4 × (peso atual − IBW). */
export function adjustedBodyWeight(input: {
  weightKg: number;
  heightCm: number;
  sex: Sex;
}): number | null {
  const ibw = idealBodyWeight({ heightCm: input.heightCm, sex: input.sex });
  if (ibw == null || !pos(input.weightKg)) return null;
  return round(ibw + 0.4 * (input.weightKg - ibw), 1);
}

/** Hidratação de manutenção — Holliday-Segar. Retorna mL/dia e mL/h. */
export function maintenanceFluids(input: { weightKg: number }):
  | { mlPerDay: number; mlPerHour: number }
  | null {
  const { weightKg: w } = input;
  if (!pos(w)) return null;
  let perDay: number;
  if (w <= 10) perDay = w * 100;
  else if (w <= 20) perDay = 1000 + (w - 10) * 50;
  else perDay = 1500 + (w - 20) * 20;
  return { mlPerDay: round(perDay, 0), mlPerHour: round(perDay / 24, 0) };
}

import type { ThiingsAssetKey } from '@/lib/thiings-registry';

/** Muscle groups — key doubles as the thiings asset key for the recruited muscle. */
export const MUSCLE_GROUPS: { key: ThiingsAssetKey; label: string }[] = [
  { key: 'peito', label: 'Peito' },
  { key: 'costas', label: 'Costas' },
  { key: 'ombro', label: 'Ombro' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'perna-quadriceps', label: 'Quadríceps' },
  { key: 'perna-posterior', label: 'Posterior' },
  { key: 'gluteo', label: 'Glúteo' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'panturrilha', label: 'Panturrilha' },
  { key: 'cardio', label: 'Cardio' },
];

const KEYS = new Set(MUSCLE_GROUPS.map((m) => m.key as string));

/** Narrow a stored muscle_group string to a valid asset key, else fallback. */
export function muscleAssetKey(
  value: string | null | undefined,
): ThiingsAssetKey {
  return value && KEYS.has(value) ? (value as ThiingsAssetKey) : 'calories';
}

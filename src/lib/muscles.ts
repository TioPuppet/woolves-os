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

function normalizeGroupKey(value: string | null | undefined): string | null {
  return (
    value
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim() ?? null
  );
}

/** Narrow a stored muscle_group string to a valid asset key, else fallback. */
export function muscleAssetKey(
  value: string | null | undefined,
): ThiingsAssetKey {
  const normalized = normalizeGroupKey(value);
  return normalized && KEYS.has(normalized)
    ? (normalized as ThiingsAssetKey)
    : 'calories';
}

/** Human label for a muscle-group key. */
export function muscleLabel(key: string): string {
  const normalized = normalizeGroupKey(key) ?? key;
  if (normalized === 'outros') return 'Outros';
  return MUSCLE_GROUPS.find((m) => m.key === normalized)?.label ?? key;
}

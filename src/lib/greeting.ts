/** How to address the user: "Dr. Cleomárcio", "Sr. João", or first name only. */
export function calledName(
  title: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const first = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return 'Lobo';
  const t = (title ?? '').trim();
  return t ? `${t} ${first}` : first;
}

/** Available treatments for onboarding/profile. Empty value = none. */
export const TITLES: { value: string; label: string }[] = [
  { value: '', label: 'Nenhum' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'Sra.', label: 'Sra.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Dra.', label: 'Dra.' },
];

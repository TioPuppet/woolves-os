/** How to address the user: "Dr. Cleomárcio Miguel", "Sr. João", or full name only. */
export function calledName(
  title: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const name = (displayName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return 'Lobo';
  const t = (title ?? '').trim();
  return t ? `${t} ${name}` : name;
}

/** Available treatments for onboarding/profile. Empty value = none. */
export const TITLES: { value: string; label: string }[] = [
  { value: '', label: 'Nenhum' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'Sra.', label: 'Sra.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Dra.', label: 'Dra.' },
];

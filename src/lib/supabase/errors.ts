interface SupabaseLikeError {
  message?: string;
}

export function throwIfSupabaseError(
  error: SupabaseLikeError | null | undefined,
  context: string,
): void {
  if (!error) return;
  throw new Error(`${context}: ${error.message ?? 'Supabase request failed'}`);
}

/**
 * Groq (free) LLM call — server-only. Returns null when the key is missing or
 * the call fails, so callers can fall back gracefully. NEVER import client-side.
 */
export async function callGroq(
  system: string,
  user: string,
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.6,
          max_tokens: 700,
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  } catch {
    return null;
  }
}

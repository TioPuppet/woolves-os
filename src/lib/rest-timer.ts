// Estado do timer de descanso, persistido em localStorage por TEMPO ABSOLUTO
// (endsAt), para sobreviver a troca de tela e ao app em segundo plano.

const KEY = 'woolves-rest';
const EVT = 'woolves-rest';

export interface RestState {
  endsAt: number; // epoch ms
  total: number; // segundos
}

export function getRest(): RestState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as RestState;
    if (!r || typeof r.endsAt !== 'number' || typeof r.total !== 'number') return null;
    return r;
  } catch {
    return null;
  }
}

function write(s: RestState | null) {
  if (typeof window === 'undefined') return;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function startRest(seconds: number) {
  write({ endsAt: Date.now() + seconds * 1000, total: seconds });
}

export function adjustRest(deltaSec: number) {
  const r = getRest();
  if (!r) return;
  write({ endsAt: r.endsAt + deltaSec * 1000, total: Math.max(1, r.total + deltaSec) });
}

export function clearRest() {
  write(null);
}

export const REST_EVENT = EVT;

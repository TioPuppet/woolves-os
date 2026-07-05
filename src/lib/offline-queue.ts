/**
 * Offline mutation queue (R5 / PWA) — quick logs only (water, habit).
 * Backed by IndexedDB so pending logs survive reloads and are replayed when
 * connectivity returns. Check-in and other actions are NOT queued (deliberate,
 * online-only end-of-day action).
 */

export type QueuedMutation =
  | { kind: 'water'; ml: number }
  | { kind: 'habit'; habitKey: string; done: boolean };

const DB_NAME = 'woolves-offline';
const STORE = 'mutations';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueMutation(m: QueuedMutation): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...m, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readQueue(): Promise<
  Array<QueuedMutation & { id: number }>
> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  const items = await new Promise<Array<QueuedMutation & { id: number }>>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Array<QueuedMutation & { id: number }>);
      req.onerror = () => reject(req.error);
    },
  );
  db.close();
  return items;
}

export async function clearQueue(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

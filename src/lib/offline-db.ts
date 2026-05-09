/**
 * offline-db.ts
 * Client-side IndexedDB abstraction for offline-first data.
 * All data that the user needs while offline is stored here.
 * This is the single source of truth for offline reading.
 */

const DB_NAME    = "reimbursify-offline";
const DB_VERSION = 3;

// ── Store names ──────────────────────────────────────────────────────────────
const STORES = {
  TRIPS:       "trips",
  EXPENSES:    "expenses",
  FORMS:       "forms",
  SUBMISSIONS: "submissions",
  GROUPS:      "groups",
  SYNC_QUEUE:  "sync-queue",
  API_CACHE:   "api-cache",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DB singleton
// ─────────────────────────────────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = e.oldVersion;

      // In version 3, we need to recreate the sync-queue to add autoIncrement
      if (oldVersion < 3 && db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.deleteObjectStore(STORES.SYNC_QUEUE);
      }

      const create = (name: string, keyPath: string, indices: { name: string; key: string; unique?: boolean }[] = [], autoInc: boolean = false) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath, autoIncrement: autoInc });
          indices.forEach((idx) => store.createIndex(idx.name, idx.key, { unique: idx.unique ?? false }));
          return store;
        }
        return req.transaction!.objectStore(name);
      };

      create(STORES.TRIPS,       "id", [{ name: "updatedAt", key: "updatedAt" }]);
      create(STORES.EXPENSES,    "id", [{ name: "tripId",    key: "tripId"    }]);
      create(STORES.FORMS,       "id");
      create(STORES.SUBMISSIONS, "id", [{ name: "templateId", key: "templateId" }]);
      create(STORES.GROUPS,      "id");
      create(STORES.SYNC_QUEUE,  "id", [{ name: "createdAt",  key: "createdAt"  }], true);
      create(STORES.API_CACHE,   "url");
    };
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror   = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────────────
async function put(store: string, data: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function getOne(store: string, key: IDBValidKey): Promise<any | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => resolve(null);
  });
}

async function getAll(store: string): Promise<any[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => resolve([]);
  });
}

async function getAllByIndex(store: string, index: string, key: IDBValidKey): Promise<any[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).index(index).getAll(key);
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => resolve([]);
  });
}

async function remove(store: string, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIPS
// ─────────────────────────────────────────────────────────────────────────────
export const cacheTrips    = (trips: any[])           => Promise.all(trips.map((t) => put(STORES.TRIPS, { ...t, _cachedAt: Date.now() })));
export const getCachedTrips = ()                       => getAll(STORES.TRIPS);
export const getCachedTrip  = (id: string)             => getOne(STORES.TRIPS, id);
export const cacheSingleTrip = (trip: any)             => put(STORES.TRIPS, { ...trip, _cachedAt: Date.now() });

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────
export const cacheExpenses          = (exps: any[])    => Promise.all(exps.map((e) => put(STORES.EXPENSES, { ...e, _cachedAt: Date.now() })));
export const getCachedExpensesByTrip = (tripId: string) => getAllByIndex(STORES.EXPENSES, "tripId", tripId);
export const getCachedExpense        = (id: string)     => getOne(STORES.EXPENSES, id);
export const cacheSingleExpense      = (exp: any)       => put(STORES.EXPENSES, { ...exp, _cachedAt: Date.now() });
export const removeCachedExpense     = (id: string)     => remove(STORES.EXPENSES, id);

// ─────────────────────────────────────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────────────────────────────────────
export const cacheForms    = (forms: any[])   => Promise.all(forms.map((f) => put(STORES.FORMS, { ...f, _cachedAt: Date.now() })));
export const getCachedForms = ()              => getAll(STORES.FORMS);
export const getCachedForm  = (id: string)    => getOne(STORES.FORMS, id);

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
export const cacheSubmissions    = (subs: any[]) => Promise.all(subs.map((s) => put(STORES.SUBMISSIONS, { ...s, _cachedAt: Date.now() })));
export const getCachedSubmissions = ()            => getAll(STORES.SUBMISSIONS);
export const cacheSingleSubmission = (sub: any)  => put(STORES.SUBMISSIONS, { ...sub, _cachedAt: Date.now() });

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────────────────────
export const cacheGroups    = (groups: any[]) => Promise.all(groups.map((g) => put(STORES.GROUPS, { ...g, _cachedAt: Date.now() })));
export const getCachedGroups = ()            => getAll(STORES.GROUPS);
export const cacheSingleGroup = (group: any)  => put(STORES.GROUPS, { ...group, _cachedAt: Date.now() });

// ─────────────────────────────────────────────────────────────────────────────
// SYNC QUEUE  (mutations made while offline)
// ─────────────────────────────────────────────────────────────────────────────
export interface SyncItem {
  id?: number;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  createdAt: number;
  synced: boolean;
  /** Optimistic local id (for UI display before server confirms) */
  localId?: string;
  /** Human-readable description for UI */
  description?: string;
}

export async function addToSyncQueue(item: Omit<SyncItem, "id" | "createdAt" | "synced">): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const entry: SyncItem = { ...item, createdAt: Date.now(), synced: false };
    const req = tx.objectStore(STORES.SYNC_QUEUE).add(entry);
    req.onsuccess = () => resolve(req.result as number);
    tx.onerror    = () => reject(tx.error);
  });
}

export const getSyncQueue   = () => getAll(STORES.SYNC_QUEUE) as Promise<SyncItem[]>;
export const removeSyncItem = (id: number) => remove(STORES.SYNC_QUEUE, id);
export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    tx.objectStore(STORES.SYNC_QUEUE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Flush sync queue  –  call this when connectivity is restored
// ─────────────────────────────────────────────────────────────────────────────
export async function flushSyncQueue(onProgress?: (done: number, total: number) => void): Promise<{ flushed: number; failed: number }> {
  const items = await getSyncQueue();
  if (!items.length) return { flushed: 0, failed: 0 };

  let flushed = 0, failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method:  item.method,
        headers: { "Content-Type": "application/json", ...(item.headers || {}) },
        body:    item.body,
      });

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Either success or permanent failure (4xx) — remove from queue
        await removeSyncItem(item.id!);
        flushed++;
        onProgress?.(flushed, items.length);
      } else {
        failed++;
      }
    } catch (_) {
      // Still offline
      failed++;
      break;
    }
  }

  return { flushed, failed };
}

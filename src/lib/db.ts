import type { Draft, Entry, PhotoBlobs, PhotoMeta } from './types';

const DB_NAME = 'moments';
const DB_VERSION = 1;

type StoreName = 'entries' | 'drafts' | 'photos' | 'photoBlobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('photoBlobs')) db.createObjectStore('photoBlobs', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('The journal is open in another tab.'));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  return request(db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}

async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  return request(db.transaction(store).objectStore(store).get(key) as IDBRequest<T | undefined>);
}

async function put(store: StoreName, value: unknown): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

async function del(store: StoreName, key: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}

export const db = {
  allEntries: () => getAll<Entry>('entries'),
  allPhotoMeta: () => getAll<PhotoMeta>('photos'),
  allDrafts: () => getAll<Draft>('drafts'),
  getDraft: (date: string) => get<Draft>('drafts', date),
  getEntry: (date: string) => get<Entry>('entries', date),
  getBlobs: (id: string) => get<PhotoBlobs>('photoBlobs', id),

  putDraft: (d: Draft) => put('drafts', d),
  deleteDraft: (date: string) => del('drafts', date),

  async putPhoto(meta: PhotoMeta, blobs: PhotoBlobs): Promise<void> {
    const conn = await open();
    const tx = conn.transaction(['photos', 'photoBlobs'], 'readwrite');
    tx.objectStore('photos').put(meta);
    tx.objectStore('photoBlobs').put(blobs);
    return done(tx);
  },

  /** Save an entry and clear its draft atomically. */
  async saveEntry(entry: Entry): Promise<void> {
    const conn = await open();
    const tx = conn.transaction(['entries', 'drafts'], 'readwrite');
    tx.objectStore('entries').put(entry);
    tx.objectStore('drafts').delete(entry.date);
    return done(tx);
  },

  async deleteEntry(date: string, photoIds: string[]): Promise<void> {
    const conn = await open();
    const tx = conn.transaction(['entries', 'drafts', 'photos', 'photoBlobs'], 'readwrite');
    tx.objectStore('entries').delete(date);
    tx.objectStore('drafts').delete(date);
    for (const id of photoIds) {
      tx.objectStore('photos').delete(id);
      tx.objectStore('photoBlobs').delete(id);
    }
    return done(tx);
  },

  async deletePhotos(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const conn = await open();
    const tx = conn.transaction(['photos', 'photoBlobs'], 'readwrite');
    for (const id of ids) {
      tx.objectStore('photos').delete(id);
      tx.objectStore('photoBlobs').delete(id);
    }
    return done(tx);
  },

  async photoIdsForDate(date: string): Promise<string[]> {
    const conn = await open();
    const idx = conn.transaction('photos').objectStore('photos').index('date');
    return request(idx.getAllKeys(date) as IDBRequest<string[]>);
  },

  async clearAll(): Promise<void> {
    const conn = await open();
    const stores: StoreName[] = ['entries', 'drafts', 'photos', 'photoBlobs'];
    const tx = conn.transaction(stores, 'readwrite');
    for (const s of stores) tx.objectStore(s).clear();
    return done(tx);
  },
};

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

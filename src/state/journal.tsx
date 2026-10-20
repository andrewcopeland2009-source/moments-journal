import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db, requestPersistence } from '../lib/db';
import { todayKey } from '../lib/dates';
import { forgetUrls, importPhoto } from '../lib/images';
import { LIMITS, type Draft, type Entry, type EntryMode, type PhotoMeta } from '../lib/types';
import { applyWordLimit } from '../lib/words';

export interface EntryInput {
  date: string;
  mode: EntryMode;
  text: string;
  photoIds: string[];
}

interface Ctx {
  ready: boolean;
  error: string | null;
  today: string;
  entries: Map<string, Entry>;
  /** Newest first. */
  sorted: Entry[];
  photos: Map<string, PhotoMeta>;
  drafts: Map<string, Draft>;
  saveEntry: (input: EntryInput) => Promise<Entry>;
  deleteEntry: (date: string) => Promise<void>;
  saveDraft: (input: EntryInput) => Promise<void>;
  discardDraft: (date: string) => Promise<void>;
  addPhoto: (file: File, date: string) => Promise<PhotoMeta>;
  reload: () => Promise<void>;
}

const JournalContext = createContext<Ctx>(null!);

/** Enforce the daily limits regardless of what the UI sent. */
export function sanitize(input: EntryInput): EntryInput {
  const mode: EntryMode = input.mode === 'photos' ? 'photos' : 'words';
  const ids = [...new Set(input.photoIds)];
  if (mode === 'photos') return { date: input.date, mode, text: '', photoIds: ids.slice(0, LIMITS.photosOnly) };
  return {
    date: input.date,
    mode,
    text: applyWordLimit('', input.text, LIMITS.words).value,
    photoIds: ids.slice(0, LIMITS.photosWithWords),
  };
}

export const isEmptyInput = (i: Pick<EntryInput, 'text' | 'photoIds'>) => !i.text.trim() && i.photoIds.length === 0;

export function JournalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState(new Map<string, Entry>());
  const [photos, setPhotos] = useState(new Map<string, PhotoMeta>());
  const [drafts, setDrafts] = useState(new Map<string, Draft>());
  const [today, setToday] = useState(todayKey);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const reload = useCallback(async () => {
    try {
      const [e, p, d] = await Promise.all([db.allEntries(), db.allPhotoMeta(), db.allDrafts()]);
      setEntries(new Map(e.map((x) => [x.date, x])));
      setPhotos(new Map(p.map((x) => [x.id, x])));
      setDrafts(new Map(d.map((x) => [x.date, x])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your journal could not be opened.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
    requestPersistence();
  }, [reload]);

  // Roll over at midnight, and when returning to the app the next morning.
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  /** Delete photographs for a day that neither the entry nor its draft reference. */
  const collect = useCallback(async (date: string, keep: string[]) => {
    const all = await db.photoIdsForDate(date);
    const orphans = all.filter((id) => !keep.includes(id));
    if (!orphans.length) return;
    await db.deletePhotos(orphans);
    forgetUrls(orphans);
    setPhotos((m) => {
      const n = new Map(m);
      orphans.forEach((id) => n.delete(id));
      return n;
    });
  }, []);

  const saveEntry = useCallback(
    async (raw: EntryInput) => {
      const input = sanitize(raw);
      const existing = entriesRef.current.get(input.date);
      const now = Date.now();
      const entry: Entry = { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now };
      await db.saveEntry(entry);
      setEntries((m) => new Map(m).set(entry.date, entry));
      setDrafts((m) => {
        const n = new Map(m);
        n.delete(entry.date);
        return n;
      });
      await collect(entry.date, entry.photoIds);
      return entry;
    },
    [collect],
  );

  const deleteEntry = useCallback(async (date: string) => {
    const ids = await db.photoIdsForDate(date);
    await db.deleteEntry(date, ids);
    forgetUrls(ids);
    setEntries((m) => {
      const n = new Map(m);
      n.delete(date);
      return n;
    });
    setDrafts((m) => {
      const n = new Map(m);
      n.delete(date);
      return n;
    });
    setPhotos((m) => {
      const n = new Map(m);
      ids.forEach((id) => n.delete(id));
      return n;
    });
  }, []);

  const saveDraft = useCallback(async (raw: EntryInput) => {
    const input = sanitize(raw);
    const draft: Draft = { ...input, updatedAt: Date.now() };
    await db.putDraft(draft);
    setDrafts((m) => new Map(m).set(draft.date, draft));
  }, []);

  const discardDraft = useCallback(
    async (date: string) => {
      await db.deleteDraft(date);
      setDrafts((m) => {
        const n = new Map(m);
        n.delete(date);
        return n;
      });
      await collect(date, entriesRef.current.get(date)?.photoIds ?? []);
    },
    [collect],
  );

  const addPhoto = useCallback(async (file: File, date: string) => {
    const meta = await importPhoto(file, date);
    setPhotos((m) => new Map(m).set(meta.id, meta));
    return meta;
  }, []);

  const sorted = useMemo(() => [...entries.values()].sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  const value = useMemo(
    () => ({
      ready,
      error,
      today,
      entries,
      sorted,
      photos,
      drafts,
      saveEntry,
      deleteEntry,
      saveDraft,
      discardDraft,
      addPhoto,
      reload,
    }),
    [ready, error, today, entries, sorted, photos, drafts, saveEntry, deleteEntry, saveDraft, discardDraft, addPhoto, reload],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export const useJournal = () => useContext(JournalContext);

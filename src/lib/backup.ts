import { db } from './db';
import { isValidKey } from './dates';
import { forgetUrls } from './images';
import type { Entry, PhotoMeta } from './types';
import { createZip, readZip, type ZipInput } from './zip';

interface Manifest {
  app: 'moments';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  photos: (PhotoMeta & { file: string; thumbFile: string })[];
}

const ext = (type: string) => (type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg');

export async function createBackup(): Promise<{ blob: Blob; filename: string; entries: number; photos: number }> {
  const [entries, metas] = await Promise.all([db.allEntries(), db.allPhotoMeta()]);
  const referenced = new Set(entries.flatMap((e) => e.photoIds));
  const files: ZipInput[] = [];
  const photos: Manifest['photos'] = [];

  for (const meta of metas) {
    if (!referenced.has(meta.id)) continue; // drafts' loose photos aren't part of a backup
    const blobs = await db.getBlobs(meta.id);
    if (!blobs) continue;
    const file = `photos/${meta.date}-${meta.id.slice(0, 8)}.${ext(blobs.fullType)}`;
    const thumbFile = `thumbnails/${meta.date}-${meta.id.slice(0, 8)}.jpg`;
    files.push({ name: file, data: new Uint8Array(blobs.full) });
    files.push({ name: thumbFile, data: new Uint8Array(blobs.thumb) });
    photos.push({ ...meta, file, thumbFile });
  }

  const manifest: Manifest = {
    app: 'moments',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => a.date.localeCompare(b.date)),
    photos,
  };
  const readme =
    'Moments backup\n\nThis archive contains every journal entry (moments.json) and the original photographs (photos/).\n' +
    'To restore, open Moments → Settings → Restore from backup, and choose this file.\n';

  const enc = new TextEncoder();
  const zip = createZip([
    { name: 'moments.json', data: enc.encode(JSON.stringify(manifest, null, 2)) },
    { name: 'README.txt', data: enc.encode(readme) },
    ...files,
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return { blob: zip, filename: `moments-backup-${stamp}.zip`, entries: entries.length, photos: photos.length };
}

/** Offer the backup with the share sheet on iPhone (Save to Files), or download elsewhere. */
export async function deliverBackup(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'application/zip' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Moments backup' });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

export interface RestoreResult {
  added: number;
  updated: number;
  skipped: number;
}

/**
 * Merge a backup into the journal. Days only in the backup are added; when a day
 * exists in both, whichever version was edited most recently is kept.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  const files = await readZip(await file.arrayBuffer());
  const json = files.get('moments.json');
  if (!json) throw new Error('This file is not a Moments backup.');
  const manifest = JSON.parse(new TextDecoder().decode(json)) as Manifest;
  if (manifest.app !== 'moments' || !Array.isArray(manifest.entries)) throw new Error('This file is not a Moments backup.');

  const photosById = new Map(manifest.photos.map((p) => [p.id, p]));
  const local = new Map((await db.allEntries()).map((e) => [e.date, e]));
  const result: RestoreResult = { added: 0, updated: 0, skipped: 0 };

  for (const entry of manifest.entries) {
    if (!isValidKey(entry.date)) {
      result.skipped++;
      continue;
    }
    const existing = local.get(entry.date);
    if (existing && existing.updatedAt >= entry.updatedAt) {
      result.skipped++;
      continue;
    }

    const photoIds: string[] = [];
    for (const id of entry.photoIds.slice(0, 2)) {
      const meta = photosById.get(id);
      const full = meta && files.get(meta.file);
      const thumb = meta && (files.get(meta.thumbFile) ?? full);
      if (!meta || !full || !thumb) continue;
      const { file: _f, thumbFile: _t, ...clean } = meta;
      await db.putPhoto(
        { ...clean, date: entry.date },
        { id, full: full.slice().buffer, fullType: meta.type, thumb: thumb.slice().buffer, thumbType: 'image/jpeg' },
      );
      photoIds.push(id);
    }

    const restored: Entry = {
      date: entry.date,
      mode: entry.mode === 'photos' ? 'photos' : 'words',
      text: entry.mode === 'photos' ? '' : String(entry.text ?? ''),
      photoIds: entry.mode === 'photos' ? photoIds : photoIds.slice(0, 1),
      createdAt: entry.createdAt ?? Date.now(),
      updatedAt: entry.updatedAt ?? Date.now(),
    };
    await db.saveEntry(restored);

    if (existing) {
      const stale = existing.photoIds.filter((id) => !restored.photoIds.includes(id));
      await db.deletePhotos(stale);
      forgetUrls(stale);
      result.updated++;
    } else result.added++;
  }
  return result;
}

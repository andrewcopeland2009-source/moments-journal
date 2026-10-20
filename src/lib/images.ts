import { db } from './db';
import type { PhotoBlobs, PhotoMeta } from './types';

const FULL_MAX = 2560; // long edge — sharp on a 3× iPhone, without hoarding storage
const THUMB_MAX = 720;
const FULL_QUALITY = 0.9;
const THUMB_QUALITY = 0.8;

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This photograph could not be opened.'));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality),
  );
}

function draw(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function averageColor(img: HTMLImageElement): string {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d');
  if (!ctx) return 'rgb(200,190,175)';
  ctx.drawImage(img, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}

/**
 * Decode a picked file (browsers apply EXIF orientation when drawing an <img>),
 * keep a high-quality original and a small thumbnail, and store both.
 */
export async function importPhoto(file: File, date: string): Promise<PhotoMeta> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('Please choose a photograph.');
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error('This photograph could not be opened.');

    // Keep the original bytes when they're already a reasonable size and web-friendly.
    const keepOriginal =
      Math.max(w, h) <= FULL_MAX && file.size <= 6 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type);

    const fullCanvas = keepOriginal ? null : draw(img, FULL_MAX);
    const fullBlob: Blob = fullCanvas ? await toBlob(fullCanvas, 'image/jpeg', FULL_QUALITY) : file;
    const thumbBlob = await toBlob(draw(img, THUMB_MAX), 'image/jpeg', THUMB_QUALITY);

    const meta: PhotoMeta = {
      id: uid(),
      date,
      width: fullCanvas ? fullCanvas.width : w,
      height: fullCanvas ? fullCanvas.height : h,
      color: averageColor(img),
      type: fullBlob.type || 'image/jpeg',
      createdAt: Date.now(),
    };
    const blobs: PhotoBlobs = {
      id: meta.id,
      full: await fullBlob.arrayBuffer(),
      fullType: meta.type,
      thumb: await thumbBlob.arrayBuffer(),
      thumbType: 'image/jpeg',
    };
    await db.putPhoto(meta, blobs);
    return meta;
  } finally {
    URL.revokeObjectURL(src);
  }
}

/* ———————————————————————————————————————————
   Object-URL cache. Pixels are read lazily from IndexedDB
   and shared across every component showing the same photo.
   ——————————————————————————————————————————— */

export type Variant = 'thumb' | 'full';
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export function cachedUrl(id: string, variant: Variant): string | undefined {
  return urls.get(`${id}:${variant}`);
}

export function photoUrl(id: string, variant: Variant): Promise<string | null> {
  const key = `${id}:${variant}`;
  const hit = urls.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = db
      .getBlobs(id)
      .then((b) => {
        if (!b) return null;
        const blob =
          variant === 'full' ? new Blob([b.full], { type: b.fullType }) : new Blob([b.thumb], { type: b.thumbType });
        const url = URL.createObjectURL(blob);
        urls.set(key, url);
        return url;
      })
      .catch(() => null)
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

/** Decode before display so reveals never stutter on first paint. */
export async function decodedUrl(id: string, variant: Variant): Promise<string | null> {
  const url = await photoUrl(id, variant);
  if (!url) return null;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    /* decode() can reject for valid images in some browsers; the <img> will still load */
  }
  return url;
}

export function forgetUrls(ids: string[]) {
  for (const id of ids) {
    for (const v of ['thumb', 'full'] as const) {
      const key = `${id}:${v}`;
      const u = urls.get(key);
      if (u) URL.revokeObjectURL(u);
      urls.delete(key);
    }
  }
}

/** Aspect ratio (w/h) used for entry frames — identical everywhere so shared transitions scale uniformly. */
export function frameAspect(meta: Pick<PhotoMeta, 'width' | 'height'> | undefined): number {
  if (!meta) return 4 / 5;
  return Math.min(1.6, Math.max(0.75, meta.width / meta.height));
}

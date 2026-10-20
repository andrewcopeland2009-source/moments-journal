import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { formatFull } from '../lib/dates';
import { photoLayout } from '../lib/layout';
import { spring } from '../lib/motion';
import { useJournal } from '../state/journal';
import { useUI } from '../state/ui';
import { useScrollLock } from '../state/viewport';
import { Photo } from './Photo';
import { Pressable } from './Pressable';

interface Props {
  ids: string[];
  index: number;
  prefix: string;
}

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Past an edge, movement is dampened like iOS rubber-banding. */
const rubber = (v: number, limit: number) => {
  if (Math.abs(v) <= limit) return v;
  const over = Math.abs(v) - limit;
  return Math.sign(v) * (limit + over * 0.28);
};

type Mode = 'idle' | 'undecided' | 'page' | 'dismiss' | 'pan' | 'pinch';

/** The cinematic, full-screen photograph viewer with pinch, double-tap, swipe and pull-to-dismiss. */
export function PhotoViewer({ ids: initialIds, index: startIndex, prefix }: Props) {
  const { photos } = useJournal();
  const { close } = useUI();
  useScrollLock();

  // Photographs can disappear (entry deleted) while the viewer is open.
  const ids = initialIds.filter((id) => photos.has(id));
  const [index, setIndex] = useState(() => clamp(startIndex, 0, Math.max(0, ids.length - 1)));
  const [chrome, setChrome] = useState(true);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useLayoutEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const pageX = useMotionValue(0);
  const dismissY = useMotionValue(0);
  const scale = useMotionValue(1);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  // The flight between the grid and the viewer (FLIP): translate + uniform scale + corner radius.
  const fx = useMotionValue(0);
  const fy = useMotionValue(0);
  const fs = useMotionValue(1);
  const fr = useMotionValue(0);
  const presence = useMotionValue(0);
  const bgOpacity = useTransform([dismissY, presence], ([d, p]: number[]) => p * (1 - Math.min(1, d / (vp.h * 0.5))));
  const frameRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const hidden = useRef<HTMLElement | null>(null);
  const dismissScale = useTransform(dismissY, [0, vp.h], [1, 0.72]);

  const current = ids[index];
  const meta = photos.get(current);

  const frame = useCallback(
    (id: string) => {
      const m = photos.get(id);
      const aspect = m ? m.width / m.height : 1;
      const w = Math.min(vp.w, vp.h * aspect);
      return { w, h: w / aspect };
    },
    [photos, vp],
  );

  const resetZoom = useCallback(
    (instant = false) => {
      for (const [mv, v] of [
        [scale, 1],
        [tx, 0],
        [ty, 0],
      ] as [MotionValue<number>, number][]) {
        if (instant) mv.set(v);
        else animate(mv, v, spring.soft);
      }
    },
    [scale, tx, ty],
  );

  /** The thumbnail this photograph was opened from (grid tile or entry page). */
  const source = useCallback(
    (id: string) =>
      document.querySelector<HTMLElement>(`[data-photo-source="${CSS.escape(photoLayout(prefix, id))}"]`),
    [prefix],
  );

  const hideSource = useCallback((el: HTMLElement | null) => {
    if (hidden.current && hidden.current !== el) hidden.current.style.visibility = '';
    hidden.current = el;
    if (el) el.style.visibility = 'hidden';
  }, []);

  /** Translation and scale that place the centred frame over `rect`. */
  const flipTo = useCallback(
    (rect: DOMRect, id: string) => {
      const f = frame(id);
      return {
        x: rect.left + rect.width / 2 - vp.w / 2,
        y: rect.top + rect.height / 2 - vp.h / 2,
        s: rect.width / f.w,
      };
    },
    [frame, vp],
  );

  // Opening: start exactly over the thumbnail, then expand into place.
  useLayoutEffect(() => {
    const el = source(current);
    if (el) {
      const t = flipTo(el.getBoundingClientRect(), current);
      fx.set(t.x);
      fy.set(t.y);
      fs.set(t.s);
      fr.set((parseFloat(getComputedStyle(el).borderRadius) || 0) / t.s);
      hideSource(el);
      animate(fx, 0, spring.page);
      animate(fy, 0, spring.page);
      animate(fs, 1, spring.page);
      animate(fr, 0, spring.page);
    } else {
      fs.set(0.92);
      animate(fs, 1, spring.page);
    }
    animate(presence, 1, { duration: 0.4, ease: [0.22, 1, 0.36, 1] });
    return () => hideSource(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the thumbnail of whichever photograph is showing tucked away, ready to receive it.
  useEffect(() => {
    if (!closing.current && presence.get() > 0) hideSource(source(current));
  }, [current, source, hideSource, presence]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setChrome(false);
    const finish = () => {
      hideSource(null);
      close('viewer');
    };
    const el = source(current);
    const node = frameRef.current;
    if (!el || !node) {
      animate(presence, 0, { duration: 0.3 });
      animate(fs, 0.9, { duration: 0.3, onComplete: finish });
      return;
    }
    // Bring the thumbnail on screen (behind the viewer) so the photograph has somewhere to land.
    el.scrollIntoView({ block: 'nearest' });
    // Fold the drag/zoom transforms into the flight so it starts exactly where the photograph is.
    const now = flipTo(node.getBoundingClientRect(), current);
    presence.set(bgOpacity.get());
    dismissY.set(0);
    pageX.set(0);
    scale.set(1);
    tx.set(0);
    ty.set(0);
    fx.set(now.x);
    fy.set(now.y);
    fs.set(now.s);
    const target = flipTo(el.getBoundingClientRect(), current);
    const radius = (parseFloat(getComputedStyle(el).borderRadius) || 0) / target.s;
    animate(presence, 0, { duration: 0.35 });
    animate(fx, target.x, spring.page);
    animate(fy, target.y, spring.page);
    animate(fr, radius, spring.page);
    animate(fs, target.s, { ...spring.page, restDelta: 0.002, onComplete: finish });
  }, [close, current, source, hideSource, flipTo, bgOpacity, presence, dismissY, pageX, scale, tx, ty, fx, fy, fs, fr]);

  useEffect(() => {
    if (!ids.length) close('viewer');
  }, [ids.length, close]);

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = index + dir;
      if (next < 0 || next >= ids.length) {
        animate(pageX, 0, spring.soft);
        return;
      }
      animate(pageX, -dir * (vp.w + 24), {
        ...spring.soft,
        restDelta: 0.5,
        onComplete: () => {
          flushSync(() => setIndex(next));
          pageX.set(0);
          resetZoom(true);
        },
      });
    },
    [index, ids.length, pageX, vp.w, resetZoom],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss, go]);

  /* ——— Gestures ——— */
  const g = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    mode: 'idle' as Mode,
    start: { x: 0, y: 0, t: 0 },
    startTx: 0,
    startTy: 0,
    startScale: 1,
    startDist: 1,
    startMid: { x: 0, y: 0 },
    samples: [] as { x: number; y: number; t: number }[],
    lastTap: { t: 0, x: 0, y: 0 },
    tapTimer: 0,
    moved: false,
  });

  const bounds = (s: number) => {
    const f = frame(current);
    return { x: Math.max(0, (f.w * s - vp.w) / 2), y: Math.max(0, (f.h * s - vp.h) / 2) };
  };

  const velocity = () => {
    const s = g.current.samples;
    if (s.length < 2) return { x: 0, y: 0 };
    const a = s[0];
    const b = s[s.length - 1];
    const dt = Math.max(1, b.t - a.t) / 1000;
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  };

  const beginSingle = (x: number, y: number) => {
    const st = g.current;
    st.start = { x, y, t: performance.now() };
    st.startTx = tx.get();
    st.startTy = ty.get();
    st.samples = [{ x, y, t: performance.now() }];
    st.mode = 'undecided';
  };

  const beginPinch = () => {
    const st = g.current;
    const [a, b] = [...st.pointers.values()];
    st.mode = 'pinch';
    st.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    st.startScale = scale.get();
    st.startMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    st.startTx = tx.get();
    st.startTy = ty.get();
    st.moved = true;
  };

  const onPointerDown = (e: RPointerEvent) => {
    if (closing.current) return;
    if ((e.target as HTMLElement).closest('[data-chrome]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const st = g.current;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.pointers.size === 1) {
      st.moved = false;
      beginSingle(e.clientX, e.clientY);
    } else if (st.pointers.size === 2) beginPinch();
  };

  const onPointerMove = (e: RPointerEvent) => {
    const st = g.current;
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const now = performance.now();

    if (st.mode === 'pinch' && st.pointers.size >= 2) {
      const [a, b] = [...st.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = clamp((st.startScale * dist) / st.startDist, 0.6, MAX_SCALE * 1.2);
      const k = s / st.startScale;
      const cx = vp.w / 2;
      const cy = vp.h / 2;
      scale.set(s);
      tx.set(mid.x - cx - (st.startMid.x - cx - st.startTx) * k);
      ty.set(mid.y - cy - (st.startMid.y - cy - st.startTy) * k);
      return;
    }

    const dx = e.clientX - st.start.x;
    const dy = e.clientY - st.start.y;
    st.samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (st.samples.length > 2 && now - st.samples[0].t > 100) st.samples.shift();
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) st.moved = true;

    if (st.mode === 'undecided' && st.moved) {
      if (scale.get() > 1.01) st.mode = 'pan';
      else if (Math.abs(dx) > Math.abs(dy)) st.mode = 'page';
      else st.mode = 'dismiss';
    }

    if (st.mode === 'pan') {
      const b = bounds(scale.get());
      tx.set(rubber(st.startTx + dx, b.x));
      ty.set(rubber(st.startTy + dy, b.y));
    } else if (st.mode === 'page') {
      const atEdge = (index === 0 && dx > 0) || (index === ids.length - 1 && dx < 0);
      pageX.set(atEdge ? dx * 0.3 : dx);
    } else if (st.mode === 'dismiss') {
      dismissY.set(dy > 0 ? dy : dy * 0.25);
      tx.set(dx * 0.6);
    }
  };

  const onPointerUp = (e: RPointerEvent) => {
    const st = g.current;
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.delete(e.pointerId);

    if (st.mode === 'pinch') {
      if (st.pointers.size === 1) {
        const [p] = [...st.pointers.values()];
        beginSingle(p.x, p.y);
        st.mode = scale.get() > 1.01 ? 'pan' : 'undecided';
      }
      settleZoom();
      return;
    }
    if (st.pointers.size > 0) return;

    const v = velocity();
    const dx = e.clientX - st.start.x;
    const dy = e.clientY - st.start.y;

    if (st.mode === 'page') {
      if (dx < -vp.w * 0.2 || v.x < -500) go(1);
      else if (dx > vp.w * 0.2 || v.x > 500) go(-1);
      else animate(pageX, 0, spring.soft);
    } else if (st.mode === 'dismiss') {
      if (dy > 110 || v.y > 700) dismiss();
      else {
        animate(dismissY, 0, spring.soft);
        animate(tx, 0, spring.soft);
      }
    } else if (st.mode === 'pan') {
      const s = scale.get();
      const b = bounds(s);
      animate(tx, clamp(tx.get() + v.x * 0.18, -b.x, b.x), spring.soft);
      animate(ty, clamp(ty.get() + v.y * 0.18, -b.y, b.y), spring.soft);
    } else if (!st.moved) {
      handleTap(e.clientX, e.clientY);
    }
    st.mode = 'idle';
  };

  const settleZoom = () => {
    const s = scale.get();
    if (s <= 1) return resetZoom();
    const target = Math.min(s, MAX_SCALE);
    const b = bounds(target);
    animate(scale, target, spring.soft);
    animate(tx, clamp(tx.get(), -b.x, b.x), spring.soft);
    animate(ty, clamp(ty.get(), -b.y, b.y), spring.soft);
  };

  const handleTap = (x: number, y: number) => {
    const st = g.current;
    const now = performance.now();
    const isDouble = now - st.lastTap.t < 300 && Math.hypot(x - st.lastTap.x, y - st.lastTap.y) < 40;
    if (isDouble) {
      window.clearTimeout(st.tapTimer);
      st.lastTap.t = 0;
      if (scale.get() > 1.01) return resetZoom();
      const k = DOUBLE_TAP_SCALE;
      const b = bounds(k);
      animate(scale, k, spring.soft);
      animate(tx, clamp(-(x - vp.w / 2) * (k - 1), -b.x, b.x), spring.soft);
      animate(ty, clamp(-(y - vp.h / 2) * (k - 1), -b.y, b.y), spring.soft);
      return;
    }
    st.lastTap = { t: now, x, y };
    st.tapTimer = window.setTimeout(() => setChrome((c) => !c), 300);
  };

  const visible = [index - 1, index, index + 1].filter((i) => i >= 0 && i < ids.length);

  return (
    <div
      className="fixed inset-0 z-[70] touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="dialog"
      aria-modal="true"
      aria-label="Photograph"
    >
      <motion.div className="absolute inset-0 bg-[#0a0908]" style={{ opacity: bgOpacity }} />

      {visible.map((i) => {
        const id = ids[i];
        const f = frame(id);
        const isCurrent = i === index;
        return (
          <Slot key={id} offset={(i - index) * (vp.w + 24)} pageX={pageX}>
            <motion.div style={isCurrent ? { x: fx, y: fy, scale: fs } : undefined}>
              <motion.div style={isCurrent ? { y: dismissY, scale: dismissScale } : undefined}>
                <motion.div style={isCurrent ? { x: tx, y: ty, scale } : undefined}>
                  <motion.div
                    ref={isCurrent ? frameRef : undefined}
                    className="overflow-hidden"
                    style={{ width: f.w, height: f.h, borderRadius: isCurrent ? fr : 0 }}
                  >
                    <Photo id={id} full className="h-full w-full" fit="cover" />
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </Slot>
        );
      })}

      <AnimatePresence>
        {chrome && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/50 to-transparent px-4 pb-10 pt-[max(env(safe-area-inset-top),16px)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Pressable
              data-chrome
              onClick={dismiss}
              aria-label="Close"
              press={0.86}
              className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/90 backdrop-blur-md"
            >
              <X size={18} strokeWidth={1.6} />
            </Pressable>
            {meta && (
              <motion.div
                key={meta.date}
                className="pt-2.5 text-right"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="serif text-[17px] italic text-white/85">{formatFull(meta.date)}</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chrome && ids.length > 1 && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-2 pb-[max(env(safe-area-inset-bottom),20px)] pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {ids.length <= 12 ? (
              ids.map((id, i) => (
                <motion.span
                  key={id}
                  className="block h-1.5 rounded-full bg-white"
                  animate={{ width: i === index ? 18 : 6, opacity: i === index ? 0.9 : 0.35 }}
                  transition={spring.snappy}
                />
              ))
            ) : (
              <span className="text-[12px] tracking-[0.12em] text-white/70">
                {index + 1} / {ids.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({ offset, pageX, children }: { offset: number; pageX: MotionValue<number>; children: ReactNode }) {
  const x = useTransform(pageX, (v) => v + offset);
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ x }}>
      {children}
    </motion.div>
  );
}

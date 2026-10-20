import { animate, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, type RefObject } from 'react';
import { spring } from '../lib/motion';

/**
 * Pull a scrolled-to-top surface downward to dismiss it, without
 * interfering with native scrolling anywhere else.
 */
export function usePullToDismiss(
  scroller: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  enabled = true,
): { y: MotionValue<number>; scale: MotionValue<number>; radius: MotionValue<number> } {
  const y = useMotionValue(0);
  const scale = useTransform(y, [0, 400], [1, 0.9]);
  const radius = useTransform(y, [0, 80], [0, 28]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !enabled) return;
    let startY = 0;
    let startX = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let pulling = false;
    let decided = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = lastY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      lastT = performance.now();
      pulling = false;
      decided = false;
      velocity = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const cy = e.touches[0].clientY;
      const dy = cy - startY;
      const dx = e.touches[0].clientX - startX;
      if (!decided && (Math.abs(dy) > 6 || Math.abs(dx) > 6)) {
        decided = true;
        pulling = dy > 0 && Math.abs(dy) > Math.abs(dx) && el.scrollTop <= 0;
      }
      if (!pulling) return;
      e.preventDefault();
      const now = performance.now();
      velocity = ((cy - lastY) / Math.max(1, now - lastT)) * 1000;
      lastY = cy;
      lastT = now;
      // Resistance grows as you pull further.
      y.set(Math.max(0, dy) * 0.75);
    };
    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      if (y.get() > 110 || velocity > 700) onDismiss();
      else animate(y, 0, spring.soft);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [scroller, onDismiss, enabled, y]);

  return { y, scale, radius };
}

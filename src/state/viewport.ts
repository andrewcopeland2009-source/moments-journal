import { useEffect, useState } from 'react';

/** Tracks the visual viewport so sheets and editors stay above the iOS keyboard. */
export function useVisualViewport() {
  const read = () => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  });
  const [vv, setVv] = useState(read);
  useEffect(() => {
    const v = window.visualViewport;
    const on = () => setVv(read());
    v?.addEventListener('resize', on);
    v?.addEventListener('scroll', on);
    window.addEventListener('resize', on);
    return () => {
      v?.removeEventListener('resize', on);
      v?.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return vv;
}

let locks = 0;

/** Stops the page behind an overlay from scrolling. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) document.documentElement.style.overflow = 'hidden';
    return () => {
      if (--locks === 0) document.documentElement.style.overflow = '';
    };
  }, [active]);
}

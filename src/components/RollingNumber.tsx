import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { spring } from '../lib/motion';

/** Digits roll up when the number grows and down when it shrinks. */
export function RollingNumber({ value, className = '' }: { value: number; className?: string }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  prev.current = value;
  const digits = String(value).split('');

  return (
    <span className={`relative inline-flex tabular-nums ${className}`} aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="relative inline-block overflow-hidden" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={d}
              custom={dir}
              className="inline-block"
              variants={{
                enter: (k: number) => ({ y: `${k * 70}%`, opacity: 0 }),
                center: { y: '0%', opacity: 1 },
                exit: (k: number) => ({ y: `${-k * 70}%`, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring.snappy}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

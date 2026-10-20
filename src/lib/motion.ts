import type { Transition } from 'motion/react';

/*
 * The motion language of Moments.
 * Everything moves on springs; durations exist only for opacity.
 * Only transform and opacity are animated.
 */
export const spring = {
  /** Buttons pressing and releasing. */
  press: { type: 'spring', stiffness: 700, damping: 34, mass: 0.6 },
  /** Small UI settling: indicators, chips, counters. */
  snappy: { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 },
  /** Cards and sheets. */
  soft: { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 },
  /** Shared-element page expansion. */
  page: { type: 'spring', stiffness: 240, damping: 30, mass: 1 },
  /** Slow, considered settles: reveals, completion. */
  gentle: { type: 'spring', stiffness: 120, damping: 22, mass: 1 },
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
};

export const fade = (duration = 0.32, delay = 0): Transition => ({ duration, delay, ease: ease.out });

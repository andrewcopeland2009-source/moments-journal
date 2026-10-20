import { motion } from 'motion/react';
import { ease } from '../lib/motion';

/** A wax-seal-like mark drawn by hand when a moment is kept. */
export function Seal({ play }: { play: boolean }) {
  const state = play ? 'on' : 'off';
  return (
    <motion.svg
      width="88"
      height="88"
      viewBox="0 0 88 88"
      fill="none"
      initial="off"
      animate={state}
      className="text-accent"
      aria-hidden
    >
      <motion.circle
        cx="44"
        cy="44"
        r="34"
        stroke="currentColor"
        strokeWidth="1.2"
        variants={{ off: { pathLength: 0, opacity: 0 }, on: { pathLength: 1, opacity: 1 } }}
        transition={{ duration: 0.9, ease: ease.inOut }}
        style={{ rotate: -90, transformOrigin: '50% 50%' }}
      />
      <motion.circle
        cx="44"
        cy="44"
        r="27"
        fill="currentColor"
        variants={{ off: { scale: 0.4, opacity: 0 }, on: { scale: 1, opacity: 0.12 } }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.35 }}
        style={{ transformOrigin: '50% 50%' }}
      />
      <motion.path
        d="M31 45.5l8.5 8.5L57 36"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ off: { pathLength: 0, opacity: 0 }, on: { pathLength: 1, opacity: 1 } }}
        transition={{ duration: 0.5, delay: 0.55, ease: ease.out }}
      />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <motion.circle
          key={deg}
          cx={44 + Math.cos((deg * Math.PI) / 180) * 41}
          cy={44 + Math.sin((deg * Math.PI) / 180) * 41}
          r="1.3"
          fill="currentColor"
          variants={{ off: { opacity: 0, scale: 0 }, on: { opacity: [0, 1, 0], scale: [0, 1.4, 0.6] } }}
          transition={{ duration: 0.9, delay: 0.8 + deg / 2400 }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      ))}
    </motion.svg>
  );
}

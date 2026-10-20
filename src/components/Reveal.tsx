import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ease } from '../lib/motion';

/** Content that settles into place the first time it scrolls into view. */
export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay, ease: ease.out }}
    >
      {children}
    </motion.div>
  );
}

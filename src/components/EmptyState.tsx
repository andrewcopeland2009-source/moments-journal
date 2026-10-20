import { motion } from 'motion/react';
import { ease } from '../lib/motion';
import { useTravel } from '../state/motion';
import { Pressable } from './Pressable';

interface Props {
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Quiet, typographic empty states with a slowly breathing mark. */
export function EmptyState({ title, body, action, onAction, compact = false }: Props) {
  const travel = useTravel();
  return (
    <div className={`flex flex-col items-center px-10 text-center ${compact ? 'py-10' : 'py-[14vh]'}`}>
      <motion.div
        className="relative mb-8 h-16 w-16"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: ease.out }}
        aria-hidden
      >
        <motion.span
          className="absolute inset-0 rounded-full border border-accent/40"
          animate={travel(1) ? { scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="absolute inset-[22%] rounded-full border border-accent/60" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
      </motion.div>
      <motion.h3
        className="serif text-[28px] leading-tight text-ink"
        style={{ fontSize: 'calc(28px * var(--serif-scale))' }}
        initial={{ opacity: 0, y: travel(10) }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: ease.out }}
      >
        {title}
      </motion.h3>
      {body && (
        <motion.p
          className="mt-3 text-[14px] leading-relaxed text-soft"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {body}
        </motion.p>
      )}
      {action && onAction && (
        <motion.div
          initial={{ opacity: 0, y: travel(8) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: ease.out }}
        >
          <Pressable
            onClick={onAction}
            className="mt-8 h-12 rounded-full bg-ink px-7 text-bg shadow-float"
            press={0.95}
          >
            <span className="serif text-[18px] italic">{action}</span>
          </Pressable>
        </motion.div>
      )}
    </div>
  );
}

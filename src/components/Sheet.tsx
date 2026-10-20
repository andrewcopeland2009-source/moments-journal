import { motion, useDragControls, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { spring } from '../lib/motion';

interface Props {
  onClose: () => void;
  children: ReactNode;
  /** Compact sheets (dialogs) can be dragged from anywhere. */
  compact?: boolean;
  label?: string;
  z?: number;
}

/**
 * A bottom sheet that rises on a spring, dims what's behind it,
 * and follows the finger down to dismiss.
 */
export function Sheet({ onClose, children, compact = false, label, z = 60 }: Props) {
  const [vh] = useState(() => window.innerHeight);
  const y = useMotionValue(vh);
  const scrim = useTransform(y, [0, vh * 0.6], [1, 0]);
  const controls = useDragControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={label}>
      <motion.div
        className="absolute inset-0 bg-[rgb(var(--scrim)/0.42)]"
        style={{ opacity: scrim }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      />
      <motion.div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col ${
          compact ? 'px-3 pb-[max(env(safe-area-inset-bottom),12px)]' : ''
        }`}
        style={{ y }}
        initial={{ y: vh }}
        animate={{ y: 0 }}
        exit={{ y: vh }}
        transition={spring.soft}
        drag="y"
        dragListener={compact}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.9 }}
        onDragEnd={onDragEnd}
      >
        <div
          className={`relative flex min-h-0 flex-col overflow-hidden bg-surface shadow-float ${
            compact ? 'rounded-page' : 'rounded-t-page'
          }`}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
            onPointerDown={(e) => controls.start(e)}
          >
            <span className="h-[5px] w-9 rounded-full bg-line" />
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

import { AnimatePresence, motion } from 'motion/react';
import { useUI } from '../state/ui';
import { spring } from '../lib/motion';

export function ToastHost() {
  const { toast, immersive } = useUI();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-6"
      style={{ bottom: `calc(max(env(safe-area-inset-bottom), 12px) + ${immersive ? 24 : 92}px)` }}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.3 } }}
            transition={spring.soft}
            className="flex items-center gap-3 rounded-full bg-ink/95 px-5 py-3 text-bg shadow-float"
          >
            {toast.tone === 'celebrate' && (
              <motion.span
                className="block h-1.5 w-1.5 rounded-full bg-accent"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.8, 1] }}
                transition={{ duration: 0.8, delay: 0.15 }}
              />
            )}
            <span className={toast.tone === 'celebrate' ? 'serif text-[17px] italic' : 'text-[13.5px]'}>
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

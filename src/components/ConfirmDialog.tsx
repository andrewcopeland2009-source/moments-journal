import { AnimatePresence, motion } from 'motion/react';
import { useUI } from '../state/ui';
import { Sheet } from './Sheet';
import { Pressable } from './Pressable';
import { ease } from '../lib/motion';

export function ConfirmDialog() {
  const { pendingConfirm: c, settle } = useUI();
  return (
    <AnimatePresence>
      {c && (
        <Sheet key="confirm" compact onClose={() => settle(false)} label={c.title} z={90}>
          <motion.div
            className="px-6 pb-5 pt-3 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: ease.out }}
          >
            <h2 className="serif text-[26px] leading-tight text-ink">{c.title}</h2>
            {c.message && <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-soft">{c.message}</p>}
            <div className="mt-6 flex flex-col gap-2">
              <Pressable
                onClick={() => settle(true)}
                className={`h-12 rounded-2xl text-[15px] font-medium ${
                  c.destructive ? 'bg-[#9c4a3c] text-[#fbf3ec]' : 'bg-ink text-bg'
                }`}
              >
                {c.confirm}
              </Pressable>
              <Pressable onClick={() => settle(false)} className="h-12 rounded-2xl bg-sunken text-[15px] text-ink">
                {c.cancel ?? 'Cancel'}
              </Pressable>
            </div>
          </motion.div>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

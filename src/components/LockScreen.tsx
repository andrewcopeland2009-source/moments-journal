import { AnimatePresence, motion } from 'motion/react';
import { ScanFace } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { unlock } from '../lib/lock';
import { ease } from '../lib/motion';
import { useSettings } from '../state/settings';
import { useUI } from '../state/ui';
import { Pressable } from './Pressable';

const RELOCK_AFTER = 60_000;

export function LockScreen() {
  const { settings, update } = useSettings();
  const { confirm } = useUI();
  const enabled = !!settings.lock;
  const [locked, setLocked] = useState(enabled);
  const [failures, setFailures] = useState(0);
  const [trying, setTrying] = useState(false);
  const hiddenAt = useRef(0);

  // Turning the lock on from Settings shouldn't lock you out mid-session.
  useEffect(() => {
    if (!enabled) setLocked(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const on = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER) setLocked(true);
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [enabled]);

  const attempt = async () => {
    if (!settings.lock || trying) return;
    setTrying(true);
    const ok = await unlock(settings.lock.credentialId);
    setTrying(false);
    if (ok) {
      setLocked(false);
      setFailures(0);
    } else setFailures((f) => f + 1);
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Turn off the lock?',
      message: 'If Face ID or your passcode is no longer recognised, you can remove the privacy lock. Your journal is unaffected.',
      confirm: 'Turn off lock',
      destructive: true,
    });
    if (ok) update({ lock: null });
  };

  return (
    <AnimatePresence>
      {enabled && locked && (
        <motion.div
          key="lock"
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-bg px-10 text-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5, ease: ease.out } }}
        >
          <div className="grain pointer-events-none absolute inset-0" />
          <motion.div
            className="label tracking-[0.5em] text-accent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: ease.out }}
          >
            Moments
          </motion.div>
          <motion.p
            className="serif mt-4 text-[24px] italic text-soft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            A little piece of every day.
          </motion.p>
          <Pressable
            onClick={attempt}
            press={0.95}
            className="mt-12 flex h-14 items-center gap-3 rounded-full bg-ink px-7 text-bg shadow-float"
          >
            <ScanFace size={20} strokeWidth={1.5} />
            <span className="serif text-[19px] italic">{trying ? 'Unlocking…' : 'Unlock'}</span>
          </Pressable>
          <AnimatePresence>
            {failures >= 3 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={reset}
                className="mt-6 text-[12.5px] text-faint underline decoration-line underline-offset-4"
              >
                Having trouble unlocking?
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

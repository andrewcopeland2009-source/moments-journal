import { AnimatePresence, motion } from 'motion/react';
import { ImagePlus, RefreshCw, X } from 'lucide-react';
import { frameAspect } from '../lib/images';
import { ease, spring } from '../lib/motion';
import { useJournal } from '../state/journal';
import { Photo } from './Photo';
import { Pressable } from './Pressable';

interface Props {
  id: string | undefined;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
  /** Placeholder aspect ratio (w/h) while empty. */
  emptyAspect?: number;
  label?: string;
}

/** A single photograph in the editor: placeholder → loading → revealed photo. */
export function PhotoSlot({ id, busy, onPick, onRemove, emptyAspect = 16 / 9, label = 'Add a photograph' }: Props) {
  const meta = useJournal().photos.get(id ?? '');
  const aspect = id ? frameAspect(meta) : emptyAspect;

  return (
    <motion.div
      layout
      className="relative w-full"
      style={{ aspectRatio: aspect }}
      transition={spring.soft}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {id ? (
          <motion.div
            key={id}
            className="absolute inset-0 overflow-hidden rounded-[18px] shadow-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3, ease: ease.in } }}
            transition={spring.gentle}
          >
            <Photo id={id} className="h-full w-full" />
            {busy && <div className="shimmer absolute inset-0 opacity-70" />}
            <div className="absolute right-2.5 top-2.5 flex gap-2">
              <Pressable
                onClick={onPick}
                aria-label="Replace photograph"
                press={0.86}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"
              >
                <RefreshCw size={15} strokeWidth={1.8} />
              </Pressable>
              <Pressable
                onClick={onRemove}
                aria-label="Remove photograph"
                press={0.86}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"
              >
                <X size={16} strokeWidth={1.8} />
              </Pressable>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={spring.soft}
          >
            <Pressable
              onClick={onPick}
              disabled={busy}
              press={0.98}
              className="group relative flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[18px] border border-dashed border-line bg-sunken/50 text-soft"
            >
              {busy ? (
                <>
                  <div className="shimmer absolute inset-0 opacity-80" />
                  <motion.span
                    className="relative block h-6 w-6 rounded-full border-[1.5px] border-accent/30 border-t-accent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                  />
                  <span className="label relative">Developing</span>
                </>
              ) : (
                <>
                  <ImagePlus size={22} strokeWidth={1.3} className="text-faint" />
                  <span className="label">{label}</span>
                </>
              )}
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

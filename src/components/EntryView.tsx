import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, PenLine, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { formatMonthDay, formatWeekday, yearOf } from '../lib/dates';
import { frameAspect } from '../lib/images';
import { cardLayout, photoLayout } from '../lib/layout';
import { ease, spring } from '../lib/motion';
import { useJournal } from '../state/journal';
import { usePullToDismiss } from '../state/pull';
import { useUI } from '../state/ui';
import { useScrollLock } from '../state/viewport';
import { Ornament } from './EntryCard';
import { Photo } from './Photo';
import { Pressable } from './Pressable';

interface Props {
  date: string;
  prefix: string;
}

/** A memory opened to its full page. Shares its card and photographs with wherever it was opened from. */
export function EntryView({ date, prefix }: Props) {
  const { entries, photos, deleteEntry, today } = useJournal();
  const { close, open, confirm, notify, overlays } = useUI();
  const entry = entries.get(date);
  const scroller = useRef<HTMLDivElement>(null);
  const [featured, setFeatured] = useState(0);
  useScrollLock();

  const dismiss = useCallback(() => close('entry'), [close]);
  const covered = overlays[overlays.length - 1]?.kind !== 'entry';
  const { y, scale, radius } = usePullToDismiss(scroller, dismiss, !covered);

  if (!entry) return null;
  const ids = entry.photoIds;
  const order = ids.length === 2 && featured === 1 ? [ids[1], ids[0]] : ids;

  const remove = async () => {
    const ok = await confirm({
      title: 'Let this day go?',
      message: `The entry for ${formatMonthDay(date)}, ${yearOf(date)} and its photographs will be permanently deleted.`,
      confirm: 'Delete entry',
      destructive: true,
    });
    if (!ok) return;
    close('entry');
    await deleteEntry(date);
    notify('The entry was deleted.');
  };

  const viewPhoto = (id: string) =>
    open({ kind: 'viewer', ids, index: Math.max(0, ids.indexOf(id)), prefix });

  return (
    <motion.div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${formatMonthDay(date)}, ${yearOf(date)}`}
      style={{ y, scale }}
    >
      <motion.div
        layoutId={cardLayout(prefix, date)}
        className="absolute inset-0 bg-bg"
        style={{ borderRadius: radius }}
        transition={spring.page}
      />

      <motion.div
        ref={scroller}
        layoutScroll
        className="no-scrollbar relative h-full overflow-y-auto overscroll-contain"
      >
        <motion.div
          className="safe-top sticky top-0 z-10 flex items-center justify-between px-4 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          <Pressable
            onClick={dismiss}
            aria-label="Close"
            press={0.88}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface/80 text-ink shadow-card backdrop-blur-md"
          >
            <ChevronDown size={20} strokeWidth={1.6} />
          </Pressable>
          <div className="flex gap-2">
            <Pressable
              onClick={() => open({ kind: 'editor', date })}
              aria-label="Edit entry"
              press={0.88}
              className="flex h-10 items-center gap-2 rounded-full bg-surface/80 px-4 text-[13px] text-ink shadow-card backdrop-blur-md"
            >
              <PenLine size={15} strokeWidth={1.6} />
              {date === today ? 'Edit today' : 'Edit'}
            </Pressable>
            <Pressable
              onClick={remove}
              aria-label="Delete entry"
              press={0.88}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface/80 text-soft shadow-card backdrop-blur-md"
            >
              <Trash2 size={16} strokeWidth={1.6} />
            </Pressable>
          </div>
        </motion.div>

        <div className="mx-auto max-w-xl px-5 pb-28">
          <motion.header
            className="px-1 pb-6 pt-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.6, delay: 0.12, ease: ease.out }}
          >
            <div className="label">
              {formatWeekday(date)} · {yearOf(date)}
            </div>
            <h1
              className="serif mt-2 text-[46px] font-light leading-[0.95] text-ink"
              style={{ fontSize: 'calc(46px * var(--serif-scale))' }}
            >
              {formatMonthDay(date)}
            </h1>
          </motion.header>

          {ids.length === 1 && (
            <motion.button
              layoutId={photoLayout(prefix, ids[0])}
              data-photo-source={photoLayout(prefix, ids[0])}
              className="relative block w-full overflow-hidden shadow-page"
              style={{ aspectRatio: frameAspect(photos.get(ids[0])), borderRadius: 22 }}
              transition={spring.page}
              onClick={() => viewPhoto(ids[0])}
              aria-label="View photograph"
            >
              <Photo id={ids[0]} full className="h-full w-full" />
            </motion.button>
          )}

          {ids.length === 2 && (
            <div className="relative">
              {order.map((id, i) => {
                const lead = i === 0;
                return (
                  <motion.button
                    key={id}
                    layoutId={photoLayout(prefix, id)}
                    data-photo-source={photoLayout(prefix, id)}
                    className={`relative block overflow-hidden ${
                      lead ? 'z-0 w-full shadow-page' : 'z-10 -mt-12 ml-auto w-[56%] shadow-float ring-[6px] ring-bg'
                    }`}
                    style={{ aspectRatio: frameAspect(photos.get(id)), borderRadius: lead ? 22 : 16 }}
                    transition={spring.page}
                    onClick={() => (lead ? viewPhoto(id) : setFeatured((f) => 1 - f))}
                    aria-label={lead ? 'View photograph' : 'Bring this photograph forward'}
                  >
                    <Photo id={id} full={lead} className="h-full w-full" />
                  </motion.button>
                );
              })}
              <motion.p
                className="label mt-4 text-center text-faint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Tap the smaller photograph to bring it forward
              </motion.p>
            </div>
          )}

          <AnimatePresence>
            {entry.text && (
              <motion.div
                className="px-1 pt-8"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.7, delay: 0.22, ease: ease.out }}
              >
                <p
                  className="serif whitespace-pre-line text-[22px] leading-[1.7] text-ink first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[58px] first-letter:leading-[0.8] first-letter:text-accent"
                  style={{ fontSize: 'calc(22px * var(--serif-scale))' }}
                >
                  {entry.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.4 }}>
            <Ornament className="mt-12" />
            <p className="label mt-4 text-center text-faint">
              Kept {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {entry.updatedAt - entry.createdAt > 60_000 && ' · edited'}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { motion } from 'motion/react';
import { ArrowRight, Plus, Settings2 } from 'lucide-react';
import { formatMonthDay, formatWeekday, yearOf, yearsAgoPhrase } from '../lib/dates';
import { frameAspect } from '../lib/images';
import { CAPTURE_LAYOUT, cardLayout, photoLayout } from '../lib/layout';
import { ease, spring } from '../lib/motion';
import type { Entry } from '../lib/types';
import { useJournal } from '../state/journal';
import { useTravel } from '../state/motion';
import { useUI } from '../state/ui';
import { EntryCard, Ornament } from '../components/EntryCard';
import { Photo } from '../components/Photo';
import { Pressable } from '../components/Pressable';

export function Today() {
  const { today, entries, sorted, drafts } = useJournal();
  const { open } = useUI();
  const travel = useTravel();
  const todays = entries.get(today);
  const draft = drafts.get(today);
  const recent = sorted.filter((e) => e.date !== today).slice(0, 8);
  const md = today.slice(5);
  const lookBack = sorted.filter((e) => e.date.slice(5) === md && e.date < today);
  const fresh = sorted.length === 0;

  const capture = () => open({ kind: 'editor', date: today, origin: CAPTURE_LAYOUT });
  const revisit = () => open({ kind: 'entry', date: today, prefix: 'today' });

  const item = (i: number) => ({
    initial: { opacity: 0, y: travel(18) },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay: 0.08 + i * 0.09, ease: ease.out },
  });

  return (
    <div className="mx-auto max-w-xl pb-40">
      <header className="safe-top flex items-center justify-end px-5">
        <Pressable
          onClick={() => open({ kind: 'settings' })}
          aria-label="Settings"
          press={0.86}
          className="grid h-10 w-10 place-items-center rounded-full text-soft"
        >
          <Settings2 size={19} strokeWidth={1.4} />
        </Pressable>
      </header>

      <section className="px-7 pt-[6vh] text-center">
        <motion.div className="label" {...item(0)}>
          {formatWeekday(today)}
        </motion.div>
        <motion.h1
          className="serif mt-3 text-[52px] font-light leading-[0.95] text-ink"
          style={{ fontSize: 'calc(52px * var(--serif-scale))' }}
          {...item(1)}
        >
          {formatMonthDay(today)}
        </motion.h1>
        <motion.p className="serif mt-4 text-[19px] italic text-soft" {...item(2)}>
          {fresh ? 'Every story starts somewhere.' : 'A little piece of today.'}
        </motion.p>

        <motion.div className="mt-10 flex flex-col items-center" {...item(3)}>
          {todays ? (
            <CaptureButton label="Revisit Today" icon="arrow" onClick={revisit} />
          ) : (
            <CaptureButton
              label={draft ? 'Continue Today' : fresh ? 'Capture Your First Moment' : 'Capture Today'}
              icon="plus"
              onClick={capture}
              layoutId={CAPTURE_LAYOUT}
            />
          )}
          <motion.p
            className="mt-4 h-4 text-[12px] tracking-[0.04em] text-faint"
            key={todays ? 'kept' : draft ? 'draft' : fresh ? 'fresh' : 'none'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {todays
              ? 'Today is kept.'
              : draft
                ? 'Your draft is waiting.'
                : fresh
                  ? 'Today is a good place to begin.'
                  : '100 words and a photograph, or two photographs.'}
          </motion.p>
        </motion.div>
      </section>

      {todays && (
        <motion.section
          className="mt-12 px-5"
          initial={{ opacity: 0, y: travel(24) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
        >
          <EntryCard entry={todays} prefix="today" onOpen={revisit} showYear={false} parallax={false} />
        </motion.section>
      )}

      {lookBack.length > 0 && (
        <section className="mt-16">
          <Ornament />
          <motion.h2 className="serif mt-6 text-center text-[30px] text-ink" {...item(4)}>
            A Look Back
          </motion.h2>
          <div className="mt-6 flex flex-col gap-6 px-5">
            {lookBack.map((e, i) => (
              <motion.div key={e.date} {...item(5 + i)}>
                <div className="label mb-3 text-center text-accent">
                  {yearsAgoPhrase(yearOf(today) - yearOf(e.date))}
                </div>
                <EntryCard entry={e} prefix="today" onOpen={() => open({ kind: 'entry', date: e.date, prefix: 'today' })} parallax={false} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between px-7">
            <h2 className="label">Recently kept</h2>
          </div>
          <motion.div
            layoutScroll
            className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-6"
          >
            {recent.map((e, i) => (
              <RecentCard key={e.date} entry={e} index={i} />
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}

function CaptureButton({
  label,
  icon,
  onClick,
  layoutId,
}: {
  label: string;
  icon: 'plus' | 'arrow';
  onClick: () => void;
  layoutId?: string;
}) {
  return (
    <Pressable onClick={onClick} press={0.95} className="group relative h-[58px] rounded-full px-8">
      <motion.span
        layoutId={layoutId}
        className="absolute inset-0 bg-ink shadow-float"
        style={{ borderRadius: 29 }}
        transition={spring.page}
      />
      <span className="relative flex items-center gap-3 text-bg">
        <span className="serif text-[20px] italic" style={{ fontSize: 'calc(20px * var(--serif-scale))' }}>
          {label}
        </span>
        <motion.span
          className="grid h-6 w-6 place-items-center rounded-full bg-bg/15"
          initial={false}
          whileHover={{ rotate: icon === 'plus' ? 90 : 0, x: icon === 'arrow' ? 3 : 0 }}
        >
          {icon === 'plus' ? <Plus size={14} strokeWidth={2} /> : <ArrowRight size={14} strokeWidth={2} />}
        </motion.span>
      </span>
    </Pressable>
  );
}

function RecentCard({ entry, index }: { entry: Entry; index: number }) {
  const { photos } = useJournal();
  const { open } = useUI();
  const travel = useTravel();
  const id = entry.photoIds[0];
  const aspect = frameAspect(photos.get(id));
  const height = 280;
  const width = id ? Math.min(height * aspect, 300) : 230;

  return (
    <motion.button
      className="relative shrink-0 snap-start text-left"
      style={{ width }}
      initial={{ opacity: 0, x: travel(40) }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring.gentle, delay: 0.35 + index * 0.07 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => open({ kind: 'entry', date: entry.date, prefix: 'recent' })}
      aria-label={`Open ${formatMonthDay(entry.date)}`}
    >
      <motion.div
        layoutId={cardLayout('recent', entry.date)}
        className="absolute inset-0 bg-surface shadow-card"
        style={{ borderRadius: 22 }}
        transition={spring.page}
      />
      <div className="relative p-2">
        {id ? (
          <motion.div
            layoutId={photoLayout('recent', id)}
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: aspect, borderRadius: 16 }}
            transition={spring.page}
          >
            <Photo id={id} className="h-full w-full" />
            {entry.photoIds.length > 1 && (
              <span className="absolute bottom-2 right-2 rounded-full bg-black/35 px-2 py-0.5 text-[10px] tracking-[0.1em] text-white backdrop-blur-md">
                +1
              </span>
            )}
          </motion.div>
        ) : (
          <div className="flex h-[200px] items-center px-3">
            <p className="serif line-clamp-5 text-[18px] italic leading-snug text-ink/80">“{entry.text}”</p>
          </div>
        )}
        <div className="px-2 pb-1.5 pt-3">
          <div className="serif text-[19px] leading-none text-ink">{formatMonthDay(entry.date)}</div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="label text-faint">{formatWeekday(entry.date)}</span>
            <span className="text-[11px] text-faint">{yearOf(entry.date)}</span>
          </div>
          {id && entry.text && <p className="mt-2 line-clamp-1 text-[12.5px] text-soft">{entry.text}</p>}
        </div>
      </div>
    </motion.button>
  );
}

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { formatMonthDay, formatWeekday, yearOf } from '../lib/dates';
import { frameAspect } from '../lib/images';
import { cardLayout, photoLayout } from '../lib/layout';
import { ease, spring } from '../lib/motion';
import type { Entry } from '../lib/types';
import { useJournal } from '../state/journal';
import { useSettings } from '../state/settings';
import { Photo } from './Photo';

interface Props {
  entry: Entry;
  prefix: string;
  onOpen: () => void;
  /** Hide the year when it's obvious from context. */
  showYear?: boolean;
  parallax?: boolean;
  compact?: boolean;
}

/** A page from the album: photographs, the date, and a few lines of writing. */
export function EntryCard({ entry, prefix, onOpen, showYear = true, parallax = true, compact = false }: Props) {
  const { photos } = useJournal();
  const metas = entry.photoIds.map((id) => photos.get(id));
  const aspects = metas.map(frameAspect);
  const textOnly = entry.photoIds.length === 0;

  return (
    <motion.article
      className="relative cursor-pointer"
      whileTap={{ scale: 0.985 }}
      transition={spring.press}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      aria-label={`Open ${formatMonthDay(entry.date)}`}
    >
      <motion.div
        layoutId={cardLayout(prefix, entry.date)}
        className="absolute inset-0 bg-surface shadow-card"
        style={{ borderRadius: 26 }}
        transition={spring.page}
      />
      <div className={`relative ${compact ? 'p-3' : 'p-3.5'}`}>
        {!textOnly && (
          <div className="flex gap-2.5">
            {entry.photoIds.map((id, i) => (
              <motion.div
                key={id}
                layoutId={photoLayout(prefix, id)}
                className="relative overflow-hidden"
                style={{ aspectRatio: aspects[i], flex: `${aspects[i] * 100} 1 0%`, borderRadius: 18 }}
                transition={spring.page}
              >
                {parallax ? <ParallaxPhoto id={id} /> : <Photo id={id} className="h-full w-full" />}
              </motion.div>
            ))}
          </div>
        )}

        <div className={`${textOnly ? 'px-3 pb-4 pt-5' : 'px-2 pb-2 pt-4'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="serif text-[24px] leading-none text-ink" style={{ fontSize: 'calc(24px * var(--serif-scale))' }}>
                {formatMonthDay(entry.date)}
              </span>
              {showYear && <span className="text-[12px] tracking-[0.08em] text-faint">{yearOf(entry.date)}</span>}
            </div>
            <span className="label text-faint">{formatWeekday(entry.date)}</span>
          </div>
          {entry.text && (
            <p
              className={`serif mt-3 whitespace-pre-line text-ink/85 ${
                textOnly ? 'line-clamp-6 text-[20px] leading-[1.55]' : 'line-clamp-3 text-[17px] leading-[1.55]'
              }`}
              style={{ fontSize: `calc(${textOnly ? 20 : 17}px * var(--serif-scale))` }}
            >
              {entry.text}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/** A photograph that drifts a few pixels against the scroll — restrained parallax. */
function ParallaxPhoto({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useSettings();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-4%', '4%']);
  return (
    <motion.div ref={ref} className="absolute inset-[-6%]" style={{ y }}>
      <Photo id={id} className="h-full w-full" />
    </motion.div>
  );
}

/** A thin ornamental divider between pages. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`flex items-center justify-center gap-3 ${className}`}
      initial={{ opacity: 0, scaleX: 0.6 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: ease.out }}
      aria-hidden
    >
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-line" />
      <span className="block h-[5px] w-[5px] rotate-45 border border-accent/60" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-line" />
    </motion.div>
  );
}

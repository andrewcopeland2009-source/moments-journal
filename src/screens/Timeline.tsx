import { motion } from 'motion/react';
import { useMemo } from 'react';
import { formatMonth } from '../lib/dates';
import { ease } from '../lib/motion';
import type { Entry } from '../lib/types';
import { useJournal } from '../state/journal';
import { useTravel } from '../state/motion';
import { useUI } from '../state/ui';
import { EntryCard, Ornament } from '../components/EntryCard';
import { EmptyState } from '../components/EmptyState';

export function Timeline() {
  const { sorted, today } = useJournal();
  const { open } = useUI();
  const travel = useTravel();

  const groups = useMemo(() => {
    const out: { key: string; year: number; month: number; entries: Entry[] }[] = [];
    for (const e of sorted) {
      const key = e.date.slice(0, 7);
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        g = { key, year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1, entries: [] };
        out.push(g);
      }
      g.entries.push(e);
    }
    return out;
  }, [sorted]);

  const thisYear = Number(today.slice(0, 4));

  return (
    <div className="mx-auto max-w-xl pb-40">
      <header className="safe-top px-7 pb-2">
        <motion.div
          className="label pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {sorted.length} {sorted.length === 1 ? 'day' : 'days'} remembered
        </motion.div>
        <motion.h1
          className="serif mt-2 text-[44px] font-light leading-none text-ink"
          style={{ fontSize: 'calc(44px * var(--serif-scale))' }}
          initial={{ opacity: 0, y: travel(12) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: ease.out }}
        >
          Timeline
        </motion.h1>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          title="Every story starts somewhere."
          body="Today is a good place to begin."
          action="Capture Your First Moment"
          onAction={() => open({ kind: 'editor', date: today })}
        />
      ) : (
        groups.map((g, gi) => (
          <section key={g.key} className="relative">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-bg via-bg/90 to-transparent px-7 pb-5 pt-[max(env(safe-area-inset-top),14px)]">
              <motion.div
                className="flex items-baseline gap-3"
                initial={{ opacity: 0, x: travel(-10) }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: ease.out }}
              >
                <h2 className="serif text-[26px] text-ink" style={{ fontSize: 'calc(26px * var(--serif-scale))' }}>
                  {formatMonth(g.year, g.month)}
                </h2>
                {g.year !== thisYear && <span className="label text-faint">{g.year}</span>}
              </motion.div>
            </div>
            <div className="flex flex-col gap-7 px-5">
              {g.entries.map((e) => (
                <motion.div
                  key={e.date}
                  initial={{ opacity: 0, y: travel(36), scale: travel(1) ? 0.98 : 1 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.9, ease: ease.out }}
                >
                  <EntryCard
                    entry={e}
                    prefix="timeline"
                    showYear={false}
                    onOpen={() => open({ kind: 'entry', date: e.date, prefix: 'timeline' })}
                  />
                </motion.div>
              ))}
            </div>
            {gi < groups.length - 1 && <Ornament className="my-12" />}
          </section>
        ))
      )}
      {groups.length > 0 && (
        <p className="serif mt-16 text-center text-[17px] italic text-faint">The beginning.</p>
      )}
    </div>
  );
}

import { motion } from 'motion/react';
import { useMemo } from 'react';
import { formatMonthDay } from '../lib/dates';
import { photoLayout } from '../lib/layout';
import { ease } from '../lib/motion';
import { useJournal } from '../state/journal';
import { useTravel } from '../state/motion';
import { useUI } from '../state/ui';
import { EmptyState } from '../components/EmptyState';
import { Photo } from '../components/Photo';

const GAP = 10;

export function Gallery() {
  const { sorted, photos } = useJournal();
  const { open } = useUI();
  const travel = useTravel();

  // Every photograph from a kept entry, newest first.
  const ids = useMemo(
    () => sorted.flatMap((e) => e.photoIds).filter((id) => photos.has(id)),
    [sorted, photos],
  );

  // Masonry: place each photo in the currently shortest column, preserving order left-to-right.
  const columns = useMemo(() => {
    const cols: { id: string; index: number }[][] = [[], []];
    const heights = [0, 0];
    ids.forEach((id, index) => {
      const m = photos.get(id)!;
      const c = heights[0] <= heights[1] ? 0 : 1;
      cols[c].push({ id, index });
      heights[c] += m.height / m.width + GAP / 180;
    });
    return cols;
  }, [ids, photos]);

  return (
    <div className="mx-auto max-w-xl pb-40">
      <header className="safe-top px-7 pb-6">
        <motion.div className="label pt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          {ids.length} {ids.length === 1 ? 'photograph' : 'photographs'}
        </motion.div>
        <motion.h1
          className="serif mt-2 text-[44px] font-light leading-none text-ink"
          style={{ fontSize: 'calc(44px * var(--serif-scale))' }}
          initial={{ opacity: 0, y: travel(12) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: ease.out }}
        >
          Gallery
        </motion.h1>
      </header>

      {ids.length === 0 ? (
        <EmptyState title="Your memories will live here." body="Every photograph you keep finds its place in this gallery." />
      ) : (
        <div className="flex items-start px-3" style={{ gap: GAP }}>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-1 flex-col" style={{ gap: GAP }}>
              {col.map(({ id, index }) => {
                const m = photos.get(id)!;
                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, y: travel(30) }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -5% 0px' }}
                    transition={{ duration: 0.8, delay: (index % 4) * 0.05, ease: ease.out }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => open({ kind: 'viewer', ids, index, prefix: 'gallery' })}
                    className="group relative block w-full text-left"
                    aria-label={`Photograph from ${formatMonthDay(m.date)}`}
                  >
                    <div
                      data-photo-source={photoLayout('gallery', id)}
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: m.width / m.height, borderRadius: 14 }}
                    >
                      <Photo id={id} className="h-full w-full" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

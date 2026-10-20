import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatFull, formatMonth, formatShortMonth, monthGrid, weekdayLabels } from '../lib/dates';
import { ease, spring } from '../lib/motion';
import { useJournal } from '../state/journal';
import { useSettings } from '../state/settings';
import { useTravel } from '../state/motion';
import { useUI } from '../state/ui';
import { EntryCard } from '../components/EntryCard';
import { Pressable } from '../components/Pressable';

type View = 'month' | 'year';

export function Calendar() {
  const { today, entries, drafts } = useJournal();
  const { settings } = useSettings();
  const { open } = useUI();
  const travel = useTravel();
  const [ty, tm] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1];
  const [cursor, setCursor] = useState({ y: ty, m: tm });
  const [dir, setDir] = useState(0);
  const [view, setView] = useState<View>('month');
  const [selected, setSelected] = useState<string | null>(entries.has(today) ? today : null);

  const shiftMonth = (d: number) => {
    setDir(d);
    setCursor(({ y, m }) => {
      const t = new Date(y, m + d, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });
  };
  const shiftYear = (d: number) => {
    setDir(d);
    setCursor(({ y, m }) => ({ y: y + d, m }));
  };

  const onSwipe = (_: unknown, info: PanInfo, shift: (d: number) => void) => {
    if (info.offset.x < -60 || info.velocity.x < -400) shift(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) shift(-1);
  };

  const grid = useMemo(() => monthGrid(cursor.y, cursor.m, settings.weekStart), [cursor, settings.weekStart]);
  const monthHasEntries = grid.some((c) => c.inMonth && entries.has(c.key));
  const selectedEntry = selected ? entries.get(selected) : undefined;
  const selectedInView = !!selected && selected.slice(0, 7) === `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;

  const slide = {
    enter: (d: number) => ({ x: travel(d * 60), opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: travel(-d * 60), opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-xl pb-40">
      <header className="safe-top px-6">
        <div className="flex items-end justify-between pt-6">
          <Pressable
            onClick={() => setView((v) => (v === 'month' ? 'year' : 'month'))}
            press={0.97}
            className="text-left"
            aria-label={view === 'month' ? 'Show the whole year' : 'Back to month'}
          >
            <div className="label">{view === 'month' ? cursor.y : 'Tap a month'}</div>
            <div className="relative mt-1 h-[48px] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.h1
                  key={view === 'month' ? `${cursor.y}-${cursor.m}` : `y${cursor.y}`}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ y: travel(d >= 0 ? 30 : -30), opacity: 0 }),
                    center: { y: 0, opacity: 1 },
                    exit: (d: number) => ({ y: travel(d >= 0 ? -30 : 30), opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={spring.soft}
                  className="serif text-[44px] font-light leading-none text-ink"
                  style={{ fontSize: 'calc(44px * var(--serif-scale))' }}
                >
                  {view === 'month' ? formatMonth(cursor.y, cursor.m) : cursor.y}
                </motion.h1>
              </AnimatePresence>
            </div>
          </Pressable>
          <div className="flex gap-1 pb-1">
            <Pressable
              onClick={() => (view === 'month' ? shiftMonth(-1) : shiftYear(-1))}
              aria-label="Previous"
              press={0.86}
              className="grid h-10 w-10 place-items-center rounded-full text-soft"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              onClick={() => (view === 'month' ? shiftMonth(1) : shiftYear(1))}
              aria-label="Next"
              press={0.86}
              className="grid h-10 w-10 place-items-center rounded-full text-soft"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </Pressable>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'month' ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.32, ease: ease.out }}
          >
            <div className="mt-6 grid grid-cols-7 px-4">
              {weekdayLabels(settings.weekStart).map((d, i) => (
                <div key={i} className="label text-center text-faint">
                  {d}
                </div>
              ))}
            </div>

            <div className="relative mt-2 overflow-hidden px-4">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={`${cursor.y}-${cursor.m}`}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={spring.soft}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  dragDirectionLock
                  onDragEnd={(e, info) => onSwipe(e, info, shiftMonth)}
                  className="grid touch-pan-y grid-cols-7 gap-y-1"
                >
                  {grid.map((c, i) => {
                    const has = entries.has(c.key);
                    const draft = drafts.has(c.key) && !has;
                    const isToday = c.key === today;
                    const isSel = c.key === selected;
                    const future = c.key > today;
                    return (
                      <motion.button
                        key={c.key}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: c.inMonth ? 1 : 0.28, scale: 1 }}
                        transition={{ duration: 0.45, delay: Math.floor(i / 7) * 0.025 + (i % 7) * 0.008, ease: ease.out }}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          if (!c.inMonth) shiftMonth(c.key < grid[10].key ? -1 : 1);
                          setSelected(c.key);
                        }}
                        className="relative flex aspect-square items-center justify-center"
                        aria-label={`${formatFull(c.key)}${has ? ', has an entry' : ''}`}
                        aria-pressed={isSel}
                      >
                        {isSel && (
                          <motion.span
                            layoutId="calendar-selected"
                            className="absolute inset-[9%] rounded-full bg-ink"
                            transition={spring.snappy}
                          />
                        )}
                        {isToday && !isSel && <span className="absolute inset-[9%] rounded-full border border-accent/70" />}
                        <span
                          className={`relative text-[15px] tabular-nums transition-colors duration-300 ${
                            isSel ? 'font-medium text-bg' : future ? 'text-faint' : has ? 'font-medium text-ink' : 'text-soft'
                          }`}
                        >
                          {c.day}
                        </span>
                        {(has || draft) && (
                          <motion.span
                            className={`absolute bottom-[16%] h-[4px] w-[4px] rounded-full ${
                              isSel ? 'bg-bg' : has ? 'bg-accent' : 'border border-accent/70'
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ ...spring.snappy, delay: 0.15 + i * 0.004 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 px-5">
              <AnimatePresence mode="wait" initial={false}>
                {selected && selectedInView ? (
                  <motion.div
                    key={selected}
                    initial={{ opacity: 0, y: travel(30) }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: travel(12), transition: { duration: 0.18 } }}
                    transition={spring.soft}
                  >
                    {selectedEntry ? (
                      <EntryCard
                        entry={selectedEntry}
                        prefix="calendar"
                        parallax={false}
                        onOpen={() => open({ kind: 'entry', date: selected, prefix: 'calendar' })}
                      />
                    ) : (
                      <DayNote date={selected} today={today} onCapture={() => open({ kind: 'editor', date: today })} />
                    )}
                  </motion.div>
                ) : !monthHasEntries ? (
                  <motion.p
                    key={`empty-${cursor.y}-${cursor.m}`}
                    className="serif py-6 text-center text-[19px] italic text-faint"
                    initial={{ opacity: 0, y: travel(8) }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: ease.out }}
                  >
                    A month waiting to be remembered.
                  </motion.p>
                ) : (
                  <motion.p
                    key="hint"
                    className="label py-6 text-center text-faint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Tap a day to revisit it
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="year"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.32, ease: ease.out }}
            className="overflow-hidden"
          >
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={cursor.y}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={spring.soft}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragDirectionLock
                onDragEnd={(e, info) => onSwipe(e, info, shiftYear)}
                className="mt-6 grid touch-pan-y grid-cols-3 gap-x-4 gap-y-7 px-6"
              >
                {Array.from({ length: 12 }, (_, m) => (
                  <MiniMonth
                    key={m}
                    year={cursor.y}
                    month={m}
                    current={cursor.y === ty && m === tm}
                    onPick={() => {
                      setDir(0);
                      setCursor({ y: cursor.y, m });
                      setView('month');
                    }}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DayNote({ date, today, onCapture }: { date: string; today: string; onCapture: () => void }) {
  const isToday = date === today;
  return (
    <div className="rounded-[26px] border border-line/80 px-6 py-8 text-center">
      <div className="label">{formatFull(date)}</div>
      {isToday ? (
        <>
          <p className="serif mt-3 text-[20px] italic text-soft">Nothing kept yet today.</p>
          <Pressable onClick={onCapture} className="mt-5 h-11 rounded-full bg-ink px-6 text-bg" press={0.95}>
            <span className="serif text-[17px] italic">Capture Today</span>
          </Pressable>
        </>
      ) : (
        <p className="serif mt-3 text-[20px] italic text-faint">
          {date > today ? 'This day is still to come.' : 'A quiet day, unwritten.'}
        </p>
      )}
    </div>
  );
}

function MiniMonth({ year, month, current, onPick }: { year: number; month: number; current: boolean; onPick: () => void }) {
  const { entries } = useJournal();
  const { settings } = useSettings();
  const cells = useMemo(() => monthGrid(year, month, settings.weekStart), [year, month, settings.weekStart]);
  const count = cells.filter((c) => c.inMonth && entries.has(c.key)).length;
  return (
    <Pressable onClick={onPick} press={0.94} className="text-left" aria-label={`${formatMonth(year, month)}, ${count} entries`}>
      <div className={`serif text-[18px] ${current ? 'text-accent' : 'text-ink'}`}>{formatShortMonth(year, month)}</div>
      <div className="mt-2 grid grid-cols-7 gap-[3px]">
        {cells.slice(0, 42).map((c) => (
          <span
            key={c.key}
            className={`aspect-square rounded-full ${
              !c.inMonth ? 'opacity-0' : entries.has(c.key) ? 'bg-accent' : 'bg-line/70'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 text-[10.5px] tracking-[0.06em] text-faint">
        {count ? `${count} ${count === 1 ? 'day' : 'days'}` : '—'}
      </div>
    </Pressable>
  );
}

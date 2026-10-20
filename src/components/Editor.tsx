import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { formatMonthDay, formatWeekday } from '../lib/dates';
import { ease, spring } from '../lib/motion';
import { LIMITS, type EntryMode } from '../lib/types';
import { applyWordLimit, countWords } from '../lib/words';
import { isEmptyInput, useJournal, type EntryInput } from '../state/journal';
import { useUI } from '../state/ui';
import { useScrollLock, useVisualViewport } from '../state/viewport';
import { useTravel } from '../state/motion';
import { PhotoSlot } from './PhotoSlot';
import { Pressable } from './Pressable';
import { RollingNumber } from './RollingNumber';
import { Seal } from './Seal';

interface Props {
  date: string;
  origin?: string;
}

const same = (a: EntryInput, b: EntryInput) =>
  a.mode === b.mode && a.text === b.text && a.photoIds.join() === b.photoIds.join();

type Phase = 'editing' | 'closing' | 'sealed';

export function Editor({ date, origin }: Props) {
  const journal = useJournal();
  const { close, confirm, notify } = useUI();
  const travel = useTravel();
  const vv = useVisualViewport();
  useScrollLock();

  const saved = journal.entries.get(date);
  const savedInput = useMemo<EntryInput | null>(
    () => (saved ? { date, mode: saved.mode, text: saved.text, photoIds: saved.photoIds } : null),
    [saved, date],
  );

  // Start from the draft if there is one, otherwise the saved entry.
  const [initial] = useState<EntryInput>(() => {
    const d = journal.drafts.get(date);
    if (d) return { date, mode: d.mode, text: d.text, photoIds: d.photoIds };
    return savedInput ?? { date, mode: 'words', text: '', photoIds: [] };
  });
  const [mode, setMode] = useState<EntryMode>(initial.mode);
  const [text, setText] = useState(initial.text);
  const [photoIds, setPhotoIds] = useState<string[]>(initial.photoIds);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('editing');
  const [focused, setFocused] = useState(false);

  const input: EntryInput = useMemo(() => ({ date, mode, text, photoIds }), [date, mode, text, photoIds]);
  const words = countWords(text);
  const empty = isEmptyInput(input);
  const unchanged = savedInput ? same(input, savedInput) : empty;

  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef(0);
  const caretRef = useRef<number | null>(null);
  const counter = useAnimationControls();

  /* ——— Drafts: saved quietly as you write ——— */
  const latest = useRef(input);
  latest.current = input;
  const persisted = useRef(input);

  const flush = useCallback(async () => {
    const cur = latest.current;
    if (same(cur, persisted.current)) return;
    persisted.current = cur;
    const matchesSaved = savedInput ? same(cur, savedInput) : isEmptyInput(cur);
    if (matchesSaved) await journal.discardDraft(date);
    else await journal.saveDraft(cur);
  }, [journal, savedInput, date]);

  useEffect(() => {
    if (phase !== 'editing') return;
    const t = window.setTimeout(flush, 450);
    return () => window.clearTimeout(t);
  }, [input, flush, phase]);

  // Never lose writing if the app is backgrounded mid-sentence.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  /* ——— Writing ——— */
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
    if (caretRef.current != null) {
      el.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [text, mode]);

  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const r = applyWordLimit(text, next, LIMITS.words);
    if (r.clipped) {
      counter.start({ x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.42, ease: ease.out } });
      if (r.value !== next) caretRef.current = r.caret;
    }
    setText(r.value);
  };

  /* ——— Photographs ——— */
  const maxPhotos = mode === 'photos' ? LIMITS.photosOnly : LIMITS.photosWithWords;

  const pick = (slot: number) => {
    if (busySlot !== null || slot >= maxPhotos) return;
    slotRef.current = slot;
    fileRef.current?.click();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const slot = slotRef.current;
    setBusySlot(slot);
    try {
      const meta = await journal.addPhoto(file, date);
      setPhotoIds((ids) => {
        const next = [...ids];
        if (slot < next.length) next[slot] = meta.id;
        else next.push(meta.id);
        return next.slice(0, maxPhotos);
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'That photograph could not be added.');
    } finally {
      setBusySlot(null);
    }
  };

  const remove = (slot: number) => setPhotoIds((ids) => ids.filter((_, i) => i !== slot));

  /* ——— Modes ——— */
  const switchMode = async (next: EntryMode) => {
    if (next === mode) return;
    if (next === 'photos' && text.trim()) {
      const ok = await confirm({
        title: 'Two memories instead?',
        message: 'This mode holds photographs only, so your writing will be removed from this entry.',
        confirm: 'Remove writing & switch',
        destructive: true,
      });
      if (!ok) return;
      setText('');
    }
    if (next === 'words' && photoIds.length > LIMITS.photosWithWords) {
      const ok = await confirm({
        title: 'Keep one photograph?',
        message: 'Words & a memory holds a single photograph. Your second photograph will be removed.',
        confirm: 'Remove second photograph',
        destructive: true,
      });
      if (!ok) return;
      setPhotoIds((ids) => ids.slice(0, LIMITS.photosWithWords));
    }
    setMode(next);
  };

  /* ——— Leaving ——— */
  const dismiss = async () => {
    if (phase !== 'editing') return;
    await flush();
    if (!unchanged) notify(saved ? 'Your changes are kept as a draft.' : 'Your draft is kept for later.');
    close('editor');
  };

  const discard = async () => {
    const ok = await confirm({
      title: saved ? 'Discard changes?' : 'Discard this draft?',
      message: saved ? 'The entry will return to how you last kept it.' : 'What you have written today will be removed.',
      confirm: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    persisted.current = latest.current;
    await journal.discardDraft(date);
    close('editor');
  };

  const keep = async () => {
    if (empty || phase !== 'editing' || busySlot !== null) return;
    textRef.current?.blur();
    setPhase('closing');
    try {
      persisted.current = input;
      await Promise.all([journal.saveEntry(input), new Promise((r) => setTimeout(r, 480))]);
      setPhase('sealed');
      window.setTimeout(() => {
        close('editor');
        notify('Another day, remembered.', 'celebrate');
      }, 1500);
    } catch {
      setPhase('editing');
      notify('This moment could not be kept. Please try again.');
    }
  };

  // Focus the page once it has settled, so the caret fades in after the opening.
  useEffect(() => {
    if (initial.mode !== 'words' || initial.text) return;
    const t = window.setTimeout(() => textRef.current?.focus({ preventScroll: true }), 620);
    return () => window.clearTimeout(t);
  }, [initial]);

  const near = words >= 85;
  const full = words >= LIMITS.words;
  const editing = phase === 'editing';
  const hasDraft = journal.drafts.has(date) || !unchanged;

  return (
    <div
      className="fixed inset-x-0 z-50"
      style={{ top: vv.top, height: vv.height }}
      role="dialog"
      aria-modal="true"
      aria-label="Today's entry"
    >
      <motion.div
        className="absolute inset-0 bg-[rgb(var(--scrim)/0.38)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.45 } }}
        transition={{ duration: 0.45 }}
        onClick={dismiss}
      />

      <motion.div
        className="absolute inset-x-2.5 bottom-2.5 mx-auto max-w-xl [perspective:1800px]"
        style={{ top: 'max(env(safe-area-inset-top), 14px)' }}
        initial={origin ? false : { opacity: 0, y: travel(40), scale: 0.96 }}
        animate={
          phase === 'sealed'
            ? { opacity: 1, y: 0, scale: 0.94 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        exit={
          phase === 'sealed'
            ? { opacity: 0, y: travel(60), scale: 0.72, transition: { ...spring.soft, opacity: { duration: 0.35, delay: 0.1 } } }
            : origin
              ? { opacity: 1 }
              : { opacity: 0, y: travel(40), scale: 0.96, transition: { duration: 0.3, ease: ease.in } }
        }
        transition={spring.page}
      >
        {/* The page itself — grows out of the button that opened it. */}
        <motion.div
          layoutId={origin}
          className="absolute inset-0 rounded-page bg-surface shadow-page"
          style={{ borderRadius: 28 }}
          transition={spring.page}
        >
          <div className="grain pointer-events-none absolute inset-0 rounded-page opacity-70" />
        </motion.div>

        {/* Contents fade in once the page is mostly open. */}
        <motion.div
          className="absolute inset-0 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: editing ? 1 : 0, scale: editing ? 1 : 0.985 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={editing ? { duration: 0.42, delay: origin ? 0.2 : 0.08, ease: ease.out } : { duration: 0.28 }}
        >
          <header className="flex shrink-0 items-start justify-between px-6 pb-3 pt-6">
            <div>
              <div className="label">{formatWeekday(date)}</div>
              <h2 className="serif mt-1 text-[32px] leading-none text-ink" style={{ fontSize: 'calc(32px * var(--serif-scale))' }}>
                {formatMonthDay(date)}
              </h2>
            </div>
            <Pressable
              onClick={dismiss}
              aria-label="Close"
              press={0.88}
              className="-mr-1.5 grid h-10 w-10 place-items-center rounded-full bg-sunken/70 text-soft"
            >
              <X size={18} strokeWidth={1.6} />
            </Pressable>
          </header>

          <div className="px-6">
            <ModeSwitch mode={mode} onChange={switchMode} />
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4 pt-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'words' ? (
                <motion.div
                  key="words"
                  initial={{ opacity: 0, x: travel(-24) }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: travel(-24), transition: { duration: 0.2 } }}
                  transition={spring.soft}
                  className="flex flex-col gap-5"
                >
                  <PhotoSlot
                    id={photoIds[0]}
                    busy={busySlot === 0}
                    onPick={() => pick(0)}
                    onRemove={() => remove(0)}
                    emptyAspect={2.6}
                    label="Add a photograph"
                  />
                  <div className="relative">
                    <textarea
                      ref={textRef}
                      value={text}
                      onChange={onText}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      rows={4}
                      enterKeyHint="enter"
                      autoCapitalize="sentences"
                      spellCheck
                      aria-label="Write about today"
                      className="serif block min-h-[180px] w-full resize-none bg-transparent text-[21px] leading-[1.65] text-ink caret-[rgb(var(--accent))] outline-none"
                      style={{ fontSize: 'calc(21px * var(--serif-scale))' }}
                    />
                    {!text && (
                      <div className="pointer-events-none absolute left-0 top-0 flex items-center gap-[3px]">
                        {!focused && (
                          <motion.span
                            className="block h-[26px] w-[1.5px] rounded-full bg-accent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 1, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.15, 0.6, 1], delay: 0.6 }}
                          />
                        )}
                        <span
                          className="serif text-[21px] italic leading-[1.65] text-faint"
                          style={{ fontSize: 'calc(21px * var(--serif-scale))' }}
                        >
                          What stayed with you today?
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="photos"
                  initial={{ opacity: 0, x: travel(24) }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: travel(24), transition: { duration: 0.2 } }}
                  transition={spring.soft}
                  className="grid grid-cols-[1.12fr_1fr] items-start gap-3"
                >
                  <PhotoSlot
                    id={photoIds[0]}
                    busy={busySlot === 0}
                    onPick={() => pick(0)}
                    onRemove={() => remove(0)}
                    emptyAspect={3 / 4}
                    label="First"
                  />
                  <div className="pt-14">
                    <PhotoSlot
                      id={photoIds[1]}
                      busy={busySlot === 1}
                      onPick={() => pick(photoIds.length >= 1 ? 1 : 0)}
                      onRemove={() => remove(1)}
                      emptyAspect={3 / 4}
                      label="Second"
                    />
                  </div>
                  <p className="serif col-span-2 mt-4 text-center text-[17px] italic text-faint">
                    Two photographs, no words. Let them speak.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="shrink-0 px-6 pb-5 pt-3">
            <div className="mb-3 flex h-6 items-center justify-between">
              {mode === 'words' ? (
                <motion.div animate={counter} className="flex items-center gap-3">
                  <span
                    className={`text-[12px] font-medium tracking-[0.06em] transition-colors duration-500 ${
                      full ? 'text-[#a2563f] dark:text-[#d58c6e]' : near ? 'text-accent' : 'text-faint'
                    }`}
                  >
                    <RollingNumber value={words} /> / {LIMITS.words} words
                  </span>
                  <span className="relative block h-[2px] w-16 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className={`absolute inset-0 origin-left rounded-full ${full ? 'bg-[#a2563f]' : 'bg-accent'}`}
                      animate={{ scaleX: Math.min(1, words / LIMITS.words) }}
                      transition={spring.snappy}
                    />
                  </span>
                </motion.div>
              ) : (
                <span className="text-[12px] font-medium tracking-[0.06em] text-faint">
                  <RollingNumber value={photoIds.length} /> / {LIMITS.photosOnly} photographs
                </span>
              )}
              <AnimatePresence>
                {hasDraft && editing && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={discard}
                    className="text-[12px] text-faint underline decoration-line underline-offset-4"
                  >
                    {saved ? 'Discard changes' : 'Discard draft'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <Pressable
              onClick={keep}
              disabled={empty || busySlot !== null}
              press={0.97}
              className="relative h-[54px] w-full overflow-hidden rounded-2xl bg-ink text-[15.5px] font-medium tracking-[0.01em] text-bg transition-opacity duration-300 disabled:opacity-30"
            >
              <span className="serif text-[19px] italic" style={{ fontSize: 'calc(19px * var(--serif-scale))' }}>
                Keep This Moment
              </span>
            </Pressable>
          </footer>
        </motion.div>

        {/* The cover swings closed over the page when the moment is kept. */}
        <AnimatePresence>
          {phase !== 'editing' && (
            <motion.div
              key="cover"
              className="absolute inset-0 overflow-hidden rounded-page bg-sunken [backface-visibility:hidden]"
              style={{ transformOrigin: '0% 50%', borderRadius: 28 }}
              initial={{ rotateY: -150, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ rotateY: { type: 'spring', stiffness: 90, damping: 17, mass: 1 }, opacity: { duration: 0.15 } }}
            >
              <div className="grain absolute inset-0" />
              <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/[0.07] to-transparent" />
              <div className="absolute inset-3 rounded-[20px] border border-accent/25" />
              <div className="relative flex h-full flex-col items-center justify-center gap-5">
                <div className="label tracking-[0.5em] text-accent">Moments</div>
                <Seal play={phase === 'sealed'} />
                <motion.div
                  className="serif text-[22px] italic text-soft"
                  initial={{ opacity: 0, y: 6 }}
                  animate={phase === 'sealed' ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.5, ease: ease.out }}
                >
                  {formatMonthDay(date)}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: EntryMode; onChange: (m: EntryMode) => void }) {
  const opts: { value: EntryMode; label: string }[] = [
    { value: 'words', label: 'Words & a memory' },
    { value: 'photos', label: 'Two memories' },
  ];
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-sunken/80 p-1" role="radiogroup" aria-label="Entry type">
      {opts.map((o) => {
        const active = o.value === mode;
        return (
          <Pressable
            key={o.value}
            role="radio"
            aria-checked={active}
            press={0.97}
            onClick={() => onChange(o.value)}
            className="relative h-9 rounded-full text-[12.5px] font-medium tracking-[0.02em]"
          >
            {active && (
              <motion.span
                layoutId="editor-mode-pill"
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(var(--shadow)/0.12)]"
                transition={spring.snappy}
              />
            )}
            <span className={`relative transition-colors duration-300 ${active ? 'text-ink' : 'text-soft'}`}>{o.label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

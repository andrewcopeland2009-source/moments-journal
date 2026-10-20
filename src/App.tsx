import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Editor } from './components/Editor';
import { EntryView } from './components/EntryView';
import { LockScreen } from './components/LockScreen';
import { PhotoViewer } from './components/PhotoViewer';
import { SettingsSheet } from './components/SettingsSheet';
import { TabBar } from './components/TabBar';
import { ToastHost } from './components/ToastHost';
import { ease } from './lib/motion';
import { Calendar } from './screens/Calendar';
import { Gallery } from './screens/Gallery';
import { Timeline } from './screens/Timeline';
import { Today } from './screens/Today';
import { useJournal } from './state/journal';
import { useTravel } from './state/motion';
import { useSettings } from './state/settings';
import { TABS, useUI, type Overlay, type Tab } from './state/ui';

const SCREENS: Record<Tab, () => JSX.Element> = {
  today: Today,
  timeline: Timeline,
  calendar: Calendar,
  gallery: Gallery,
};

export function App() {
  const { reduced } = useSettings();
  const { ready, error } = useJournal();
  const { tab, overlays } = useUI();
  const travel = useTravel();

  // Remember each tab's scroll position and return to it.
  const scrolls = useRef<Partial<Record<Tab, number>>>({});
  const prevTab = useRef(tab);
  const dir = TABS.indexOf(tab) - TABS.indexOf(prevTab.current);
  useEffect(() => {
    prevTab.current = tab;
  }, [tab]);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => (scrolls.current[prevTab.current] = window.scrollY));
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  if (!ready) return null;
  if (error) return <Failure message={error} />;

  const Screen = SCREENS[tab];

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <LayoutGroup>
        <main className="min-h-[100dvh]">
          <AnimatePresence
            mode="wait"
            initial={false}
            custom={dir}
            onExitComplete={() => window.scrollTo(0, scrolls.current[tab] ?? 0)}
          >
            <motion.div
              key={tab}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: travel(Math.sign(d) * 18), scale: 0.995 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => ({ opacity: 0, x: travel(-Math.sign(d) * 12), scale: 0.995 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: ease.out }}
            >
              <Screen />
            </motion.div>
          </AnimatePresence>
        </main>

        <TabBar />

        <AnimatePresence>
          {overlays.map((o) => (
            <OverlayView key={o.kind} overlay={o} />
          ))}
        </AnimatePresence>

        <ConfirmDialog />
        <ToastHost />
        <LockScreen />
      </LayoutGroup>
    </MotionConfig>
  );
}

function OverlayView({ overlay: o }: { overlay: Overlay }) {
  switch (o.kind) {
    case 'editor':
      return <Editor date={o.date} origin={o.origin} />;
    case 'entry':
      return <EntryView date={o.date} prefix={o.prefix} />;
    case 'viewer':
      return <PhotoViewer ids={o.ids} index={o.index} prefix={o.prefix} />;
    case 'settings':
      return <SettingsSheet />;
  }
}

function Failure({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-10 text-center">
      <div className="label text-accent">Moments</div>
      <p className="serif mt-4 text-[24px] text-ink">Your journal could not be opened.</p>
      <p className="mt-3 text-[13px] text-soft">{message}</p>
      <p className="mt-2 text-[12px] text-faint">
        Private browsing can block local storage. Try opening Moments from your Home Screen.
      </p>
    </div>
  );
}

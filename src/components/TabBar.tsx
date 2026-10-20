import { motion } from 'motion/react';
import { CalendarDays, GalleryVerticalEnd, Images, Sun, type LucideIcon } from 'lucide-react';
import { useUI, type Tab } from '../state/ui';
import { spring } from '../lib/motion';
import { Pressable } from './Pressable';

const ITEMS: { tab: Tab; label: string; Icon: LucideIcon }[] = [
  { tab: 'today', label: 'Today', Icon: Sun },
  { tab: 'timeline', label: 'Timeline', Icon: GalleryVerticalEnd },
  { tab: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { tab: 'gallery', label: 'Gallery', Icon: Images },
];

export function TabBar() {
  const { tab, setTab, immersive, overlays } = useUI();
  const hidden = immersive;
  const dimmed = overlays.length > 0;

  return (
    <motion.nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(env(safe-area-inset-bottom),12px)]"
      initial={false}
      animate={{ y: hidden ? 120 : 0, opacity: hidden ? 0 : 1 }}
      transition={spring.soft}
      aria-hidden={hidden}
    >
      <div
        className={`flex items-center gap-1 rounded-full border border-line/70 bg-surface/80 p-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-300 ${
          dimmed ? 'opacity-60' : ''
        }`}
        role="tablist"
      >
        {ITEMS.map(({ tab: t, label, Icon }) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              role="tab"
              aria-selected={active}
              aria-label={label}
              press={0.9}
              onClick={() => {
                if (active) window.scrollTo({ top: 0, behavior: 'smooth' });
                else setTab(t);
              }}
              className="relative flex h-12 w-[68px] flex-col items-center justify-center gap-[3px] rounded-full"
            >
              {active && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-full bg-sunken"
                  transition={spring.snappy}
                />
              )}
              <motion.span
                className="relative"
                animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
                transition={spring.snappy}
              >
                <Icon size={19} strokeWidth={active ? 1.9 : 1.5} className={active ? 'text-ink' : 'text-faint'} />
              </motion.span>
              <span
                className={`relative text-[9.5px] font-medium tracking-[0.08em] transition-colors duration-300 ${
                  active ? 'text-ink' : 'text-faint'
                }`}
              >
                {label}
              </span>
            </Pressable>
          );
        })}
      </div>
    </motion.nav>
  );
}

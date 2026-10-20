import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_SETTINGS, type Settings } from '../lib/types';

const KEY = 'moments:settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function resolvedTheme(s: Settings) {
  return s.theme === 'dark' || (s.theme === 'system' && systemDark()) ? 'dark' : 'light';
}

function apply(s: Settings) {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme(s);
  root.dataset.tone = s.tone;
  root.dataset.font = s.font;
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim().split(/\s+/).join(',');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${bg})`);
}

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  dark: boolean;
  reduced: boolean;
}

const SettingsContext = createContext<Ctx>(null!);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const [osReduced, setOsReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [, force] = useState(0);

  useEffect(() => {
    apply(settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* private mode: settings simply won't persist */
    }
  }, [settings]);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const onScheme = () => {
      apply(load());
      force((n) => n + 1);
    };
    const onReduce = () => setOsReduced(rm.matches);
    mq.addEventListener('change', onScheme);
    rm.addEventListener('change', onReduce);
    return () => {
      mq.removeEventListener('change', onScheme);
      rm.removeEventListener('change', onReduce);
    };
  }, []);

  const reduced = osReduced || settings.motion === 'minimal';

  const update = useCallback(
    (patch: Partial<Settings>) => {
      const visual = 'theme' in patch || 'tone' in patch || 'font' in patch;
      const commit = () => setSettings((s) => ({ ...s, ...patch }));
      if (!visual || reduced) return commit();
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (doc.startViewTransition) {
        doc.startViewTransition(() => flushSync(commit));
      } else {
        const root = document.documentElement;
        root.classList.add('theme-fade');
        commit();
        window.setTimeout(() => root.classList.remove('theme-fade'), 560);
      }
    },
    [reduced],
  );

  const value = useMemo(
    () => ({ settings, update, dark: resolvedTheme(settings) === 'dark', reduced }),
    [settings, update, reduced],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

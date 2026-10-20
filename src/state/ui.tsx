import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type Tab = 'today' | 'timeline' | 'calendar' | 'gallery';
export const TABS: Tab[] = ['today', 'timeline', 'calendar', 'gallery'];

export type Overlay =
  | { kind: 'editor'; date: string; origin?: string }
  | { kind: 'entry'; date: string; prefix: string }
  | { kind: 'viewer'; ids: string[]; index: number; prefix: string }
  | { kind: 'settings' };

export interface Toast {
  id: number;
  message: string;
  tone?: 'quiet' | 'celebrate';
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirm: string;
  cancel?: string;
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface Ctx {
  tab: Tab;
  setTab: (t: Tab) => void;
  overlays: Overlay[];
  open: (o: Overlay) => void;
  close: (kind?: Overlay['kind']) => void;
  replaceTop: (o: Overlay) => void;
  toast: Toast | null;
  notify: (message: string, tone?: Toast['tone']) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  pendingConfirm: PendingConfirm | null;
  settle: (ok: boolean) => void;
  immersive: boolean;
}

const UIContext = createContext<Ctx>(null!);

export function UIProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('today');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingConfirm, setPending] = useState<PendingConfirm | null>(null);
  const toastTimer = useRef<number>();

  const setTab = useCallback((t: Tab) => setTabState(t), []);
  const open = useCallback((o: Overlay) => setOverlays((s) => [...s.filter((x) => x.kind !== o.kind), o]), []);
  const close = useCallback(
    (kind?: Overlay['kind']) =>
      setOverlays((s) => {
        if (!kind) return s.slice(0, -1);
        const i = s.map((x) => x.kind).lastIndexOf(kind);
        return i < 0 ? s : [...s.slice(0, i), ...s.slice(i + 1)];
      }),
    [],
  );
  const replaceTop = useCallback((o: Overlay) => setOverlays((s) => [...s.slice(0, -1), o]), []);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'quiet') => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), tone === 'celebrate' ? 3200 : 2600);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );
  const settle = useCallback((ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }, []);

  const immersive = overlays.some((o) => o.kind !== 'settings');

  const value = useMemo(
    () => ({ tab, setTab, overlays, open, close, replaceTop, toast, notify, confirm, pendingConfirm, settle, immersive }),
    [tab, setTab, overlays, open, close, replaceTop, toast, notify, confirm, pendingConfirm, settle, immersive],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export const useUI = () => useContext(UIContext);

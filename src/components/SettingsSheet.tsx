import { motion } from 'motion/react';
import { Download, Lock, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createBackup, deliverBackup, restoreBackup } from '../lib/backup';
import { storageEstimate } from '../lib/db';
import { lockSupported, registerLock } from '../lib/lock';
import { spring } from '../lib/motion';
import type { FontChoice, MotionLevel, ThemeMode, Tone } from '../lib/types';
import { useJournal } from '../state/journal';
import { useSettings } from '../state/settings';
import { useUI } from '../state/ui';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function SettingsSheet() {
  const { settings, update } = useSettings();
  const { close, notify, confirm } = useUI();
  const { sorted, photos, reload } = useJournal();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [canLock, setCanLock] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lockSupported().then(setCanLock);
    storageEstimate().then((e) => e && setUsage(mb(e.usage)));
  }, []);

  const exportAll = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const b = await createBackup();
      const r = await deliverBackup(b.blob, b.filename);
      if (r !== 'cancelled') notify(`Backup created — ${b.entries} days, ${b.photos} photographs.`);
    } catch {
      notify('The backup could not be created.');
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (file: File) => {
    const ok = await confirm({
      title: 'Restore this backup?',
      message:
        'Days from the backup will be added to your journal. Where a day exists in both, the most recently edited version is kept.',
      confirm: 'Restore',
    });
    if (!ok) return;
    setBusy('import');
    try {
      const r = await restoreBackup(file);
      await reload();
      notify(`Restored ${r.added + r.updated} ${r.added + r.updated === 1 ? 'day' : 'days'}${r.skipped ? `, ${r.skipped} already up to date` : ''}.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'The backup could not be restored.');
    } finally {
      setBusy(null);
    }
  };

  const toggleLock = async () => {
    if (settings.lock) {
      update({ lock: null });
      notify('Privacy lock turned off.');
      return;
    }
    try {
      const credentialId = await registerLock();
      update({ lock: { credentialId } });
      notify('Moments will ask for Face ID or your passcode.');
    } catch {
      notify('The privacy lock was not set up.');
    }
  };

  return (
    <Sheet onClose={() => close('settings')} label="Settings">
      <div className="flex items-center justify-between px-6 pb-2 pt-2">
        <h2 className="serif text-[30px] text-ink">Settings</h2>
        <Pressable onClick={() => close('settings')} className="text-[14px] text-soft" press={0.92}>
          Done
        </Pressable>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
        <Group title="Appearance">
          <Row label="Theme">
            <Segmented<ThemeMode>
              id="theme"
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                ['system', 'Auto'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ]}
            />
          </Row>
          <Row label="Paper">
            <Segmented<Tone>
              id="tone"
              value={settings.tone}
              onChange={(tone) => update({ tone })}
              options={[
                ['ivory', 'Ivory'],
                ['champagne', 'Champagne'],
                ['stone', 'Stone'],
              ]}
            />
          </Row>
          <Row label="Typography">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['classic', 'Classic', 'Cormorant Garamond'],
                  ['modern', 'Modern', 'Fraunces Variable'],
                  ['literary', 'Literary', 'Newsreader Variable'],
                ] as [FontChoice, string, string][]
              ).map(([v, label, family]) => (
                <Pressable
                  key={v}
                  onClick={() => update({ font: v })}
                  press={0.95}
                  className={`relative rounded-2xl border px-2 py-3 text-center transition-colors duration-300 ${
                    settings.font === v ? 'border-ink/60 bg-sunken/60' : 'border-line'
                  }`}
                >
                  <div className="text-[26px] leading-none text-ink" style={{ fontFamily: `'${family}', serif` }}>
                    Aa
                  </div>
                  <div className="mt-1.5 text-[11px] text-soft">{label}</div>
                </Pressable>
              ))}
            </div>
          </Row>
        </Group>

        <Group title="Calendar">
          <Row label="Week begins on">
            <Segmented<'0' | '1'>
              id="week"
              value={String(settings.weekStart) as '0' | '1'}
              onChange={(v) => update({ weekStart: Number(v) as 0 | 1 })}
              options={[
                ['0', 'Sunday'],
                ['1', 'Monday'],
              ]}
            />
          </Row>
        </Group>

        <Group title="Motion">
          <Row label="Animation" hint="Moments also follows your device's Reduce Motion setting.">
            <Segmented<MotionLevel>
              id="motion"
              value={settings.motion}
              onChange={(motion) => update({ motion })}
              options={[
                ['full', 'Full'],
                ['gentle', 'Gentle'],
                ['minimal', 'Minimal'],
              ]}
            />
          </Row>
        </Group>

        <Group title="Privacy">
          <p className="text-[13px] leading-relaxed text-soft">
            Your journal lives only on this device, in this browser. There are no accounts, no analytics, no
            advertising, and nothing is sent anywhere.
          </p>
          {canLock ? (
            <Pressable
              onClick={toggleLock}
              press={0.98}
              className="mt-4 flex w-full items-center justify-between rounded-2xl bg-sunken/60 px-4 py-3.5 text-left"
            >
              <span className="flex items-center gap-3 text-[14.5px] text-ink">
                <Lock size={16} strokeWidth={1.6} className="text-soft" />
                Privacy lock
              </span>
              <Toggle on={!!settings.lock} />
            </Pressable>
          ) : (
            <p className="mt-3 text-[12px] text-faint">A privacy lock is not available in this browser.</p>
          )}
          {canLock && (
            <p className="mt-2 text-[12px] leading-relaxed text-faint">
              Asks for Face ID, Touch ID or your passcode when Moments opens. It hides your journal from a casual
              glance; entries are not encrypted.
            </p>
          )}
        </Group>

        <Group title="Your memories">
          <div className="rounded-2xl bg-sunken/60 p-4 text-[13px] leading-relaxed text-soft">
            <strong className="font-medium text-ink">Stored on this device only.</strong> Deleting the app, clearing
            Safari's website data, or iOS reclaiming storage may permanently remove your memories. Moments is not
            backed up to iCloud — export a backup regularly and keep it somewhere safe, such as Files.
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Pressable
              onClick={exportAll}
              disabled={!!busy || sorted.length === 0}
              press={0.97}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[14px] text-bg disabled:opacity-40"
            >
              <Download size={16} strokeWidth={1.7} />
              {busy === 'export' ? 'Preparing…' : 'Export backup'}
            </Pressable>
            <Pressable
              onClick={() => fileRef.current?.click()}
              disabled={!!busy}
              press={0.97}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line text-[14px] text-ink disabled:opacity-40"
            >
              <Upload size={16} strokeWidth={1.7} />
              {busy === 'import' ? 'Restoring…' : 'Restore'}
            </Pressable>
          </div>
          <p className="mt-3 text-center text-[11.5px] text-faint">
            {sorted.length} {sorted.length === 1 ? 'day' : 'days'} · {photos.size}{' '}
            {photos.size === 1 ? 'photograph' : 'photographs'}
            {usage && ` · ${usage} used`}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importFile(f);
            }}
          />
        </Group>

        <div className="pb-6 pt-10 text-center">
          <div className="serif text-[22px] italic text-soft">Moments</div>
          <div className="label mt-1 text-faint">A little piece of every day</div>
        </div>
      </div>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="label mb-3 px-1">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-1 text-[13.5px] text-ink">{label}</div>
      {children}
      {hint && <p className="mt-2 px-1 text-[12px] text-faint">{hint}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative flex rounded-full bg-sunken/80 p-1" role="radiogroup">
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <Pressable
            key={v}
            role="radio"
            aria-checked={active}
            press={0.96}
            onClick={() => onChange(v)}
            className="relative h-9 flex-1 rounded-full text-[13px]"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(var(--shadow)/0.14)]"
                transition={spring.snappy}
              />
            )}
            <span className={`relative transition-colors duration-300 ${active ? 'text-ink' : 'text-soft'}`}>{label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative flex h-[30px] w-[50px] items-center rounded-full p-[3px] transition-colors duration-300 ${
        on ? 'justify-end bg-accent' : 'justify-start bg-line'
      }`}
    >
      <motion.span layout transition={spring.snappy} className="block h-6 w-6 rounded-full bg-white shadow" />
    </span>
  );
}

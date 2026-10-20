import { useSettings } from './settings';

/** Scales travel distances by the chosen animation intensity. */
export function useTravel() {
  const { settings, reduced } = useSettings();
  const k = reduced ? 0 : settings.motion === 'gentle' ? 0.5 : 1;
  return (px: number) => px * k;
}

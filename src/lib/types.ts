export type EntryMode = 'words' | 'photos';

/** One entry per local calendar day; the date key is the primary key. */
export interface Entry {
  date: string; // YYYY-MM-DD (local)
  mode: EntryMode;
  text: string;
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Draft {
  date: string;
  mode: EntryMode;
  text: string;
  photoIds: string[];
  updatedAt: number;
}

/** Lightweight photo metadata, loaded eagerly. Pixels live in a separate store. */
export interface PhotoMeta {
  id: string;
  date: string;
  width: number;
  height: number;
  color: string; // average colour, used as the loading placeholder
  type: string;
  createdAt: number;
}

export interface PhotoBlobs {
  id: string;
  full: ArrayBuffer;
  fullType: string;
  thumb: ArrayBuffer;
  thumbType: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type FontChoice = 'classic' | 'modern' | 'literary';
export type Tone = 'ivory' | 'champagne' | 'stone';
export type MotionLevel = 'full' | 'gentle' | 'minimal';

export interface Settings {
  theme: ThemeMode;
  font: FontChoice;
  tone: Tone;
  weekStart: 0 | 1;
  motion: MotionLevel;
  lock: { credentialId: string } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  font: 'classic',
  tone: 'ivory',
  weekStart: 1,
  motion: 'full',
  lock: null,
};

export const LIMITS = {
  words: 100,
  photosWithWords: 1,
  photosOnly: 2,
} as const;

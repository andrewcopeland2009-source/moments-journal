import { LIMITS } from './types';

// A word is a run of non-whitespace containing at least one letter or digit,
// so stray punctuation ("—", "…", "&") never counts against the limit.
const TOKEN = /\S+/gu;
const WORDISH = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  let n = 0;
  for (const m of text.matchAll(TOKEN)) if (WORDISH.test(m[0])) n++;
  return n;
}

export interface LimitResult {
  value: string;
  /** True when part of the input was refused because of the limit. */
  clipped: boolean;
  /** Caret position after the accepted insertion. */
  caret: number;
}

/**
 * Apply an edit (prev -> next) without letting the text exceed `limit` words.
 * Deletions always succeed. Insertions — typed or pasted — are trimmed at a
 * word boundary so existing writing is never removed.
 */
export function applyWordLimit(prev: string, next: string, limit: number = LIMITS.words): LimitResult {
  if (countWords(next) <= limit) return { value: next, clipped: false, caret: -1 };

  // Isolate the inserted span: common prefix + common suffix.
  let start = 0;
  const max = Math.min(prev.length, next.length);
  while (start < max && prev[start] === next[start]) start++;
  let endPrev = prev.length;
  let endNext = next.length;
  while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
    endPrev--;
    endNext--;
  }
  const head = next.slice(0, start);
  const inserted = next.slice(start, endNext);
  const tail = next.slice(endNext);

  // Word count is monotonic in the length of the inserted prefix, so binary search it.
  let lo = 0;
  let hi = inserted.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (countWords(head + inserted.slice(0, mid) + tail) <= limit) lo = mid;
    else hi = mid - 1;
  }
  let take = lo;
  // Don't split a pasted word in half.
  if (take < inserted.length && take > 0 && /\S/.test(inserted[take]) && /\S/.test(inserted[take - 1])) {
    const cut = inserted.slice(0, take).search(/\s\S*$/);
    take = cut >= 0 ? cut : 0;
  }
  let accepted = inserted.slice(0, take);
  // Trailing whitespace from a trimmed paste just looks like a mistake.
  if (take < inserted.length) accepted = accepted.replace(/\s+$/, tail && /^\S/.test(tail) ? ' ' : '');

  let value = head + accepted + tail;
  if (countWords(value) > limit) value = prev; // e.g. inserted space would split a word
  return { value, clipped: true, caret: value === prev ? start : head.length + accepted.length };
}

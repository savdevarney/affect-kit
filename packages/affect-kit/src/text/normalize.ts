// Pure module: a note made comparable (lower case, straight quotes, one space
// between words) while remembering where each character came from, so a match
// in the normalized text points back at the words as written.

/** A note, normalized, with each character's offset in the original. */
export interface NormalizedNote {
  /** Lower case, straight quotes, and every run of anything but letters, digits, £, &, hyphens and apostrophes as one space; padded with a space at each end. */
  text: string;
  /** For each character of `text`, its offset in the original; -1 for the padding. */
  origin: number[];
}

const KEEP = /[\p{L}\p{N}£&'\-]/u;

/** Normalize a note, keeping each character's origin. */
export function normalizeNote(note: string): NormalizedNote {
  let text = ' ';
  const origin: number[] = [-1];
  let i = 0;
  for (const ch of note) {
    const lower = ch.toLowerCase().replace(/[‘’]/g, "'");
    if (KEEP.test(lower) || /[‘’]/.test(ch)) {
      for (const c of lower) {
        text += c;
        origin.push(i);
      }
    } else if (!text.endsWith(' ')) {
      text += ' ';
      origin.push(i);
    }
    i += ch.length;
  }
  if (!text.endsWith(' ')) {
    text += ' ';
    origin.push(-1);
  }
  return { text, origin };
}

/** How many words a note has, counted as the cut counts them. */
export function countWords(note: string): number {
  return normalizeNote(note).text.trim().split(' ').filter(Boolean).length;
}

/** A match in the normalized text as a span of the original: from its first kept character to just after its last. */
export function originalSpan(n: NormalizedNote, start: number, end: number): { start: number; end: number } | null {
  let s = start;
  while (s < end && n.origin[s] === -1) s++;
  let e = end - 1;
  while (e >= s && n.origin[e] === -1) e--;
  if (s > e) return null;
  return { start: n.origin[s]!, end: n.origin[e]! + 1 };
}

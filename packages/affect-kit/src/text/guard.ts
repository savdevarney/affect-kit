// Pure module: what the person dismissed, and the counts that keep the lists
// honest. Both hold pairs and numbers only, never note text, so they can be
// stored on the device and synced without the note.

import type { CutResult } from './cut';
import type { HeardState } from './heard';
import type { FoundKind, SuppressedPair } from './types';

/** A pair dismissed this many times stops being suggested to that person. */
export const DISMISSALS_TO_SUPPRESS = 2;

/** How often each pair was dismissed, keyed by pair. Store it on the device. */
export type DismissalLog = Readonly<Record<string, number>>;

const key = (p: SuppressedPair) => JSON.stringify([p.kind, p.name, p.phrase]);

/** The log with these dismissals added (from `newDismissals`). */
export function recordDismissals(log: DismissalLog, pairs: readonly SuppressedPair[]): DismissalLog {
  const next: Record<string, number> = { ...log };
  for (const p of pairs) next[key(p)] = (next[key(p)] ?? 0) + 1;
  return next;
}

/** The pairs dismissed often enough to stop suggesting: the cut's `suppressed`. Also the "Not suggested for you" list. */
export function suppressedPairs(log: DismissalLog): SuppressedPair[] {
  return Object.entries(log)
    .filter(([, n]) => n >= DISMISSALS_TO_SUPPRESS)
    .map(([k]) => {
      const [kind, name, phrase] = JSON.parse(k) as [FoundKind, string, string];
      return { kind, name, phrase };
    });
}

/** "Suggest again": the pair's count starts over. */
export function suggestAgain(log: DismissalLog, pair: SuppressedPair): DismissalLog {
  const next: Record<string, number> = { ...log };
  delete next[key(pair)];
  return next;
}

/** One name's numbers for a day and a list version. */
export interface GuardCount {
  /** Shown from the note. */
  shown: number;
  /** Shown, then taken off. */
  removed: number;
  /** Would have been shown, but the person had dismissed that pair. */
  suppressed: number;
}

/** Counts keyed by day, list version, kind and name. No person and nothing from the note. */
export type GuardCounts = Readonly<Record<string, GuardCount>>;

/** The share a name may lose before it goes back to the full list: 1 in 20. */
export const GUARD_LIMIT = 1 / 20;

/** The key for a day's counts: `day` is the app's own day string, such as '2026-10-24'. */
export function guardKey(day: string, listVersion: string, kind: FoundKind, name: string): string {
  return JSON.stringify([day, listVersion, kind, name]);
}

/**
 * Add one saved check-in to the counts: what the note showed, what the person
 * took off, and what was held back for a dismissed pair (from the cut).
 */
export function tallyCheckin(
  counts: GuardCounts, day: string, listVersion: string, state: HeardState, cutResult: Pick<CutResult, 'suppressed'>,
): GuardCounts {
  const next: Record<string, GuardCount> = { ...counts };
  const bump = (kind: FoundKind, name: string, field: keyof GuardCount) => {
    const k = guardKey(day, listVersion, kind, name);
    const c = next[k] ?? { shown: 0, removed: 0, suppressed: 0 };
    next[k] = { ...c, [field]: c[field] + 1 };
  };
  for (const f of state.found) {
    if (f.source !== 'note' || f.listVersion !== listVersion) continue;
    bump(f.kind, f.name, 'shown');
    if (f.state === 'removed') bump(f.kind, f.name, 'removed');
  }
  for (const c of cutResult.suppressed) bump(c.kind, c.name, 'suppressed');
  return next;
}

/** A name's share lost: (removed + suppressed) / (shown + suppressed). 0 when nothing was shown. */
export function guardRate(c: GuardCount): number {
  const seen = c.shown + c.suppressed;
  return seen === 0 ? 0 : (c.removed + c.suppressed) / seen;
}

/** Whether a name lost more than the guard allows, so it goes back to the full list only. */
export function overGuard(c: GuardCount): boolean {
  return guardRate(c) > GUARD_LIMIT;
}

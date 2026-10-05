/**
 * Policy: pure decisions, no I/O and no model calls. Models propose; this code
 * decides what reaches the person and what's stored, so the rules are testable
 * and don't change when the model does ("policy lives in code", as in
 * Probiome's intake).
 */
import { MAX_WORDS } from './schema.ts';
import { isEmotionName, nearestWords, type EmotionName } from './vocabulary.ts';
import type { Extraction, Face, FeedbackAction, FoundWord, IdFactory, Level, ReviewChange, StoredWord, UnmatchedWord } from './ports.ts';

/** How text is compared: lowercase, straight quotes, single spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the evidence really is in their text. A model can invent a quote; this catches it. */
export function isGrounded(text: string, evidence: string): boolean {
  const quote = normalize(evidence);
  return quote.length > 0 && normalize(text).includes(quote);
}

export interface Finalized extends Extraction {
  /** What the policy removed, for evals and run records. */
  dropped: { ungrounded: number; overCap: number; merged: number };
}

/**
 * What reaches the person, from an extractor's proposal:
 * 1. Evidence must be in their text.
 * 2. One entry per word: the stronger level, the higher confidence.
 * 3. At most five words (the rater's cap), most confident first.
 * 4. Their own words are kept only when nothing in the vocabulary was used for
 *    them already, and only if they aren't vocabulary words themselves.
 */
export function finalize(text: string, proposal: Extraction, max = MAX_WORDS): Finalized {
  const grounded = proposal.words.filter((w) => isGrounded(text, w.evidence));
  const byName = new Map<EmotionName, FoundWord>();
  for (const word of grounded) {
    const seen = byName.get(word.name);
    if (!seen) {
      byName.set(word.name, word);
      continue;
    }
    const stronger = word.confidence > seen.confidence ? word : seen;
    byName.set(word.name, {
      ...stronger,
      level: Math.max(word.level, seen.level) as Level,
      confidence: Math.max(word.confidence, seen.confidence),
    });
  }
  const merged = [...byName.values()].sort((x, y) => y.confidence - x.confidence);
  const words = merged.slice(0, max);

  const usedEvidence = words.map((w) => normalize(w.evidence));
  const unmatched: UnmatchedWord[] = [];
  const saidSeen = new Set<string>();
  for (const item of proposal.unmatched) {
    const said = normalize(item.said);
    if (!said || saidSeen.has(said) || isEmotionName(said)) continue;
    if (!isGrounded(text, item.evidence)) continue;
    if (usedEvidence.some((evidence) => evidence.includes(said))) continue;
    saidSeen.add(said);
    unmatched.push({ said, evidence: item.evidence });
  }

  return {
    words,
    unmatched,
    dropped: {
      ungrounded: proposal.words.length - grounded.length,
      merged: grounded.length - merged.length,
      overCap: merged.length - words.length,
    },
  };
}

/** When no words came through: the words nearest their face, offered unselected. Nothing is saved unless they tap one. */
export function suggestions(face: Face, found: readonly FoundWord[]): EmotionName[] {
  return found.length === 0 ? nearestWords(face, 3) : [];
}

/**
 * Done: their final words against the check-in's current ones. Rows are
 * superseded and inserted, never edited, and every difference is feedback
 * (the label flywheel's signal). "Kept" is recorded on the first review only:
 * later visits record changes, not repeated agreement.
 */
export function reviewDiff(input: {
  current: readonly StoredWord[];
  final: readonly { name: EmotionName; level: Level }[];
  firstReview: boolean;
  ids: IdFactory;
  now: Date;
}): ReviewChange {
  const { current, final, firstReview, ids, now } = input;
  const finalByName = new Map(final.map((w) => [w.name, w.level]));
  const currentNames = new Set(current.map((w) => w.name));
  const change: ReviewChange = { supersede: [], insert: [], feedback: [], reviewedAt: now.toISOString() };
  const feedback = (action: FeedbackAction, word: { id: string | null; name: EmotionName }, fromLevel: Level | null, toLevel: Level | null) =>
    change.feedback.push({ id: ids.next(), wordId: word.id, action, name: word.name, fromLevel, toLevel });

  for (const word of current) {
    const level = finalByName.get(word.name);
    if (level === undefined) {
      change.supersede.push(word.id);
      feedback('removed', word, word.level, null);
    } else if (level !== word.level) {
      const replacement: StoredWord = { ...word, id: ids.next(), level, source: 'person', confidence: null };
      change.supersede.push(word.id);
      change.insert.push(replacement);
      feedback('level_changed', word, word.level, level);
    } else if (firstReview) {
      feedback('kept', word, word.level, word.level);
    }
  }

  for (const { name, level } of final) {
    if (currentNames.has(name)) continue;
    const added: StoredWord = { id: ids.next(), name, level, source: 'person', runId: null, evidence: null, confidence: null };
    change.insert.push(added);
    feedback('added', added, null, level);
  }
  return change;
}

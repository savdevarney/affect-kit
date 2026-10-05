/**
 * Scoring for the evals (docs/checkin/evals.md § 3): pure functions over cases
 * and predictions. No models, files or network, so they're unit-tested
 * (scoring.test.ts) and the runner only calls, scores and writes.
 */
import { z } from 'zod';
import { isGrounded } from '../src/policy.ts';
import { EmotionNameSchema, FaceSchema, LevelSchema } from '../src/schema.ts';
import type { EmotionName } from '../src/vocabulary.ts';
import type { Extraction } from '../src/ports.ts';

// ── Cases ──────────────────────────────────────────────────────────────────────

const Slot = z.object({ any: z.array(EmotionNameSchema).min(1), level: LevelSchema.optional() });
const FeelingCaseSchema = z.object({
  id: z.string(),
  face: FaceSchema,
  text: z.string().min(1),
  expected: z.array(Slot),
  alsoFine: z.array(EmotionNameSchema),
  forbidden: z.array(EmotionNameSchema),
  unmatched: z.array(z.string()),
  tags: z.array(z.string()).min(1),
  labelledBy: z.string(),
});
export type FeelingCase = z.infer<typeof FeelingCaseSchema>;

const SafetyCaseSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  show: z.union([z.boolean(), z.literal('either')]),
  tags: z.array(z.string()),
});
export type SafetyCase = z.infer<typeof SafetyCaseSchema>;

/** Validates a case file; a forbidden word that also fills a slot is a labelling mistake, so it fails too. */
export function parseFeelingCases(json: unknown): FeelingCase[] {
  const cases = z.object({ cases: z.array(FeelingCaseSchema) }).parse(json).cases;
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) throw new Error(`Duplicate case id ${c.id}`);
    ids.add(c.id);
    const slotted = new Set(c.expected.flatMap((s) => s.any));
    const clash = c.forbidden.find((w) => slotted.has(w) || c.alsoFine.includes(w));
    if (clash) throw new Error(`${c.id}: "${clash}" is both expected (or fine) and forbidden`);
  }
  return cases;
}

export function parseSafetyCases(json: unknown): SafetyCase[] {
  return z.object({ cases: z.array(SafetyCaseSchema) }).parse(json).cases;
}

// ── One case ───────────────────────────────────────────────────────────────────

export interface CaseScore {
  id: string;
  tags: string[];
  slots: number;
  /** Slots filled by a predicted word. */
  filled: number;
  /** Predicted words that fill no slot and aren't fine: over-labelling. */
  extra: EmotionName[];
  /** Predicted words in `alsoFine`: neither right nor wrong. */
  neutral: EmotionName[];
  /** Predicted forbidden words: severe errors. */
  forbidden: EmotionName[];
  /** Filled slots that name a level, and how many of those got it exactly. */
  levelScored: number;
  levelExact: number;
  /** 1 for 3, or 3 for 1. */
  farMisses: number;
  /** Their own words (out of vocabulary) expected, and found. */
  unmatchedExpected: number;
  unmatchedFound: number;
  /** Every slot filled and nothing extra. */
  exact: boolean;
  /** Each predicted word's confidence and whether it filled a slot (neutral words left out), for calibration. */
  calibration: { confidence: number; correct: boolean }[];
}

/**
 * Scores one prediction against one case. Each slot takes at most one word,
 * and slots with fewer options choose first, so a word that could fill two
 * slots goes where it's needed.
 */
export function scoreCase(c: FeelingCase, prediction: Extraction): CaseScore {
  const remaining = [...prediction.words];
  let filled = 0;
  let levelScored = 0;
  let levelExact = 0;
  let farMisses = 0;
  const calibration: CaseScore['calibration'] = [];

  for (const slot of [...c.expected].sort((x, y) => x.any.length - y.any.length)) {
    const index = remaining.findIndex((w) => slot.any.includes(w.name));
    if (index === -1) continue;
    const [word] = remaining.splice(index, 1);
    filled++;
    calibration.push({ confidence: word!.confidence, correct: true });
    if (slot.level) {
      levelScored++;
      if (word!.level === slot.level) levelExact++;
      if (Math.abs(word!.level - slot.level) === 2) farMisses++;
    }
  }

  const neutral = remaining.filter((w) => c.alsoFine.includes(w.name)).map((w) => w.name);
  const extraWords = remaining.filter((w) => !c.alsoFine.includes(w.name));
  calibration.push(...extraWords.map((w) => ({ confidence: w.confidence, correct: false })));
  const said = new Set(prediction.unmatched.map((u) => u.said.toLowerCase().trim()));

  return {
    id: c.id,
    tags: c.tags,
    slots: c.expected.length,
    filled,
    extra: extraWords.map((w) => w.name),
    neutral,
    forbidden: prediction.words.filter((w) => c.forbidden.includes(w.name)).map((w) => w.name),
    levelScored,
    levelExact,
    farMisses,
    unmatchedExpected: c.unmatched.length,
    unmatchedFound: c.unmatched.filter((u) => said.has(u)).length,
    exact: filled === c.expected.length && extraWords.length === 0,
    calibration,
  };
}

/** Of the words an extractor proposed (before the policy), how many quote their text. */
export function groundedCount(text: string, proposal: Extraction): { grounded: number; total: number } {
  return { grounded: proposal.words.filter((w) => isGrounded(text, w.evidence)).length, total: proposal.words.length };
}

// ── A whole run ─────────────────────────────────────────────────────────────────

export interface RunSummary {
  cases: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  exactRate: number;
  levelExactRate: number | null;
  farMisses: number;
  meanPredicted: number;
  meanSlots: number;
  casesWithExtra: number;
  /** Events-only cases where any word at all was put in their mouth, fine-or-not. */
  eventsOnlyWithWords: { count: number; of: number };
  forbiddenCases: string[];
  unmatchedRecall: number | null;
  /** Expected calibration error over the bands below. */
  ece: number | null;
  bands: { band: string; words: number; precision: number | null }[];
  byTag: Record<string, { cases: number; f1: number | null }>;
}

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
const harmonic = (p: number | null, r: number | null) => (p === null || r === null || p + r === 0 ? null : (2 * p * r) / (p + r));
const BANDS: [string, number, number][] = [
  ['< 0.5', 0, 0.5],
  ['0.5–0.7', 0.5, 0.7],
  ['0.7–0.9', 0.7, 0.9],
  ['≥ 0.9', 0.9, 1.01],
];

export function summarize(scores: readonly CaseScore[]): RunSummary {
  const sum = (f: (s: CaseScore) => number) => scores.reduce((t, s) => t + f(s), 0);
  const filled = sum((s) => s.filled);
  const extra = sum((s) => s.extra.length);
  const slots = sum((s) => s.slots);
  const precision = ratio(filled, filled + extra);
  const recall = ratio(filled, slots);
  const events = scores.filter((s) => s.tags.includes('events-only'));
  const words = scores.flatMap((s) => s.calibration);

  const bands = BANDS.map(([band, lo, hi]) => {
    const inBand = words.filter((w) => w.confidence >= lo && w.confidence < hi);
    return { band, words: inBand.length, precision: ratio(inBand.filter((w) => w.correct).length, inBand.length), confidence: inBand.reduce((t, w) => t + w.confidence, 0) / (inBand.length || 1) };
  });
  const ece = words.length === 0 ? null : bands.reduce((t, b) => t + (b.words / words.length) * Math.abs((b.precision ?? 0) - b.confidence), 0);

  const byTag: RunSummary['byTag'] = {};
  for (const tag of new Set(scores.flatMap((s) => s.tags))) {
    const tagged = scores.filter((s) => s.tags.includes(tag));
    const f = tagged.reduce((t, s) => t + s.filled, 0);
    const e = tagged.reduce((t, s) => t + s.extra.length, 0);
    const n = tagged.reduce((t, s) => t + s.slots, 0);
    byTag[tag] = { cases: tagged.length, f1: harmonic(ratio(f, f + e), ratio(f, n)) };
  }

  return {
    cases: scores.length,
    precision,
    recall,
    f1: harmonic(precision, recall),
    exactRate: ratio(scores.filter((s) => s.exact).length, scores.length) ?? 0,
    levelExactRate: ratio(sum((s) => s.levelExact), sum((s) => s.levelScored)),
    farMisses: sum((s) => s.farMisses),
    meanPredicted: ratio(sum((s) => s.filled + s.extra.length + s.neutral.length), scores.length) ?? 0,
    meanSlots: ratio(slots, scores.length) ?? 0,
    casesWithExtra: scores.filter((s) => s.extra.length > 0).length,
    eventsOnlyWithWords: { count: events.filter((s) => s.extra.length + s.neutral.length > 0).length, of: events.length },
    forbiddenCases: scores.filter((s) => s.forbidden.length > 0).map((s) => s.id),
    unmatchedRecall: ratio(sum((s) => s.unmatchedFound), sum((s) => s.unmatchedExpected)),
    ece,
    bands: bands.map(({ band, words, precision }) => ({ band, words, precision })),
    byTag,
  };
}

// ── The safety screen ───────────────────────────────────────────────────────────

export interface SafetySummary {
  recall: number | null;
  falsePositiveRate: number | null;
  misses: string[];
  falsePositives: string[];
}

export function summarizeSafety(cases: readonly SafetyCase[], shown: (c: SafetyCase) => boolean): SafetySummary {
  const must = cases.filter((c) => c.show === true);
  const mustNot = cases.filter((c) => c.show === false);
  const misses = must.filter((c) => !shown(c)).map((c) => c.id);
  const falsePositives = mustNot.filter((c) => shown(c)).map((c) => c.id);
  return {
    recall: ratio(must.length - misses.length, must.length),
    falsePositiveRate: ratio(falsePositives.length, mustNot.length),
    misses,
    falsePositives,
  };
}

/** Percentile by nearest rank, for latency. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}


/**
 * Ports: what the check-in core needs from the outside world, as interfaces with
 * DI tokens. Adapters live in src/extract, src/safety and the app (the D1
 * repository). Like an Angular InjectionToken bound to a provider: callers
 * depend on the token, and the composition root picks the implementation.
 */
import type { EmotionName } from './vocabulary.ts';

export interface Face {
  v: number;
  a: number;
}

export type Level = 1 | 2 | 3;

// ── Extraction ──────────────────────────────────────────────────────────────

/** A vocabulary word found in their text, with the span of their words that supports it. */
export interface FoundWord {
  name: EmotionName;
  level: Level;
  /** Copied from their text. Empty only for the face-nearest baseline, which reads no text. */
  evidence: string;
  /** 0–1: how sure the extractor is that they'd agree. */
  confidence: number;
}

/** A feeling word they used that no vocabulary word fits ("relieved", "grieving"). */
export interface UnmatchedWord {
  said: string;
  evidence: string;
}

export interface Extraction {
  words: FoundWord[];
  unmatched: UnmatchedWord[];
}

/** What a model call cost, when the adapter can measure it. */
export interface CallMeter {
  ms: number;
  inputTokens: number | null;
  outputTokens: number | null;
}

/** Text, and the face as a prior, in; feeling words out. Swappable, and picked by evals. */
export interface FeelingExtractor {
  /** adapter/model/prompt version, stored on every extraction run. */
  readonly id: string;
  /** `face` is null in the evals' words-only ablation. */
  extract(input: { text: string; face: Face | null }): Promise<Extraction & { meter?: CallMeter }>;
}

// ── Safety ─────────────────────────────────────────────────────────────────

export interface SafetyResult {
  /** Show crisis resources now. */
  show: boolean;
  /** Ids of the rules that matched, never the text. */
  rules: string[];
}

/** Text in; whether to show crisis resources out. Code first, never only a model. */
export interface SafetyScreen {
  readonly id: string;
  screen(text: string): SafetyResult;
}

// ── Storage ─────────────────────────────────────────────────────────────────

export type WordSource = 'model' | 'person';

export interface StoredWord {
  id: string;
  name: EmotionName;
  level: Level;
  source: WordSource;
  /** The run that proposed it; null for words the person added. */
  runId: string | null;
  evidence: string | null;
  confidence: number | null;
}

export interface StoredCheckin {
  id: string;
  userId: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  /** YYYY-MM-DD in their zone, with the day starting at 4 a.m. */
  localDate: string;
  timezone: string;
  face: Face;
  /** Their words, as written: the source of truth. */
  body: string;
  reviewedAt: string | null;
  /** Current words: never superseded rows. */
  words: StoredWord[];
  unmatched: string[];
}

export type RunOutcome = 'ok' | 'invalid_output' | 'error' | 'timeout';

export interface ExtractionRun {
  id: string;
  /** adapter/model/prompt version. */
  extractor: string;
  vocabulary: string;
  purpose: 'live' | 'shadow';
  outcome: RunOutcome;
  meter: CallMeter | null;
  createdAt: string;
}

export type FeedbackAction = 'kept' | 'removed' | 'level_changed' | 'added';

export interface WordFeedback {
  id: string;
  wordId: string | null;
  action: FeedbackAction;
  name: EmotionName;
  fromLevel: Level | null;
  toLevel: Level | null;
}

/** Everything a new check-in writes, in one batch. */
export interface NewCheckin {
  checkin: Omit<StoredCheckin, 'words' | 'unmatched' | 'reviewedAt'>;
  runs: ExtractionRun[];
  words: StoredWord[];
  unmatched: { id: string; said: string; runId: string }[];
}

/** What Done changes, in one batch: rows are superseded and inserted, never edited. */
export interface ReviewChange {
  supersede: string[];
  insert: StoredWord[];
  feedback: WordFeedback[];
  reviewedAt: string;
}

/**
 * Storage for check-ins. Every method is scoped by user id: there's no
 * row-level security underneath (D1), so this port is the access boundary.
 */
export interface CheckinRepository {
  create(userId: string, record: NewCheckin): Promise<void>;
  find(userId: string, id: string): Promise<StoredCheckin | null>;
  review(userId: string, id: string, change: ReviewChange): Promise<void>;
  /** Check-ins on these local dates, oldest first. */
  days(userId: string, from: string, to: string): Promise<StoredCheckin[]>;
  /** Deletes the check-in and everything derived from it. False when there was none. */
  delete(userId: string, id: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}

/** New row ids: time-ordered UUIDs (v7), so ids sort by creation. */
export interface IdFactory {
  next(): string;
}

// ── DI tokens ───────────────────────────────────────────────────────────────

export const FEELING_EXTRACTOR = Symbol('FeelingExtractor');
/** The extractor that answers when the main one fails: the deterministic lexicon. */
export const FALLBACK_EXTRACTOR = Symbol('FallbackExtractor');
export const SAFETY_SCREEN = Symbol('SafetyScreen');
export const CHECKIN_REPOSITORY = Symbol('CheckinRepository');
export const CLOCK = Symbol('Clock');
export const ID_FACTORY = Symbol('IdFactory');

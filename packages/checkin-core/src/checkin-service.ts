// tsyringe needs the Reflect metadata polyfill before it loads; importing it here
// makes the service entry safe to import first, wherever it's imported from.
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { CheckinError, ExtractionTimeout, OutputError } from './errors.ts';
import { localDate, addDays } from './day.ts';
import { finalize, reviewDiff, suggestions } from './policy.ts';
import type { CheckinInput, ReviewInput } from './schema.ts';
import { VOCABULARY_ID, type EmotionName } from './vocabulary.ts';
import {
  CHECKIN_REPOSITORY,
  CLOCK,
  FALLBACK_EXTRACTOR,
  FEELING_EXTRACTOR,
  ID_FACTORY,
  SAFETY_SCREEN,
  type CallMeter,
  type CheckinRepository,
  type Clock,
  type Extraction,
  type ExtractionRun,
  type Face,
  type FeelingExtractor,
  type IdFactory,
  type Level,
  type NewCheckin,
  type RunOutcome,
  type SafetyScreen,
  type StoredCheckin,
  type WordSource,
} from './ports.ts';

/** A check-in as the app shows it. */
export interface CheckinView {
  id: string;
  createdAt: string;
  localDate: string;
  timezone: string;
  face: Face;
  body: string;
  reviewedAt: string | null;
  words: { name: EmotionName; level: Level; source: WordSource; evidence: string | null }[];
  unmatched: string[];
}

/** What creating a check-in returns: the check-in, plus what the review step needs. */
export interface CreatedCheckin extends CheckinView {
  /** Show crisis resources first. Computed from their words now; never stored. */
  safety: { show: boolean };
  /** When no words came through: words near the face, unselected. */
  suggestions: EmotionName[];
  /** Who found the words: a model, or simple matching (the fallback). Null with no text. */
  foundWith: 'model' | 'simple' | null;
}

/** A model gets this long before the lexicon answers instead. */
export const EXTRACT_TIMEOUT_MS = 8000;

/** The longest span of days one request may read. */
export const MAX_DAYS = 62;

/**
 * One check-in, end to end: screen their words for crisis language, find
 * feeling words (a model, with the lexicon as the fallback), apply the policy,
 * save; then their review at Done. Every step that can be is a pure function
 * elsewhere; this class is the orchestration and the I/O.
 */
@injectable()
export class CheckinService {
  constructor(
    @inject(CHECKIN_REPOSITORY) private readonly repo: CheckinRepository,
    @inject(FEELING_EXTRACTOR) private readonly extractor: FeelingExtractor,
    @inject(FALLBACK_EXTRACTOR) private readonly fallback: FeelingExtractor,
    @inject(SAFETY_SCREEN) private readonly safety: SafetyScreen,
    @inject(CLOCK) private readonly clock: Clock,
    @inject(ID_FACTORY) private readonly ids: IdFactory,
  ) {}

  /**
   * Idempotent on the client's id: a retry of the same check-in returns the one
   * it already made. The same id with different content is a conflict, never a
   * silent overwrite or a silently dropped edit.
   */
  async create(userId: string, input: CheckinInput): Promise<CreatedCheckin> {
    const body = input.text.trim();
    const existing = await this.repo.find(userId, input.id);
    if (existing) {
      const same = existing.body === body && existing.face.v === input.face.v && existing.face.a === input.face.a && existing.timezone === input.timezone;
      if (!same) throw new CheckinError('That id belongs to a different check-in', 'CONFLICT');
      return { ...view(existing), safety: { show: this.safety.screen(existing.body).show }, suggestions: suggestions(existing.face, existing.words), foundWith: null };
    }

    const now = this.clock.now();
    const safety = this.safety.screen(body);
    const extraction = body ? await this.extract(body, input.face, now) : null;
    const final = finalize(body, extraction?.proposal ?? { words: [], unmatched: [] });
    const runId = extraction?.runs.at(-1)?.id ?? null;

    const record: NewCheckin = {
      checkin: {
        id: input.id,
        userId,
        createdAt: now.toISOString(),
        localDate: localDate(now, input.timezone),
        timezone: input.timezone,
        face: input.face,
        body,
      },
      runs: extraction?.runs ?? [],
      words: final.words.map((w) => ({ id: this.ids.next(), name: w.name, level: w.level, source: 'model', runId, evidence: w.evidence, confidence: w.confidence })),
      unmatched: runId ? final.unmatched.map((u) => ({ id: this.ids.next(), said: u.said, runId })) : [],
    };
    await this.repo.create(userId, record);

    return {
      ...view({ ...record.checkin, reviewedAt: null, words: record.words, unmatched: record.unmatched.map((u) => u.said) }),
      safety: { show: safety.show },
      suggestions: suggestions(input.face, final.words),
      foundWith: extraction?.foundWith ?? null,
    };
  }

  /** Done: their final words. Differences become feedback; rows are superseded, never edited. */
  async review(userId: string, id: string, input: ReviewInput): Promise<CheckinView> {
    const checkin = await this.repo.find(userId, id);
    if (!checkin) throw new CheckinError('No such check-in', 'NOT_FOUND');
    const change = reviewDiff({
      current: checkin.words,
      final: input.words,
      firstReview: checkin.reviewedAt === null,
      ids: this.ids,
      now: this.clock.now(),
    });
    await this.repo.review(userId, id, change);
    const updated = await this.repo.find(userId, id);
    if (!updated) throw new CheckinError('No such check-in', 'NOT_FOUND');
    return view(updated);
  }

  /** Check-ins from one local date to another, inclusive, oldest first. */
  async days(userId: string, from: string, to: string): Promise<CheckinView[]> {
    if (to < from || addDays(from, MAX_DAYS - 1) < to) throw new CheckinError(`Ask for 1 to ${MAX_DAYS} days`, 'INVALID');
    return (await this.repo.days(userId, from, to)).map(view);
  }

  delete(userId: string, id: string): Promise<boolean> {
    return this.repo.delete(userId, id);
  }

  /** The main extractor, or the fallback when it fails; every attempt is a run. */
  private async extract(text: string, face: Face, now: Date): Promise<{ runs: ExtractionRun[]; proposal: Extraction; foundWith: 'model' | 'simple' }> {
    const simple = this.extractor.id === this.fallback.id;
    try {
      const result = await withTimeout(this.extractor.extract({ text, face }), EXTRACT_TIMEOUT_MS);
      return { runs: [this.run(this.extractor.id, 'ok', result.meter ?? null, now)], proposal: result, foundWith: simple ? 'simple' : 'model' };
    } catch (error) {
      if (simple) throw error;
      const failed = this.run(this.extractor.id, outcomeOf(error), null, now);
      const result = await this.fallback.extract({ text, face });
      return { runs: [failed, this.run(this.fallback.id, 'ok', null, now)], proposal: result, foundWith: 'simple' };
    }
  }

  private run(extractor: string, outcome: RunOutcome, meter: CallMeter | null, now: Date): ExtractionRun {
    return { id: this.ids.next(), extractor, vocabulary: VOCABULARY_ID, purpose: 'live', outcome, meter, createdAt: now.toISOString() };
  }
}

export function view(c: StoredCheckin): CheckinView {
  return {
    id: c.id,
    createdAt: c.createdAt,
    localDate: c.localDate,
    timezone: c.timezone,
    face: c.face,
    body: c.body,
    reviewedAt: c.reviewedAt,
    words: c.words.map(({ name, level, source, evidence }) => ({ name, level, source, evidence })),
    unmatched: c.unmatched,
  };
}

function outcomeOf(error: unknown): RunOutcome {
  if (error instanceof ExtractionTimeout) return 'timeout';
  if (error instanceof OutputError) return 'invalid_output';
  return 'error';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ExtractionTimeout(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

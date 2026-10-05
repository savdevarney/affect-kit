import { z } from 'zod';
import { CheckinError, EmotionNameSchema, LevelSchema, type CheckinRepository, type NewCheckin, type ReviewChange, type StoredCheckin, type StoredWord } from '@affect-kit/checkin-core';

/** Rows are parsed like any other input: a bad row is an error, never a bad Rating. */
const CheckinRow = z.object({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  local_date: z.string(),
  timezone: z.string(),
  face_v: z.number(),
  face_a: z.number(),
  body: z.string(),
  reviewed_at: z.string().nullable(),
});
const WordRow = z.object({
  id: z.string(),
  checkin_id: z.string(),
  name: EmotionNameSchema,
  level: LevelSchema,
  source: z.enum(['model', 'person']),
  run_id: z.string().nullable(),
  evidence: z.string().nullable(),
  confidence: z.number().nullable(),
});
const UnmatchedRow = z.object({ checkin_id: z.string(), said: z.string() });

const toWord = (row: z.infer<typeof WordRow>): StoredWord => ({
  id: row.id,
  name: row.name,
  level: row.level,
  source: row.source,
  runId: row.run_id,
  evidence: row.evidence,
  confidence: row.confidence,
});

/**
 * The CheckinRepository port on D1 (SQLite). D1 has no row-level security, so
 * every statement carries the user id; that, and the tests in
 * test/d1-repository.test.ts, are the access boundary. Writes are D1 batches,
 * which run as one transaction.
 */
export class D1CheckinRepository implements CheckinRepository {
  constructor(private readonly db: D1Database) {}

  async create(userId: string, record: NewCheckin): Promise<void> {
    const { checkin: c } = record;
    if (c.userId !== userId) throw new CheckinError('A check-in belongs to the person creating it', 'INVALID');
    await this.db.batch([
      this.db
        .prepare('insert into checkins (id, user_id, created_at, local_date, timezone, face_v, face_a, body) values (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(c.id, userId, c.createdAt, c.localDate, c.timezone, c.face.v, c.face.a, c.body),
      ...record.runs.map((r) =>
        this.db
          .prepare('insert into extraction_runs (id, checkin_id, extractor, vocabulary, purpose, outcome, ms, input_tokens, output_tokens, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(r.id, c.id, r.extractor, r.vocabulary, r.purpose, r.outcome, r.meter?.ms ?? null, r.meter?.inputTokens ?? null, r.meter?.outputTokens ?? null, r.createdAt),
      ),
      ...record.words.map((w) => this.insertWord(c.id, w, c.createdAt)),
      ...record.unmatched.map((u) => this.db.prepare('insert into unmatched_words (id, checkin_id, said, run_id) values (?, ?, ?, ?)').bind(u.id, c.id, u.said, u.runId)),
    ]);
  }

  async find(userId: string, id: string): Promise<StoredCheckin | null> {
    const [checkins, words, unmatched] = await this.db.batch([
      this.db.prepare('select * from checkins where id = ? and user_id = ?').bind(id, userId),
      this.db
        .prepare(
          `select w.* from feeling_words w join checkins c on c.id = w.checkin_id
           where w.checkin_id = ? and c.user_id = ? and w.superseded_at is null order by w.created_at, w.rowid`,
        )
        .bind(id, userId),
      this.db.prepare('select u.checkin_id, u.said from unmatched_words u join checkins c on c.id = u.checkin_id where u.checkin_id = ? and c.user_id = ? order by u.rowid').bind(id, userId),
    ]);
    const row = checkins?.results[0];
    return row ? assemble([row], words?.results ?? [], unmatched?.results ?? [])[0]! : null;
  }

  async review(userId: string, id: string, change: ReviewChange): Promise<void> {
    const owned = await this.db.prepare('select 1 from checkins where id = ? and user_id = ?').bind(id, userId).first();
    if (!owned) throw new CheckinError('No such check-in', 'NOT_FOUND');
    await this.db.batch([
      ...change.supersede.map((wordId) => this.db.prepare('update feeling_words set superseded_at = ? where id = ? and checkin_id = ? and superseded_at is null').bind(change.reviewedAt, wordId, id)),
      ...change.insert.map((w) => this.insertWord(id, w, change.reviewedAt)),
      ...change.feedback.map((f) =>
        this.db
          .prepare('insert into word_feedback (id, checkin_id, word_id, action, name, from_level, to_level, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(f.id, id, f.wordId, f.action, f.name, f.fromLevel, f.toLevel, change.reviewedAt),
      ),
      this.db.prepare('update checkins set reviewed_at = ? where id = ? and user_id = ?').bind(change.reviewedAt, id, userId),
    ]);
  }

  async days(userId: string, from: string, to: string): Promise<StoredCheckin[]> {
    const inRange = 'select id from checkins where user_id = ? and local_date between ? and ?';
    const [checkins, words, unmatched] = await this.db.batch([
      this.db.prepare('select * from checkins where user_id = ? and local_date between ? and ? order by created_at').bind(userId, from, to),
      this.db.prepare(`select * from feeling_words where checkin_id in (${inRange}) and superseded_at is null order by created_at, rowid`).bind(userId, from, to),
      this.db.prepare(`select checkin_id, said from unmatched_words where checkin_id in (${inRange}) order by rowid`).bind(userId, from, to),
    ]);
    return assemble(checkins?.results ?? [], words?.results ?? [], unmatched?.results ?? []);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db.prepare('delete from checkins where id = ? and user_id = ?').bind(id, userId).run();
    return result.meta.changes > 0;
  }

  private insertWord(checkinId: string, w: StoredWord, at: string) {
    return this.db
      .prepare('insert into feeling_words (id, checkin_id, name, level, source, run_id, evidence, confidence, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(w.id, checkinId, w.name, w.level, w.source, w.runId, w.evidence, w.confidence, at);
  }
}

function assemble(checkinRows: unknown[], wordRows: unknown[], unmatchedRows: unknown[]): StoredCheckin[] {
  const words = wordRows.map((r) => WordRow.parse(r));
  const unmatched = unmatchedRows.map((r) => UnmatchedRow.parse(r));
  return checkinRows.map((raw) => {
    const r = CheckinRow.parse(raw);
    return {
      id: r.id,
      userId: r.user_id,
      createdAt: r.created_at,
      localDate: r.local_date,
      timezone: r.timezone,
      face: { v: r.face_v, a: r.face_a },
      body: r.body,
      reviewedAt: r.reviewed_at,
      words: words.filter((w) => w.checkin_id === r.id).map(toWord),
      unmatched: unmatched.filter((u) => u.checkin_id === r.id).map((u) => u.said),
    };
  });
}

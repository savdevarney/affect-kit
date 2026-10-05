import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { CheckinService } from '@affect-kit/checkin-core/service';
import { LexiconExtractor, PhraseSafetyScreen, uuidv7, uuidv7Ids } from '@affect-kit/checkin-core';
import { D1CheckinRepository } from '../src/lib/server/d1-repository.ts';

// Against a real (local, in-memory) D1 through Wrangler's platform proxy, with
// the migration applied: integration tests use the real database, not a mock.

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
let service: CheckinService;
const NOW = new Date('2026-10-05T18:30:00Z');

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', persist: false, remoteBindings: false });
  db = proxy.env.DB;
  const folder = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(folder)).filter((f) => f.endsWith('.sql')).sort()) {
    const statements = (await readFile(new URL(file, folder), 'utf8'))
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) await db.prepare(statement).run();
  }
  const lexicon = new LexiconExtractor();
  service = new CheckinService(new D1CheckinRepository(db), lexicon, lexicon, new PhraseSafetyScreen(), { now: () => NOW }, uuidv7Ids);
}, 60_000);

afterAll(() => proxy?.dispose());

const input = (text: string) => ({ id: uuidv7(), face: { v: 0.3, a: -0.5 }, text, timezone: 'America/Los_Angeles' });
const count = async (table: string, checkinId: string) =>
  ((await db.prepare(`select count(*) as n from ${table} where checkin_id = ?`).bind(checkinId).first<{ n: number }>())?.n ?? 0);

describe('D1CheckinRepository', () => {
  it('stores a check-in with its run and words, and reads it back', async () => {
    const created = await service.create('ana', input('So tired, and a bit relieved.'));
    const [day] = await service.days('ana', created.localDate, created.localDate);
    expect(day).toMatchObject({ id: created.id, body: 'So tired, and a bit relieved.', face: { v: 0.3, a: -0.5 }, unmatched: ['relieved'], reviewedAt: null });
    expect(day!.words).toEqual([{ name: 'tired', level: 3, source: 'model', evidence: 'So tired' }]);
    expect(await count('extraction_runs', created.id)).toBe(1);
  });

  it('records review as superseded rows and feedback, never edits', async () => {
    const created = await service.create('ana', input('Kind of proud'));
    const reviewed = await service.review('ana', created.id, { words: [{ name: 'proud', level: 3 }, { name: 'grateful', level: 2 }] });
    expect(reviewed.words.map((w) => [w.name, w.level, w.source])).toEqual([
      ['proud', 3, 'person'],
      ['grateful', 2, 'person'],
    ]);
    expect(await count('feeling_words', created.id)).toBe(3);
    const feedback = await db.prepare('select action, name, from_level, to_level from word_feedback where checkin_id = ? order by rowid').bind(created.id).all();
    expect(feedback.results).toEqual([
      { action: 'level_changed', name: 'proud', from_level: 1, to_level: 3 },
      { action: 'added', name: 'grateful', from_level: null, to_level: 2 },
    ]);
  });

  it("keeps people's check-ins apart", async () => {
    const created = await service.create('ana', input('calm'));
    await expect(service.review('ben', created.id, { words: [] })).rejects.toThrow('No such check-in');
    expect(await service.delete('ben', created.id)).toBe(false);
    expect(await service.days('ben', created.localDate, created.localDate)).toEqual([]);
  });

  it('deletes a check-in and everything derived from it', async () => {
    const created = await service.create('ana', input('Worried, and a bit relieved'));
    await service.review('ana', created.id, { words: [{ name: 'anxious', level: 3 }] });
    expect(await service.delete('ana', created.id)).toBe(true);
    for (const table of ['extraction_runs', 'feeling_words', 'unmatched_words', 'word_feedback']) {
      expect(await count(table, created.id), table).toBe(0);
    }
  });
});

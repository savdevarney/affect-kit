import { beforeEach, describe, expect, it } from 'vitest';
import { CheckinService } from '../src/checkin-service.ts';
import { CheckinError, OutputError } from '../src/errors.ts';
import { LexiconExtractor } from '../src/extract/lexicon.ts';
import { PhraseSafetyScreen } from '../src/safety/phrase-screen.ts';
import { uuidv7 } from '../src/ids.ts';
import type { Extraction, FeelingExtractor } from '../src/ports.ts';
import { MemoryCheckinRepository } from './memory-repository.ts';

const USER = 'user-1';
const NOW = new Date('2026-10-05T18:30:00Z');

class ScriptedExtractor implements FeelingExtractor {
  readonly id = 'scripted/model/v1';
  calls = 0;
  constructor(private readonly answer: () => Promise<Extraction>) {}
  extract() {
    this.calls++;
    return this.answer();
  }
}

function setup(answer: () => Promise<Extraction>) {
  const repo = new MemoryCheckinRepository();
  const extractor = new ScriptedExtractor(answer);
  let n = 0;
  const service = new CheckinService(repo, extractor, new LexiconExtractor(), new PhraseSafetyScreen(), { now: () => NOW }, { next: () => `row-${++n}` });
  return { repo, extractor, service };
}

const input = (text: string) => ({ id: uuidv7(NOW.getTime()), face: { v: 0.3, a: -0.5 }, text, timezone: 'America/Los_Angeles' });

describe('CheckinService.create', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup(async () => ({
      words: [
        { name: 'tired', level: 3, evidence: 'wiped', confidence: 0.9 },
        { name: 'proud', level: 1, evidence: 'Kind of proud', confidence: 0.8 },
        { name: 'joy', level: 2, evidence: 'over the moon', confidence: 0.7 },
      ],
      unmatched: [{ said: 'relieved', evidence: 'relieved' }],
    }));
  });

  it('saves their words as written, with policy-checked feeling words', async () => {
    const created = await ctx.service.create(USER, input('  Presentation went fine but I’m wiped. Kind of proud though, and relieved.  '));
    expect(created.body).toBe('Presentation went fine but I’m wiped. Kind of proud though, and relieved.');
    expect(created.words.map((w) => [w.name, w.level, w.source])).toEqual([
      ['tired', 3, 'model'],
      ['proud', 1, 'model'],
    ]);
    expect(created.unmatched).toEqual(['relieved']);
    expect(created.localDate).toBe('2026-10-05');
    expect(created.foundWith).toBe('model');
    expect(created.safety).toEqual({ show: false });
    expect(ctx.repo.runs.map((r) => [r.extractor, r.outcome])).toEqual([['scripted/model/v1', 'ok']]);
  });

  it('is idempotent on the client id: a retry returns the same check-in and calls no model', async () => {
    const request = input('Kind of proud, and wiped');
    await ctx.service.create(USER, request);
    const again = await ctx.service.create(USER, request);
    expect(again.id).toBe(request.id);
    expect(ctx.extractor.calls).toBe(1);
    expect(ctx.repo.checkins.size).toBe(1);
  });

  it('falls back to the lexicon when the model fails, and records both runs', async () => {
    const failing = setup(async () => {
      throw new OutputError('not JSON');
    });
    const created = await failing.service.create(USER, input('So tired.'));
    expect(created.words.map((w) => [w.name, w.level])).toEqual([['tired', 3]]);
    expect(created.foundWith).toBe('simple');
    expect(failing.repo.runs.map((r) => [r.extractor, r.outcome])).toEqual([
      ['scripted/model/v1', 'invalid_output'],
      ['lexicon/v1', 'ok'],
    ]);
  });

  it('suggests words near the face when nothing came through, and saves none of them', async () => {
    const quiet = setup(async () => ({ words: [], unmatched: [] }));
    const created = await quiet.service.create(USER, input('Meetings all day.'));
    expect(created.words).toEqual([]);
    expect(created.suggestions).toHaveLength(3);
    expect(quiet.repo.words).toHaveLength(0);
  });

  it('saves a face-only check-in without calling a model', async () => {
    const created = await ctx.service.create(USER, input('   '));
    expect(created.body).toBe('');
    expect(created.foundWith).toBeNull();
    expect(ctx.extractor.calls).toBe(0);
  });

  it('flags crisis language for resources, and never stores the flag', async () => {
    const created = await ctx.service.create(USER, input('I want to kill myself'));
    expect(created.safety).toEqual({ show: true });
    const stored = await ctx.repo.find(USER, created.id);
    expect(JSON.stringify(stored)).not.toContain('kill-myself');
    expect(Object.keys(stored!)).not.toContain('safety');
  });
});

describe('CheckinService.review', () => {
  it('applies their changes as new rows and feedback', async () => {
    const { repo, service } = setup(async () => ({ words: [{ name: 'tired', level: 3, evidence: 'wiped', confidence: 0.9 }], unmatched: [] }));
    const created = await service.create(USER, input('wiped'));
    const reviewed = await service.review(USER, created.id, { words: [{ name: 'tired', level: 2 }, { name: 'content', level: 1 }] });
    expect(reviewed.words.map((w) => [w.name, w.level, w.source])).toEqual([
      ['tired', 2, 'person'],
      ['content', 1, 'person'],
    ]);
    expect(reviewed.reviewedAt).toBe(NOW.toISOString());
    expect(repo.feedback.map((f) => f.action)).toEqual(['level_changed', 'added']);
    expect(repo.words.filter((w) => w.supersededAt !== null)).toHaveLength(1);
  });

  it("refuses someone else's check-in", async () => {
    const { service } = setup(async () => ({ words: [], unmatched: [] }));
    const created = await service.create(USER, input('fine'));
    await expect(service.review('user-2', created.id, { words: [] })).rejects.toBeInstanceOf(CheckinError);
  });
});

describe('CheckinService.days', () => {
  it('limits how many days one request reads', async () => {
    const { service } = setup(async () => ({ words: [], unmatched: [] }));
    await expect(service.days(USER, '2026-01-01', '2026-12-31')).rejects.toThrow('Ask for 1 to 62 days');
    await expect(service.days(USER, '2026-10-05', '2026-10-04')).rejects.toBeInstanceOf(CheckinError);
    expect(await service.days(USER, '2026-10-01', '2026-10-07')).toEqual([]);
  });
});

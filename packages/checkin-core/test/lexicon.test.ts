import { describe, expect, it } from 'vitest';
import { LexiconExtractor } from '../src/extract/lexicon.ts';

const lexicon = new LexiconExtractor();
const run = async (text: string) => {
  const { words, unmatched } = await lexicon.extract({ text, face: null });
  return { words: words.map((w) => [w.name, w.level, w.evidence]), unmatched: unmatched.map((u) => [u.said, u.evidence]) };
};

describe('LexiconExtractor', () => {
  it('finds vocabulary words and close synonyms, with their evidence', async () => {
    expect((await run('Worried about tomorrow, and kind of lonely')).words).toEqual([
      ['anxious', 2, 'Worried'],
      ['lonely', 1, 'kind of lonely'],
    ]);
  });

  it('reads intensity from intensifiers, strong words and capitals', async () => {
    expect((await run('So tired.')).words).toEqual([['tired', 3, 'So tired']]);
    expect((await run('A little bit nervous')).words).toEqual([['anxious', 1, 'A little bit nervous']]);
    expect((await run('Exhausted')).words).toEqual([['tired', 3, 'Exhausted']]);
    expect((await run('I am FURIOUS')).words).toEqual([['enraged', 3, 'FURIOUS']]);
    expect((await run('less anxious than yesterday')).words).toEqual([['anxious', 1, 'less anxious']]);
    expect((await run('so moved by the letter')).words).toEqual([['moved', 3, 'so moved']]);
  });

  it('skips negated feelings', async () => {
    expect((await run("Not anxious anymore. I wasn't lonely either.")).words).toEqual([]);
    expect((await run('no longer sad')).words).toEqual([]);
  });

  it('lets a clause boundary end a negation', async () => {
    expect((await run('Not hungry, but sad')).words).toEqual([['sad', 2, 'sad']]);
  });

  it('prefers the longer phrase where phrases overlap', async () => {
    expect((await run('Pissed off at the landlord')).words).toEqual([['anger', 2, 'Pissed off']]);
  });

  it('matches whole words only', async () => {
    expect((await run('Cleaned the saddle, made dinner')).words).toEqual([]);
  });

  it('keeps feeling words with no vocabulary fit as their own', async () => {
    expect(await run('Honestly just relieved, and a bit confused')).toEqual({
      words: [],
      unmatched: [
        ['relieved', 'relieved'],
        ['confused', 'confused'],
      ],
    });
  });

  it('finds nothing in events', async () => {
    expect(await run('Meetings all day, then groceries.')).toEqual({ words: [], unmatched: [] });
  });
});

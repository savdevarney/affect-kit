import { describe, expect, it } from 'vitest';
import {
  createHeard, cut, heardReducer, heardSchedule, literalMatch, dismissalsAtSave, normalizeNote, phraseListClassifier, HEARD_TIMING,
  recordDismissals, suppressedPairs, suggestAgain, tallyCheckin, guardRate, overGuard, guardKey,
  type Candidate, type ClassifierOutput, type HeardState,
} from '../../src/text';
import { createRating } from '../../src/core/vad';

// Small lists, made up for the tests: an app brings its own.
const areas = phraseListClassifier({
  version: 't1',
  lists: {
    work: { anchors: ['my boss|manager', 'meetings?|deadlines?', 'work|office'], except: ['work out|working out', { pattern: "friend'?s (?:shift|manager|job)", reason: 'someone-else' }] },
    sleep: { anchors: ['no sleep|slept', 'nap|naps', 'sleep|asleep'], except: ['sleeping on it'] },
    family: { anchors: ['mum|dad', 'sister|brother'] },
    weather: { anchors: ['rain|raining', 'windy'] },
  },
  setAsides: ["(?:the |my )?[\\p{L}'-]+ (?:was|is) (?:fine|ok)"],
});

const names = (r: { shown: Candidate[] }) => r.shown.map(c => c.name);

describe('normalizeNote', () => {
  it('lower-cases, straightens quotes and keeps where every character came from', () => {
    const n = normalizeNote('My  Boss’s  deadline!');
    expect(n.text).toBe(" my boss's deadline ");
    const at = n.text.indexOf('boss');
    expect('My  Boss’s  deadline!'.slice(n.origin[at]!, n.origin[at + 3]! + 1)).toBe('Boss');
  });
});

describe('phraseListClassifier', () => {
  it('scores one per anchor group, and spends words so a phrase counts once', () => {
    const out = areas.classify('No sleep again, then a nap before my boss called a meeting');
    const sleep = out.candidates.find(c => c.name === 'sleep')!;
    expect(sleep.score).toBe(2);                       // "no sleep" and "nap"; "sleep" is spent
    expect(sleep.phrases.map(p => p.phrase)).toEqual(['no sleep', 'nap']);
    expect(out.candidates.find(c => c.name === 'work')!.score).toBe(2);
  });

  it('points at the words as written', () => {
    const note = 'Slept badly. Then MEETINGS all day';
    const out = areas.classify(note);
    const meet = out.candidates.find(c => c.name === 'work')!.phrases[0]!;
    expect(note.slice(meet.spans[0]!.start, meet.spans[0]!.end)).toBe('MEETINGS');
  });

  it("skips idioms and someone else's things, and says why", () => {
    // A skip is recorded only when the set-aside words hold a real anchor ("work", "manager").
    const out = areas.classify('Need to work out tonight, then drinks with my friend’s manager');
    expect(out.candidates.find(c => c.name === 'work')).toBeUndefined();
    expect(out.skipped.map(s => [s.name, s.reason])).toEqual([['work', 'idiom'], ['work', 'someone-else']]);
  });

  it('sets aside what the note says is not the point', () => {
    const out = areas.classify('Honestly work was fine today, just tired and grey');
    expect(out.candidates.find(c => c.name === 'work')).toBeUndefined();
    expect(out.skipped).toContainEqual(expect.objectContaining({ name: 'work', reason: 'negated' }));
  });
});

describe('cut', () => {
  const note = 'mum called, then my boss, the meetings ran late, no sleep, a nap';
  const withRain = `${note}, and rain`;

  it('shows at most three of a kind, strongest first, ties in list order', () => {
    expect(names(cut(areas.classify(note), note))).toEqual(['work', 'sleep', 'family']);
  });

  it('shows none when the third and fourth are as strong', () => {
    // family and weather, one mention each: too unsure to pick.
    expect(names(cut(areas.classify(withRain), withRain))).toEqual([]);
  });

  it('shows nothing for a note under four words', () => {
    expect(cut(areas.classify('my boss again'), 'my boss again').shown).toEqual([]);
  });

  it('shows none of a kind when the cut falls on a tie', () => {
    const tie: ClassifierOutput = {
      candidates: ['a', 'b', 'c', 'd'].map(name => ({ kind: 'area', name, score: 1, phrases: [{ phrase: name, spans: [] }] })),
      skipped: [],
    };
    const result = cut(tie, 'one two three four five');
    expect(result.shown).toEqual([]);
    expect(result.skipped.map(s => s.reason)).toEqual(['below-bar', 'below-bar', 'below-bar', 'below-bar']);
  });

  it('cuts each kind on its own', () => {
    const both: ClassifierOutput = {
      candidates: [
        { kind: 'feeling', name: 'tired', score: 1, phrases: [{ phrase: 'tired', spans: [] }] },
        { kind: 'area', name: 'work', score: 2, phrases: [{ phrase: 'boss', spans: [] }, { phrase: 'meeting', spans: [] }] },
      ],
      skipped: [],
    };
    expect(cut(both, 'tired after the boss meeting').shown.map(c => c.kind)).toEqual(['feeling', 'area']);
  });

  it('drops a suppressed pair but keeps other phrases for the same name, and counts what it held back', () => {
    const r = cut(areas.classify(withRain), withRain, { suppressed: [{ kind: 'area', name: 'weather', phrase: 'rain' }, { kind: 'area', name: 'sleep', phrase: 'no sleep' }] });
    const sleep = r.shown.find(c => c.name === 'sleep')!;
    expect(sleep.phrases.map(p => p.phrase)).toEqual(['nap']);
    expect(sleep.score).toBe(1);
    expect(names(r)).toEqual(['work', 'sleep', 'family']); // without rain, the tie at the cut is gone
    expect(r.suppressed).toEqual([]); // nothing would have shown: the tie
    const only = cut(areas.classify('rain all day and nothing else to say'), 'rain all day and nothing else to say', { suppressed: [{ kind: 'area', name: 'weather', phrase: 'rain' }] });
    expect(only.shown).toEqual([]);
    expect(only.suppressed.map(c => c.name)).toEqual(['weather']);
  });

  it('ranks everything, then shows only what may ship', () => {
    const r = cut(areas.classify(note), note, { shippable: (_kind, name) => name !== 'work' });
    expect(names(r)).toEqual(['sleep', 'family']);
  });
});

describe('literalMatch', () => {
  it('finds the chosen word or a form of it, never a word that only means something like it', () => {
    const note = 'So tired. Tiredness everywhere, exhausted and angry';
    expect(literalMatch('tired', note).map(s => note.slice(s.start, s.end))).toEqual(['tired', 'Tiredness']);
    expect(literalMatch('anger', note).map(s => note.slice(s.start, s.end))).toEqual(['angry']);
    expect(literalMatch('calm', note)).toEqual([]);
  });
});

describe('heardReducer', () => {
  const note = 'mum called, then my boss, the meetings ran late, no sleep, a nap';
  const result = cut(areas.classify(note), note);
  const feelingResult = (name: string) => ({
    shown: [...result.shown, { kind: 'feeling' as const, name, score: 1, phrases: [{ phrase: name, spans: [] }] }],
    suppressed: [],
    skipped: [],
  });
  const read = (state: HeardState, offerFeelings = false, r = result) =>
    heardReducer(state, { type: 'read', text: note, result: r, listVersion: 't1', config: { offerFeelings } });

  it('fills areas in as kept, each from the note, with where it was said', () => {
    const s = read(createHeard());
    expect(s.found.map(f => [f.name, f.state, f.source])).toEqual([
      ['work', 'kept', 'note'], ['sleep', 'kept', 'note'], ['family', 'kept', 'note'],
    ]);
    expect(s.found[0]!.listVersion).toBe('t1');
    expect(s.found[0]!.spans.length).toBeGreaterThan(0);
  });

  it('offers feelings only when the flag is on and no words were chosen before the note, at the base level', () => {
    expect(read(createHeard(), false, feelingResult('tired')).found.some(f => f.kind === 'feeling')).toBe(false);
    const offered = read(createHeard(), true, feelingResult('tired')).found.find(f => f.kind === 'feeling')!;
    expect([offered.state, offered.level]).toEqual(['offered', 1]);
    const afterWords = read(createHeard({ rating: createRating({ face: null, labels: [{ name: 'proud', level: 2 }] }) }), true, feelingResult('tired'));
    expect(afterWords.found.filter(f => f.kind === 'feeling').map(f => f.name)).toEqual(['proud']);
  });

  it('never offers a hopeless-family word, and shows nothing once one is chosen', () => {
    expect(read(createHeard(), true, feelingResult('hopeless')).found.some(f => f.name === 'hopeless')).toBe(false);
    const chosen = createHeard({ rating: createRating({ labels: [{ name: 'hopeless', level: 1 }] }) });
    expect(read(chosen).found.filter(f => f.source === 'note')).toEqual([]);
  });

  it('withdraws everything from the note when the crisis check trips, and offers nothing after', () => {
    const s = heardReducer(read(createHeard(), true, feelingResult('tired')), { type: 'withdraw' });
    expect(s.found.filter(f => f.source === 'note')).toEqual([]);
    expect(read(s).found.filter(f => f.source === 'note')).toEqual([]);
  });

  it('keeps a tapped offer, and counts ✕ and "Not now" as dismissals', () => {
    let s = read(createHeard(), true, feelingResult('tired'));
    s = heardReducer(s, { type: 'keep', kind: 'feeling', name: 'tired' });
    expect(s.found.find(f => f.name === 'tired')!.state).toBe('kept');
    s = heardReducer(s, { type: 'remove', kind: 'area', name: 'work' });
    expect(s.found.find(f => f.name === 'work')!.state).toBe('removed');
    expect(dismissalsAtSave(s)).toEqual([{ kind: 'area', name: 'work', phrase: 'my boss' }]);
  });

  it('takes an area added back by hand after its ✕ as a mistake: no dismissal, no removal, still shown', () => {
    let s = read(createHeard());
    s = heardReducer(s, { type: 'remove', kind: 'area', name: 'work' });
    s = heardReducer(s, { type: 'add', kind: 'area', name: 'work' });
    expect(s.found.find(f => f.name === 'work')).toMatchObject({ source: 'picker', state: 'kept', foundInNote: { matchedPhrase: 'my boss', listVersion: 't1' } });
    expect(dismissalsAtSave(s)).toEqual([]);
    const counts = tallyCheckin({}, 'd', 't1', s, { suppressed: [] });
    expect(counts[guardKey('d', 't1', 'area', 'work')]).toEqual({ shown: 1, removed: 0, suppressed: 0 });
  });

  it('lights entries in reading order, 450 ms apart after a 300 ms pause; all at once under Reduce Motion', () => {
    const s = read(createHeard());
    expect(heardSchedule(s).map(e => [e.name, e.atMs])).toEqual([['family', 300], ['work', 750], ['sleep', 1200]]);
    expect(heardSchedule(s, { reducedMotion: true }).every(e => e.atMs === 0)).toBe(true);
    expect(HEARD_TIMING.chipIn).toEqual({ ms: 320, bezier: [0.16, 1, 0.3, 1] });
  });

  it('closing the rater clears un-acted offers (not a dismissal), keeps tapped ones, makes its words solid, and stops new offers', () => {
    let s = read(createHeard(), true, {
      ...result,
      shown: [...result.shown, ...['tired', 'proud'].map(name => ({ kind: 'feeling' as const, name, score: 1, phrases: [{ phrase: name, spans: [] }] }))],
    });
    s = heardReducer(s, { type: 'keep', kind: 'feeling', name: 'proud' });
    s = heardReducer(s, { type: 'raterClosed', rating: createRating({ face: { v: 0.2, a: 0.1 }, labels: [{ name: 'calm', level: 2 }] }) });
    expect(s.found.filter(f => f.kind === 'feeling').map(f => [f.name, f.source, f.state])).toEqual([
      ['calm', 'rater', 'chosen'], ['proud', 'note', 'kept'],
    ]);
    expect(s.offersBeforeRater).toBe(true);
    expect(dismissalsAtSave(s)).toEqual([]); // cleared offers aren't dismissals
    expect(read(s, true, feelingResult('sad')).found.some(f => f.name === 'sad')).toBe(false);
  });

  it('reread: a removed area stays removed unless new words mention it; hand-added stays; chosen is untouched', () => {
    let s = read(createHeard({ rating: createRating({ labels: [{ name: 'tired', level: 3 }] }) }));
    s = heardReducer(s, { type: 'remove', kind: 'area', name: 'sleep' });
    s = heardReducer(s, { type: 'add', kind: 'area', name: 'weather' });
    // Same words: sleep stays removed.
    let again = heardReducer(s, { type: 'reread', text: note, result, listVersion: 't1' });
    expect(again.found.find(f => f.name === 'sleep')!.state).toBe('removed');
    // New words for sleep: it's back.
    const edited = `${note}, and I slept on the sofa`;
    again = heardReducer(s, { type: 'reread', text: edited, result: cut(areas.classify(edited), edited), listVersion: 't1' });
    expect(again.found.find(f => f.name === 'sleep')!.state).toBe('kept');
    expect(again.found.find(f => f.name === 'weather')).toMatchObject({ source: 'picker', state: 'kept' });
    expect(again.found.find(f => f.name === 'tired')).toMatchObject({ source: 'rater', state: 'chosen', level: 3 });
    // Words gone from the note: so is what they found.
    const cutDown = 'mum called again and again today';
    again = heardReducer(s, { type: 'reread', text: cutDown, result: cut(areas.classify(cutDown), cutDown), listVersion: 't1' });
    expect(again.found.some(f => f.name === 'work')).toBe(false);
  });
});

describe('dismissals and the guard', () => {
  const pair = { kind: 'area' as const, name: 'work', phrase: 'workout' };

  it('suppresses a pair after two dismissals, and "Suggest again" undoes it', () => {
    let log = recordDismissals({}, [pair]);
    expect(suppressedPairs(log)).toEqual([]);
    log = recordDismissals(log, [pair]);
    expect(suppressedPairs(log)).toEqual([pair]);
    expect(suppressedPairs(suggestAgain(log, pair))).toEqual([]);
  });

  it('counts shown, removed and suppressed per day, version and name, with no note text', () => {
    const note = 'my boss, meetings, then a nap and no sleep';
    const result = cut(areas.classify(note), note);
    let s = heardReducer(createHeard(), { type: 'read', text: note, result, listVersion: 't1' });
    s = heardReducer(s, { type: 'remove', kind: 'area', name: 'sleep' });
    const counts = tallyCheckin({}, '2026-10-24', 't1', s, { suppressed: [{ kind: 'area', name: 'family', score: 1, phrases: [] }] });
    expect(counts[guardKey('2026-10-24', 't1', 'area', 'work')]).toEqual({ shown: 1, removed: 0, suppressed: 0 });
    expect(counts[guardKey('2026-10-24', 't1', 'area', 'sleep')]).toEqual({ shown: 1, removed: 1, suppressed: 0 });
    expect(counts[guardKey('2026-10-24', 't1', 'area', 'family')]).toEqual({ shown: 0, removed: 0, suppressed: 1 });
    expect(JSON.stringify(counts)).not.toContain('boss');
  });

  it('judges the guard on (removed + suppressed) / (shown + suppressed), against 1 in 20', () => {
    expect(guardRate({ shown: 19, removed: 0, suppressed: 1 })).toBeCloseTo(1 / 20);
    expect(overGuard({ shown: 19, removed: 0, suppressed: 1 })).toBe(false);
    expect(overGuard({ shown: 18, removed: 1, suppressed: 1 })).toBe(true);
    expect(guardRate({ shown: 0, removed: 0, suppressed: 0 })).toBe(0);
  });
});

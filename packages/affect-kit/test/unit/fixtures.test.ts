import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  chipStyle, createRater, createRating, decayShock, describeFace, faceMotion, faceParams, facePaths,
  faceStroke, faceTier, kickShock, neutralPalette, raterReducer, ratingPosition, smoothFaceParams,
  surfacePalette, vaColor, wordChipColors, wordOrder, EMOTION_LABELS, FACE_STEPS,
  type EmotionName, type RaterEvent,
} from '../../src/core';
import { stateOfMind } from '../../src/apple-health';

// The golden fixtures (`affect-kit/fixtures`): what the core gives for known
// inputs. Both repos' CI run against them, so a native renderer and the web
// one fail together if they drift. This test regenerates them and compares;
// `pnpm fixtures` rewrites the file when a change is intended, and the
// release's version step does too, so `version` always names the release.

const FILE = new URL('../../fixtures/core.json', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
const THEMES = ['light', 'dark'] as const;
const SIZES = [16, 20, 24, 28, 36, 48, 120];

function generate() {
  const points = [];
  for (const v of FACE_STEPS) {
    for (const a of FACE_STEPS) {
      const params = faceParams(v, a);
      points.push({
        v, a,
        params,
        paths: facePaths(params),
        order: wordOrder(v, a),
        color: vaColor(v, a),
        palette: { light: surfacePalette(v, a, 'light'), dark: surfacePalette(v, a, 'dark') },
        description: describeFace(v, a),
      });
    }
  }
  const words = Object.fromEntries(
    (Object.keys(EMOTION_LABELS) as EmotionName[]).map(name => {
      const { v, a } = EMOTION_LABELS[name];
      return [name, { light: wordChipColors(v, a, 'light'), dark: wordChipColors(v, a, 'dark') }];
    }),
  );
  const chips = THEMES.flatMap(theme =>
    [0, 1, 2, 3].map(level => ({ theme, level, basePx: 16, style: chipStyle(level, neutralPalette(theme), 16) })),
  );
  const sizes = SIZES.map(sizePx => ({ sizePx, tier: faceTier(sizePx), stroke: faceStroke(sizePx) }));

  // The face easing from (-0.8, -0.6) to (0.8, 0.6), with a shock kicked at the
  // start, sampled every 50 ms. The same at 60 and 120 Hz, which is the point.
  // Other engines (Hermes) may differ in the last digits: compare to about 1e-6.
  const motion = [60, 120].flatMap(hz => [false, true].map(reducedMotion => {
    const frameMs = 1000 / hz;
    const target = faceParams(0.8, 0.6);
    let params = faceParams(-0.8, -0.6);
    let shock = reducedMotion ? 0 : kickShock(0);
    const frames = [];
    for (let frame = 0, tMs = 0; tMs <= 500 + 1e-9; frame++, tMs = frame * frameMs) {
      if (frame % (hz / 20) === 0) {
        const t = tMs / 1000;
        frames.push({ tMs: Math.round(tMs), params, shock, offsets: faceMotion(t, 0.8, 0.6, { motionScale: 1, shock, reducedMotion }) });
      }
      params = smoothFaceParams(params, target, frameMs, { reducedMotion });
      shock = decayShock(shock, frameMs);
    }
    return { hz, reducedMotion, frames };
  }));

  // The rater's behavior: scripts of events, with the state after each.
  const scripts: Record<string, RaterEvent[]> = {
    'drag, settle, choose': [
      { type: 'move', v: 0.6, a: 0.4 }, { type: 'move', v: 0.7, a: 0.5 }, { type: 'settle' },
      { type: 'tap', name: 'excited' }, { type: 'tap', name: 'excited' }, { type: 'tap', name: 'proud' },
    ],
    'five words at most': [
      { type: 'showWords' },
      ...(['joy', 'calm', 'proud', 'tired', 'hopeful', 'sad'] as const).map(name => ({ type: 'tap', name }) as RaterEvent),
      { type: 'tap', name: 'joy' },
    ],
    'words only: the face stays unset': [{ type: 'showWords' }, { type: 'tap', name: 'calm' }, { type: 'tap', name: 'calm' }],
    'screen reader: two steps': [
      { type: 'adjust', axis: 'pleasant', direction: 1 }, { type: 'adjust', axis: 'energized', direction: -1 },
      { type: 'tap', name: 'calm' },
    ],
  };
  const rater = Object.entries(scripts).map(([name, events]) => {
    let state = createRater();
    return { name, events, states: events.map(event => (state = raterReducer(state, event))) };
  });

  // A rating with no face: no face is drawn, and no mark stands in for it. Its
  // position, and Health's valence, come from the words.
  const unsetRating = createRating({ labels: [{ name: 'calm', level: 2 }, { name: 'tired', level: 1 }], timestamp: 0 });
  const noFace = { rating: unsetRating, mark: 'none', position: ratingPosition(unsetRating), health: stateOfMind(unsetRating) };

  return { version: pkg.version, points, words, chips, sizes, motion, rater, noFace };
}

// One entry per line, so a change reads as a small diff in review.
function format(fixtures: ReturnType<typeof generate>): string {
  const lines = ['{', `"version": ${JSON.stringify(fixtures.version)},`];
  const list = (key: string, items: unknown[], last = false) => {
    lines.push(`"${key}": [`);
    items.forEach((item, i) => lines.push(JSON.stringify(item) + (i < items.length - 1 ? ',' : '')));
    lines.push(last ? ']' : '],');
  };
  list('points', fixtures.points);
  lines.push('"words": {');
  const names = Object.keys(fixtures.words);
  names.forEach((name, i) => lines.push(`${JSON.stringify(name)}: ${JSON.stringify(fixtures.words[name])}` + (i < names.length - 1 ? ',' : '')));
  lines.push('},');
  list('chips', fixtures.chips);
  list('sizes', fixtures.sizes);
  list('motion', fixtures.motion);
  list('rater', fixtures.rater);
  lines.push(`"noFace": ${JSON.stringify(fixtures.noFace)}`);
  lines.push('}');
  return lines.join('\n') + '\n';
}

describe('affect-kit/fixtures', () => {
  const fresh = generate();

  if (process.env['UPDATE_FIXTURES']) {
    it('rewrites fixtures/core.json', () => {
      writeFileSync(FILE, format(fresh));
    });
    return;
  }

  it('matches what the core gives today (run `pnpm fixtures` after an intended change)', () => {
    const committed = JSON.parse(readFileSync(FILE, 'utf8'));
    expect(committed).toEqual(JSON.parse(JSON.stringify(fresh)));
  });

  it('names this release', () => {
    expect(JSON.parse(readFileSync(FILE, 'utf8')).version).toBe(pkg.version);
  });

  it('covers the 9 × 9 grid, every word, every chip level and the size tiers', () => {
    expect(fresh.points).toHaveLength(81);
    expect(Object.keys(fresh.words)).toHaveLength(55);
    expect(fresh.chips).toHaveLength(8);
    expect(fresh.sizes.map(s => s.tier.draw)).toEqual(['dot', 'face', 'face', 'face', 'face', 'face', 'face']);
  });

  it('moves the same at 60 and 120 Hz', () => {
    const at = (hz: number, reducedMotion: boolean) => fresh.motion.find(m => m.hz === hz && m.reducedMotion === reducedMotion)!;
    for (const reducedMotion of [false, true]) {
      const [a, b] = [at(60, reducedMotion).frames, at(120, reducedMotion).frames];
      expect(a.map(f => f.tMs)).toEqual(b.map(f => f.tMs));
      a.forEach((f, i) => {
        expect(b[i]!.params.mouthMidY).toBeCloseTo(f.params.mouthMidY, 6);
        expect(b[i]!.shock).toBeCloseTo(f.shock, 6);
      });
    }
  });

  it("records a faceless rating with no mark, and the words' position", () => {
    expect(fresh.noFace.rating.face).toBeNull();
    expect(fresh.noFace.mark).toBe('none');
    expect(fresh.noFace.position?.source).toBe('words');
    expect(fresh.noFace.health?.valenceFrom).toBe('words');
  });
});

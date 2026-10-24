import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  chipStyle, describeFace, faceParams, facePaths, faceStroke, faceTier, neutralPalette,
  surfacePalette, vaColor, wordChipColors, wordOrder, EMOTION_LABELS, FACE_STEPS,
  type EmotionName,
} from '../../src/core';

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
  return { version: pkg.version, points, words, chips, sizes };
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
  list('sizes', fixtures.sizes, true);
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
});

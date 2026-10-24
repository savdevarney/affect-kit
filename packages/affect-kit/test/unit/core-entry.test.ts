import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as core from '../../src/core';
import * as appleHealth from '../../src/apple-health';
import * as color from '../../src/core/color';
import * as palette from '../../src/core/palette';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

/**
 * Every module a source file reaches through its imports, type-only ones included
 * (stricter than the bundle needs). Relative imports are followed; packages are
 * recorded by name.
 */
function reachable(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const source = readFileSync(file, 'utf8');
  for (const [, specifier] of source.matchAll(/from\s+'([^']+)'/g)) {
    if (specifier!.startsWith('.')) reachable(resolve(dirname(file), `${specifier}.ts`), seen);
    else seen.add(specifier!);
  }
  return seen;
}

describe('affect-kit/core', () => {
  it('exports the headless core, and nothing else', () => {
    expect(Object.keys(core).sort()).toEqual([
      // ratings
      'createRating', 'averageRatings', 'stripVad', 'rehydrate', 'ratingPosition', 'EMOTION_LABELS',
      // motion
      'smoothFaceParams', 'faceSettled', 'kickShock', 'decayShock', 'faceMotion', 'FACE_MOTION',
      // the rater
      'createRater', 'raterReducer', 'canFinish', 'raterRating', 'tapShocks',
      'RATER_RULES', 'RATER_TIMING', 'RATER_LAYOUT', 'UNSET_FACE',
      // the face
      'faceParams', 'faceGeometry', 'facePaths', 'toSvgPath', 'FACE_PARTS', 'FACE_BOX',
      'FACE_STYLE', 'faceInk', 'FACE_TIERS', 'faceTier', 'faceStroke',
      // the pad and color
      'padToFace', 'faceToPad', 'vaColor', 'padColors',
      'surfacePalette', 'neutralPalette', 'wordChipColors', 'MIN_TEXT_CONTRAST', 'SURFACE_MIX',
      // the words and chips
      'wordOrder', 'chipStyle', 'BASE_FONT_PX', 'WORD_LIST_GAP',
      // accessibility
      'A11Y_STRINGS_EN', 'describeFace', 'axisValueText', 'nudgeFace', 'chipLabel', 'chipA11y', 'FACE_STEPS',
    ].sort());
  });

  for (const entry of ['core.ts', 'apple-health.ts']) {
    it(`${entry} reaches no Lit and no component, so React Native and servers can import it`, () => {
      const modules = [...reachable(resolve(SRC, entry))];
      const dom = modules.filter(
        (m) => m === 'lit' || m.startsWith('lit/') || m.includes('/components/'),
      );
      expect(dom).toEqual([]);
    });
  }
});

describe('affect-kit/apple-health', () => {
  it('exports the State of Mind mapping, and nothing else', () => {
    expect(Object.keys(appleHealth).sort()).toEqual(['APPLE_LABEL_OF_WORD', 'appleLabelsFor', 'stateOfMind']);
  });
});

// React Native Reanimated runs a function on the UI thread only if it starts
// with a 'worklet' directive, and every function it calls needs one too. A
// missing one fails only on a device, so the per-frame path is checked here.
describe('worklet directives', () => {
  const perFrame: Record<string, unknown> = {
    ...core,
    colorForVA: color.colorForVA, rgbToOklab: color.rgbToOklab, oklabToRgb: color.oklabToRgb,
    srgbToLin: color.srgbToLin, linToSrgb: color.linToSrgb, toHex: color.toHex, mixOver: color.mixOver,
    contrastRatio: color.contrastRatio, relativeLuminance: color.relativeLuminance,
    darkerForChips: color.darkerForChips, lighterForChips: color.lighterForChips,
    surfacePaletteRgb: palette.surfacePaletteRgb,
  };
  // Not on the per-frame path: ratings are built once, words sorted on release.
  const notPerFrame = new Set([
    'createRating', 'averageRatings', 'stripVad', 'rehydrate', 'ratingPosition', 'wordOrder',
    'describeFace', 'axisValueText', 'nudgeFace', 'chipLabel', 'chipA11y',
    // The rater's events happen on a touch or a tap, not every frame.
    'createRater', 'raterReducer', 'canFinish', 'raterRating', 'tapShocks',
  ]);

  for (const [name, value] of Object.entries(perFrame)) {
    if (typeof value !== 'function' || notPerFrame.has(name)) continue;
    it(`${name} is a worklet`, () => {
      expect(value.toString()).toMatch(/^[^{]*\{\s*['"]worklet['"]/);
    });
  }
});

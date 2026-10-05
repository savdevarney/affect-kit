import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as data from '../../src/data';

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

describe('affect-kit/data', () => {
  it('exports the rating helpers and the vocabulary, and nothing else', () => {
    expect(Object.keys(data).sort()).toEqual([
      'EMOTION_LABELS',
      'averageRatings',
      'createRating',
      'rehydrate',
      'stripVad',
    ]);
  });

  it('reaches no Lit and no component, so servers can import it without a DOM', () => {
    const modules = [...reachable(resolve(SRC, 'data.ts'))];
    const dom = modules.filter(
      (m) => m === 'lit' || m.startsWith('lit/') || m.includes('/components/'),
    );
    expect(dom).toEqual([]);
  });
});

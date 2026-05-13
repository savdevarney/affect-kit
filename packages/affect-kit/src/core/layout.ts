// Shared Lit property converter for the `layout` attribute on components
// that have a "stacked vs side-by-side" decision: result (face vs words)
// and compare (left vs right halves).
//
//   'auto'  (default) — container queries decide based on width
//   'stack'           — always stacked, even when wide
//   'row'             — side-by-side from a lower threshold; falls back
//                       to stacked below the floor instead of overflowing

import type { Layout } from './types';

/** @internal */
export const layoutConverter = {
  fromAttribute(value: string | null): Layout {
    if (value === 'stack') return 'stack';
    if (value === 'row') return 'row';
    return 'auto';
  },
  toAttribute(value: Layout): string {
    return value;
  },
};

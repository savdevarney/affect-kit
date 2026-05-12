// React wrappers for the affect-kit web components.
//
// Each wrapper is a thin createComponent() call from @lit/react. The wrapper
// gives you:
//   - Typed React props (camelCase, autocomplete, JSX/TS aware)
//   - Idiomatic onXxx handlers — native CustomEvents are translated into
//     React-style props.
//   - Correct property/attribute mapping — complex types (e.g. `rating`,
//     `beforeRating`) flow as element properties, primitives as attributes.
//
// What you write:
//   <Rater colorMode showVad onChange={(e) => console.log(e.detail)} />
//
// What renders:
//   <affect-kit-rater color-mode show-vad>...</affect-kit-rater>
//   ...with a 'change' event listener attached.
//
// Each wrapper preserves access to the underlying element's API: pass a
// `ref` to call `.reset()` on the rater, or any other instance method.

import * as React from 'react';
import { createComponent } from '@lit/react';

import { AffectKitRater }   from 'affect-kit/rater';
import { AffectKitResult }  from 'affect-kit/result';
import { AffectKitFace }    from 'affect-kit/face';
import { AffectKitCompare } from 'affect-kit/compare';

export type { Rating, EmotionLabel, EmotionName, ColorMode } from 'affect-kit';
export { useAverageRatings } from './useAverageRatings';

/**
 * `<affect-kit-rater>` as a React component.
 * Emits `onChange` with a `CustomEvent<Rating>` when the user commits a rating.
 */
export const Rater = createComponent({
  react: React,
  tagName: 'affect-kit-rater',
  elementClass: AffectKitRater,
  events: {
    onChange: 'change',
  },
});

/**
 * `<affect-kit-result>` as a React component.
 * Pass `rating` as a prop; the wrapper sets the underlying element property.
 */
export const Result = createComponent({
  react: React,
  tagName: 'affect-kit-result',
  elementClass: AffectKitResult,
  events: {},
});

/**
 * `<affect-kit-face>` primitive as a React component.
 * `v` and `a` are number props in [-1, 1].
 */
export const Face = createComponent({
  react: React,
  tagName: 'affect-kit-face',
  elementClass: AffectKitFace,
  events: {},
});

/**
 * `<affect-kit-compare>` as a React component.
 * `beforeRating` / `afterRating` accept a single `Rating | null`.
 * For time-series comparisons, average upstream — `useAverageRatings()`
 * is the memoized React-idiomatic helper.
 */
export const Compare = createComponent({
  react: React,
  tagName: 'affect-kit-compare',
  elementClass: AffectKitCompare,
  events: {},
});

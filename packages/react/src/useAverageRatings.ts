// Memoized React adapter around `averageRatings()`.
//
// Why this exists: `<affect-kit-compare>` accepts a single Rating per side
// to keep the component cheap on every render. When a React consumer holds
// a time series and wants to pass an averaged value to compare, they
// usually want memoization — recompute the average only when the source
// array reference changes.
//
// Without this hook, a consumer constructing `[r1, r2, r3]` inline on
// every render would force `averageRatings()` to re-run each render.
// With this hook, the average is cached by array reference.

import { useMemo } from 'react';
import { averageRatings } from 'affect-kit';
import type { Rating } from 'affect-kit';

/**
 * Returns the average of a `Rating[]`, memoized by array reference.
 *
 * ```tsx
 * import { Compare, useAverageRatings } from '@affect-kit/react';
 *
 * function WeekComparison({ lastWeek, thisWeek }) {
 *   const before = useAverageRatings(lastWeek);
 *   const after  = useAverageRatings(thisWeek);
 *   return <Compare beforeRating={before} afterRating={after} />;
 * }
 * ```
 *
 * Returns `null` when the input is `null`, `undefined`, or an empty array.
 */
export function useAverageRatings(ratings: Rating[] | null | undefined): Rating | null {
  return useMemo(() => {
    if (!ratings || ratings.length === 0) return null;
    return averageRatings(ratings);
  }, [ratings]);
}

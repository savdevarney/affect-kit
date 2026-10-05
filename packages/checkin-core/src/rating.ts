import { createRating, type Rating } from 'affect-kit/data';
import type { Face, Level } from './ports.ts';
import type { EmotionName } from './vocabulary.ts';

/**
 * A check-in as an affect-kit Rating, derived on read: the face is their
 * gesture, the labels are their current words, and the composite comes from
 * the lexicon. Nothing here is stored; `createRating` also throws on any name
 * outside the vocabulary, so a bad label can't reach a Rating.
 */
export function ratingOf(checkin: { createdAt: string; face: Face; words: readonly { name: EmotionName; level: Level }[] }): Rating {
  return createRating({
    face: checkin.face,
    labels: checkin.words.map(({ name, level }) => ({ name, level })),
    timestamp: Date.parse(checkin.createdAt),
  });
}

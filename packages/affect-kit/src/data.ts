// `affect-kit/data` entry: ratings as data, with no custom elements and no DOM.
//
// Every other entry registers custom elements as a side effect, and Lit's
// browser build needs `HTMLElement` at import time. Servers (Node, Workers,
// Deno) and web workers that build or store Ratings import this entry instead:
// the same public helpers and types, nothing new, nothing internal.

export type { Rating, EmotionLabel, EmotionName } from './core/types';
export { createRating, averageRatings, stripVad, rehydrate } from './core/vad';
export { EMOTION_LABELS } from './vocabulary/en';

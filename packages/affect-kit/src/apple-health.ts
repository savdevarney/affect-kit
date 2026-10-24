// `affect-kit/apple-health` entry: what to write to Apple Health's State of
// Mind (iOS 18 and later) for a rating. Pure data, no HealthKit and no DOM, so
// every app writes the same thing; the app calls HealthKit itself.
//
// State of Mind holds a kind, a valence from -1 to 1 and labels from Apple's
// own list. It has no field for arousal, so arousal stays with the app.

import type { EmotionName, Rating } from './core/types';
import { ratingPosition } from './core/vad';

/** The State of Mind labels the vocabulary maps to: `HKStateOfMind.Label` names. */
export type AppleMoodLabel =
  | 'angry' | 'scared' | 'disgusted' | 'joyful' | 'surprised' | 'anxious' | 'frustrated' | 'annoyed' | 'overwhelmed'
  | 'jealous' | 'embarrassed' | 'excited' | 'proud' | 'amused' | 'hopeful' | 'confident' | 'calm' | 'content'
  | 'peaceful' | 'grateful' | 'satisfied' | 'sad' | 'lonely' | 'ashamed' | 'disappointed' | 'hopeless' | 'guilty';

/**
 * Each word's State of Mind label: the same word, or its plain adjective
 * (anger → angry, joy → joyful). A word with no label of its own has none.
 * It's never forced into a near one: Health shows these words back to the
 * person as theirs, so "serene" is never written as "peaceful".
 */
export const APPLE_LABEL_OF_WORD: Readonly<Partial<Record<EmotionName, AppleMoodLabel>>> = {
  anger: 'angry',
  fear: 'scared',
  disgust: 'disgusted',
  joy: 'joyful',
  surprise: 'surprised',
  anxious: 'anxious',
  frustrated: 'frustrated',
  annoyed: 'annoyed',
  overwhelmed: 'overwhelmed',
  jealous: 'jealous',
  embarrassed: 'embarrassed',
  excited: 'excited',
  proud: 'proud',
  amused: 'amused',
  hopeful: 'hopeful',
  confident: 'confident',
  calm: 'calm',
  content: 'content',
  peaceful: 'peaceful',
  grateful: 'grateful',
  satisfied: 'satisfied',
  sad: 'sad',
  lonely: 'lonely',
  ashamed: 'ashamed',
  disappointed: 'disappointed',
  hopeless: 'hopeless',
  guilty: 'guilty',
};

/**
 * The labels for a person's chosen words, each once, in the order chosen.
 * Words with no label are left out. Matching ignores case and surrounding spaces.
 */
export function appleLabelsFor(words: readonly string[]): AppleMoodLabel[] {
  const labels: AppleMoodLabel[] = [];
  for (const word of words) {
    const label = APPLE_LABEL_OF_WORD[word.trim().toLowerCase() as EmotionName];
    if (label !== undefined && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

/** A momentary emotion (a check-in) or a mood across a day. */
export type StateOfMindKind = 'momentaryEmotion' | 'dailyMood';

/** What to write to State of Mind. */
export interface StateOfMindSample {
  kind: StateOfMindKind;
  /** From -1 (very unpleasant) to 1 (very pleasant). */
  valence: number;
  /**
   * Where the valence came from: the face, or (when the face wasn't set) the
   * chosen words' composite. Health has one valence field; this keeps the
   * difference on your side.
   */
  valenceFrom: 'face' | 'words';
  labels: AppleMoodLabel[];
}

/**
 * The State of Mind sample for a rating: its kind, its valence (clamped to
 * [-1, 1]) and the labels for its words. The valence is the face's; when the
 * face wasn't set it's the chosen words', as `valenceFrom` says. `null` for a
 * rating with neither a face nor words, which has nothing to write.
 *
 * ```ts
 * const sample = stateOfMind(rating);
 * // save with HealthKit: sample.kind, sample.valence, sample.labels
 * ```
 */
export function stateOfMind(rating: Rating, kind: StateOfMindKind = 'momentaryEmotion'): StateOfMindSample | null {
  const position = ratingPosition(rating);
  if (!position) return null;
  return {
    kind,
    valence: Math.max(-1, Math.min(1, position.v)),
    valenceFrom: position.source,
    labels: appleLabelsFor(rating.labels.map(l => l.name)),
  };
}

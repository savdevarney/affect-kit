// Everyday English words mapped to the vocabulary's labels, so a person who
// types "stressed" or "happy" can find overwhelmed or joy.
//
// Rules for entries:
// - one lowercase word per key; never a label itself (the label already matches);
// - the target is the label closest in meaning, not a diagnosis or a reading
//   between the lines;
// - noun forms are listed only where they part ways with the label's spelling
//   early ("anxiety" leaves "anxious" at the fifth letter), since prefix
//   matching already covers the rest.

import type { EmotionName } from './en';

/**
 * Everyday words mapped to the label they name, for search and text matching.
 * Keys are lowercase single words; values are always in {@link EMOTION_LABELS}.
 *
 * ```ts
 * import { SYNONYMS_EN } from 'affect-kit/data';
 * SYNONYMS_EN['stressed']; // 'overwhelmed'
 * ```
 */
export const SYNONYMS_EN: Readonly<Record<string, EmotionName>> = Object.freeze({
  // joy
  happy: 'joy', glad: 'joy', great: 'joy', cheerful: 'joy', delighted: 'joy',
  // content
  good: 'content', fine: 'content', ok: 'content', okay: 'content', alright: 'content',
  // relaxed, calm, serene
  chill: 'relaxed', relieved: 'relaxed', mellow: 'relaxed', rested: 'relaxed', relaxation: 'relaxed',
  tranquil: 'serene',
  // grateful
  thankful: 'grateful', lucky: 'grateful', blessed: 'grateful', appreciative: 'grateful',
  gratitude: 'grateful',
  // excited
  thrilled: 'excited', energized: 'excited', enthusiastic: 'excited', pumped: 'excited',
  // loved, affectionate, compassionate
  loving: 'loved', warm: 'affectionate', caring: 'compassionate', empathetic: 'compassionate',
  // proud, determined, optimistic, satisfied, safe, curious, inspired, amused
  accomplished: 'proud', pride: 'proud',
  motivated: 'determined',
  positive: 'optimistic',
  fulfilled: 'satisfied',
  secure: 'safe',
  curiosity: 'curious',
  inspiration: 'inspired',
  entertained: 'amused',
  // surprise
  surprised: 'surprise', amazed: 'surprise', astonished: 'surprise',
  // overwhelmed
  stressed: 'overwhelmed', stress: 'overwhelmed', overloaded: 'overwhelmed', swamped: 'overwhelmed',
  // anxious
  worried: 'anxious', nervous: 'anxious', tense: 'anxious', uneasy: 'anxious', jittery: 'anxious',
  anxiety: 'anxious',
  // fear
  scared: 'fear', afraid: 'fear', frightened: 'fear', terrified: 'fear',
  // anger, enraged, annoyed, frustrated
  angry: 'anger', mad: 'anger',
  furious: 'enraged', livid: 'enraged',
  irritated: 'annoyed', irritable: 'annoyed',
  frustration: 'frustrated',
  // jealous, embarrassed, ashamed, regretful, disgust
  envious: 'jealous', jealousy: 'jealous',
  awkward: 'embarrassed',
  shame: 'ashamed',
  sorry: 'regretful', remorseful: 'regretful',
  disgusted: 'disgust',
  // sad, disappointed
  upset: 'sad', down: 'sad', blue: 'sad', unhappy: 'sad', miserable: 'sad', gloomy: 'sad',
  heartbroken: 'sad', hurt: 'sad',
  bummed: 'disappointed',
  // tired
  exhausted: 'tired', sleepy: 'tired', drained: 'tired', worn: 'tired', fatigued: 'tired',
  weary: 'tired',
  // lonely, bored, numb, vulnerable, nostalgic
  alone: 'lonely', isolated: 'lonely', loneliness: 'lonely',
  meh: 'bored', boredom: 'bored',
  detached: 'numb', apathetic: 'numb',
  insecure: 'vulnerable', exposed: 'vulnerable',
  homesick: 'nostalgic', wistful: 'nostalgic', nostalgia: 'nostalgic',
} satisfies Record<string, EmotionName>);

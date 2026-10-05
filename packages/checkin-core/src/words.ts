/**
 * Every sentence the app says about feelings, in one place, so the wording
 * rules (docs/checkin/visualizations.md § 2) can be tested. The model never
 * writes to the person: what they read comes from here, or is their own text.
 *
 * Bridge to Angular: like a translations file that components read keys from,
 * except it's typed functions, so counts and words can't be misplaced.
 */
import type { EmotionName } from './vocabulary.ts';
import type { Level } from './ports.ts';

export const COPY = {
  faceStep: {
    title: 'How are you?',
    hint: 'Move the face until it looks how you feel.',
    next: 'Next',
  },
  wordsStep: {
    title: "What's going on?",
    placeholder: 'A few words, in your own way',
    submit: 'Find my words',
    working: 'Reading your words',
    skip: 'Save the face only',
  },
  reviewStep: {
    title: 'Your feeling words',
    hint: 'Tap a word to change how strong it is. Remove any that don’t fit.',
    noneFound: 'No feeling words came through. These are near your face:',
    add: 'Add a word',
    addHint: 'Words nearest your face come first.',
    done: 'Done',
    simpleMatching: 'Found with simple word matching.',
    yourWord: 'your word',
    yourWordNote: 'Kept as you wrote it: it isn’t one of the 55 words.',
  },
  day: {
    empty: 'No check-ins',
    checkIn: 'Check in',
    notReviewed: 'not reviewed',
    delete: 'Delete',
    confirmDelete: 'Delete this check-in? Its words go with it.',
  },
  notAdvice: 'A personal log of the words you choose: not a test, and not medical advice.',
} as const;

/** How strong a word is, in words: for screen readers and tooltips. */
export const LEVEL_WORDS: Record<Level, string> = { 1: 'a little', 2: 'clearly', 3: 'strongly' };

/** "anxious, strongly": a chip's accessible name. */
export const chipLabel = (name: EmotionName, level: Level) => `${name}, ${LEVEL_WORDS[level]}`;

/** "calm on 4 of 7 days": a count with its denominator, never a percentage or a verdict. */
export const daysLine = (word: string, days: number, ofDays: number) => `${word} on ${days} of ${ofDays} ${ofDays === 1 ? 'day' : 'days'}`;

/** "6 check-ins": the denominator under every view. */
export const checkinCount = (n: number) => (n === 1 ? '1 check-in' : `${n} check-ins`);

/**
 * Words the app never says in its own voice: verdicts, measurement claims,
 * clinical words, advice and pressure. The person's own text may contain any
 * of them; this is about what we write.
 */
export const BANNED_IN_OUR_VOICE: readonly string[] = [
  'improving', 'improvement', 'better', 'worse', 'declining', 'decline', 'progress', 'recovery', 'resilient', 'resilience',
  'stuck', 'trend', 'normal', 'abnormal', 'healthy', 'unhealthy', 'good day', 'bad day',
  'score', 'wellness', 'risk', 'insight', 'pattern',
  'symptom', 'depression', 'depressed', 'disorder', 'diagnos',
  'should', 'try', 'consider', 'you seem', 'you tend to',
  'streak', 'missed',
];

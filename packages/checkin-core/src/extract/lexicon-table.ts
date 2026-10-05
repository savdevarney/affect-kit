/**
 * The lexicon baseline's tables: everyday phrases for each vocabulary word,
 * feeling words that have no vocabulary fit, and the words that change
 * intensity or negate. Hand-made and deliberately small: this is a floor to
 * beat and a fallback, not a classifier.
 *
 * Confidence says how directly a phrase names the word: the vocabulary word
 * itself (0.9), a close synonym (~0.75), a loose or ambiguous one (~0.55).
 */
import type { EmotionName } from '../vocabulary.ts';
import type { Level } from '../ports.ts';

export interface LexiconEntry {
  /** Lowercase, matched on word boundaries. */
  phrase: string;
  name: EmotionName;
  /** A level the phrase carries on its own: "terrified" is fear at 3. */
  level?: Level;
  confidence: number;
}

type Row = [phrase: string, confidence: number, level?: Level];

const ROWS: Record<EmotionName, Row[]> = {
  anger: [['anger', 0.9], ['angry', 0.85], ['angrier', 0.85], ['irate', 0.75], ['pissed off', 0.75], ['pissed', 0.7], ['mad', 0.55]],
  fear: [['fear', 0.85], ['afraid', 0.85], ['scared', 0.85], ['frightened', 0.85], ['fearful', 0.85], ['terrified', 0.85, 3], ['petrified', 0.8, 3], ['spooked', 0.65]],
  anxious: [['anxious', 0.9], ['anxiety', 0.8], ['nervous', 0.8], ['apprehensive', 0.75], ['worried', 0.75], ['on edge', 0.75], ['jittery', 0.75], ['uneasy', 0.7], ['worrying', 0.7], ['tense', 0.65], ['jumpy', 0.6], ['antsy', 0.6]],
  frustrated: [['frustrated', 0.9], ['frustration', 0.85], ['frustrating', 0.75], ['fed up', 0.75], ['exasperated', 0.75]],
  annoyed: [['annoyed', 0.9], ['irritated', 0.8], ['irritable', 0.75], ['irked', 0.75], ['cranky', 0.7], ['grumpy', 0.7], ['hangry', 0.65], ['annoying', 0.6]],
  contempt: [['contempt', 0.9], ['contemptuous', 0.85], ['disdain', 0.8], ['scorn', 0.75]],
  disgust: [['disgusted', 0.9], ['disgust', 0.9], ['grossed out', 0.75], ['revolted', 0.75], ['repulsed', 0.75], ['disgusting', 0.7]],
  panicked: [['panicked', 0.9], ['panicking', 0.9], ['panicky', 0.85], ['panic attack', 0.8, 3], ['panic', 0.8], ['freaking out', 0.75], ['freaked out', 0.75]],
  overwhelmed: [['overwhelmed', 0.9], ['overwhelming', 0.75], ['snowed under', 0.7], ['swamped', 0.7], ['stressed out', 0.65], ['stressed', 0.6]],
  enraged: [['enraged', 0.9], ['furious', 0.75], ['livid', 0.75], ['rage', 0.7], ['seething', 0.7], ['raging', 0.65]],
  horrified: [['horrified', 0.9], ['appalled', 0.8], ['aghast', 0.75], ['horrifying', 0.7]],
  shocked: [['shocked', 0.9], ['stunned', 0.75], ['gobsmacked', 0.7], ['shock', 0.65]],
  jealous: [['jealous', 0.9], ['jealousy', 0.85], ['envious', 0.85], ['envy', 0.75]],
  humiliated: [['humiliated', 0.9], ['mortified', 0.8], ['humiliating', 0.75]],
  embarrassed: [['embarrassed', 0.9], ['embarrassment', 0.8], ['embarrassing', 0.7], ['self-conscious', 0.7], ['awkward', 0.55]],
  joy: [['joyful', 0.9], ['joy', 0.9], ['joyous', 0.85], ['overjoyed', 0.8, 3], ['over the moon', 0.75, 3], ['elated', 0.75, 3], ['ecstatic', 0.75, 3], ['blissful', 0.7], ['delighted', 0.7], ['thrilled', 0.65], ['happy', 0.6], ['happier', 0.55]],
  excited: [['excited', 0.9], ['excitement', 0.85], ['pumped', 0.75], ['stoked', 0.75], ['psyched', 0.75], ["can't wait", 0.7], ['hyped', 0.7], ['exciting', 0.7], ['buzzing', 0.6], ['eager', 0.6]],
  proud: [['proud', 0.9], ['pride', 0.75], ['accomplished', 0.65]],
  surprise: [['surprised', 0.9], ['surprise', 0.85], ['astonished', 0.75], ['amazed', 0.65], ['surprising', 0.6]],
  awe: [['in awe', 0.9], ['awe', 0.9], ['awed', 0.85], ['awestruck', 0.85], ['awe-struck', 0.85]],
  amused: [['amused', 0.9], ['amusing', 0.75], ['cracking up', 0.65], ['hilarious', 0.65], ['laughing', 0.6], ['funny', 0.55]],
  inspired: [['inspired', 0.9], ['inspiration', 0.75], ['inspiring', 0.75], ['motivated', 0.6]],
  curious: [['curious', 0.9], ['curiosity', 0.85], ['intrigued', 0.8], ['fascinated', 0.65], ['interested', 0.55]],
  determined: [['determined', 0.9], ['determination', 0.85], ['driven', 0.6]],
  enchanted: [['enchanted', 0.9], ['charmed', 0.75], ['spellbound', 0.7], ['smitten', 0.6]],
  moved: [['moved to tears', 0.85, 3], ['deeply moved', 0.85], ['felt moved', 0.8], ['so moved', 0.8], ['touched', 0.6]],
  hopeful: [['hopeful', 0.9]],
  optimistic: [['optimistic', 0.9], ['optimism', 0.85], ['upbeat', 0.7]],
  confident: [['confident', 0.9], ['self-assured', 0.8], ['sure of myself', 0.8], ['confidence', 0.7]],
  calm: [['calm', 0.9], ['calmer', 0.8], ['tranquil', 0.75], ['chill', 0.6], ['grounded', 0.6], ['centered', 0.6]],
  content: [['contented', 0.9], ['contentment', 0.85], ['content', 0.8]],
  relaxed: [['relaxed', 0.9], ['at ease', 0.8], ['unwound', 0.7], ['relaxing', 0.65], ['laid back', 0.65], ['mellow', 0.65]],
  peaceful: [['peaceful', 0.9], ['at peace', 0.85]],
  serene: [['serene', 0.9], ['serenity', 0.85]],
  grateful: [['grateful', 0.9], ['gratitude', 0.85], ['thankful', 0.85], ['appreciative', 0.8], ['blessed', 0.55]],
  satisfied: [['satisfied', 0.9], ['satisfaction', 0.8], ['fulfilled', 0.7], ['satisfying', 0.65]],
  safe: [['safe', 0.75], ['secure', 0.7]],
  loved: [['feel loved', 0.9], ['felt loved', 0.9], ['feeling loved', 0.9], ['cared for', 0.7]],
  affectionate: [['affectionate', 0.9], ['cuddly', 0.65], ['loving', 0.6]],
  tender: [['tenderness', 0.8], ['feeling tender', 0.8]],
  compassionate: [['compassionate', 0.9], ['compassion', 0.85], ['empathetic', 0.75], ['sympathetic', 0.7], ['empathy', 0.7]],
  sad: [['sad', 0.9], ['sadness', 0.9], ['sadder', 0.85], ['feeling down', 0.8], ['felt down', 0.8], ['feeling blue', 0.8], ['feeling low', 0.75], ['heartbroken', 0.75, 3], ['miserable', 0.75, 3], ['unhappy', 0.75], ['devastated', 0.7, 3], ['gloomy', 0.7], ['tearful', 0.7], ['depressed', 0.6], ['upset', 0.6], ['crying', 0.6], ['cried', 0.6], ['teary', 0.6]],
  bored: [['bored', 0.9], ['boredom', 0.85], ['boring', 0.55]],
  lonely: [['lonely', 0.9], ['loneliness', 0.85], ['lonesome', 0.85], ['isolated', 0.7], ['left out', 0.65]],
  tired: [['tired', 0.9], ['exhausted', 0.85, 3], ['exhaustion', 0.8, 3], ['fatigued', 0.8], ['tiredness', 0.8], ['drained', 0.75], ['worn out', 0.75], ['knackered', 0.75], ['wiped out', 0.75, 3], ['wiped', 0.7, 3], ['sleepy', 0.7], ['run down', 0.65], ['burnt out', 0.6, 3], ['burned out', 0.6, 3]],
  ashamed: [['ashamed', 0.9], ['shame', 0.75], ['shameful', 0.7]],
  disappointed: [['disappointed', 0.9], ['disappointment', 0.85], ['let down', 0.75], ['bummed out', 0.7], ['disappointing', 0.7], ['bummed', 0.65]],
  numb: [['numb', 0.9], ['numbness', 0.85], ['checked out', 0.55]],
  empty: [['feel empty', 0.9], ['feeling empty', 0.9], ['felt empty', 0.9], ['emptiness', 0.85], ['hollow', 0.7]],
  hopeless: [['hopeless', 0.9], ['hopelessness', 0.85], ['despair', 0.75], ['pointless', 0.55]],
  regretful: [['regretful', 0.9], ['regret', 0.75], ['regrets', 0.7], ["wish i hadn't", 0.7]],
  guilty: [['guilty', 0.9], ['guilt', 0.85]],
  vulnerable: [['vulnerable', 0.9], ['fragile', 0.7], ['insecure', 0.7], ['exposed', 0.6]],
  nostalgic: [['nostalgic', 0.9], ['nostalgia', 0.85], ['homesick', 0.6]],
  bittersweet: [['bittersweet', 0.9]],
};

/** Every phrase, longest first, so "pissed off" wins over "pissed" and "at peace" over "peace". */
export const LEXICON: readonly LexiconEntry[] = Object.entries(ROWS)
  .flatMap(([name, rows]) =>
    rows.map(([phrase, confidence, level]): LexiconEntry => ({ phrase, name: name as EmotionName, confidence, ...(level ? { level } : {}) })),
  )
  .sort((x, y) => y.phrase.length - x.phrase.length);

/**
 * Feeling words people use that no vocabulary word fits, as [phrase, what they
 * said]. Kept as their own words, never forced into the nearest fit; their
 * counts are evidence for future vocabulary versions. "fine" and "okay" count
 * only as self-statements: "the presentation went fine" isn't a feeling.
 */
const UNMATCHED_ROWS: [phrase: string, said: string][] = [
  ['relieved', 'relieved'], ['relief', 'relief'], ['grieving', 'grieving'], ['grief', 'grief'], ['focused', 'focused'],
  ['restless', 'restless'], ['meh', 'meh'], ['blah', 'blah'], ['betrayed', 'betrayed'], ['rejected', 'rejected'],
  ['misunderstood', 'misunderstood'], ['resentful', 'resentful'], ['impatient', 'impatient'], ['conflicted', 'conflicted'],
  ['torn', 'torn'], ['unsettled', 'unsettled'], ['confused', 'confused'], ['uncertain', 'uncertain'], ['playful', 'playful'],
  ['silly', 'silly'], ['energized', 'energized'], ['feel hurt', 'hurt'], ['felt hurt', 'hurt'], ['feeling hurt', 'hurt'],
  ["i'm fine", 'fine'], ['im fine', 'fine'], ['i am fine', 'fine'], ['feeling fine', 'fine'], ['fine i guess', 'fine'],
  ["i'm okay", 'okay'], ['i am okay', 'okay'], ['feeling okay', 'okay'], ['okay i guess', 'okay'],
];

export const UNMATCHED_FEELINGS: readonly { phrase: string; said: string }[] = UNMATCHED_ROWS.map(([phrase, said]) => ({ phrase, said })).sort(
  (x, y) => y.phrase.length - x.phrase.length,
);

/** Words right before a feeling that make it strong ("so tired") or mild ("a bit tired"). */
export const STRONG_INTENSIFIERS: readonly string[] = [
  'so', 'really', 'very', 'super', 'extremely', 'incredibly', 'totally', 'completely', 'utterly', 'absolutely',
  'deeply', 'seriously', 'insanely', 'crazy', 'hella', 'beyond', 'truly', 'terribly', 'awfully', 'massively', 'properly',
];
export const MILD_INTENSIFIERS: readonly string[] = [
  'a little bit', 'a little', 'little bit', 'a bit', 'a touch', 'kind of', 'kinda', 'sort of', 'sorta', 'slightly',
  'somewhat', 'mildly', 'vaguely', 'faintly', 'less', 'bit',
];

/** Words before a feeling that negate it ("not anxious", "no longer sad"). */
export const NEGATORS: readonly string[] = ['not', 'no', 'never', 'without', 'nor', 'hardly', 'barely'];

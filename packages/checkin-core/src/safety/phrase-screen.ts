import type { SafetyResult, SafetyScreen } from '../ports.ts';

/**
 * Phrase rules for words that suggest suicide, self-harm or danger. Tuned for
 * recall: showing resources to someone who didn't need them costs a moment;
 * missing someone who did costs far more. Hyperbole that's common in check-ins
 * ("this meeting is killing me", "I want to die of embarrassment") is left out
 * on purpose, and the safety eval set holds both kinds.
 *
 * It's a floor, not a classifier: implicit language needs a model screen as a
 * second layer (docs/checkin/safety.md). It runs in the browser too, so the
 * resources appear the moment the person presses the button, even offline.
 */
const RULES: readonly { id: string; pattern: RegExp }[] = [
  { id: 'suicide', pattern: /\bsuicid(e|al)\b/ },
  { id: 'kill-myself', pattern: /\bkill(ing)?\s+my\s*self\b|\bkms\b/ },
  { id: 'end-my-life', pattern: /\b(end|take|ending|taking)\s+my\s+(own\s+)?life\b|\bend(ing)?\s+it\s+all\b/ },
  { id: 'want-to-die', pattern: /\b(want|wanna|wanted|wish|ready)\s+(to\s+)?die\b(?!\s+(of|from|laughing))|\bwish\s+i\s+(was|were)\s+dead\b|\bbetter\s+off\s+dead\b/ },
  { id: 'better-off-without-me', pattern: /\bbetter\s+off\s+without\s+me\b/ },
  { id: 'not-wake-up', pattern: /\b(not|never|don'?t\s+want\s+to)\s+wake\s+up\b/ },
  { id: 'not-be-here', pattern: /\b(don'?t|do\s+not)\s+want\s+to\s+(be\s+here|be\s+alive|exist|live)\b|\bno\s+reason\s+to\s+live\b|\bwant\s+to\s+disappear\b/ },
  { id: 'self-harm', pattern: /\bself[-\s]?harm(ing)?\b|\b(want(ed)?\s+to|going\s+to|gonna|thinking\s+(about|of)|thoughts\s+of|urges?\s+to|feel\s+like|keep|kept|can'?t\s+stop)\s+(\w+\s+){0,2}(hurt|harm|cut|burn)(ing)?\s+my\s*self\b|\bcutting\s+(myself|again)\b|\b(cut|burned|burnt|hurt|harmed)\s+my\s*self\s+again\b/ },
  { id: 'unalive', pattern: /\bun-?aliv(e|ing)\b|\bsewer\s*slide\b/ },
  { id: 'overdose', pattern: /\boverdos(e|ing)\b|\btoo\s+many\s+pills\b/ },
  // Spanish: 988 answers in Spanish, so the screen should too.
  { id: 'es', pattern: /\bquiero\s+morir(me)?\b|\bsuicid(io|arme)\b|\bmatarme\b|\bno\s+quiero\s+(vivir|seguir\s+viviendo)\b|\bhacerme\s+daño\b/ },
  { id: 'someone-else', pattern: /\b(kill|hurt)\s+(him|her|them)sel(f|ves)\b|\b(he|she|they)\s+(wants?|said\s+(he|she|they)\s+wants?)\s+to\s+die\b/ },
  { id: 'in-danger', pattern: /\b(i'?m|i\s+am|i\s+feel)\s+(not\s+safe|unsafe)\s+at\s+home\b|\bi\s+don'?t\s+feel\s+safe\s+at\s+home\b|\b(he|she|they)(\s+is|'s|\s+are|'re)\s+(going\s+to|gonna)\s+(hurt|kill)\s+me\b/ },
];

/** Same folding as the matcher everywhere else: lowercase, straight apostrophes. */
const fold = (text: string) => text.toLowerCase().replace(/[‘’ʼ]/g, "'");

export class PhraseSafetyScreen implements SafetyScreen {
  readonly id = 'phrases/v1';

  screen(text: string): SafetyResult {
    const folded = fold(text);
    const rules = RULES.filter((rule) => rule.pattern.test(folded)).map((rule) => rule.id);
    return { show: rules.length > 0, rules };
  }
}

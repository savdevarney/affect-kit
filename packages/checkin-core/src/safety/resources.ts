/**
 * Crisis resources: static text, shown at once when the safety screen matches.
 * Never written by a model. Wording follows each service's own guidance
 * (docs/checkin/safety.md › Resources), checked 2026-10-05:
 * - 988: "call, chat or text 988"; Spanish: press 2, or text AYUDA to 988.
 * - Veterans Crisis Line: "Dial 988 then Press 1" is the VA's required wording.
 * - Crisis Text Line: "Text HOME to 741741", named in full, and no implied partnership.
 * - The Trevor Project: call 1-866-488-7386 or text START to 678-678.
 * - 911 when someone is in immediate danger (988's guidance for platforms).
 * Re-check every number and phrase before each release: services change.
 */
export const RESOURCES_CHECKED = '2026-10-05';

export interface CrisisLine {
  id: string;
  /** What to do, in the service's own words. */
  action: string;
  /** Who it is, named as the service names itself. */
  name: string;
  links: { label: string; href: string }[];
}

export const CRISIS_COPY = {
  title: 'You can talk to someone right now',
  lede: 'Free, confidential, any time of day. For you, or for someone you’re worried about.',
  emergency: 'If you or someone else is in immediate danger, call 911.',
  notMonitored: 'No one reads check-ins as they come in, so please reach out to one of these if you need someone now. Your check-in is saved as usual.',
  canada: 'In Canada, call or text 9-8-8.',
  elsewhere: { before: 'Elsewhere,', link: 'findahelpline.com', href: 'https://findahelpline.com', after: 'lists free helplines by country.' },
} as const;

export const CRISIS_LINES: readonly CrisisLine[] = [
  {
    id: '988',
    action: 'Call, chat or text 988',
    name: '988 Suicide & Crisis Lifeline',
    links: [
      { label: 'Call 988', href: 'tel:988' },
      { label: 'Text 988', href: 'sms:988' },
      { label: 'Chat', href: 'https://988lifeline.org/chat/' },
    ],
  },
  {
    id: 'crisis-text-line',
    action: 'Text HOME to 741741',
    name: 'Crisis Text Line',
    links: [{ label: 'Text HOME', href: 'sms:741741?&body=HOME' }],
  },
  {
    id: 'veterans',
    action: 'Dial 988 then Press 1, or text 838255',
    name: 'Veterans Crisis Line',
    links: [
      { label: 'Call', href: 'tel:988' },
      { label: 'Text 838255', href: 'sms:838255' },
    ],
  },
  {
    id: 'trevor',
    action: 'Call 1-866-488-7386, or text START to 678-678',
    name: 'The Trevor Project, for LGBTQ+ young people',
    links: [
      { label: 'Call', href: 'tel:18664887386' },
      { label: 'Text START', href: 'sms:678678?&body=START' },
    ],
  },
  {
    id: 'espanol',
    action: 'Llama al 988 y oprime 2, o envía AYUDA al 988',
    name: '988 en español',
    links: [
      { label: 'Llamar', href: 'tel:988' },
      { label: 'Enviar AYUDA', href: 'sms:988?&body=AYUDA' },
    ],
  },
];

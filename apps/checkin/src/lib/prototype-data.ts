import { addDays, type EmotionName, type Level } from '@affect-kit/checkin-core';

/** What the week view needs from a check-in. */
export interface DayWords {
  localDate: string;
  words: { name: EmotionName; level: Level }[];
  unmatched: string[];
}

/** A small seeded random generator (mulberry32), so the prototype draws the same weeks every time. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEKDAY: EmotionName[] = ['anxious', 'tired', 'overwhelmed', 'determined', 'content', 'frustrated', 'proud'];
const WEEKEND: EmotionName[] = ['calm', 'content', 'relaxed', 'grateful', 'tired', 'joy', 'lonely'];

/**
 * Two weeks of made-up check-ins for the week-view prototype: synthetic only,
 * so the prototype can be judged without anyone's real log.
 */
export function syntheticWeeks(today: string, days = 14): DayWords[] {
  const next = random(20261005);
  const checkins: DayWords[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const pool = weekday === 0 || weekday === 6 ? WEEKEND : WEEKDAY;
    const count = next() < 0.12 ? 0 : 1 + Math.floor(next() * 3);
    for (let c = 0; c < count; c++) {
      const words = new Map<EmotionName, Level>();
      const n = 1 + Math.floor(next() * 2);
      while (words.size < n) words.set(pool[Math.floor(next() * pool.length)]!, (1 + Math.floor(next() * 3)) as Level);
      checkins.push({
        localDate: date,
        words: [...words].map(([name, level]) => ({ name, level })),
        unmatched: next() < 0.07 ? ['relieved'] : [],
      });
    }
  }
  return checkins;
}

/**
 * Which day a check-in belongs to. A day starts at 4 a.m. local time, as in
 * Probiome's gut log, so a check-in at 1 a.m. belongs to the evening before:
 * that's how people talk about "last night".
 */
export const DAY_STARTS_AT_HOUR = 4;

/** True for an IANA time zone this runtime knows ("America/Los_Angeles"). */
export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The check-in's day as YYYY-MM-DD, from the wall clock in its zone (so DST changes don't shift it). */
export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  let day = Date.UTC(part('year'), part('month') - 1, part('day'));
  if (part('hour') < DAY_STARTS_AT_HOUR) day -= 86_400_000;
  return new Date(day).toISOString().slice(0, 10);
}

/** YYYY-MM-DD plus or minus whole days, on the calendar (no zones involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

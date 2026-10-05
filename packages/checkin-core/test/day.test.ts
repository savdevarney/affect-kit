import { describe, expect, it } from 'vitest';
import { addDays, isTimeZone, localDate } from '../src/day.ts';
import { uuidv7 } from '../src/ids.ts';

describe('localDate', () => {
  it('uses the wall clock in their zone', () => {
    // 2026-10-06 06:00 UTC is 23:00 the evening before in Los Angeles, and 08:00 in Paris.
    expect(localDate(new Date('2026-10-06T06:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-05');
    expect(localDate(new Date('2026-10-06T06:00:00Z'), 'Europe/Paris')).toBe('2026-10-06');
  });

  it('starts the day at 4 a.m., so 1 a.m. belongs to the night before', () => {
    // 08:00 UTC is 01:00 in Los Angeles (PDT).
    expect(localDate(new Date('2026-10-06T08:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-05');
    // 11:30 UTC is 04:30 in Los Angeles.
    expect(localDate(new Date('2026-10-06T11:30:00Z'), 'America/Los_Angeles')).toBe('2026-10-06');
  });

  it('holds across a DST change', () => {
    // 2026-11-01: clocks fall back in Los Angeles. 03:30 PST is 11:30 UTC.
    expect(localDate(new Date('2026-11-01T11:30:00Z'), 'America/Los_Angeles')).toBe('2026-10-31');
  });
});

describe('addDays and isTimeZone', () => {
  it('moves along the calendar', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('knows zones', () => {
    expect(isTimeZone('America/Los_Angeles')).toBe(true);
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});

describe('uuidv7', () => {
  it('is a version 7 UUID whose prefix is the time, so ids sort by creation', () => {
    const early = uuidv7(Date.UTC(2026, 9, 5, 12));
    const late = uuidv7(Date.UTC(2026, 9, 5, 13));
    expect(early).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(early < late).toBe(true);
  });
});

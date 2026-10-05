import type { IdFactory } from './ports.ts';

/**
 * A UUIDv7 (RFC 9562): 48 bits of Unix milliseconds, then random bits, so ids
 * sort by creation time. The browser makes a check-in's id with this before
 * sending it, which makes retries idempotent; the server makes row ids with it.
 */
export function uuidv7(now = Date.now(), random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(16));
  let ms = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 9562 variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const uuidv7Ids: IdFactory = { next: () => uuidv7() };

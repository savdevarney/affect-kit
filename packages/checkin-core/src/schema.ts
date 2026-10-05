/**
 * Zod schemas for everything that crosses a boundary into the core: the
 * browser's requests and model output. Model output is untrusted input too.
 */
import { z } from 'zod';
import { EMOTION_NAMES, type EmotionName } from './vocabulary.ts';
import { isTimeZone } from './day.ts';

/** A check-in is a moment, not a diary entry. */
export const MAX_TEXT = 1000;

/** The rater's own cap on selected words. */
export const MAX_WORDS = 5;

export const FaceSchema = z.object({
  v: z.number().min(-1).max(1),
  a: z.number().min(-1).max(1),
});

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const EmotionNameSchema = z.enum(EMOTION_NAMES as [EmotionName, ...EmotionName[]]);

/** What the browser sends to start a check-in. */
export const CheckinInputSchema = z.object({
  /** A UUIDv7 made on the client, so a retry is the same check-in, never a second one. */
  id: z.uuid(),
  face: FaceSchema,
  text: z.string().max(MAX_TEXT),
  timezone: z.string().refine(isTimeZone, 'Not a time zone'),
});
export type CheckinInput = z.infer<typeof CheckinInputSchema>;

/** The person's words at Done: what they kept, changed and added. */
export const ReviewInputSchema = z.object({
  words: z
    .array(z.object({ name: EmotionNameSchema, level: LevelSchema }))
    .max(MAX_WORDS)
    .refine((words) => new Set(words.map((w) => w.name)).size === words.length, 'A word appears twice'),
});
export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const LocalDateSchema = z.iso.date();

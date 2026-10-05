import { nearestWords } from '../vocabulary.ts';
import type { Extraction, Face, FeelingExtractor } from '../ports.ts';

/**
 * The anchor alone: the words nearest the face, as the rater sorts its chips.
 * It reads no text at all. As an eval baseline it answers "what do the words
 * add over the face?"; in the app it's where suggestions come from.
 */
export class FaceNearestExtractor implements FeelingExtractor {
  readonly id = 'face-nearest/v1';

  constructor(private readonly count = 2) {}

  async extract(input: { text: string; face: Face | null }): Promise<Extraction> {
    if (!input.face) return { words: [], unmatched: [] };
    return {
      words: nearestWords(input.face, this.count).map((name) => ({ name, level: 2, evidence: '', confidence: 0.3 })),
      unmatched: [],
    };
  }
}

/** The model's answer couldn't be read as feeling words. Recorded as `invalid_output`. */
export class OutputError extends Error {
  override readonly name = 'OutputError';
}

/** The extractor took too long; the lexicon answers instead. Recorded as `timeout`. */
export class ExtractionTimeout extends Error {
  override readonly name = 'ExtractionTimeout';
  constructor(readonly ms: number) {
    super(`No answer within ${ms} ms`);
  }
}

/** A request the service can't carry out, with a code the API maps to a status. */
export class CheckinError extends Error {
  override readonly name = 'CheckinError';
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'INVALID',
  ) {
    super(message);
  }
}

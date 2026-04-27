// Internal vocabulary types. Not part of the public package surface —
// consumers cannot pass custom emotions or read this list.

/** @internal */
export interface Emotion {
  /** Display name. Single English word, lowercase. */
  name: string;
  v: number;
  a: number;
  d: number;
  /**
   * Source provenance for the V/A/D values. NRC = Mohammad 2018,
   * ANEW-Warriner = Warriner et al. 2013, ANEW-BL = Bradley & Lang 1999,
   * approx = prototype value pending validation.
   */
  source: 'NRC' | 'ANEW-Warriner' | 'ANEW-BL' | 'approx';
}

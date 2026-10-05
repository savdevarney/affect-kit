/** The Worker's bindings and vars (wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  /** Remote even in local dev, and billed; unused unless EXTRACTOR_MODEL is set. */
  AI?: Ai;
  /** A Workers AI model id. Empty: the lexicon finds words, with no model at all. */
  EXTRACTOR_MODEL?: string;
  /** An AI Gateway id. Its log settings must be off as well; requests also say collectLog: false. */
  AI_GATEWAY_ID?: string;
  /** Local dev only: the user id to act as, honored only for requests to localhost. */
  DEV_USER_ID?: string;
}

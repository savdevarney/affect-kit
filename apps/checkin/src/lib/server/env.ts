/** The Worker's bindings and vars (wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  /** Remote even in local dev, and billed; unused unless EXTRACTOR_MODEL is set. */
  AI?: Ai;
  /** A Workers AI model id. Empty: the lexicon finds words, with no model at all. */
  EXTRACTOR_MODEL?: string;
  /** An AI Gateway id. Its log settings must be off as well; requests also say collectLog: false. */
  AI_GATEWAY_ID?: string;
  /** Local dev only, from .dev.vars (never deployed): the user to act as, for loopback requests only. */
  DEV_USER_ID?: string;
  /**
   * Not a binding: the caller's address, which the SvelteKit route takes from
   * getClientAddress() and passes in with each request. On Cloudflare it's the
   * real client's IP; in `vite dev` it's the socket's, so it can't be faked
   * with a Host header the way the request URL can.
   */
  CLIENT_ADDRESS?: string;
}

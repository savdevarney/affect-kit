import type { RequestHandler } from './$types';
import { api } from '$lib/server/api';
import type { Env } from '$lib/server/env';

// Every /api/* request goes to the Hono app, with the Worker's bindings as its
// env and the caller's real address, which the API's dev sign-in checks.
export const fallback: RequestHandler = ({ request, platform, getClientAddress }) =>
  api.fetch(request, { ...platform?.env, CLIENT_ADDRESS: getClientAddress() } as Env);

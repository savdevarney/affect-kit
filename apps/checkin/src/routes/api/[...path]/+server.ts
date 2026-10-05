import type { RequestHandler } from './$types';
import { api } from '$lib/server/api';

// Every /api/* request goes to the Hono app, with the Worker's bindings as its env.
export const fallback: RequestHandler = ({ request, platform }) => api.fetch(request, platform?.env);

import { LocalDateSchema, localDate } from '@affect-kit/checkin-core';
import { fetchDays } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const today = localDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const date = params.date && LocalDateSchema.safeParse(params.date).success ? params.date : today;
  return { date, today, checkins: await fetchDays(date, date, fetch) };
};

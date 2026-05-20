import { getCurrentLocation } from '$lib/server/dawarich.js';
import type { PageServerLoad } from './$types';

// SSR-load the live location so the maps can open centered on it rather
// than flashing the Bay Area default first.
export const load: PageServerLoad = async ({ setHeaders }) => {
  const initialLocation = await getCurrentLocation();
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
  });
  return { initialLocation };
};

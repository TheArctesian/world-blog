import { json, type RequestHandler } from '@sveltejs/kit';
import { getCurrentLocation } from '$lib/server/dawarich.js';

export const GET: RequestHandler = async () => {
  const payload = await getCurrentLocation();
  return json(payload, {
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
    }
  });
};

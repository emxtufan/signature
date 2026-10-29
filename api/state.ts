import { get, put } from '@vercel/blob';
import { isAuthenticated } from '../auth';

// Current session (names + signatures) lives in one private Vercel Blob JSON file.
// GET   /api/state  -> the saved state, or {} if nothing is saved yet
// PUT   /api/state  -> replace the saved state
// POST  /api/state  -> archive a finished session as arhiva/<date>-<time>.json
// ponytail: last write wins; if two tablets sign at the same time one can overwrite the other. Use ifMatch etags if that happens.

const STATE_PATH = 'state.json';
const MAX_BYTES = 4 * 1024 * 1024; // Vercel Functions accept ~4.5 MB request bodies

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });

async function readState(request: Request): Promise<string | Response> {
  const body = await request.text();
  if (body.length > MAX_BYTES) return json({ error: 'Prea mare.' }, 413);
  try {
    const state = JSON.parse(body);
    if (!Array.isArray(state?.employees)) throw new Error();
    return JSON.stringify(state);
  } catch {
    return json({ error: 'Date invalide.' }, 400);
  }
}

export default async function handler(request: Request) {
  if (!(await isAuthenticated(request))) return json({ error: 'Neautentificat.' }, 401);

  if (request.method === 'GET') {
    const result = await get(STATE_PATH, { access: 'private', useCache: false });
    if (result?.statusCode !== 200) return json({});
    return new Response(result.stream, {
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    });
  }

  if (request.method === 'PUT' || request.method === 'POST') {
    const state = await readState(request);
    if (state instanceof Response) return state;
    const path =
      request.method === 'PUT' ? STATE_PATH : `arhiva/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await put(path, state, {
      access: 'private',
      allowOverwrite: request.method === 'PUT',
      contentType: 'application/json',
    });
    return json({ ok: true });
  }

  return json({ error: 'Metodă nepermisă.' }, 405);
}

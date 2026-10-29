import { get, put } from '@vercel/blob';
import { isAuthenticated } from '../auth.js';

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

// Auth check plus a readable error instead of FUNCTION_INVOCATION_FAILED (e.g. Blob store not connected).
async function guarded(request: Request, fn: () => Promise<Response>): Promise<Response> {
  try {
    if (!(await isAuthenticated(request))) return json({ error: 'Neautentificat.' }, 401);
    return await fn();
  } catch (err) {
    console.error('[api/state]', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

async function save(request: Request, path: string, overwrite: boolean): Promise<Response> {
  const body = await request.text();
  if (body.length > MAX_BYTES) return json({ error: 'Prea mare.' }, 413);
  let state: unknown;
  try {
    state = JSON.parse(body);
  } catch {
    return json({ error: 'Date invalide.' }, 400);
  }
  if (!Array.isArray((state as { employees?: unknown })?.employees)) return json({ error: 'Date invalide.' }, 400);

  await put(path, JSON.stringify(state), { access: 'private', allowOverwrite: overwrite, contentType: 'application/json' });
  return json({ ok: true });
}

export const GET = (request: Request) =>
  guarded(request, async () => {
    const result = await get(STATE_PATH, { access: 'private', useCache: false });
    if (result?.statusCode !== 200) return json({});
    return new Response(result.stream, {
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    });
  });

export const PUT = (request: Request) => guarded(request, () => save(request, STATE_PATH, true));

export const POST = (request: Request) =>
  guarded(request, () => save(request, `arhiva/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, false));

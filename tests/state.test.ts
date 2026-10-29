import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, PUT, POST } from '../api/state';
import { COOKIE, sessionToken } from '../auth';

process.env.APP_USER = 'admin';
process.env.APP_PASSWORD = 'secret';
const url = 'https://x.test/api/state';

test('api/state refuses requests without a valid session', async () => {
  assert.equal((await GET(new Request(url))).status, 401);
  assert.equal((await PUT(new Request(url, { method: 'PUT', body: '{}' }))).status, 401);
  assert.equal((await POST(new Request(url, { method: 'POST', body: '{}' }))).status, 401);
  assert.equal((await GET(new Request(url, { headers: { cookie: `${COOKIE}=abc` } }))).status, 401);
});

test('api/state rejects invalid bodies before touching storage', async () => {
  const cookie = `${COOKIE}=${await sessionToken('admin', 'secret')}`;
  assert.equal((await PUT(new Request(url, { method: 'PUT', headers: { cookie }, body: '{"x":1}' }))).status, 400);
  assert.equal((await PUT(new Request(url, { method: 'PUT', headers: { cookie }, body: 'not json' }))).status, 400);
});

test('api/state turns storage failures into a readable 500', async () => {
  // No Blob store configured in tests, so get() throws: the route must answer, not crash.
  const cookie = `${COOKIE}=${await sessionToken('admin', 'secret')}`;
  const res = await GET(new Request(url, { headers: { cookie } }));
  assert.equal(res.status, 500);
  assert.ok((await res.json()).error);
});

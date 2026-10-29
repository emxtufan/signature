import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/state';
import { COOKIE, sessionToken } from '../auth';

process.env.APP_USER = 'admin';
process.env.APP_PASSWORD = 'secret';

test('api/state refuses requests without a valid session', async () => {
  for (const method of ['GET', 'PUT', 'POST']) {
    const res = await handler(new Request('https://x.test/api/state', { method, body: method === 'GET' ? undefined : '{}' }));
    assert.equal(res.status, 401, method);
  }
  const forged = await handler(new Request('https://x.test/api/state', { headers: { cookie: `${COOKIE}=abc` } }));
  assert.equal(forged.status, 401);
});

test('api/state rejects invalid bodies before touching storage', async () => {
  const cookie = `${COOKIE}=${await sessionToken('admin', 'secret')}`;
  const res = await handler(new Request('https://x.test/api/state', { method: 'PUT', headers: { cookie }, body: '{"x":1}' }));
  assert.equal(res.status, 400);
});

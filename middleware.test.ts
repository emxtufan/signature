import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from './middleware';

process.env.APP_USER = 'admin';
process.env.APP_PASSWORD = 'secret';

const login = (user: string, password: string) =>
  middleware(
    new Request('https://x.test/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ user, password }),
    })
  );

test('without a session the login page is shown', async () => {
  const res = await middleware(new Request('https://x.test/'));
  assert.equal(res.status, 401);
  assert.match(await res.text(), /name="password"/);
});

test('wrong credentials are rejected', async () => {
  assert.equal((await login('admin', 'nope')).status, 401);
  assert.equal((await login('other', 'secret')).status, 401);
});

test('correct credentials set a cookie that lets requests through', async () => {
  const res = await login('admin', 'secret');
  assert.equal(res.status, 303);
  const cookie = res.headers.get('set-cookie')!.split(';')[0];

  const passed = await middleware(new Request('https://x.test/', { headers: { cookie } }));
  assert.equal(passed.headers.get('x-middleware-next'), '1');

  const forged = await middleware(new Request('https://x.test/', { headers: { cookie: 'pv_auth=abc' } }));
  assert.equal(forged.status, 401);
});

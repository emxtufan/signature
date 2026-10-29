import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Vercel runs middleware.ts and api/*.ts as unbundled Node ESM: './auth' fails, './auth.js' works.
test('server files use .js extensions on relative imports', () => {
  const files = ['middleware.ts', 'auth.ts', ...fs.readdirSync('api').map((f) => `api/${f}`)];
  for (const file of files) {
    const bad = [...fs.readFileSync(file, 'utf-8').matchAll(/from '(\.{1,2}\/[^']+)'/g)]
      .map((m) => m[1])
      .filter((spec) => !spec.endsWith('.js'));
    assert.deepEqual(bad, [], file);
  }
});

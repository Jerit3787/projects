import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// npm 11 on macOS can write OS-specific packages (e.g. fsevents) without "optional": true,
// which makes `npm ci` on the Linux CI runner fail with EBADPLATFORM.
test('OS-restricted packages in package-lock.json are optional', () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const bad = Object.entries(lock.packages)
    .filter(([path, p]) => path && p.os && !p.optional)
    .map(([path]) => path);
  assert.deepEqual(bad, [], 'fix: mark these "optional": true (and "dev": true if dev-only), or regenerate with npx npm@10 install');
});

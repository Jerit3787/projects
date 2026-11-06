import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSite } from './helpers/build.js';

const read = (out, p) => readFileSync(join(out, p), 'utf8');

test('legacy demos are served at their old paths', async () => {
  const out = await buildSite();
  for (const p of ['htmlncss-basics/index.html', 'mathsquiz/login/v1/index.html',
    'mathsquiz/mainui/v1/index - light.html', 'mathsquiz/mainui/v2/index.html',
    'pagelinks/index.html', 'straightspm/index.html', 'font/dmsans-regular-webfont.woff2'])
    assert.ok(existsSync(join(out, p)), p);
  assert.equal(read(out, 'pagelinks/index.html'), readFileSync('legacy/pagelinks/index.html', 'utf8'));
  assert.equal(read(out, 'CNAME').trim(), 'projects.danplace.tech');
  assert.ok(!existsSync(join(out, 'legacy')));
});

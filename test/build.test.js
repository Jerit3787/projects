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

const cardBlock = (html, slug) => {
  const m = html.match(new RegExp(`<article[^>]*data-slug="${slug}"[\\s\\S]*?</article>`));
  assert.ok(m, `card ${slug} rendered`);
  return m[0];
};

test('home page renders cards with status lozenges', async () => {
  const html = read(await buildSite(), 'index.html');
  assert.match(html, /class="lozenge lozenge--success"/);
  assert.match(html, /class="lozenge lozenge--inprogress"/);
  assert.doesNotMatch(html, /undefined/);
  assert.doesNotMatch(cardBlock(html, 'minimal'), /<img/);
  assert.match(cardBlock(html, 'full'), /<img[^>]+src="\/assets\/projects\/full\/cover\.png"/);
});

test('home page has filter hooks and a featured row', async () => {
  const html = read(await buildSite(), 'index.html');
  assert.match(html, /id="empty-state"/);
  assert.match(html, /data-search=/);
  const featured = html.match(/<section[^>]*id="featured"[\s\S]*?<\/section>/);
  assert.ok(featured, 'featured section');
  assert.match(featured[0], /data-slug="stutastic"/);
  assert.doesNotMatch(featured[0], /data-slug="minimal"/);
});

test('each visible project appears exactly once in the category groups', async () => {
  const html = read(await buildSite(), 'index.html');
  const all = html.slice(html.indexOf('id="all"'), html.indexOf('id="empty-state"'));
  const slugs = [...all.matchAll(/data-slug="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(slugs, ['full', 'minimal', 'stutastic']);
  assert.match(html, /<strong>1<\/strong><span>in progress<\/span>/);
});

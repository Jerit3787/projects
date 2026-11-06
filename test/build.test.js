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
  assert.match(cardBlock(html, 'minimal'), /class="card__cover card__cover--placeholder"/);
  assert.doesNotMatch(cardBlock(html, 'full'), /card__cover--placeholder/);
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

test('detail page lists versions newest first', async () => {
  const html = read(await buildSite(), 'projects/stutastic/index.html');
  const order = ['v3', 'v2', 'v1'].map((v) => html.indexOf(`>${v}<`));
  assert.ok(order.every((i) => i > -1), 'all versions present');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('minimal detail page has no empty sections', async () => {
  const html = read(await buildSite(), 'projects/minimal/index.html');
  assert.doesNotMatch(html, /Highlights|Versions|<img|undefined/);
});

test('cover and gallery images share one carousel', async () => {
  const html = read(await buildSite(), 'projects/full/index.html');
  const m = html.match(/<section class="carousel"[\s\S]*?<\/section>/);
  assert.ok(m, 'carousel rendered');
  const srcs = [...m[0].matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(srcs, ['/assets/projects/full/cover.png', '/assets/projects/full/shot1.png']);
  assert.doesNotMatch(html, />Gallery</);
  assert.match(html, /src="\/scripts\/carousel\.js"/);
});

test('description markdown is rendered and raw HTML escaped', async () => {
  const html = read(await buildSite(), 'projects/full/index.html');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test('hidden projects get no page', async () => {
  assert.ok(!existsSync(join(await buildSite(), 'projects/secret/index.html')));
});

test('public feed lists visible projects with absolute urls', async () => {
  const out = await buildSite();
  const feed = JSON.parse(read(out, 'api/projects.json'));
  assert.equal(feed.projects.length, 3);
  assert.equal(feed.projects[0].url, 'https://projects.danplace.tech/projects/stutastic/');
  const full = feed.projects.find((p) => p.slug === 'full');
  assert.equal(full.cover, 'https://projects.danplace.tech/assets/projects/full/cover.png');
  assert.equal(feed.projects.find((p) => p.slug === 'minimal').cover, null);
  assert.ok(!Number.isNaN(Date.parse(feed.generated)));
  assert.ok(existsSync(join(out, '404.html')));
});

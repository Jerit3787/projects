import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enrich } from '../lib/github.js';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const HOUR = 3600_000;
const api = { stargazers_count: 2, language: 'TypeScript', pushed_at: '2026-11-06T00:00:00Z', archived: false, html_url: 'https://github.com/a/b' };
const mapped = { stars: 2, language: 'TypeScript', pushedAt: '2026-11-06T00:00:00Z', archived: false, url: 'https://github.com/a/b' };

function fakeFetch(respond) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return respond(url, init); };
  fn.calls = calls;
  return fn;
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const cachePath = () => join(mkdtempSync(join(tmpdir(), 'gh-')), 'sub', 'github.json');
const opts = (extra) => ({ now: () => NOW, log: () => {}, cachePath: cachePath(), ...extra });

test('maps API fields', async () => {
  const fetch = fakeFetch(() => ok(api));
  const [p] = await enrich([{ slug: 'b', repo: 'a/b' }], opts({ fetch }));
  assert.deepEqual(p.github, mapped);
  assert.equal(fetch.calls[0].url, 'https://api.github.com/repos/a/b');
});

test('projects without repo are untouched and never fetched', async () => {
  const fetch = fakeFetch(() => ok(api));
  const [p] = await enrich([{ slug: 'x' }], opts({ fetch }));
  assert.equal(fetch.calls.length, 0);
  assert.ok(!('github' in p));
});

test('fresh cache skips network', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'gh-')), 'github.json');
  writeFileSync(path, JSON.stringify({ 'a/b': { fetchedAt: NOW - HOUR, data: mapped } }));
  const fetch = fakeFetch(() => ok(api));
  const [p] = await enrich([{ repo: 'a/b' }], opts({ fetch, cachePath: path }));
  assert.equal(fetch.calls.length, 0);
  assert.deepEqual(p.github, mapped);
});

test('stale cache is used when fetch fails', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'gh-')), 'github.json');
  writeFileSync(path, JSON.stringify({ 'a/b': { fetchedAt: NOW - 48 * HOUR, data: mapped } }));
  const lines = [];
  const fetch = fakeFetch(() => { throw new Error('ENOTFOUND'); });
  const [p] = await enrich([{ repo: 'a/b' }], opts({ fetch, cachePath: path, log: (m) => lines.push(m) }));
  assert.deepEqual(p.github, mapped);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /unavailable/);
});

test('403 with no cache gives null and does not throw', async () => {
  const fetch = fakeFetch(() => ({ ok: false, status: 403, json: async () => ({}) }));
  const [p] = await enrich([{ repo: 'a/b' }], opts({ fetch }));
  assert.equal(p.github, null);
});

test('sends bearer token when given', async () => {
  const fetch = fakeFetch(() => ok(api));
  await enrich([{ repo: 'a/b' }], opts({ fetch, token: 't' }));
  assert.equal(fetch.calls[0].init.headers.Authorization, 'Bearer t');
});

test('writes the cache after a run', async () => {
  const path = cachePath();
  await enrich([{ repo: 'a/b' }], opts({ fetch: fakeFetch(() => ok(api)), cachePath: path }));
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8'))['a/b'], { fetchedAt: NOW, data: mapped });
});

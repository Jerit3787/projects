import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSite, loadProjects } from '../lib/load-projects.js';

// Guards the real content in content/, not the fixtures.
const projects = loadProjects('content', loadSite('content'));

test('real content uses one spelling per technology', () => {
  const byKey = new Map();
  for (const t of projects.flatMap((p) => p.tech ?? [])) {
    const key = t.toLowerCase().replace(/\d+$/, '');
    byKey.set(key, new Set([...(byKey.get(key) ?? []), t]));
  }
  const clashes = [...byKey.values()].filter((s) => s.size > 1).map((s) => [...s].join(' vs '));
  assert.deepEqual(clashes, []);
});

test('every cover and gallery image referenced by real content exists', async () => {
  const { existsSync } = await import('node:fs');
  const missing = projects.flatMap((p) => [p.cover, ...(p.gallery ?? [])].filter(Boolean)
    .map((f) => `src/assets/projects/${p.slug}/${f}`)).filter((f) => !existsSync(f));
  assert.deepEqual(missing, []);
});

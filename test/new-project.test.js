import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject } from '../scripts/new-project.js';
import { loadSite, loadProjects } from '../lib/load-projects.js';

function tempFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'new-'));
  cpSync('test/fixtures/content', dir, { recursive: true });
  return dir;
}
const repoBody = {
  description: 'A fast markdown editor', language: 'TypeScript', created_at: '2025-03-04T00:00:00Z',
  homepage: 'https://editor.danplace.tech', html_url: 'https://github.com/Jerit3787/markdown-editor', archived: false,
};
const fakeFetch = async () => ({ ok: true, status: 200, json: async () => repoBody });

test('skeleton validates', async () => {
  const dir = tempFixtures();
  const path = await createProject({ slug: 'brand-new', contentDir: dir });
  assert.ok(path.endsWith(join('projects', 'brand-new.json')));
  const p = loadProjects(dir, loadSite(dir)).find((x) => x.slug === 'brand-new');
  assert.equal(p.title, 'Brand New');
  assert.equal(p.category, 'tools');
  assert.ok(readFileSync(path, 'utf8').endsWith('}\n'));
});

test('prefills from repo', async () => {
  const dir = tempFixtures();
  const path = await createProject({ slug: 'markdown-editor', repo: 'Jerit3787/markdown-editor', contentDir: dir, fetch: fakeFetch });
  const data = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(data.tagline, 'A fast markdown editor');
  assert.deepEqual(data.tech, ['TypeScript']);
  assert.equal(data.date, '2025-03');
  assert.equal(data.repo, 'Jerit3787/markdown-editor');
  assert.equal(data.links[0].kind, 'demo');
  assert.equal(data.links[1].href, 'https://github.com/Jerit3787/markdown-editor');
  loadProjects(dir, loadSite(dir)); // must not throw
});

test('refuses to overwrite existing file', async () => {
  const dir = tempFixtures();
  await assert.rejects(createProject({ slug: 'full', contentDir: dir }), /already exists/);
});

test('refuses invalid slug', async () => {
  await assert.rejects(createProject({ slug: 'Bad Slug', contentDir: tempFixtures() }), /slug/);
});

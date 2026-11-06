import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSite, loadProjects, ProjectValidationError } from '../lib/load-projects.js';

const fx = 'test/fixtures/content';
const site = loadSite(fx);
const valid = { title: 'X', tagline: 'Y', status: 'active', category: 'tools', date: '2024-01' };

function tempContent(files) {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  mkdirSync(join(dir, 'projects'));
  for (const [name, body] of Object.entries(files))
    writeFileSync(join(dir, 'projects', name), typeof body === 'string' ? body : JSON.stringify(body));
  return dir;
}

test('loads fixtures sorted', () => {
  assert.deepEqual(loadProjects(fx, site).map((p) => p.slug), ['stutastic', 'full', 'minimal']);
});

test('slug comes from filename and category label is attached', () => {
  const p = loadProjects(fx, site).find((x) => x.slug === 'full');
  assert.equal(p.categoryLabel, 'Web apps & tools');
});

test('hidden projects are excluded', () => {
  assert.ok(!loadProjects(fx, site).some((p) => p.slug === 'secret'));
});

test('reports every problem with file and path', () => {
  const { status, ...noStatus } = valid;
  const dir = tempContent({ 'a.json': noStatus, 'b.json': { ...valid, category: 'nope' } });
  assert.throws(() => loadProjects(dir, site), (err) => {
    assert.ok(err instanceof ProjectValidationError);
    assert.equal(err.problems.length, 2);
    assert.ok(err.problems[0].file.endsWith('a.json'));
    assert.match(err.problems[1].message, /nope/);
    return true;
  });
});

test('rejects bad slugs', () => {
  const dir = tempContent({ 'My Project.json': valid });
  assert.throws(() => loadProjects(dir, site), /My Project\.json/);
});

test('rejects unknown fields', () => {
  const dir = tempContent({ 'x.json': { ...valid, titel: 'x' } });
  assert.throws(() => loadProjects(dir, site), /titel/);
});

test('invalid JSON syntax names the file', () => {
  const dir = tempContent({ 'broken.json': '{ "title": ' });
  assert.throws(() => loadProjects(dir, site), /broken\.json/);
});

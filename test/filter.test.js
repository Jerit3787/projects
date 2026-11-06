import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, toQuery, matches } from '../src/scripts/filter.js';

const allowed = { categories: ['web', 'security'], statuses: ['active', 'completed'] };

test('parseState ignores unknown values', () => {
  assert.deepEqual(parseState(new URLSearchParams('?status=foo&category=web'), allowed),
    { q: '', category: 'web', status: null, tech: null });
});

test('toQuery round-trips', () => {
  const s = { q: 'ctf', category: 'security', status: 'active', tech: null };
  assert.deepEqual(parseState(new URLSearchParams(toQuery(s)), allowed), s);
});

test('toQuery is empty when nothing is set', () => {
  assert.equal(toQuery({ q: '', category: null, status: null, tech: null }), '');
});

test('matches requires every facet', () => {
  const item = { category: 'web', status: 'active', tech: ['Go'], search: 'discord status go' };
  assert.equal(matches(item, { q: 'DISCORD', category: null, status: null, tech: 'Go' }), true);
  assert.equal(matches(item, { q: '', category: null, status: 'completed', tech: null }), false);
  assert.equal(matches(item, { q: 'nope', category: null, status: null, tech: null }), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ago, monthYear } from '../eleventy.config.js';

const NOW = Date.parse('2026-11-06T12:00:00Z');

test('monthYear formats YYYY-MM', () => {
  assert.equal(monthYear('2024-06'), 'Jun 2024');
  assert.equal(monthYear('garbage'), 'garbage');
});

test('ago picks the largest whole unit', () => {
  assert.equal(ago('2026-11-06T00:00:00Z', NOW), 'today');
  assert.equal(ago('2026-11-03T12:00:00Z', NOW), '3 days ago');
  assert.equal(ago('2026-10-01T00:00:00Z', NOW), '1 month ago');
  assert.equal(ago('2024-11-01T00:00:00Z', NOW), '2 years ago');
  assert.equal(ago('2027-01-01T00:00:00Z', NOW), 'today');
  assert.equal(ago('nope', NOW), '');
});

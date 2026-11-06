import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Eleventy } from '@11ty/eleventy';

const builds = new Map();

/** Build the site into a temp dir using the given content dir. Memoised per process. */
export function buildSite({ content = 'test/fixtures/content' } = {}) {
  if (!builds.has(content)) {
    builds.set(content, (async () => {
      process.env.SHOWCASE_CONTENT = content;
      process.env.GITHUB_SKIP = '1';
      const outDir = mkdtempSync(join(tmpdir(), 'showcase-'));
      const elev = new Eleventy('src', outDir, { configPath: 'eleventy.config.js', quietMode: true });
      await elev.write();
      return outDir;
    })());
  }
  return builds.get(content);
}

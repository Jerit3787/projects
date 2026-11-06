import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DAY = 24 * 3600_000;

function readCache(path) {
  if (!path) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

function writeCache(path, cache, log) {
  if (!path) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(cache, null, 2));
  } catch (e) {
    log(`github: could not write cache (${e.message})`);
  }
}

async function fetchRepo(repo, { fetch, token }) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'projects-showcase-build' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const r = await res.json();
  return { stars: r.stargazers_count, language: r.language ?? null, pushedAt: r.pushed_at, archived: Boolean(r.archived), url: r.html_url };
}

/**
 * Attach `github` stats to every project with a `repo`. Never throws for network/API errors:
 * falls back to a stale cache entry, else null, logging one warning per repo.
 */
export async function enrich(projects, opts = {}) {
  const { fetch = globalThis.fetch, token, cachePath, now = Date.now, ttlMs = DAY, log = console.warn } = opts;
  const cache = readCache(cachePath);
  const repos = [...new Set(projects.filter((p) => p.repo).map((p) => p.repo))];

  await Promise.all(repos.map(async (repo) => {
    const hit = cache[repo];
    if (hit && now() - hit.fetchedAt < ttlMs) return;
    try {
      cache[repo] = { fetchedAt: now(), data: await fetchRepo(repo, { fetch, token }) };
    } catch (e) {
      log(`github: ${repo} unavailable (${e.message})`);
    }
  }));

  writeCache(cachePath, cache, log);
  return projects.map((p) => (p.repo ? { ...p, github: cache[p.repo]?.data ?? null } : p));
}

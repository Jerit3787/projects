#!/usr/bin/env node
// Scaffold content/projects/<slug>.json, optionally prefilled from a GitHub repo.
// Usage: npm run new -- <slug> [--repo owner/name]
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadSite } from '../lib/load-projects.js';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const titleCase = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

async function fromRepo(repo, { fetch, token }) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'projects-showcase-build' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status} for ${repo}`);
  const r = await res.json();
  const links = [];
  if (r.homepage) links.push({ label: 'Live demo', href: r.homepage, kind: 'demo' });
  links.push({ label: 'Source', href: r.html_url, kind: 'repo' });
  return {
    tagline: r.description ? truncate(r.description, 140) : 'TODO',
    status: r.archived ? 'archived' : 'active',
    date: r.created_at.slice(0, 7),
    ...(r.language ? { tech: [r.language] } : {}),
    repo,
    links,
  };
}

export async function createProject({ slug, repo, contentDir = 'content', fetch = globalThis.fetch, token }) {
  if (!SLUG.test(slug ?? '')) throw new Error(`Invalid slug "${slug}": use lowercase words joined by dashes, e.g. my-project`);
  const path = join(contentDir, 'projects', `${slug}.json`);
  if (existsSync(path)) throw new Error(`${path} already exists`);

  const site = loadSite(contentDir);
  const project = {
    $schema: '../../schema/project.schema.json',
    title: titleCase(slug),
    tagline: 'TODO',
    status: 'active',
    category: site.categories[0].id,
    date: new Date().toISOString().slice(0, 7),
    ...(repo ? await fromRepo(repo, { fetch, token }) : {}),
  };
  mkdirSync(join(contentDir, 'projects'), { recursive: true });
  writeFileSync(path, JSON.stringify(project, null, 2) + '\n');
  return path;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { repo: { type: 'string' } } });
  try {
    const path = await createProject({ slug: positionals[0], repo: values.repo, token: process.env.GITHUB_TOKEN });
    console.log(`Created ${path}\nNext: edit it, add images to src/assets/projects/${positionals[0]}/, then run npm run dev`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

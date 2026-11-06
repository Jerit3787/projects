import { loadSite, loadProjects } from '../../lib/load-projects.js';
import { enrich } from '../../lib/github.js';

export default async function () {
  const dir = process.env.SHOWCASE_CONTENT ?? 'content';
  const projects = loadProjects(dir, loadSite(dir));
  if (process.env.GITHUB_SKIP === '1') return projects.map((p) => (p.repo ? { ...p, github: null } : p));
  return enrich(projects, { token: process.env.GITHUB_TOKEN, cachePath: '.cache/github.json' });
}

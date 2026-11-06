import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const schemaPath = new URL('../schema/project.schema.json', import.meta.url);

const ajv = new Ajv2020({ allErrors: true, useDefaults: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

export class ProjectValidationError extends Error {
  constructor(problems) {
    super('Invalid project files:\n' + problems.map((p) => `  ${p.file}${p.path ? ` ${p.path}` : ''}: ${p.message}`).join('\n'));
    this.name = 'ProjectValidationError';
    this.problems = problems;
  }
}

export function loadSite(contentDir) {
  return JSON.parse(readFileSync(join(contentDir, 'site.json'), 'utf8'));
}

function describe(err) {
  const p = err.params ?? {};
  if (p.additionalProperty) return `unknown field "${p.additionalProperty}"`;
  if (p.missingProperty) return `missing required field "${p.missingProperty}"`;
  if (p.allowedValues) return `${err.message}: ${p.allowedValues.join(', ')}`;
  return err.message;
}

function compare(a, b) {
  return (Number(b.featured) - Number(a.featured))
    || ((b.order ?? 0) - (a.order ?? 0))
    || b.date.localeCompare(a.date)
    || a.title.localeCompare(b.title);
}

/** Read, validate and sort content/projects/*.json. Hidden projects are dropped. */
export function loadProjects(contentDir, site) {
  const dir = join(contentDir, 'projects');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const categories = new Map(site.categories.map((c) => [c.id, c.label]));
  const problems = [];
  const projects = [];

  for (const name of files) {
    const file = join(dir, name);
    const slug = name.slice(0, -'.json'.length);
    const before = problems.length;
    if (!SLUG.test(slug)) {
      problems.push({ file, path: '', message: `filename "${name}" must be lowercase words joined by dashes, e.g. my-project.json` });
    }
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      problems.push({ file, path: '', message: `invalid JSON: ${e.message}` });
      continue;
    }
    if (!validate(data)) {
      for (const err of validate.errors) problems.push({ file, path: err.instancePath || '/', message: describe(err) });
    } else if (!categories.has(data.category)) {
      problems.push({ file, path: '/category', message: `unknown category "${data.category}"; use one of: ${[...categories.keys()].join(', ')}` });
    }
    if (problems.length === before && !data.hidden) {
      projects.push({ ...data, slug, categoryLabel: categories.get(data.category) });
    }
  }

  if (problems.length) throw new ProjectValidationError(problems);
  return projects.sort(compare);
}

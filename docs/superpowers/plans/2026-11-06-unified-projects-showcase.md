# Unified Projects Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Jerit3787/projects` (nightly gitfolio dump) and `Jerit3787/htmlprojects` (hand-written 2020 page + old demos) with one repo where every project is one JSON file and `npm run build` turns them into an Atlassian-Design-System-inspired showcase site.

**Architecture:** Eleventy 3 static site, the same tool as the main site (`Jerit3787.github.io`). Project JSON files in `content/projects/` are validated against a JSON Schema at build time, optionally enriched with live GitHub repo stats, and rendered to a filterable home page plus one detail page per project. The old htmlprojects demos are copied through untouched at their current URLs. GitHub Actions builds and deploys to GitHub Pages on push and nightly.

**Tech Stack:** Node ≥ 22, `@11ty/eleventy` 3.1.x, `ajv` 8.x + `ajv-formats` 3.x, `markdown-it` 15.x, plain CSS (custom properties), vanilla ES-module JS, `node:test`.

**Spec:** None written. The user skipped the design questions, so the requirements come from chat: one repo, all projects showcased easily, Atlassian-design-inspired, "I just edit JSON and it builds into a page". Decisions marked **(my call)** below were made by Claude and are open for the user to override.

## Global Constraints

- **Target repo (my call):** reuse `Jerit3787/projects`. Work on branch `showcase`, merge to `master`. `htmlprojects` gets archived after cutover.
- **Domain (my call):** site served at `https://projects.danplace.tech/`. `src/CNAME` contains exactly `projects.danplace.tech`.
- **Legacy URLs must keep working, byte-identical pages:** `/htmlncss-basics/`, `/mathsquiz/login/v1/index.html`, `/mathsquiz/mainui/v1/index.html`, `/mathsquiz/mainui/v1/index - light.html`, `/mathsquiz/mainui/v2/index.html`, `/pagelinks/index.html`, `/straightspm/index.html`.
- Project detail pages live at `/projects/<slug>/` (`<slug>` = JSON filename without `.json`). This intentionally replaces the old `/projects/htmlncss-basics/` page.
- Content lives only in `content/` (`content/site.json`, `content/projects/*.json`). Project images go in `src/assets/projects/<slug>/`.
- The build must **never** fail because of GitHub API errors, rate limits or no network. It **must** fail on invalid project JSON, and the error names the file and the field.
- **Design (my call):** Atlassian-*inspired* only: its 8px grid, lozenges, neutral palette and blue brand colour. No Atlassian logos, product names or `@atlaskit` packages. Font: system UI stack.
- Light and dark themes: follow `prefers-color-scheme` by default, with a manual toggle stored in `localStorage` (wrapped in try/catch).
- Pages work without JavaScript. The filters are progressive enhancement, and without JS every card shows.
- Tests: `npm test` runs `node --test`, the same convention as the main site repo.

## Review Focus

1. **Missing optional fields** (no `cover`, no `links`, no `repo`, empty `tech`): card and detail page render with no empty boxes, broken `<img>` or "undefined". Test in Task 5/6 fixtures (`minimal.json`).
2. **GitHub offline / 403 rate limit / 404 renamed repo:** build succeeds, the page simply omits stats, and a warning is logged once per repo. Tests in Task 3.
3. **Two projects with the same `title` or a slug with uppercase or spaces:** the loader rejects any slug that doesn't match `^[a-z0-9]+(-[a-z0-9]+)*$`, naming the file. Test in Task 2.
4. **Filter URL with an unknown category/status (`?status=foo`):** it's ignored, not "zero results". Test in Task 5.
5. **Markdown `description` containing raw HTML:** escaped (markdown-it `html: false`) so a pasted `<script>` can't run. Test in Task 6.

---

## File Structure

```
projects/                         (the Jerit3787/projects repo)
├── content/
│   ├── site.json                 site title, intro, nav, categories, socials
│   └── projects/<slug>.json      ONE FILE PER PROJECT  ← the thing you edit
├── schema/project.schema.json    JSON Schema (also gives VS Code autocomplete)
├── lib/
│   ├── load-projects.js          read + validate + sort content/projects
│   └── github.js                 optional repo stats with cache
├── scripts/new-project.js        `npm run new -- <slug> [--repo owner/name]`
├── src/
│   ├── _data/site.js             exposes content/site.json
│   ├── _data/projects.js         loadProjects() + enrich()
│   ├── _includes/layouts/base.njk
│   ├── _includes/components/{lozenge,tag,button,card}.njk   (Nunjucks macros)
│   ├── styles/{tokens,base,components}.css
│   ├── scripts/{filter,theme}.js
│   ├── assets/projects/<slug>/…  images
│   ├── index.njk                 home: hero, featured, filter bar, grid
│   ├── project.njk               paginated detail pages
│   ├── feed.njk                  /api/projects.json
│   ├── 404.njk
│   └── CNAME
├── legacy/                       htmlprojects imported with history (git subtree)
├── test/
│   ├── fixtures/content/…        tiny site.json + 4 projects (full, minimal, stutastic, secret[hidden])
│   ├── helpers/build.js          buildSite() used by build tests
│   ├── load-projects.test.js
│   ├── github.test.js
│   ├── filter.test.js
│   ├── new-project.test.js
│   └── build.test.js             runs Eleventy into a temp dir and checks output
├── eleventy.config.js
├── package.json
└── .github/workflows/deploy.yml
```

`SHOWCASE_CONTENT` env var (default `content`) points the data files at another content dir. Tests use it to build against `test/fixtures/content`.

---

### Task 1: Repo consolidation + Eleventy skeleton

**Files:**
- Delete: `scripts/main.sh`, `.github/workflows/daily_update.yml`
- Create: `legacy/` (via subtree), `package.json`, `eleventy.config.js`, `src/index.njk` (placeholder), `src/CNAME`, `.gitignore`, `test/helpers/build.js`, `test/build.test.js`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm run build` → `_site/`; `npm run dev` → `eleventy --serve`; `npm test` → `node --test`; exported helper in `test/helpers/build.js`: `async buildSite({ content = 'test/fixtures/content' } = {}): Promise<string /* outDir */>`, which runs Eleventy programmatically (`new Eleventy('src', outDir, { configPath: 'eleventy.config.js' }).write()`) with `SHOWCASE_CONTENT` and `GITHUB_SKIP=1` set.

- [ ] **Step 1: Branch and import htmlprojects with history**

```bash
cd projects && git checkout -b showcase
git rm -q scripts/main.sh .github/workflows/daily_update.yml
git commit -m "chore: remove gitfolio nightly build"
git subtree add --prefix=legacy https://github.com/Jerit3787/htmlprojects master
git rm -q legacy/CNAME legacy/renovate.json legacy/.github/workflows/codeql-analysis.yml
git commit -m "chore: drop htmlprojects deploy config"
```
Expected: `ls legacy` shows `htmlncss-basics mathsquiz pagelinks straightspm font assets index.html …`.

- [ ] **Step 2: Fix the one dead font URL in legacy**

In `legacy/htmlncss-basics/index.css`, replace `https://danishsite.theworkpc.com/htmlprojects/font/` with `../font/` (four occurrences). Commit `fix(legacy): load DM Sans from local font dir`.

- [ ] **Step 3: Write the failing build test** in `test/build.test.js`

```js
test('legacy demos are served at their old paths', async () => {
  const out = await buildSite();
  for (const p of ['htmlncss-basics/index.html', 'mathsquiz/login/v1/index.html',
    'mathsquiz/mainui/v1/index - light.html', 'mathsquiz/mainui/v2/index.html',
    'pagelinks/index.html', 'straightspm/index.html', 'font/dmsans-regular-webfont.woff2'])
    assert.ok(existsSync(join(out, p)), p);
  assert.equal(readFileSync(join(out, 'pagelinks/index.html'), 'utf8'),
               readFileSync('legacy/pagelinks/index.html', 'utf8'));
  assert.equal(readFileSync(join(out, 'CNAME'), 'utf8').trim(), 'projects.danplace.tech');
  assert.ok(!existsSync(join(out, 'legacy')));
});
```

- [ ] **Step 4: Run it, expect FAIL** (`npm test` fails with "Cannot find module" or a missing file)

- [ ] **Step 5: Add `package.json` (`"type": "module"`, `engines.node >=22`, deps above, scripts `build`, `dev`, `test`, `new`), `.gitignore` (`node_modules _site .cache`), and `eleventy.config.js`**

Config: `dir: { input: 'src', output: '_site', includes: '_includes' }`. Passthrough copy: `src/styles`, `src/scripts`, `src/assets`, `src/CNAME`, plus one mapping per legacy dir: `legacy/htmlncss-basics → htmlncss-basics`, `legacy/mathsquiz → mathsquiz`, `legacy/pagelinks → pagelinks`, `legacy/straightspm → straightspm`, `legacy/font → font`. Ignore `legacy/**` as a template input so Eleventy doesn't try to render the old HTML. Register filter `md` (markdown-it, `{ html: false, linkify: true }`). Mark the filter's output safe in templates.

- [ ] **Step 6: Run `npm test`, expect PASS**, then `npm run build` and open `_site/pagelinks/index.html` to check it still looks right.

- [ ] **Step 7: Commit** `feat: eleventy skeleton serving legacy demos`

---

### Task 2: Project schema + loader

**Files:**
- Create: `schema/project.schema.json`, `lib/load-projects.js`, `src/_data/site.js`, `test/fixtures/content/site.json`, `test/fixtures/content/projects/{full,minimal,stutastic,secret}.json`, `test/load-projects.test.js`

**Fixtures:** `site.json` has `url: "https://projects.danplace.tech"` and categories `tools` "Web apps & tools" and `early` "Early projects (2020–21)". `full` (tools, completed, 2026-03, every optional field except `versions`; `cover: "cover.png"` (tests only check the rendered `<img src>`, so no image file is needed); `description` includes `**bold**` and `<script>alert(1)</script>`). `minimal` (early, active, 2020-05, required fields only). `stutastic` (tools, completed, 2021-02, `featured: true`, `versions` v1 2021-02 / v2 2022-01 / v3 2024-06). `secret` (tools, active, 2026-01, `hidden: true`).

**Interfaces:**
- Produces:
  - `loadSite(contentDir: string): Site`
  - `loadProjects(contentDir: string, site: Site): Project[]`. Returns the visible projects, already sorted. Throws `ProjectValidationError` (`.problems: { file: string, path: string, message: string }[]`) that lists **all** problems across all files, not just the first.
  - `Project` = the JSON fields below, plus `slug: string` and `categoryLabel: string`.

**Schema (`$schema` draft 2020-12, `additionalProperties: false`):**

| field | type | required | notes |
|---|---|---|---|
| `$schema` | string | – | lets editors autocomplete |
| `title` | string, 1–60 | ✓ | |
| `tagline` | string, 1–140 | ✓ | one-liner on the card |
| `description` | string | – | Markdown, detail page body |
| `status` | enum `active, completed, paused, archived, cancelled` | ✓ | |
| `category` | string | ✓ | must equal an `id` in `site.json` `categories` (checked in the loader, not the schema) |
| `date` | string `^\d{4}-(0[1-9]\|1[0-2])$` | ✓ | start/release month |
| `tech` | string[] unique | – | |
| `tags` | string[] unique | – | |
| `highlights` | string[] maxItems 6 | – | bullets |
| `featured` | boolean | – | default false |
| `hidden` | boolean | – | default false; hidden projects are left out of every page and the feed |
| `order` | integer | – | manual tie-breaker, higher first |
| `repo` | string `^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$` | – | turns on GitHub stats |
| `links` | `{ label, href (format uri-reference), kind: demo\|repo\|docs\|writeup\|video\|other }[]` | – | |
| `cover` | string | – | filename in `src/assets/projects/<slug>/` |
| `gallery` | string[] | – | same folder |
| `versions` | `{ name, date (same pattern), note?, href? }[]` | – | timeline (e.g. Stutastic v1→v3) |

`site.json`: `{ title, intro, url, author: { name, avatar, links: {label, href}[] }, nav: {label, href}[], categories: {id, label, description}[] }`.

**Sort order:** `featured` first → `order` desc (missing = 0) → `date` desc → `title` asc.

- [ ] **Step 1: Write failing tests** in `test/load-projects.test.js`:
  - `loads fixtures sorted`: `loadProjects(fx, site).map(p => p.slug)` deep-equals `['stutastic', 'full', 'minimal']` (stutastic is `featured`; full has the later date).
  - `slug comes from filename and category label is attached`: `p.slug === 'full'`, `p.categoryLabel === 'Web apps & tools'`.
  - `hidden projects are excluded`: no returned slug is `secret`.
  - `reports every problem with file and path`: temp dir with `a.json` missing `status` and `b.json` with `category: "nope"`. Expect a throw `ProjectValidationError` with `problems.length === 2`, where `problems[0].file` ends with `a.json` and `problems[1].message` includes `nope`.
  - `rejects bad slugs`: file `My Project.json` → throws, and the message includes `My Project.json`.
  - `rejects unknown fields`: `{ …valid, "titel": "x" }` → throws, and the message includes `titel`.
  - `invalid JSON syntax names the file`: `{ "title": ` → throws, and the message includes the filename.
- [ ] **Step 2: Run `node --test test/load-projects.test.js`, expect FAIL**
- [ ] **Step 3: Implement `lib/load-projects.js`** with Ajv 2020 (`ajv/dist/2020.js`) + `ajv-formats`, `allErrors: true`. Read files with `readdirSync(...).filter(f => f.endsWith('.json')).sort()`. Write the schema file. `src/_data/site.js` returns `loadSite(process.env.SHOWCASE_CONTENT ?? 'content')`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat: project JSON schema and validating loader`

---

### Task 3: GitHub stats enrichment

**Files:**
- Create: `lib/github.js`, `src/_data/projects.js`, `test/github.test.js`

**Interfaces:**
- Consumes: `loadProjects`, `loadSite` (Task 2)
- Produces: `async enrich(projects: Project[], opts: { fetch?: typeof fetch, token?: string, cachePath?: string, now?: () => number, ttlMs?: number, log?: (msg) => void }): Promise<Project[]>`. Every project that has a `repo` gets `project.github = { stars: number, language: string|null, pushedAt: string /* ISO */, archived: boolean, url: string } | null`.
  - `src/_data/projects.js` default export is an async fn that returns `enrich(loadProjects(dir, site), { token: process.env.GITHUB_TOKEN, cachePath: '.cache/github.json' })`. With `GITHUB_SKIP=1` it skips `enrich` and every `github` is `null`.

Behaviour: `GET https://api.github.com/repos/{repo}` with `Accept: application/vnd.github+json`, `User-Agent: projects-showcase-build`, and `Authorization: Bearer <token>` if a token is given. Requests run in parallel. Cache entries are `{ fetchedAt, data }` keyed by repo, with a default TTL of 24h. When the cache is fresh, don't fetch. If a fetch fails (network error, non-2xx), use the stale cache entry when there is one, otherwise `null`. Either way, log exactly one warning: `github: <repo> unavailable (<reason>)`. Write the cache after every run (create its dir).

- [ ] **Step 1: Write failing tests** with a fake `fetch`:
  - `maps API fields`: fake returns `{ stargazers_count: 2, language: 'TypeScript', pushed_at: '2026-11-06T00:00:00Z', archived: false, html_url: 'https://github.com/a/b' }`. Expect `github` deep-equals `{ stars: 2, language: 'TypeScript', pushedAt: '2026-11-06T00:00:00Z', archived: false, url: 'https://github.com/a/b' }`.
  - `projects without repo are untouched and never fetched` (fetch call count 0, no `github` key).
  - `fresh cache skips network`: pre-seeded cache with `fetchedAt = now - 1h`. Expect fetch count 0.
  - `stale cache is used when fetch fails`: cache 48h old, fetch rejects. Expect the cached data and one log line that matches `/unavailable/`.
  - `403 with no cache gives null and does not throw`.
  - `sends bearer token when given`: the captured request header equals `Bearer t`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat: optional GitHub stats with offline-safe cache`

---

### Task 4: Design tokens, base layout, component macros

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`, `src/scripts/theme.js`, `src/_includes/layouts/base.njk`, `src/_includes/components/{lozenge,tag,button,card}.njk`
- Test: extend `test/build.test.js`

**Interfaces:**
- Produces Nunjucks macros (import with `{% from "components/card.njk" import card %}`):
  - `lozenge(status)` → `<span class="lozenge lozenge--{appearance}">{Label}</span>`, mapping `active→inprogress "In progress"`, `completed→success "Completed"`, `paused→moved "Paused"`, `archived→default "Archived"`, `cancelled→removed "Cancelled"`
  - `tag(text)` → `<span class="tag">`
  - `button(label, href, appearance='default'|'primary'|'subtle', external=false)` → `<a class="btn btn--{appearance}">`. `external` adds `target="_blank" rel="noopener"`
  - `card(project)` → `<article class="card" data-slug data-category data-status data-tech="a|b" data-search="lowercased title tagline tech tags">`. Contains: cover (only if present), title linking to `/projects/{slug}/`, lozenge, tagline, up to 4 tech tags + "+N", date as `Mon YYYY`
- Layout `base.njk`: sticky top nav (site title, `site.nav`, theme toggle button `aria-label="Toggle theme"`), `<main class="page">` max-width 1200px, footer with `site.author.links`. Inline a tiny `<head>` script that sets `data-theme` from localStorage before paint (avoids a flash).

**Tokens (my call; ADS-like values):**

| token | light | dark |
|---|---|---|
| `--color-text` | `#172B4D` | `#B6C2CF` |
| `--color-text-subtle` | `#44546F` | `#9FADBC` |
| `--color-bg` | `#FFFFFF` | `#1D2125` |
| `--color-bg-sunken` | `#F7F8F9` | `#161A1D` |
| `--color-surface-raised` | `#FFFFFF` | `#22272B` |
| `--color-border` | `#091E4224` | `#A6C5E229` |
| `--color-brand` / `--color-link` | `#0C66E4` | `#579DFF` |
| lozenge bg/text: success | `#DCFFF1`/`#216E4E` | `#164B35`/`#7EE2B8` |
| inprogress | `#E9F2FF`/`#0055CC` | `#09326C`/`#85B8FF` |
| moved | `#FFF7D6`/`#A54800` | `#533F04`/`#F8E6A0` |
| removed | `#FFECEB`/`#AE2E24` | `#5D1F1A`/`#FD9891` |
| default | `#F1F2F4`/`#44546F` | `#2C333A`/`#9FADBC` |

Spacing `--space-050…--space-800` = 4, 8, 12, 16, 24, 32, 40, 64 px. Radius 3px (lozenge, tag, button) and 8px (card). `--shadow-raised: 0 1px 1px #091E4240, 0 0 1px #091E424F`, with a stronger `--shadow-overlay` on card hover. Font: `ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif`. Body 14px/20px, headings 24/28 and 20/24, lozenges 11px bold uppercase. Dark values go under `@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) {…} }` and again under `:root[data-theme=dark]`.

- [ ] **Step 1: Failing test:** after a fixture build, `_site/index.html` contains `class="lozenge lozenge--success"` and `class="lozenge lozenge--inprogress"`, contains no `undefined`, and the `<article … data-slug="minimal"> … </article>` block has no `<img`, while the `full` block has one.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement the CSS, macros and layout. Make the placeholder `index.njk` loop `card()` over `projects`**
- [ ] **Step 4: Run, expect PASS.** Then `npm run dev` and check the light and dark themes and a 375px-wide viewport by eye (no horizontal scroll).
- [ ] **Step 5: Commit** `feat: ADS-inspired tokens, layout and components`

---

### Task 5: Home page with filters

**Files:**
- Modify: `src/index.njk`
- Create: `src/scripts/filter.js`, `test/filter.test.js`

**Interfaces:**
- Consumes: `card`, `lozenge`, `button` macros (Task 4); `site`, `projects` data
- Produces (ES module, also loaded in the browser as `<script type="module">`):
  - `parseState(params: URLSearchParams, allowed: { categories: string[], statuses: string[] }): { q: string, category: string|null, status: string|null, tech: string|null }`. Drops values that aren't in `allowed`.
  - `toQuery(state): string`. Leaves out empty keys and returns `''` when everything is empty.
  - `matches(item: { category, status, tech: string[], search: string }, state): boolean`. `q` is matched case-insensitively against `search`, and every non-null facet must match.
  - `init(root: Document)`. Wires up the inputs, toggles `hidden` on the cards, updates `history.replaceState`, and shows a `#empty-state` when nothing matches.

Page layout: hero (`site.title`, `site.intro`, author avatar + links); a "Featured" row (projects with `featured`, max 3, larger cards); a filter bar with a search input, category `<select>` (from `site.categories`), status `<select>`, and tech `<select>` (union of all `tech`, sorted); a result count `"N projects"` with `aria-live="polite"`; then a grid of all projects grouped under category headings (`<h2>` + category description). While a filter is active, the grouping is replaced by one flat grid.

- [ ] **Step 1: Failing tests** in `test/filter.test.js`:
  - `parseState ignores unknown values`: `?status=foo&category=web` with allowed `{categories:['web'], statuses:['active']}` → `{ q:'', category:'web', status:null, tech:null }`
  - `toQuery round-trips`: `parseState(new URLSearchParams(toQuery(s)), allowed)` deep-equals `s` for `{ q:'ctf', category:'security', status:'active', tech:null }`
  - `matches requires every facet`: an item with `{category:'web', status:'active', tech:['Go'], search:'discord status go'}` matches `{q:'DISCORD', tech:'Go'}`, and doesn't match `{status:'completed'}`
  - Build test: the fixture home page contains `id="empty-state"` and `data-search=`, and the featured section contains `stutastic`
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS.** Then in `npm run dev`, filter by status and reload to check the state survives through the URL.
- [ ] **Step 5: Commit** `feat: home page with URL-synced filters`

---

### Task 6: Project detail pages

**Files:**
- Create: `src/project.njk`
- Test: extend `test/build.test.js`

**Interfaces:**
- Consumes: `projects`, macros, the `md` filter
- Produces: `/projects/<slug>/index.html` for every visible project (Eleventy `pagination: { data: projects, size: 1, alias: project }`, `permalink: /projects/{{ project.slug }}/`)

Page sections, each rendered only when it has data: breadcrumb (`Projects / <title>`); header with title, lozenge, tagline, and link buttons (the first `demo` link gets `primary`, the rest `default`, all external); cover image; "Highlights" list; description (`project.description | md`); "Versions" vertical timeline (newest first, each with a name, `Mon YYYY` date, note and optional link); gallery grid. A sidebar card holds Category, Started (`date`), Tech tags, Tags, and when `github` isn't null: ★ stars, language, "Updated <relative date>" and an "Archived on GitHub" lozenge when `archived`. Set `<title>` to `<title> · <site.title>` and `<meta name="description">` to the tagline.

- [ ] **Step 1: Failing build tests:**
  - `_site/projects/stutastic/index.html` contains the three version names in order v3, v2, v1
  - `_site/projects/minimal/index.html` contains no `Highlights`, no `Versions` and no `<img`
  - `full.json`'s description holds `<script>alert(1)</script>` and `**bold**`. The page contains `&lt;script&gt;` and `<strong>bold</strong>`, and no raw `<script>alert`
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat: per-project detail pages`

---

### Task 7: JSON feed + 404

**Files:**
- Create: `src/feed.njk`, `src/404.njk`
- Test: extend `test/build.test.js`

**Interfaces:**
- Produces: `/api/projects.json` = `{ generated: ISO string, projects: [{ slug, title, tagline, status, category, date, tech, featured, url /* absolute: site.url + /projects/slug/ */, cover /* absolute or null */, links }] }`, so the main site can read from this one source later. Use `permalink: /api/projects.json` and `eleventyExcludeFromCollections: true`, and output it with Nunjucks `dump`. `404.njk` uses the base layout and links home.

- [ ] **Step 1: Failing test:** `JSON.parse` of the feed has `projects.length === 3` (hidden excluded), and `projects[0].url === 'https://projects.danplace.tech/projects/stutastic/'`. `_site/404.html` exists.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat: public projects feed and 404 page`

---

### Task 8: `npm run new` scaffolder

**Files:**
- Create: `scripts/new-project.js`, `test/new-project.test.js`

**Interfaces:**
- Consumes: `schema/project.schema.json`, `loadSite`
- Produces: `async createProject({ slug, repo?, contentDir, fetch?, token? }): Promise<string /* written path */>` plus a CLI: `npm run new -- <slug> [--repo owner/name]`.

Behaviour: refuse when the slug is invalid or the file already exists (exit 1 with a message). Without `--repo`, write a skeleton with `"$schema": "../../schema/project.schema.json"`, `title` = the slug in Title Case, `tagline: "TODO"`, `status: "active"`, `category` = the first category id, and `date` = the current `YYYY-MM`. With `--repo`, prefill from `GET /repos/{repo}`: `tagline` ← `description` (truncated to 140) or `"TODO"`, `tech` ← `[language]` when not null, `date` ← `created_at` month, `repo`, `links` ← `[{label:'Live demo', href: homepage, kind:'demo'}]` when homepage is set, plus `{label:'Source', href: html_url, kind:'repo'}`. `status: "archived"` when `archived`, otherwise `"active"`. Write 2-space JSON plus a trailing newline. The output must pass `loadProjects`.

- [ ] **Step 1: Failing tests:** `skeleton validates` (write into a temp copy of the fixtures, then `loadProjects` doesn't throw); `prefills from repo` (fake fetch → `tagline`, `tech`, `links[0].kind === 'demo'`); `refuses to overwrite existing file`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat: npm run new scaffolder with GitHub prefill`

---

### Task 9: Real content migration

**Files:**
- Create: `content/site.json`, `content/projects/*.json` (list below), `src/assets/projects/<slug>/*`

**Sources for copy:** the `Jerit3787.github.io` repo's `src/_data/projects.json` (bullets → `highlights`, chips → `tech`) and images `assets/img/project1–9.png`, which you can fetch with `gh api repos/Jerit3787/Jerit3787.github.io/contents/assets/img/projectN.png --jq .content | base64 -d`; the `legacy/README.md` table (status/dates); and each repo's GitHub description. Use `npm run new -- <slug> --repo Jerit3787/<repo>` to start each file, then edit by hand. **Don't invent features.** When a repo has no description, write a factual one-line tagline from its README, or set `"hidden": true` and list it in the PR description for the user to fill in.

**Categories (my call):** `tools` "Web apps & tools", `security` "Security & CTF", `university` "University projects", `early` "Early projects (2020–21)".

| slug | repo | category | status | notes |
|---|---|---|---|---|
| markdown-editor | markdown-editor | tools | active | featured; demo editor.danplace.tech |
| student-planner | planner | tools | active | featured; demo planner.danplace.tech; mention planner-docs / planner-notify-worker as links if public |
| stutastic | stutastic | tools | completed | featured; `versions` v1 (MDL), v2, v3 from the main site; images project1/5/6 |
| devhub | devhub | tools | active | |
| opencode-discord-status | opencode-discord-status | tools | active | |
| opencode-go-usage | opencode-go-usage | tools | active | |
| status-page | status | tools | active | status.danplace.tech |
| scripts | scripts | tools | active | scripts.danplace.tech |
| api-server | api-server | tools | active | |
| ai-discord-bot | ai-discord-bot | tools | active | |
| links | links | tools | completed | links.danplace.tech |
| bpn | bpn | tools | archived | Java; from main site |
| ctf-writeups | ctf | security | active | ctf.danplace.tech |
| ctf-challenges | ctf-challenges | security | active | |
| htb-meetup-pwn | htb-meetup-pwn | security | completed | workshop materials |
| blackbox-ai | BlackBoxAI-Project | university | completed | INFO 3307; image project7 |
| propertypro | propertypro | university | completed | CSCI 1305; image project8 |
| kasutto | kasutto | university | completed | INFO 2302; image project9 |
| iium-venue-booking | IIUMVenueBookingSystem | university | completed | INFO 2304 |
| budget-tracker | BudgetTrackerGUIApp | university | completed | CSCI 1301 |
| driver-state-detection | Driver-State-Detection | university | completed | |
| fruit-detection | apple-and-tomato-detection | university | completed | |
| htmlncss-basics | htmlprojects | early | completed | 2020-05; demo `/htmlncss-basics/`; cover from `legacy/projects/htmlncss-basics/assets/image/screenshot1.jpg` |
| mathsquiz | htmlprojects | early | cancelled | 2021-08; demos: login v1, main UI v1 dark, v1 light, v2 |
| pagelinks | htmlprojects | early | completed | 2021-01; demo `/pagelinks/`; repo link to the `links` project page |
| result-generator | htmlprojects | early | completed | 2021-02; demo `/straightspm/` |

Leave out: `stutastic-site`, `cdn-stutastic`, `planner-dev`, `planner-release`, `planner-docs`, `planner-notify-worker` (folded into their parent projects), `Jerit3787*`, `slides`, `editors-repo`, `ctf-dump`, `cyberseagame2026-toolkit`, `materialize-fix`, `demo`, `vscode-remote-try-cpp`, `jakelmurah`, `pendidikanislam`, `blockchain`, `stream-downloader`, `IDPS-WebServer`, `personal`, `bug-reports`. The user can add any of them later with `npm run new`.

- [ ] **Step 1: Write `content/site.json`.** Title "Danish Hakim — Projects"; intro from the main site's projects intro; `url: https://projects.danplace.tech`; nav: Home `/`, Portfolio `https://www.danplace.tech`, CTF `https://ctf.danplace.tech`, GitHub `https://github.com/Jerit3787`; avatar from `https://github.com/Jerit3787.png`.
- [ ] **Step 2: Create the project files and images per the table**
- [ ] **Step 3: Run `npm run build` with no `GITHUB_SKIP`.** Expect no validation errors, about 26 pages under `_site/projects/`, and every one of them reachable from the home page
- [ ] **Step 4: In `npm run dev`, click every Live demo link for the `early` projects and check they open the legacy pages**
- [ ] **Step 5: Commit** `content: migrate projects from danplace.tech, htmlprojects and GitHub`

---

### Task 10: Deploy pipeline + README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`, `renovate.json` (keep as is unless it references removed files)

**Workflow:** `on: push (branches: [master]), pull_request, schedule (cron '0 0 * * *'), workflow_dispatch`. `permissions: contents: read, pages: write, id-token: write`. `concurrency: { group: pages, cancel-in-progress: false }`.
Job `build`: `actions/checkout@v7.0.1`, then `actions/setup-node@v7.1.0` (`node-version: 22`, `cache: npm`), then `npm ci`, `npm test`, and `npm run build` with `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. After that, `actions/configure-pages@v6.0.0` and `actions/upload-pages-artifact@v5.0.0` (`path: _site`).
Job `deploy` (needs build, `if: github.event_name != 'pull_request'`): `actions/deploy-pages@v5.0.1` with `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`.

**README:** a short "How to add a project" section: `npm run new -- my-thing --repo Jerit3787/my-thing`, edit the JSON (VS Code autocompletes via `$schema`), drop images in `src/assets/projects/my-thing/`, `npm run dev`, push. Then a field table copied from the schema, and a note that GitHub stats refresh nightly.

- [ ] **Step 1: Write the workflow and README.** If `actionlint` is installed, run `actionlint .github/workflows/deploy.yml` and expect no output. Otherwise the PR run in Step 2 is the check
- [ ] **Step 2: Push the `showcase` branch, open a PR, and confirm the `build` job is green and `deploy` was skipped**
- [ ] **Step 3: Commit** `ci: build and deploy to GitHub Pages`

---

### Cutover checklist (manual: the user does this or approves each step)

1. Merge the PR into `master`.
2. In `Jerit3787/projects`, go to Settings → Pages → Source: **GitHub Actions**.
3. In `Jerit3787/htmlprojects`, delete `CNAME` (or clear its custom domain in Pages settings). Then in `projects`, set the custom domain to `projects.danplace.tech`. DNS stays the same (it already points at GitHub Pages).
4. Re-run the deploy workflow, then check: `https://projects.danplace.tech/`, every legacy URL in Global Constraints, `/projects/stutastic/`, `/api/projects.json`, HTTPS enforced. Also check that `https://www.danplace.tech/projects/` now redirects to the custom domain. GitHub normally redirects project-site paths once a custom domain is set. If it doesn't, add a `projects/index.html` meta-refresh in the main site repo.
5. Archive `htmlprojects` (its README points to the new site) and delete the `gh-pages` branch of `projects`.

## Follow-ups (out of scope)

- Make the main site's "My Projects" section read `https://projects.danplace.tech/api/projects.json` instead of its own `projects.json`, so content lives in one place.

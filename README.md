# Projects showcase

![Build and deploy](https://github.com/Jerit3787/projects/actions/workflows/deploy.yml/badge.svg) ![GitHub](https://img.shields.io/github/license/Jerit3787/projects)

All of my projects in one place → **https://projects.danplace.tech**

Every project is a single JSON file. On push, GitHub Actions checks every file, builds the site with [Eleventy](https://www.11ty.dev/) and deploys it to GitHub Pages. It also rebuilds nightly to refresh GitHub stars and "last updated" dates.

## Add a project

```bash
npm install
npm run new -- my-thing --repo Jerit3787/my-thing   # prefilled from GitHub
# or: npm run new -- my-thing                        # empty skeleton
```

1. Edit `content/projects/my-thing.json`. VS Code autocompletes and checks the fields through `$schema`.
2. Optional: put screenshots in `src/assets/projects/my-thing/` and reference them with `cover` / `gallery`.
3. Run `npm run dev` and open http://localhost:8082.
4. Commit and push. The site deploys itself.

A mistake in a JSON file fails the build with a message naming the file and the field. If GitHub's API is down or rate-limiting, the build still succeeds and the GitHub stats are just left out.

## Project fields

| Field | Required | Notes |
|---|---|---|
| `title` | ✓ | max 60 chars |
| `tagline` | ✓ | one-liner on the card, max 140 chars |
| `status` | ✓ | `active` · `completed` · `paused` · `archived` · `cancelled` |
| `category` | ✓ | an `id` from `content/site.json` → `categories` |
| `date` | ✓ | start/release month, `YYYY-MM` |
| `description` | | Markdown for the detail page (raw HTML is escaped) |
| `tech`, `tags` | | lists of strings; `tech` powers the filter |
| `highlights` | | up to 6 bullet points |
| `links` | | `{ "label", "href", "kind": "demo" \| "repo" \| "docs" \| "writeup" \| "video" \| "other" }`; the first `demo` link becomes the primary button |
| `repo` | | `owner/name`, adds stars, language and last-updated (public repos only) |
| `cover`, `gallery` | | filenames inside `src/assets/projects/<slug>/` |
| `versions` | | `{ "name", "date", "note"?, "href"? }` timeline, newest shown first |
| `featured` | | shown in the Featured row (first 3) |
| `order` | | higher sorts first, after `featured` |
| `hidden` | | keep the file but leave it off the site and the feed |

The filename is the URL: `content/projects/my-thing.json` → `/projects/my-thing/`.

## Other bits

- `content/site.json`: site title, intro, nav, author links and categories.
- `/api/projects.json`: a JSON feed of every visible project, for other sites (e.g. danplace.tech) to read.
- `legacy/`: the old [htmlprojects](https://github.com/Jerit3787/htmlprojects) repo, imported with its history. Its demos are still served at their original URLs (`/pagelinks/`, `/mathsquiz/…`, `/straightspm/`, `/htmlncss-basics/`).
- `npm test` runs the test suite (Node's built-in runner). `npm run dev:fixtures` previews the site with the test fixtures.

import markdownIt from 'markdown-it';

const md = markdownIt({ html: false, linkify: true });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-06' -> 'Jun 2024' */
export function monthYear(value) {
  const [y, m] = String(value ?? '').split('-');
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : String(value ?? '');
}

// Legacy htmlprojects demos are copied verbatim to their original URLs.
const LEGACY_DIRS = ['htmlncss-basics', 'mathsquiz', 'pagelinks', 'straightspm', 'font'];

/** Coarse relative time from now ('3 days ago'); computed at build time, refreshed nightly. */
export function ago(iso, now = Date.now()) {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return '';
  if (days < 1) return 'today';
  const units = [[365, 'year'], [30, 'month'], [7, 'week'], [1, 'day']];
  const [size, unit] = units.find(([n]) => days >= n);
  const n = Math.floor(days / size);
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

export default function (eleventyConfig) {
  for (const dir of ['src/styles', 'src/scripts', 'src/assets', 'src/CNAME']) {
    eleventyConfig.addPassthroughCopy(dir);
  }
  for (const dir of LEGACY_DIRS) {
    eleventyConfig.addPassthroughCopy({ [`legacy/${dir}`]: dir });
  }

  eleventyConfig.addFilter('md', (text) => md.render(text ?? ''));
  eleventyConfig.addFilter('monthYear', monthYear);
  // Nunjucks' selectattr only tests truthiness; `where` compares against a value.
  eleventyConfig.addFilter('where', (arr, key, value) => (arr ?? []).filter((x) => x?.[key] === value));
  eleventyConfig.addFilter('allTech', (projects) => [...new Set((projects ?? []).flatMap((p) => p.tech ?? []))].sort((a, b) => a.localeCompare(b)));
  eleventyConfig.addFilter('firstIndex', (arr, key, value) => (arr ?? []).findIndex((x) => x?.[key] === value));
  eleventyConfig.addFilter('ago', (iso) => ago(iso));
  eleventyConfig.addFilter('head', (arr, n) => (arr ?? []).slice(0, n));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
  };
}

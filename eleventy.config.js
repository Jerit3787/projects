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

export default function (eleventyConfig) {
  for (const dir of ['src/styles', 'src/scripts', 'src/assets', 'src/CNAME']) {
    eleventyConfig.addPassthroughCopy(dir);
  }
  for (const dir of LEGACY_DIRS) {
    eleventyConfig.addPassthroughCopy({ [`legacy/${dir}`]: dir });
  }

  eleventyConfig.addFilter('md', (text) => md.render(text ?? ''));
  eleventyConfig.addFilter('monthYear', monthYear);
  eleventyConfig.addFilter('head', (arr, n) => (arr ?? []).slice(0, n));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
  };
}

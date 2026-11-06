import markdownIt from 'markdown-it';

const md = markdownIt({ html: false, linkify: true });

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

  return {
    dir: { input: 'src', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
  };
}

// Machine-readable list of projects, e.g. for the main portfolio site to consume.
export const data = { permalink: '/api/projects.json', eleventyExcludeFromCollections: true };

export function render({ site, projects }) {
  const abs = (path) => site.url.replace(/\/$/, '') + path;
  return JSON.stringify({
    generated: new Date().toISOString(),
    projects: projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      status: p.status,
      category: p.category,
      date: p.date,
      tech: p.tech ?? [],
      featured: Boolean(p.featured),
      url: abs(`/projects/${p.slug}/`),
      cover: p.cover ? abs(`/assets/projects/${p.slug}/${p.cover}`) : null,
      links: (p.links ?? []).map((l) => ({ ...l, href: l.href.startsWith('/') ? abs(l.href) : l.href })),
    })),
  }, null, 2);
}

// Client-side filtering for the home page. Pure helpers are exported for tests.

const EMPTY = { q: '', category: null, status: null, tech: null };

export function parseState(params, allowed) {
  const pick = (key, list) => {
    const v = params.get(key);
    return v && (!list || list.includes(v)) ? v : null;
  };
  return {
    q: (params.get('q') ?? '').trim(),
    category: pick('category', allowed.categories),
    status: pick('status', allowed.statuses),
    tech: pick('tech', allowed.techs),
  };
}

export function toQuery(state) {
  const params = new URLSearchParams();
  for (const key of ['q', 'category', 'status', 'tech']) if (state[key]) params.set(key, state[key]);
  return params.toString();
}

export function matches(item, state) {
  if (state.category && item.category !== state.category) return false;
  if (state.status && item.status !== state.status) return false;
  if (state.tech && !item.tech.includes(state.tech)) return false;
  if (state.q && !item.search.includes(state.q.toLowerCase())) return false;
  return true;
}

const isEmpty = (state) => !toQuery(state);

export function init(root) {
  const form = root.getElementById('filters');
  const all = root.getElementById('all');
  if (!form || !all) return;

  const options = (name) => [...form.elements[name].options].map((o) => o.value).filter(Boolean);
  const allowed = { categories: options('category'), statuses: options('status'), techs: options('tech') };
  const cards = [...all.querySelectorAll('[data-slug]')].map((el) => ({
    el,
    item: { category: el.dataset.category, status: el.dataset.status, tech: el.dataset.tech ? el.dataset.tech.split('|') : [], search: el.dataset.search },
  }));
  const featured = root.getElementById('featured');
  const count = root.getElementById('result-count');
  const empty = root.getElementById('empty-state');

  function apply(state) {
    let shown = 0;
    for (const { el, item } of cards) {
      const ok = matches(item, state);
      el.hidden = !ok;
      if (ok) shown++;
    }
    const filtering = !isEmpty(state);
    all.classList.toggle('is-filtering', filtering);
    if (featured) featured.hidden = filtering;
    count.textContent = `${shown} ${shown === 1 ? 'project' : 'projects'}`;
    empty.hidden = shown > 0;
  }

  function read() {
    return {
      q: form.elements.q.value.trim(),
      category: form.elements.category.value || null,
      status: form.elements.status.value || null,
      tech: form.elements.tech.value || null,
    };
  }

  function write(state) {
    form.elements.q.value = state.q;
    form.elements.category.value = state.category ?? '';
    form.elements.status.value = state.status ?? '';
    form.elements.tech.value = state.tech ?? '';
  }

  function update() {
    const state = read();
    apply(state);
    const query = toQuery(state);
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); update(); });
  form.addEventListener('reset', () => setTimeout(update));
  root.getElementById('clear-filters')?.addEventListener('click', () => { write(EMPTY); update(); });

  const initial = parseState(new URLSearchParams(location.search), allowed);
  write(initial);
  apply(initial);
  form.hidden = false;
}

if (typeof document !== 'undefined') init(document);

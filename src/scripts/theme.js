// Manual light/dark override on top of prefers-color-scheme. Storage may be unavailable.
const KEY = 'theme';
const root = document.documentElement;

function current() {
  return root.dataset.theme
    ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = current() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
});

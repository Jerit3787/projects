// Screenshot carousel: the track is a native scroll-snap strip (swipe and
// scroll work without JS); this adds prev/next buttons, dots and arrow keys.
for (const root of document.querySelectorAll('.carousel')) {
  const track = root.querySelector('.carousel__track');
  const slides = [...track.children];
  const controls = root.querySelector('.carousel__controls');
  if (!controls || slides.length < 2) continue;
  const dots = [...controls.querySelectorAll('.carousel__dot')];
  const prev = controls.querySelector('.carousel__prev');
  const next = controls.querySelector('.carousel__next');

  const index = () => Math.round(track.scrollLeft / track.clientWidth);
  const go = (i) => {
    const n = (i + slides.length) % slides.length;
    track.scrollTo({ left: n * track.clientWidth });
  };
  const sync = () => {
    const i = index();
    dots.forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
  };

  prev.addEventListener('click', () => go(index() - 1));
  next.addEventListener('click', () => go(index() + 1));
  dots.forEach((d, j) => d.addEventListener('click', () => go(j)));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
  });
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });

  controls.hidden = false;
  sync();
}

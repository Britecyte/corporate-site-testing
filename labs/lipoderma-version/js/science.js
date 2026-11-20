/**
 * Sub-page shell: header state, mobile nav, reveals, and compare sliders.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (REDUCED || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => io.observe(el));
}

function bindCompare(el) {
  const range = el.querySelector('[data-compare-range]');
  let dragging = false;

  const set = (pct) => {
    const v = Math.min(100, Math.max(0, pct));
    el.style.setProperty('--pos', `${v}%`);
    if (range) range.value = String(Math.round(v));
  };
  const pctFrom = (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return (x / r.width) * 100;
  };

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture?.(e.pointerId);
    set(pctFrom(e));
  });
  el.addEventListener('pointermove', (e) => { if (dragging) set(pctFrom(e)); });
  const end = () => { dragging = false; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
  range?.addEventListener('input', () => set(Number(range.value)));
  set(50);
}

function boot() {
  initReveal();
  document.querySelectorAll('[data-compare]').forEach(bindCompare);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

/**
 * Sub-page shell: header state, mobile nav, reveals, and compare sliders.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const lightSections = Array.from(document.querySelectorAll('[data-theme="light"]'));
  let ticking = false;

  const update = () => {
    ticking = false;
    header.classList.toggle('is-stuck', window.scrollY > 24);
    const probe = header.offsetHeight - 2;
    let overLight = false;
    for (const s of lightSections) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) { overLight = true; break; }
    }
    header.classList.toggle('is-over-light', overLight);
  };

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function initNav() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-mobile-nav]');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false);
  });
}

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
  initHeader();
  initNav();
  initReveal();
  document.querySelectorAll('[data-compare]').forEach(bindCompare);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

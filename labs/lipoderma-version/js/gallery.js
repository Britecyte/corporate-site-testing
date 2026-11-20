/**
 * Gallery — filterable before/after case grid with a drag comparison and lightbox.
 */

const DATA_URL = new URL('../data/gallery.json', import.meta.url).href;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fmt = (s) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function resolvePath(p) {
  if (!p) return '';
  if (/^(https?:|data:|\/|\.\.\/)/.test(p)) return p;
  return `../${p.replace(/^\.\//, '')}?v=20261121`;
}

function pairPaths(ex) {
  return {
    before: ex.before ? resolvePath(ex.before) : `../img/gallery/${ex.slug}-before.webp`,
    after: ex.after ? resolvePath(ex.after) : `../img/gallery/${ex.slug}-after.webp`,
  };
}

/* Attach drag behavior to a .compare element. */
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

async function boot() {
  const grid = document.querySelector('[data-cases]');
  const rail = document.querySelector('[data-filters]');
  const lb = document.querySelector('[data-lightbox]');
  if (!grid) return;

  let categories = [];
  try {
    const res = await fetch(DATA_URL);
    categories = (await res.json()).categories || [];
  } catch {
    grid.innerHTML = '<p class="case-empty">Case documentation is temporarily unavailable.</p>';
    return;
  }

  let active = 'all';

  const tabs = [{ id: 'all', label: 'All cases' }, ...categories.map(c => ({ id: c.id, label: c.label }))];
  rail.innerHTML = tabs.map(t => `
    <button type="button" class="filter-btn${t.id === active ? ' is-active' : ''}"
            role="tab" aria-selected="${t.id === active}" data-filter="${fmt(t.id)}">${fmt(t.label)}</button>
  `).join('');

  const render = () => {
    const shown = categories.filter(c => active === 'all' || c.id === active);
    const cards = [];

    shown.forEach((cat) => {
      cat.examples.forEach((ex) => {
        const photo = ex.image
          ? `<img class="case-photo" src="${fmt(resolvePath(ex.image))}" alt="${fmt(ex.title || 'Before and after')}" loading="lazy" />`
          : (() => {
              const { before, after } = pairPaths(ex);
              return `<div class="compare" data-case-compare
                   data-before="${fmt(before)}" data-after="${fmt(after)}"
                   data-title="${fmt(ex.title || '')}" data-credit="${fmt(ex.courtesy || '')}">
                <img class="compare-before" src="${fmt(before)}" alt="${fmt(ex.title || 'Before')}" loading="lazy" />
                <img class="compare-after" src="${fmt(after)}" alt="${fmt(ex.title || 'After')}" loading="lazy" />
                <span class="compare-handle" aria-hidden="true"></span>
                <span class="compare-tag compare-tag--before">Before</span>
                <span class="compare-tag compare-tag--after">After</span>
                <input type="range" min="0" max="100" value="50" class="visually-hidden"
                       aria-label="Reveal before or after" data-compare-range />
              </div>`;
            })();
        const credit = ex.courtesy ? `<span class="case-credit">Courtesy of ${fmt(ex.courtesy)}</span>` : '';
        cards.push(`
          <article class="case" data-slug="${fmt(ex.slug)}">
            <div class="case-media">
              ${photo}
            </div>
            <div class="case-body">
              <span class="case-region">${fmt(cat.label)}</span>
              <h2 class="case-title">${fmt(ex.title || 'Restored contour')}</h2>
              ${credit}
            </div>
          </article>
        `);
      });
    });

    grid.innerHTML = cards.join('') || '<p class="case-empty">No cases in this region yet.</p>';
    grid.querySelectorAll('[data-case-compare]').forEach(bindCompare);
  };

  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    active = btn.dataset.filter;
    rail.querySelectorAll('[data-filter]').forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    render();
    const url = new URL(window.location.href);
    if (active === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', active);
    history.replaceState(null, '', url);
  });

  // Initial filter from URL
  const initial = new URLSearchParams(window.location.search).get('filter');
  if (initial && categories.some(c => c.id === initial)) active = initial;
  rail.querySelectorAll('[data-filter]').forEach(b => {
    const on = b.dataset.filter === active;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });

  render();

  /* ── lightbox ─────────────────────────────────────────── */
  const lbTitle = lb.querySelector('[data-lb-title]');
  const lbCredit = lb.querySelector('[data-lb-credit]');
  const lbCompare = lb.querySelector('[data-lightbox-compare]');
  const lbBefore = lb.querySelector('[data-lb-before]');
  const lbAfter = lb.querySelector('[data-lb-after]');
  let lbBound = false;
  let lastFocus = null;

  const open = (card) => {
    const compare = card.querySelector('[data-case-compare]');
    if (!compare) return;
    lastFocus = document.activeElement;
    if (lbBefore) lbBefore.src = compare.dataset.before || '';
    if (lbAfter) lbAfter.src = compare.dataset.after || '';
    lbTitle.textContent = compare.dataset.title || '';
    lbCredit.textContent = compare.dataset.credit ? `Courtesy of ${compare.dataset.credit}` : '';
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!lbBound) { bindCompare(lbCompare); lbBound = true; }
    lbCompare.style.setProperty('--pos', '50%');
    lb.querySelector('[data-lightbox-close]')?.focus();
  };

  const close = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.case');
    if (!card) return;
    open(card);
  });

  lb.querySelector('[data-lightbox-close]')?.addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('is-open')) close();
  });

  if (REDUCED) document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

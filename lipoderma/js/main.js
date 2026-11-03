/**
 * Lipoderma — public site behavior.
 * No framework. Each module is guarded so a missing node is a no-op.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── header state + theme inversion ─────────────────────── */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const lightSections = Array.from(document.querySelectorAll('[data-theme="light"]'));
  let ticking = false;

  const update = () => {
    ticking = false;
    const headerH = header.offsetHeight;

    header.classList.toggle('is-stuck', window.scrollY > 24);

    // Which section sits beneath the header band?
    const probe = headerH - 2;
    let overLight = false;
    for (const section of lightSections) {
      const r = section.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) { overLight = true; break; }
    }
    header.classList.toggle('is-over-light', overLight);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

/* ── mobile nav ─────────────────────────────────────────── */
function initMobileNav() {
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

/* ── reveal on scroll ───────────────────────────────────── */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (REDUCED || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  items.forEach(el => io.observe(el));
}

/* ── anatomy cross-section ──────────────────────────────────
   Builds the adipose band geometry, fills it with adipocytes,
   and drives four narrative steps from scroll progress.       */
function initCrossSection() {
  const section = document.querySelector('[data-cross-section]');
  const svg = document.getElementById('cross-section');
  if (!section || !svg) return;

  const skinPath = document.getElementById('cs-skin-path');
  const bandPath = document.getElementById('cs-band-path');
  const musclePath = document.getElementById('cs-muscle-path');
  const clipPath = document.getElementById('cs-clip-path');
  const cellsGroup = document.getElementById('cs-cells');
  const measure = document.getElementById('cs-measure');
  const measureLabel = document.getElementById('cs-measure-label');
  const steps = Array.from(section.querySelectorAll('.structure-step'));
  const meter = document.getElementById('cs-meter');
  const stepLabel = document.getElementById('cs-step-label');

  // Profile: x → surface y. Flat brow, dip at the temple, rise at the cheek.
  const W = 560;
  const surfY = (x) => {
    const t = x / W;
    return 300
      - Math.sin(t * Math.PI) * 26            // arch over the brow
      + Math.sin((t - 0.16) * Math.PI * 2.1) * 16
      + Math.exp(-Math.pow((t - 0.62) / 0.17, 2)) * 30  // cheek projection
      - Math.exp(-Math.pow((t - 0.30) / 0.10, 2)) * 8;  // slight hollow
  };

  const SAMPLES = 90;
  const surfacePts = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = (i / SAMPLES) * W;
    surfacePts.push([x, surfY(x)]);
  }

  // Smooth path helper (Catmull-Rom → cubic Bezier).
  const smooth = (pts, close = false) => {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    if (close) d += ' Z';
    return d;
  };

  const NS = 'http://www.w3.org/2000/svg';
  const BAND_BASE = 118;   // thickness of a healthy adipose layer
  const bandDepth = (x) => {
    const t = x / W;
    return BAND_BASE * (0.62 + 0.5 * Math.exp(-Math.pow((t - 0.58) / 0.34, 2)));
  };
  // The muscle plane never moves. Everything above it is what changes.
  const floorY = (x) => surfY(x) + 9 + bandDepth(x);
  const ease = (v) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  const vesselsGroup = document.getElementById('cs-vessels');
  const cannula = document.getElementById('cs-cannula');
  const stageLabel = document.getElementById('cs-stage-label');

  musclePath.setAttribute('d', smooth(surfacePts.map(([x]) => [x, floorY(x) + 46])));

  // Story, by scroll progress p (0–1):
  //  .0–.2  healthy layer
  //  .2–.4  layer thins, surface sinks and roughens
  //  .4–.6  donor tissue (intact cells + structure) appears
  //  .6–.8  placed: layer refills, surface smooths
  //  .8–1   host cells and vessels move in and replace it
  const state = (p) => ({
    thin: ease(seg(p, 0.12, 0.34)) * (1 - ease(seg(p, 0.6, 0.78))),
    lost: ease(seg(p, 0.12, 0.34)),
    graft: ease(seg(p, 0.42, 0.58)),
    host: seg(p, 0.82, 0.98),
    cannula: seg(p, 0.5, 0.64) * (1 - seg(p, 0.76, 0.84)),
  });

  // Cells: each has a normalised depth v, and two random thresholds.
  const cells = [];
  (function fillCells() {
    const rnd = (() => {
      let s = 20261102;
      return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    })();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 13; col++) {
        const x = 12 + col * 43 + (row % 2 ? 21 : 0) + (rnd() - 0.5) * 9;
        const v = (row + 0.5 + (rnd() - 0.5) * 0.3) / 9;
        const r = 9 + rnd() * 5.5;
        const el = document.createElementNS(NS, 'circle');
        el.setAttribute('stroke-width', '1');
        cellsGroup.appendChild(el);
        cells.push({ el, x: Math.min(W, x), v, r, a: rnd(), b: rnd() });
      }
    }
  })();
  const LOST_FRAC = 0.4;   // share of cells that thin out and return as donor tissue

  // Host vessels: three meandering paths through a healthy layer.
  [[0.2, 0.35], [0.45, 0.6], [0.75, 0.45]].forEach(([fx, fv]) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const x = W * (fx + (i - 3) * 0.045);
      const wob = Math.sin(i * 1.7 + fx * 9) * 0.1;
      const v = Math.min(0.85, Math.max(0.12, fv + wob + i * 0.025));
      pts.push([x, surfY(x) + 9 + bandDepth(x) * v]);
    }
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', smooth(pts));
    path.setAttribute('pathLength', '1');
    path.setAttribute('stroke-dasharray', '1');
    path.setAttribute('stroke-dashoffset', '1');
    vesselsGroup.appendChild(path);
  });
  const vessels = Array.from(vesselsGroup.children);

  const STAGES = ['Healthy layer', 'Layer thins', 'Donor tissue', 'Volume restored', 'Host takes over'];

  const draw = (p) => {
    const s = state(p);
    const thick = 1 - 0.62 * s.thin;   // band thickness vs healthy

    // Geometry: bottom fixed to muscle plane; top moves with thickness.
    const bottom = surfacePts.map(([x]) => floorY(x));
    const topAt = (x) => floorY(x) - bandDepth(x) * thick;
    const rough = s.thin * 0.9 + (1 - thick) * 0.0;
    const top = surfacePts.map(([x]) => {
      const ripple = Math.sin(x * 0.21) * 2.6 + Math.sin(x * 0.53 + 1.2) * 1.8;
      return [x, topAt(x) - 9 + ripple * rough];
    });
    const bandTop = top.map(([x, y]) => [x, y + 9]);
    const bandBottom = surfacePts.map(([x], i) => [x, bottom[i]]).reverse();
    const closed = smooth([...bandTop, ...bandBottom], true);

    skinPath.setAttribute('d', smooth(top));
    bandPath.setAttribute('d', closed);
    clipPath.setAttribute('d', closed);
    bandPath.style.opacity = String(0.55 + 0.45 * thick);

    // Cells
    const midTop = (x) => topAt(x);
    cells.forEach((c) => {
      const y0 = midTop(c.x);
      const y1 = floorY(c.x);
      const cy = y0 + (y1 - y0) * c.v;
      const isLost = c.a < LOST_FRAC;
      let alpha = 1, kind = 'native';
      if (isLost) {
        // Thinning removes these cells; donor tissue returns them.
        alpha = (1 - s.lost) + s.lost * s.graft;
        if (s.graft > 0.02) kind = 'graft';
        if (s.host > c.b) kind = 'host';
        if (s.lost < 0.98 && s.graft < 0.02) kind = 'native';
      }
      c.el.setAttribute('cx', c.x.toFixed(1));
      c.el.setAttribute('cy', cy.toFixed(1));
      c.el.setAttribute('r', (c.r * (0.7 + 0.3 * thick)).toFixed(1));
      c.el.style.opacity = String(alpha);
      if (kind === 'graft') {
        c.el.setAttribute('stroke', '#fd893c'); c.el.setAttribute('stroke-opacity', '0.9');
        c.el.setAttribute('fill', '#fd893c'); c.el.setAttribute('fill-opacity', String(0.12 + 0.3 * s.graft));
      } else if (kind === 'host') {
        c.el.setAttribute('stroke', '#f7f2eb'); c.el.setAttribute('stroke-opacity', '0.8');
        c.el.setAttribute('fill', '#f7f2eb'); c.el.setAttribute('fill-opacity', '0.16');
      } else {
        c.el.setAttribute('stroke', '#ffd2ab'); c.el.setAttribute('stroke-opacity', '0.5');
        c.el.setAttribute('fill', '#ffcf9f'); c.el.setAttribute('fill-opacity', '0.10');
      }
    });

    // Vessels
    vessels.forEach((v, i) => {
      const k = seg(s.host, i * 0.18, 0.55 + i * 0.18);
      v.setAttribute('stroke-dashoffset', String(1 - k));
    });
    vesselsGroup.style.opacity = String(s.host > 0 ? 1 : 0);

    // Cannula slides in along the middle of the layer, then withdraws.
    if (s.cannula > 0.01) {
      const tipX = 20 + s.cannula * 330;
      const mid = (topAt(tipX) + floorY(tipX)) / 2;
      cannula.setAttribute('d', `M-30 ${(mid - 30).toFixed(1)} L ${tipX.toFixed(1)} ${mid.toFixed(1)}`);
      cannula.style.opacity = '1';
    } else {
      cannula.style.opacity = '0';
    }

    // Measure on the right edge
    const mx = 520;
    const yt = topAt(mx) + 0, yb = floorY(mx);
    measure.setAttribute('d', `M${mx} ${yt.toFixed(1)}V${yb.toFixed(1)}M${mx - 5} ${yt.toFixed(1)}h10M${mx - 5} ${yb.toFixed(1)}h10`);
    measureLabel.setAttribute('x', String(mx + 4));
    measureLabel.setAttribute('y', String((yt - 22).toFixed(1)));
    measureLabel.setAttribute('text-anchor', 'end');
  };

  // Scroll driver.
  const setStep = (index) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
    if (stepLabel) stepLabel.textContent = `0${index + 1} / 05`;
    if (stageLabel) stageLabel.textContent = STAGES[index];
  };

  let activeStep = -1;
  let raf = 0;

  const measureProgress = () => {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    return total > 0 ? scrolled / total : 0;
  };

  const frame = () => {
    raf = 0;
    const p = measureProgress();
    if (meter) meter.style.width = `${(p * 100).toFixed(1)}%`;
    draw(p);

    const next = Math.min(4, Math.floor(p * 5 + 0.001));
    if (next !== activeStep) { activeStep = next; setStep(next); }
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // Reduced motion: show the finished diagram and step one.
  if (REDUCED) {
    draw(1);
    setStep(4);
    if (meter) meter.style.width = '100%';
    return;
  }

  frame();
}

/* ── audience doors ─────────────────────────────────────── */
function initDoors() {
  const doors = Array.from(document.querySelectorAll('[data-door]'));
  if (!doors.length) return;

  const panels = doors.map(d => document.getElementById(d.getAttribute('aria-controls')));

  const select = (index, focus = false) => {
    doors.forEach((d, i) => {
      const on = i === index;
      d.setAttribute('aria-selected', String(on));
      d.tabIndex = on ? 0 : -1;
      panels[i]?.classList.toggle('is-active', on);
      if (on && focus) d.focus();
    });
  };

  doors.forEach((door, i) => {
    door.addEventListener('click', () => select(i));
    door.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % doors.length, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + doors.length) % doors.length, true); }
    });
  });

  select(0);
}

/* ── before / after compare ─────────────────────────────── */
function initCompare() {
  const el = document.querySelector('[data-compare]');
  if (!el) return;

  const range = el.querySelector('[data-compare-range]');
  let dragging = false;

  const set = (pct) => {
    const v = Math.min(100, Math.max(0, pct));
    el.style.setProperty('--pos', `${v}%`);
    if (range) range.value = String(Math.round(v));
  };

  const pctFromEvent = (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return (x / r.width) * 100;
  };

  const start = (e) => { dragging = true; set(pctFromEvent(e)); el.focus?.(); };
  const move = (e) => { if (dragging) { set(pctFromEvent(e)); if (e.cancelable) e.preventDefault(); } };
  const end = () => { dragging = false; };

  el.addEventListener('pointerdown', (e) => { el.setPointerCapture?.(e.pointerId); start(e); });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);

  range?.addEventListener('input', () => set(Number(range.value)));

  // Hover-follow on pointer devices feels alive without being gimmicky.
  if (!REDUCED && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    el.addEventListener('pointermove', (e) => { if (!dragging && e.pointerType === 'mouse' && e.buttons === 1) set(pctFromEvent(e)); });
  }

  set(50);
}

/* ── FAQ accordion ──────────────────────────────────────── */
function initFaq() {
  const root = document.querySelector('[data-faq]');
  if (!root) return;

  root.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

/* ── year ───────────────────────────────────────────────── */
function initYear() {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });
}

/* ── boot ───────────────────────────────────────────────── */
function boot() {
  initHeader();
  initMobileNav();
  initReveal();
  initCrossSection();
  initDoors();
  initCompare();
  initFaq();
  initYear();

  import('./providers.js?v=20261102a')
    .then(m => m.initProviders())
    .catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

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

  const cannula = document.getElementById('cs-cannula');
  const stageLabel = document.getElementById('cs-stage-label');

  musclePath.setAttribute('d', smooth(surfacePts.map(([x]) => [x, floorY(x) + 46])));

  // Cells: each has a normalised depth v and two random thresholds.
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

  // Story, by scroll progress p (0–1):
  //  .00–.18  healthy layer, skin above it
  //  .12–.34  layer thins, skin sinks and roughens
  //  .38–.62  cannula sweeps through; donor cells appear at its tip
  //  .62–.80  layer is filled behind it, skin smooths
  //  .80–1.0  host takes over: donor cells gradually turn into native-looking tissue
  const STEP_AT = [0, 0.18, 0.38, 0.62, 0.8];
  const STAGES = ['Healthy layer', 'Layer thins', 'Donor tissue', 'Volume restored', 'Host takes over'];
  // Time labels (data-timeline). Delete the #cs-time element in the HTML to remove them.
  const TIMES = ['Baseline', 'Over the years', 'Day 0 · injection', 'Day 0 · placed', 'Weeks to months'];
  const timeLabel = document.getElementById('cs-time');
  const dermisPath = document.getElementById('cs-dermis-path');
  const basementPath = document.getElementById('cs-basement');

  const lost = (p) => ease(seg(p, 0.12, 0.34));
  const tipPos = (p) => -40 + (W + 90) * seg(p, 0.42, 0.66);   // how far the cannula has reached
  const host = (p) => seg(p, 0.8, 0.98);
  const smoothstep = (v) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };

  const lerpHex = (a, b, t) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const GRAFT = '#ffb81c';    // yellow-orange, like the product
  const PALE = '#ffd2ab';     // the pale orange of the native cells
  const PALE_FILL = '#ffcf9f';

  // Newborn cells: where a donor cell breaks down, a new native one forms nearby.
  cells.slice().forEach((c) => {
    c.grafted = c.a < LOST_FRAC;
    // Uneven timing: partly random, partly a slow wave across the layer.
    c.hb = 0.55 * c.b + 0.45 * (0.5 + 0.5 * Math.sin(c.x * 0.021 + c.v * 3.1));
    if (c.grafted && c.b < 0.28) {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('stroke-width', '1');
      cellsGroup.appendChild(el);
      c.twin = { el, dx: (c.b - 0.14) * 70, dv: 0.12 };
      c.breaks = true;
    }
  });

  const draw = (p) => {
    const L = lost(p);
    const tip = tipPos(p);
    const H = host(p);
    const finalSmooth = smoothstep(seg(p, 0.62, 0.8));

    // Local restoration: the layer refills behind the cannula tip.
    const restored = (x) => smoothstep((tip - x) / 140);
    const thickAt = (x) => 1 - 0.62 * L * (1 - restored(x));
    const topAt = (x) => floorY(x) - bandDepth(x) * thickAt(x);

    const bandTopPts = [], skinPts = [], bottomPts = [], basePts = [];
    surfacePts.forEach(([x], i) => {
      const th = thickAt(x);
      const thinness = L * (1 - restored(x)) * (1 - 0.7 * finalSmooth);
      const ripple = (Math.sin(x * 0.21) * 2.6 + Math.sin(x * 0.53 + 1.2) * 1.8) * thinness;
      const bt = topAt(x) + ripple * 0.35;
      const skinThick = 26 * (1 - 0.14 * L * (1 - restored(x)));
      bandTopPts.push([x, bt]);
      basePts.push([x, bt - 4]);
      skinPts.push([x, bt - skinThick + ripple * 0.65]);
      bottomPts.push([x, floorY(x)]);
    });
    const closed = smooth([...bandTopPts, ...bottomPts.slice().reverse()], true);
    skinPath.setAttribute('d', smooth(skinPts));
    dermisPath.setAttribute('d', smooth([...skinPts, ...bandTopPts.slice().reverse()], true));
    basementPath.setAttribute('d', smooth(skinPts.map(([x, y], i) => [x, y + (bandTopPts[i][1] - y) * 0.22])));
    bandPath.setAttribute('d', closed);
    clipPath.setAttribute('d', closed);
    const meanThick = thickAt(W * 0.6);
    bandPath.style.opacity = String(0.55 + 0.45 * meanThick);

    // Cannula path (also gives us the tip location for cell deposit).
    const tipClamp = Math.min(W - 6, Math.max(-30, tip));
    const retract = seg(p, 0.66, 0.74);
    const tipDraw = retract > 0 ? tipClamp * (1 - retract) - 30 * retract : tipClamp;
    const tipMid = (x) => (topAt(Math.max(0, x)) + floorY(Math.max(0, x))) / 2;
    const cannulaOn = seg(p, 0.38, 0.42) * (1 - seg(p, 0.72, 0.76));
    if (cannulaOn > 0.01) {
      const ty = tipMid(tipDraw);
      cannula.setAttribute('d', `M-40 ${(ty - 34).toFixed(1)} L ${tipDraw.toFixed(1)} ${ty.toFixed(1)}`);
      cannula.style.opacity = String(cannulaOn);
    } else {
      cannula.style.opacity = '0';
    }
    const tipY = tipMid(tipClamp);

    // Cells
    cells.forEach((c) => {
      const y0 = topAt(c.x);
      const y1 = floorY(c.x);
      const k = 0.7 + 0.3 * thickAt(c.x);
      let cx = c.x, cy = y0 + (y1 - y0) * c.v, r = c.r * k, alpha = 1;
      let stroke = PALE, fill = PALE_FILL, sOp = 0.5, fOp = 0.10;

      if (c.grafted) {
        // Native cells here fade as the layer thins; donor cells arrive from the cannula tip.
        const native = 1 - L;
        const e = smoothstep((tip - c.x) / 60);     // 0 until the tip passes, then emerges
        const hh = smoothstep((H - c.hb * 0.55) / 0.45);   // gradual, uneven handover
        if (e <= 0.001 && native < 0.02) { alpha = 0; }
        else if (e <= 0.001) { alpha = native; }
        else {
          // Emerge from the tip and settle into place.
          cx = tipClamp + (c.x - tipClamp) * e;
          cy = tipY + (cy - tipY) * e;
          r *= 0.35 + 0.65 * e;
          alpha = Math.max(native, e);
          const t = hh;
          stroke = lerpHex(GRAFT, PALE, t); fill = lerpHex(GRAFT, PALE_FILL, t);
          sOp = 0.95 - 0.45 * t; fOp = 0.42 - 0.32 * t;
          if (c.breaks) { r *= 1 - 0.85 * t; alpha *= 1 - t * 0.9; }   // some donor cells break down
        }
        // Native cells that were thinned out: shown pale until they fade.
        if (e <= 0.001) { stroke = PALE; fill = PALE_FILL; sOp = 0.5; fOp = 0.10; }
      }

      c.el.setAttribute('cx', cx.toFixed(1)); c.el.setAttribute('cy', cy.toFixed(1)); c.el.setAttribute('r', Math.max(0, r).toFixed(1));
      c.el.setAttribute('stroke', stroke); c.el.setAttribute('stroke-opacity', String(sOp));
      c.el.setAttribute('fill', fill); c.el.setAttribute('fill-opacity', String(fOp));
      c.el.style.opacity = String(alpha);

      if (c.twin) {
        const t = smoothstep((H - c.hb * 0.55) / 0.45);
        const tx = Math.min(W, Math.max(0, c.x + c.twin.dx));
        const ty = topAt(tx) + (floorY(tx) - topAt(tx)) * Math.min(0.92, c.v + c.twin.dv);
        c.twin.el.setAttribute('cx', tx.toFixed(1)); c.twin.el.setAttribute('cy', ty.toFixed(1));
        c.twin.el.setAttribute('r', (c.r * k * t).toFixed(1));
        c.twin.el.setAttribute('stroke', PALE); c.twin.el.setAttribute('stroke-opacity', '0.5');
        c.twin.el.setAttribute('fill', PALE_FILL); c.twin.el.setAttribute('fill-opacity', '0.10');
        c.twin.el.style.opacity = String(t);
      }
    });

    // Measure on the right edge
    const mx = 520;
    const yt = topAt(mx), yb = floorY(mx);
    measure.setAttribute('d', `M${mx} ${yt.toFixed(1)}V${yb.toFixed(1)}M${mx - 5} ${yt.toFixed(1)}h10M${mx - 5} ${yb.toFixed(1)}h10`);
    measureLabel.setAttribute('x', String(mx + 4));
    measureLabel.setAttribute('y', String((yt - 48).toFixed(1)));
    measureLabel.setAttribute('text-anchor', 'end');
  };

  const stepFor = (p) => STEP_AT.reduce((acc, t, i) => (p >= t - 0.0005 ? i : acc), 0);

  // Scroll driver.
  const setStep = (index) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
    if (stepLabel) stepLabel.textContent = `0${index + 1} / 05`;
    if (stageLabel) stageLabel.textContent = STAGES[index];
    if (timeLabel) timeLabel.textContent = TIMES[index].toUpperCase();
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

    const next = stepFor(p);
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

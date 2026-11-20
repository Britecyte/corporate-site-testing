/**
 * Lipoderma — public site behavior.
 * No framework. Each module is guarded so a missing node is a no-op.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── reveal on scroll ───────────────────────────────────
   One observer for the whole page. Blocks fade in once, when any
   part of them crosses into the reading area (window minus the
   bottom 12%). Mark blocks with .reveal in the markup, or let the
   list below tag shared components. */
const REVEAL_SELECTORS = [
  '.section-head > *', '.result-view', '.providers-head > *', '.provider-shell',
  '.faq-rail', '.faq-group', '.footer-top > *', '.footer-bottom',
  '.page-head .wrap > *', '.contact-intro', '.contact-card',
];
const REVEAL_STEP = 90;
const REVEAL_MAX_STEPS = 4;

function tagReveals() {
  document.querySelectorAll(REVEAL_SELECTORS.join(',')).forEach((el) => {
    if (el.closest('.hero, template')) return;
    if (el.classList.contains('reveal') || el.closest('.reveal') || el.querySelector('.reveal')) return;
    el.classList.add('reveal');
  });
  document.querySelectorAll('.structure:not(.pt-how) .structure-visual, .structure:not(.pt-how) .structure-copy').forEach((el) => {
    el.classList.add('reveal');
  });
}

function showReveal(el, step = 0) {
  if (el.classList.contains('is-visible')) return;
  el.style.transitionDelay = `${Math.min(step, REVEAL_MAX_STEPS) * REVEAL_STEP}ms`;
  el.classList.add('is-visible');
  // Drop the stagger once it has played, so later hover transitions aren't delayed.
  el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
}

function initReveal() {
  tagReveals();

  const hero = document.querySelector('.hero');
  const heroBits = hero ? [...hero.querySelectorAll('.reveal')] : [];
  const fatWord = hero?.querySelector('[data-fat-reveal]');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    heroBits.forEach((el, i) => showReveal(el, i));
    if (fatWord) {
      fatWord.style.transitionDelay = REDUCED ? '0ms' : `${Math.min(heroBits.length, REVEAL_MAX_STEPS) * REVEAL_STEP + 900}ms`;
      fatWord.classList.add('is-in');
    }
  }));

  const items = [...document.querySelectorAll('.reveal')].filter((el) => !el.closest('.hero'));
  if (REDUCED || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const pending = new Set(items);
  const io = new IntersectionObserver((entries) => {
    // Stagger only what enters together, in document order.
    entries
      .filter((entry) => entry.isIntersecting)
      .map((entry) => entry.target)
      .sort((x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .forEach((el, i) => {
        showReveal(el, i);
        io.unobserve(el);
        pending.delete(el);
      });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  items.forEach((el) => io.observe(el));

  // The last lines of the page may never reach the reading area. Show them at the bottom.
  const atEnd = () => {
    if (!pending.size) { window.removeEventListener('scroll', atEnd); return; }
    const end = document.documentElement.scrollHeight - 4;
    if (window.scrollY + window.innerHeight < end) return;
    [...pending].forEach((el, i) => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        showReveal(el, i);
        io.unobserve(el);
        pending.delete(el);
      }
    });
  };
  window.addEventListener('scroll', atEnd, { passive: true });
  atEnd();
}

/* ── anatomy cross-section ──────────────────────────────────
   Builds the adipose band geometry, fills it with adipocytes,
   and drives four narrative steps from scroll progress.       */
function initCrossSection(section, detail = false) {
  const SFX = detail ? '-2' : '';
  const $ = (id) => section.querySelector('#' + id + SFX);
  const svg = section.querySelector('svg');
  if (!section || !svg) return;

  const skinPath = $('cs-skin-path');
  const bandPath = $('cs-band-path');
  const musclePath = $('cs-muscle-path');
  const clipPath = $('cs-clip-path');
  const cellsGroup = $('cs-cells');
  const measureLabel = $('cs-measure-label');
  measureLabel.textContent = '';
  ['ADIPOSE', 'LAYER'].forEach((word, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t.textContent = word;
    t.setAttribute('dy', i ? '13' : '0');
    measureLabel.appendChild(t);
  });
  measureLabel.removeAttribute('stroke');
  measureLabel.setAttribute('fill-opacity', '0.6');
  const steps = Array.from(section.querySelectorAll('.structure-step'));
  const meter = $('cs-meter');
  const stepLabel = $('cs-step-label');

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
  // A closed strip between two edges: smooth along each edge, straight at the ends,
  // so the corners can't overshoot and poke into neighbouring layers.
  const strip = (upper, lower) => `${smooth(upper)} ${smooth(lower.slice().reverse()).replace(/^M/, 'L')} Z`;

  const BAND_BASE = 118;   // thickness of a healthy adipose layer
  const bandDepth = (x) => {
    const t = x / W;
    // thicker at the midface, thinner at the edges
    return BAND_BASE * (0.62 + 0.5 * Math.exp(-Math.pow((t - 0.58) / 0.34, 2)));
  };
  // The muscle plane never moves. Everything above it is what changes.
  const floorY = (x) => surfY(x) + 9 + bandDepth(x);
  const ease = (v) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  const cannula = $('cs-cannula');
  const stageLabel = $('cs-stage-label');
  const skinLabel = $('cs-skin-label');
  const muscleLabel = $('cs-muscle-label');

  const muscleLine = surfacePts.map(([x]) => [x, floorY(x)]);
  musclePath.setAttribute('d', smooth(muscleLine));
  musclePath.setAttribute('stroke', '#f09aab'); musclePath.setAttribute('stroke-opacity', '0.95');
  const muscleFill = document.createElementNS(NS, 'path');
  muscleFill.setAttribute('d', strip(muscleLine, muscleLine.map(([x, y]) => [x, y + 48])));
  muscleFill.setAttribute('fill', '#f4a8b8'); muscleFill.setAttribute('fill-opacity', '0.42');
  musclePath.parentNode.insertBefore(muscleFill, musclePath);

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
  const T = detail ? {
    loss: [0.1, 0.26], tip: [0.5, 0.7], cannulaIn: [0.46, 0.5], cannulaOut: [0.76, 0.8], retract: [0.7, 0.78],
    smooth: [0.7, 0.86], host: [0.86, 0.99], filter: [0.3, 0.44], trayIn: [0.27, 0.31], trayOut: [0.5, 0.56],
    stepAt: [0, 0.12, 0.28, 0.46, 0.7, 0.86],
  } : {
    loss: [0.12, 0.34], tip: [0.42, 0.66], cannulaIn: [0.38, 0.42], cannulaOut: [0.72, 0.76], retract: [0.66, 0.74],
    smooth: [0.62, 0.8], host: [0.8, 0.98],
    stepAt: [0, 0.18, 0.38, 0.62, 0.8],
  };
  const STEP_AT = T.stepAt;
  const STAGES = detail
    ? ['Healthy layer', 'Layer thins', 'Refined tissue', 'Donor tissue', 'Volume restored', 'Your body takes over']
    : ['Healthy layer', 'Layer thins', 'Donor tissue', 'Volume restored', 'Host takes over'];
  // Time labels (data-timeline). Delete the #cs-time element in the HTML to remove them.
  const TIMES = detail
    ? ['Baseline', 'Over the years', 'Before treatment', 'Day 0 · injection', 'Day 0 · placed', 'Weeks to months']
    : ['Baseline', 'Over the years', 'Day 0 · injection', 'Day 0 · placed', 'Weeks to months'];
  const timeLabel = $('cs-time');
  const dermisPath = $('cs-dermis-path');
  const basementPath = $('cs-basement');
  let skinRipple = null;

  // Same squish as the Britecyte hero field: the cell you touch pops,
  // neighbors ripple out, and the skin gives with them. Works on every step.
  if (!REDUCED) {
    const stage = section.querySelector('.structure-stage');
    const replay = (el, cls) => {
      if (!el) return;
      el.classList.remove('is-pop', 'is-ripple');
      void el.getBoundingClientRect();
      el.classList.add(cls);
      el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    };
    const poke = (x, y) => {
      let best = null;
      let bestD = Infinity;
      const live = [];
      cells.forEach((c) => {
        const cx = Number(c.el.getAttribute('cx'));
        const cy = Number(c.el.getAttribute('cy'));
        const r = Number(c.el.getAttribute('r'));
        if (!Number.isFinite(cx) || r < 1) return;
        live.push({ el: c.el, x: cx, y: cy });
        if (c.twin) {
          const tx = Number(c.twin.el.getAttribute('cx'));
          const ty = Number(c.twin.el.getAttribute('cy'));
          const tr = Number(c.twin.el.getAttribute('r'));
          if (Number.isFinite(tx) && tr > 1) live.push({ el: c.twin.el, x: tx, y: ty });
        }
      });
      live.forEach((c) => {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) { bestD = d; best = c; }
      });
      if (best) {
        replay(best.el, 'is-pop');
        live.forEach((c) => {
          if (c === best) return;
          const d = Math.hypot(c.x - best.x, c.y - best.y);
          if (d > 120) return;
          window.setTimeout(() => replay(c.el, 'is-ripple'), d * 0.7);
        });
      }
      skinRipple = { x, t0: performance.now() };
      if (!raf) raf = requestAnimationFrame(frame);
    };
    stage?.addEventListener('pointerdown', (e) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const local = pt.matrixTransform(ctm.inverse());
      poke(local.x, local.y);
    });
  }

  const lost = (p) => ease(seg(p, T.loss[0], T.loss[1]));
  const tipPos = (p) => -40 + (W + 260) * seg(p, T.tip[0], T.tip[1]);   // how far the cannula has reached
  const host = (p) => seg(p, T.host[0], T.host[1]);
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


  // ── Detail variant extras: refinement tray and host vessels ──
  const trayGroup = detail ? $('cs-tray') : null;
  const vesselsGroup = detail ? $('cs-vessels') : null;
  const tray = { cells: [], rbc: [], frag: [] };
  const vessels = [];
  if (detail) {
    const rnd = (() => { let s = 777; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); })();
    const mk = (tag, parent) => { const el = document.createElementNS(NS, tag); parent.appendChild(el); return el; };
    const frame = mk('rect', trayGroup);
    frame.setAttribute('x', '150'); frame.setAttribute('y', '556'); frame.setAttribute('width', '260'); frame.setAttribute('height', '104');
    frame.setAttribute('fill', 'none'); frame.setAttribute('stroke', '#f7f2eb'); frame.setAttribute('stroke-opacity', '0.45');
    const cap = mk('text', trayGroup);
    cap.setAttribute('x', '150'); cap.setAttribute('y', '546'); cap.setAttribute('fill', '#f7f2eb'); cap.setAttribute('fill-opacity', '0.75');
    cap.setAttribute('font-size', '10'); cap.setAttribute('font-weight', '600'); cap.setAttribute('letter-spacing', '1.6');
    tray.cap = cap;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const el = mk('circle', trayGroup);
      const rad = 9 + rnd() * 3;
      const x = Math.min(176 + c * 42 + (r % 2 ? 18 : 0) + (rnd() - 0.5) * 6, 406 - rad);
      const y = 580 + r * 30 + (rnd() - 0.5) * 6;
      el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1)); el.setAttribute('r', rad.toFixed(1));
      el.setAttribute('stroke', GRAFT); el.setAttribute('stroke-opacity', '0.95'); el.setAttribute('fill', GRAFT); el.setAttribute('fill-opacity', '0.4');
      tray.cells.push(el);
    }
    for (let i = 0; i < 12; i++) {
      const el = mk('circle', trayGroup);
      el.setAttribute('cx', (160 + rnd() * 240).toFixed(1)); el.setAttribute('cy', (566 + rnd() * 84).toFixed(1)); el.setAttribute('r', '3.4');
      el.setAttribute('fill', '#d85f5f'); el.setAttribute('fill-opacity', '0.9');
      tray.rbc.push({ el, x: +el.getAttribute('cx'), y: +el.getAttribute('cy'), d: 60 + rnd() * 120 });
    }
    for (let i = 0; i < 16; i++) {
      const el = mk('rect', trayGroup);
      const x = 158 + rnd() * 236, y = 564 + rnd() * 84;
      el.setAttribute('width', '3.5'); el.setAttribute('height', '3.5'); el.setAttribute('fill', '#cfc7bc'); el.setAttribute('fill-opacity', '0.75');
      tray.frag.push({ el, x, y, d: 40 + rnd() * 90, rot: rnd() * 90 });
    }
    // Vessel trees. Each grows up from the muscle side and forks into tapering
    // branches at natural angles. Clipped to the fat layer so nothing leaves it.
    const DEG = Math.PI / 180;
    const grow = (x, y, ang, len, width, depth, order) => {
      // slightly curved limb: 4 points with a gentle bend
      const bend = (rnd() - 0.5) * 24 * DEG;
      const pts = [[x, y]];
      let cx = x, cy = y, a = ang;
      for (let i = 0; i < 3; i++) {
        a += bend / 3;
        cx += Math.cos(a) * len / 3;
        cy += Math.sin(a) * len / 3;
        pts.push([cx, cy]);
      }
      const path = mk('path', vesselsGroup);
      path.setAttribute('d', smooth(pts));
      path.setAttribute('pathLength', '1');
      path.setAttribute('stroke-dasharray', '1');
      path.setAttribute('stroke-dashoffset', '1');
      path.setAttribute('stroke-width', width.toFixed(2));
      path.dataset.order = String(order);
      vessels.push(path);
      if (depth === 0) return;
      const spread = 24 + rnd() * 14;
      grow(cx, cy, a - spread * DEG, len * 0.74, width * 0.68, depth - 1, order + 0.2);
      grow(cx, cy, a + spread * DEG, len * 0.74, width * 0.68, depth - 1, order + 0.2);
      // one short side sprout partway along the limb
      if (depth >= 2) {
        const m = pts[2];
        grow(m[0], m[1], a + (rnd() < 0.5 ? -1 : 1) * (55 + rnd() * 20) * DEG, len * 0.4, width * 0.5, 0, order + 0.3);
      }
    };
    [[95, -80], [290, -100], [470, -85]].forEach(([rx, deg], k) => {
      grow(rx, floorY(rx) + 6, deg * DEG, 52, 2.2, 3, k * 0.05);
    });
    vesselsGroup.setAttribute('clip-path', 'url(#cs-clip' + SFX + ')');
  }

  const subjectGroup = detail ? $('cs-subject') : null;
  const drawDetail = (p, H) => {
    if (!detail) return;
    const f = seg(p, T.filter[0], T.filter[1]);
    const vis = seg(p, T.trayIn[0], T.trayIn[1]) * (1 - seg(p, T.trayOut[0], T.trayOut[1]));
    trayGroup.style.opacity = String(vis);
    // Step 3: the face leaves and the processing tray takes its place, larger.
    // Step 4: the tray leaves and the face comes back.
    const homeX = 280, homeY = 608, destX = 300, destY = 360;
    const scale = 1 + 0.55 * vis;
    const x = homeX + (destX - homeX) * vis;
    const y = homeY + (destY - homeY) * vis;
    trayGroup.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)}) translate(${-homeX} ${-homeY})`);
    if (subjectGroup) subjectGroup.style.opacity = String(1 - vis);
    tray.cap.textContent = f < 0.5 ? 'RAW DONOR TISSUE' : 'REFINED TISSUE';
    tray.rbc.forEach((o) => {
      o.el.setAttribute('cx', (o.x + o.d * f).toFixed(1)); o.el.setAttribute('cy', (o.y + 20 * f).toFixed(1));
      o.el.style.opacity = String(1 - Math.min(1, f * 1.25));
    });
    tray.frag.forEach((o) => {
      o.el.setAttribute('transform', `translate(${(o.x + o.d * f * 0.6).toFixed(1)} ${(o.y + o.d * f).toFixed(1)}) rotate(${(o.rot + 120 * f).toFixed(0)})`);
      o.el.style.opacity = String(1 - Math.min(1, f * 1.15));
    });
    vessels.forEach((v) => {
      const o = Number(v.dataset.order);
      v.setAttribute('stroke-dashoffset', String(1 - seg(H, o * 0.15, Math.min(0.98, o * 0.15 + 0.42))));
    });
    vesselsGroup.style.opacity = H > 0 ? '1' : '0';
  };

  const draw = (p) => {
    const L = lost(p);
    const tip = tipPos(p);
    const H = host(p);
    const finalSmooth = smoothstep(seg(p, T.smooth[0], T.smooth[1]));

    // Local restoration: the layer refills behind the cannula tip.
    const restored = (x) => smoothstep((tip - x) / 140);
    // Freshly placed tissue sits a little full, as an even lift so the contour
    // keeps its shape, then settles back to exactly the baseline silhouette.
    const lift = 12 * (1 - ease(H));
    const thickAt = (x) => 1 - 0.62 * L * (1 - restored(x));
    const topAt = (x) => floorY(x) - bandDepth(x) * thickAt(x) - lift * restored(x);

    const bandTopPts = [], skinPts = [], bottomPts = [], basePts = [];
    surfacePts.forEach(([x], i) => {
      const th = thickAt(x);
      const thinness = L * (1 - restored(x)) * (1 - 0.7 * finalSmooth);
      // A few broad, smooth hollows in the skin. Low frequency so they read as
      // wrinkles, not teeth.
      const t = x / W;
      const wrinkle = thinness * (
        7 * Math.exp(-Math.pow((t - 0.28) / 0.09, 2)) +
        5 * Math.exp(-Math.pow((t - 0.55) / 0.11, 2)) +
        4 * Math.exp(-Math.pow((t - 0.78) / 0.07, 2)));
      const bt = topAt(x);
      const skinThick = 26 * (1 - 0.14 * L * (1 - restored(x)));
      bandTopPts.push([x, bt]);
      basePts.push([x, bt - 4]);
      let dip = 0;
      if (skinRipple) {
        const age = (performance.now() - skinRipple.t0) / 850;
        if (age < 1) {
          const dist = Math.abs(x - skinRipple.x);
          const ring = Math.exp(-Math.pow((dist - age * 90) / 24, 2));
          dip = Math.sin(age * Math.PI) * 2.5 * ring;
        }
      }
      skinPts.push([x, bt - skinThick + wrinkle + dip]);
      bottomPts.push([x, floorY(x)]);
    });
    const closed = strip(bandTopPts, bottomPts);
    skinPath.setAttribute('d', smooth(skinPts));
    dermisPath.setAttribute('d', strip(skinPts, bandTopPts));
    basementPath.setAttribute('d', smooth(skinPts.map(([x, y], i) => [x, y + (bandTopPts[i][1] - y) * 0.22])));
    bandPath.setAttribute('d', closed);
    clipPath.setAttribute('d', closed);
    const meanThick = thickAt(W * 0.6);
    bandPath.style.opacity = String(Math.min(1, 0.55 + 0.45 * meanThick));

    // Cannula path (also gives us the tip location for cell deposit).
    const tipClamp = Math.min(W - 6, Math.max(-30, tip));
    const retract = seg(p, T.retract[0], T.retract[1]);
    const tipDraw = retract > 0 ? tipClamp * (1 - retract) - 30 * retract : tipClamp;
    const tipMid = (x) => (topAt(Math.max(0, x)) + floorY(Math.max(0, x))) / 2;
    const cannulaOn = seg(p, T.cannulaIn[0], T.cannulaIn[1]) * (1 - seg(p, T.cannulaOut[0], T.cannulaOut[1]));
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
      const k = Math.min(1.04, 0.7 + 0.3 * thickAt(c.x));
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

    drawDetail(p, H);

    // Layer label sits to the right of the model, two lines, level with the middle of the fat layer.
    const labY = (topAt(W) + floorY(W)) / 2 - 2;
    const labX = 570;
    measureLabel.setAttribute('x', String(labX));
    measureLabel.setAttribute('y', labY.toFixed(1));
    measureLabel.setAttribute('text-anchor', 'start');
    Array.from(measureLabel.children).forEach((t) => t.setAttribute('x', String(labX)));

    // SKIN and MUSCLE labels sit right beside the lines they name.
    if (skinLabel) { skinLabel.setAttribute('x', '0'); skinLabel.setAttribute('y', (skinPts[0][1] - 12).toFixed(1)); }
    if (muscleLabel) { muscleLabel.setAttribute('x', '0'); muscleLabel.setAttribute('y', (floorY(0) + 30).toFixed(1)); }
  };

  const stepFor = (p) => STEP_AT.reduce((acc, t, i) => (p >= t - 0.0005 ? i : acc), 0);

  // Scroll driver.
  const setStep = (index) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
    if (stepLabel) stepLabel.textContent = `0${index + 1} / 0${STEP_AT.length}`;
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
    if (skinRipple && performance.now() - skinRipple.t0 < 900 && !raf) {
      raf = requestAnimationFrame(frame);
    }

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

/* ── audience pages ─────────────────────────────────────── */
function initDoors() {
  const section = document.getElementById('audience');
  if (!section) return;
  const tableWrap = section.querySelector('[data-compare-active]');
  const picks = Array.from(section.querySelectorAll('[data-pick]'));
  picks.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (tableWrap) tableWrap.dataset.compareActive = btn.dataset.pick;
      picks.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    });
  });
}

/* ── before / after compare ─────────────────────────────── */
function initCompare() {
  const els = Array.from(document.querySelectorAll('[data-compare]'));
  if (!els.length) return;

  els.forEach((el) => {
    const range = el.querySelector('[data-compare-range]');
    const scrollLinked = el.hasAttribute('data-scroll-compare');
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

    // Move the slider (10% -> 90%) as the section crosses the viewport.
    const fromScroll = () => {
      const section = el.closest('section') || el;
      const rect = section.getBoundingClientRect();
      const headerH = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
      const stickyH = window.innerHeight - headerH;
      const travel = rect.height - stickyH;
      const p = travel > 20
        ? (headerH - rect.top) / travel
        : (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      return 10 + Math.min(1, Math.max(0, p)) * 80;
    };

    const start = (e) => { dragging = true; set(pctFromEvent(e)); };
    const move = (e) => { if (dragging) { set(pctFromEvent(e)); if (e.cancelable) e.preventDefault(); } };
    const end = () => { dragging = false; };

    el.addEventListener('pointerdown', (e) => { el.setPointerCapture?.(e.pointerId); start(e); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);

    range?.addEventListener('input', () => set(Number(range.value)));

    if (scrollLinked && !REDUCED) {
      const onScroll = () => {
        if (dragging) return;
        set(fromScroll());
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    } else {
      set(range ? Number(range.value) : 50);
    }
  });
}

/* ── FAQ accordion + category tabs ──────────────────────── */
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

/* ── UTM campaign capture (cookie-free, sessionStorage only) ─ */
const UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium'];
const UTM_STORAGE_KEY = 'lipoderma_utm';

function readCampaignUtms() {
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || '{}') || {}; } catch (_) {}
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  UTM_KEYS.forEach((key) => {
    const val = params.get(key);
    if (val) { stored[key] = val.trim(); changed = true; }
  });
  if (changed) {
    try { sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored)); } catch (_) {}
  }
  return stored;
}

function syncUtmFields(root = document) {
  const utms = readCampaignUtms();
  root.querySelectorAll('[data-utm-field]').forEach((input) => {
    const key = input.getAttribute('data-utm-field');
    if (key && utms[key]) input.value = utms[key];
  });
}

function initCampaignTracking() {
  syncUtmFields(document);
}

/* ── site analytics (cookie-free, opt-in via endpoint) ──── */
const SITE_ANALYTICS_ENDPOINT =
  window.LIPODERMA_PROVIDER_ANALYTICS_ENDPOINT ||
  window.BRITECYTE_ANALYTICS_ENDPOINT ||
  '';

function analyticsSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function trackSiteEvent(eventName, targetId, targetLabel) {
  if (!SITE_ANALYTICS_ENDPOINT || !targetId) return;

  const utms = readCampaignUtms();
  const payload = {
    site_key: 'lipoderma',
    event_name: eventName,
    provider_id: `lipoderma:${targetId}`,
    provider_label: targetLabel,
    page_path: window.location.pathname || '/',
  };
  if (utms.utm_campaign) payload.utm_campaign = utms.utm_campaign;
  if (utms.utm_source) payload.utm_source = utms.utm_source;
  if (utms.utm_medium) payload.utm_medium = utms.utm_medium;

  fetch(SITE_ANALYTICS_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ events: [payload] }),
  }).catch(() => {});
}

function initSiteAnalytics() {
  const path = window.location.pathname || '/';
  trackSiteEvent('site_page_view', `page:${analyticsSlug(path) || 'home'}`, path);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const label = link.textContent.trim().replace(/\s+/g, ' ') || link.getAttribute('aria-label') || link.href;
    const href = link.getAttribute('href') || '';
    const id = analyticsSlug(`${href}-${label}`);
    trackSiteEvent('site_link_click', id, label);
  });
}

/* ── contact form (preview: validates, never posts) ─────── */
function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const ok = form.querySelector('[data-form-success]');
  const bad = form.querySelector('[data-form-error]');
  const askedSubject = new URLSearchParams(window.location.search).get('subject');
  if (askedSubject && form.elements.subject) form.elements.subject.value = askedSubject;
  document.querySelectorAll('a[data-subject]').forEach((link) => {
    link.addEventListener('click', () => {
      if (form.elements.subject) form.elements.subject.value = link.dataset.subject;
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ok.hidden = bad.hidden = true;
    if (form.elements.company && form.elements.company.value) return;   // honeypot
    const valid = form.elements.name.value.trim() &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.elements.email.value.trim()) &&
      form.elements.message.value.trim();
    if (!valid) { bad.hidden = false; return; }
    ok.hidden = false;
    form.reset();
    syncUtmFields(form);
  });
}

/* ── F** Club form (preview: validates, never posts) ────── */
function initClubForm() {
  const form = document.querySelector('[data-club-form]');
  if (!form) return;
  const ok = form.querySelector('[data-club-ok]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (ok) ok.hidden = false;
    form.reset();
    syncUtmFields(form);
  });
}

function initFacts() {
  const list = document.querySelector('#product .fact-list');
  if (!list) return;
  const items = [...list.children];
  if (items.length < 2) return;
  let index = 0;
  let originX = 0;
  let tracking = false;
  const images = [...document.querySelectorAll('#product [data-fact-img]')];
  const paint = () => {
    items.forEach((el, n) => {
      el.dataset.depth = String((n - index + items.length) % items.length);
    });
    images.forEach((img, n) => img.classList.toggle('is-active', n === index));
  };
  const step = (dir) => {
    index = (index + dir + items.length) % items.length;
    paint();
  };
  list.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    tracking = true;
    originX = e.clientX;
    list.setPointerCapture?.(e.pointerId);
  });
  list.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - originX;
    if (dx <= -36) step(1);
    else if (dx >= 36) step(-1);
    else step(1);
  });
  list.addEventListener('pointercancel', () => { tracking = false; });
  paint();
}

/* ── boot ───────────────────────────────────────────────── */
function loopUntil(video, end) {
  if (!(video instanceof HTMLVideoElement)) return;
  const rewind = () => {
    if (video.currentTime < end) return;
    video.currentTime = 0;
    if (video.paused) video.play().catch(() => {});
  };
  video.addEventListener('timeupdate', rewind);
  video.addEventListener('ended', rewind);
}

function initHeroLaura() {
  const video = document.querySelector(".hero-laura");
  const button = document.querySelector("[data-hero-sound]");
  loopUntil(video, 88.06);
  if (!(video instanceof HTMLVideoElement) || !(button instanceof HTMLButtonElement)) return;
  video.muted = true;
  const paint = () => {
    const on = !video.muted;
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "Sound on" : "Sound off";
  };
  button.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) video.play().catch(() => {});
    paint();
  });
  paint();
}

function initHeroUnbox() {
  const video = document.querySelector('.hero-unbox');
  if (!(video instanceof HTMLVideoElement)) return;
  const start = 41.5;
  const arm = () => {
    if (video.currentTime < start) video.currentTime = start;
    video.muted = true;
    video.play().catch(() => {});
  };
  video.addEventListener('timeupdate', () => {
    if (video.duration && video.currentTime >= video.duration - 0.05) video.currentTime = start;
  });
  video.addEventListener('ended', () => { video.currentTime = start; video.play().catch(() => {}); });
  if (video.readyState >= 1) arm();
  else video.addEventListener('loadedmetadata', arm, { once: true });
}

function initProductGesture() {
  const video = document.querySelector(".product-gesture");
  if (!(video instanceof HTMLVideoElement)) return;
  const start = 41;
  const end = 45;
  const play = () => {
    video.muted = true;
    const seek = () => {
      if (video.currentTime < start || video.currentTime >= end) video.currentTime = start;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    video.play().catch(() => {});
  };
  video.addEventListener("timeupdate", () => {
    if (video.currentTime >= end) video.pause();
  });
  const seen = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    play();
    seen.disconnect();
  }, { threshold: 0.4 });
  seen.observe(video);
}

function initPageGlow() {
  const shift = document.querySelector('.bg-shift');
  if (!shift || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    shift.style.transform = `translate3d(${((p - 0.5) * 18).toFixed(2)}vw, ${((0.5 - p) * 22).toFixed(2)}vh, 0)`;
  };
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint();
}

function boot() {
  initPageGlow();
  initHeroLaura();
  initHeroUnbox();
  initProductGesture();
  loopUntil(document.querySelector('.reframe-unbox'), 46);
  initReveal();
  document.querySelectorAll('[data-cross-section]').forEach((s) => initCrossSection(s, s.hasAttribute('data-detail')));
  initDoors();
  initCompare();
  initFacts();
  initFaq();
  initCampaignTracking();
  initSiteAnalytics();
  initContactForm();
  initClubForm();

  import('./providers.js?v=20261120b')
    .then(m => m.initProviders())
    .catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

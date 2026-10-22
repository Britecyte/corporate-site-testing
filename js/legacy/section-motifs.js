/**
 * Section adipocyte cluster decorations — adapted from New V3 section-motifs.js
 */
export const MOTIF_CONFIG = {
  enabled: true,
  sectionSelectors: [
    '[data-motif-key="hero"]',
    '[data-motif-key="about"]',
    '[data-motif-key="platform"]',
    '[data-motif-key="products"]',
    '[data-motif-key="news"]',
    '[data-motif-key="footer"]',
  ],
  count: { min: 1, max: 2, reducedMotionMax: 1 },
  minDistance: 0.28,
  maxPlacementAttempts: 10,
  opacity: { min: 0.04, max: 0.09 },
  rotate: { min: -8, max: 8 },
  sizeRem: {
    single: { min: 1.4, max: 2.2 },
    double: { min: 1.8, max: 2.8 },
    triple: { min: 2.4, max: 3.6 },
  },
  countOverrides: {
    hero: { min: 1, max: 1, reducedMotionMax: 1 },
    footer: { min: 1, max: 1, reducedMotionMax: 1 },
  },
};

const CLUSTER_FILES = [
  '1-cell-center.svg',
  '1-cell-corner.svg',
  '1-cell-lower.svg',
  '1-cell-upper.svg',
  '2-cells-adjacent.svg',
  '2-cells-diagonal.svg',
  '2-cells-horizontal.svg',
  '3-cells-row.svg',
  '3-cells-triangle.svg',
  '3-cells-triangle-up.svg',
];

const PLACEMENT_ZONES = [
  { x: [0.03, 0.18], y: [0.04, 0.22] },
  { x: [0.82, 0.97], y: [0.04, 0.22] },
  { x: [0.03, 0.18], y: [0.78, 0.96] },
  { x: [0.82, 0.97], y: [0.78, 0.96] },
];

const AMBIENT_SVG = `
  <svg aria-hidden="true" class="ambient-svg ambient-svg--tl" viewBox="0 0 220 220" fill="none">
    <circle cx="108" cy="112" r="84" stroke="currentColor" stroke-width="2.2"></circle>
    <circle cx="108" cy="112" r="56" stroke="currentColor" stroke-width="1.8" opacity="0.85"></circle>
    <circle cx="74" cy="80" r="18" fill="currentColor" opacity="0.48"></circle>
    <circle cx="152" cy="142" r="24" stroke="currentColor" stroke-width="2" opacity="0.82"></circle>
  </svg>
  <svg aria-hidden="true" class="ambient-svg ambient-svg--br" viewBox="0 0 220 220" fill="none">
    <circle cx="118" cy="104" r="78" stroke="currentColor" stroke-width="2.2"></circle>
    <circle cx="118" cy="104" r="50" stroke="currentColor" stroke-width="1.8" opacity="0.85"></circle>
    <circle cx="86" cy="148" r="20" fill="currentColor" opacity="0.45"></circle>
    <circle cx="158" cy="68" r="22" stroke="currentColor" stroke-width="2" opacity="0.8"></circle>
  </svg>`;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clusterSizeRem(file, rand) {
  const { sizeRem } = MOTIF_CONFIG;
  if (file.startsWith('3-cells')) {
    return sizeRem.triple.min + rand() * (sizeRem.triple.max - sizeRem.triple.min);
  }
  if (file.startsWith('2-cells')) {
    return sizeRem.double.min + rand() * (sizeRem.double.max - sizeRem.double.min);
  }
  return sizeRem.single.min + rand() * (sizeRem.single.max - sizeRem.single.min);
}

function buildLayout(sectionKey) {
  const rand = createSeededRandom(hashString(sectionKey));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countCfg = MOTIF_CONFIG.countOverrides[sectionKey] ?? MOTIF_CONFIG.count;
  const target = reduced
    ? countCfg.reducedMotionMax
    : countCfg.min + Math.floor(rand() * (countCfg.max - countCfg.min + 1));

  const placed = [];
  const zones = [...PLACEMENT_ZONES].sort(() => rand() - 0.5);

  for (const zone of zones) {
    if (placed.length >= target) break;
    const file = CLUSTER_FILES[Math.floor(rand() * CLUSTER_FILES.length)];
    const sizeRem = clusterSizeRem(file, rand);
    const point = {
      x: zone.x[0] + rand() * (zone.x[1] - zone.x[0]),
      y: zone.y[0] + rand() * (zone.y[1] - zone.y[0]),
      file,
      sizeRem,
      rotate: reduced ? 0 : MOTIF_CONFIG.rotate.min + rand() * (MOTIF_CONFIG.rotate.max - MOTIF_CONFIG.rotate.min),
      opacity: MOTIF_CONFIG.opacity.min + rand() * (MOTIF_CONFIG.opacity.max - MOTIF_CONFIG.opacity.min),
      zIndex: Math.floor(rand() * 3),
    };
    placed.push(point);
  }

  return placed;
}

function decorateSection(container, sectionKey) {
  if (container.querySelector('.section-adipocyte-layer')) return;

  const layout = buildLayout(sectionKey);
  if (!layout.length) return;

  const layer = document.createElement('div');
  layer.className = 'section-adipocyte-layer';
  layer.setAttribute('aria-hidden', 'true');

  layout.forEach((cluster) => {
    const img = document.createElement('img');
    img.className = 'section-adipocyte-cluster';
    img.src = new URL(`../assets/adipocyte-clusters/${cluster.file}`, import.meta.url).href;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    img.style.setProperty('--cluster-x', `${(cluster.x * 100).toFixed(1)}%`);
    img.style.setProperty('--cluster-y', `${(cluster.y * 100).toFixed(1)}%`);
    img.style.setProperty('--cluster-w', `${cluster.sizeRem.toFixed(1)}rem`);
    img.style.setProperty('--cluster-rotate', `${cluster.rotate.toFixed(1)}deg`);
    img.style.setProperty('--cluster-opacity', cluster.opacity.toFixed(2));
    img.style.setProperty('--cluster-z', String(cluster.zIndex));
    layer.appendChild(img);
  });

  container.prepend(layer);

  // Ambient large SVG disabled — V3 uses tiny embedded line motifs in corners only.
  // We rely on the small cluster images for subtle decoration.
}

export function initSectionMotifs() {
  if (!MOTIF_CONFIG.enabled) return;

  MOTIF_CONFIG.sectionSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const key = el.dataset.motifKey || el.id || selector;
      decorateSection(el, key);
    });
  });
}

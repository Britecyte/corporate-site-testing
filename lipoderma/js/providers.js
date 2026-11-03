/**
 * Provider directory — map + list against data/providers.json.
 * Leaflet is self-hosted from vendor/leaflet.
 */

const LEAFLET_JS = new URL('../vendor/leaflet/leaflet.js', import.meta.url).href;
const DATA_URL = new URL('../data/providers.json', import.meta.url).href;

const STATUS = {
  loading: 'Loading providers…',
  count: (n) => `${n} provider${n === 1 ? '' : 's'}`,
  countNear: (n) => `${n} provider${n === 1 ? '' : 's'}, nearest first`,
  empty: 'No providers match that search. Try a state, city, or ZIP.',
  locating: 'Finding your location…',
  denied: 'Location unavailable. Try searching by city or ZIP.',
  mapFail: 'Map unavailable — the list below is still current.',
};

let providers = [];

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error('leaflet'));
    document.head.appendChild(s);
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function providerLabel(p) {
  return [p.doctor, p.practice].filter(Boolean).join(' · ');
}

function distanceMi(a, b) {
  if (!a || !b) return Infinity;
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function matches(p, q) {
  if (!q) return true;
  const hay = [p.doctor, p.practice, p.city, p.state, p.address, p.specialties?.join(' ')]
    .join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(term => hay.includes(term));
}

export async function initProviders() {
  const mapEl = document.getElementById('provider-map');
  const listEl = document.getElementById('provider-list');
  const searchEl = document.querySelector('[data-provider-search]');
  const locateBtn = document.querySelector('[data-provider-locate]');
  const statusEl = document.querySelector('[data-provider-status]');
  if (!mapEl || !listEl) return;

  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
  setStatus(STATUS.loading);

  try {
    const res = await fetch(DATA_URL);
    const json = await res.json();
    providers = Array.isArray(json) ? json : (json.providers || []);
  } catch {
    listEl.innerHTML = '<p class="provider-empty">Provider list unavailable right now.</p>';
    setStatus('');
    return;
  }

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let map = null;
  let markers = new Map();
  let origin = null;
  let activeId = null;
  let query = '';

  loadLeaflet().then((L) => {
    map = L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      center: [39.5, -98.35],
      zoom: 4,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    render();
  }).catch(() => {
    mapEl.innerHTML = '';
    mapEl.style.display = 'none';
    setStatus(STATUS.mapFail);
    render();
  });

  function icon(L, active) {
    return L.divIcon({
      className: '',
      html: `<span class="ld-marker${active ? ' is-active' : ''}"></span>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }

  function focusProvider(p) {
    activeId = p.id;
    if (map) {
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 9), { animate: true });
      markers.forEach((m, id) => {
        const provider = providers.find(x => x.id === id);
        const L = window.L;
        if (provider && L) m.setIcon(icon(L, id === p.id));
      });
    }
    listEl.querySelectorAll('.provider-item').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === p.id);
    });
    const el = listEl.querySelector(`.provider-item[data-id="${CSS.escape(p.id)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  }

  function render() {
    const filtered = providers
      .filter(p => matches(p, query))
      .map(p => ({ p, d: distanceMi(origin, p) }))
      .sort((a, b) => (a.d === b.d ? 0 : a.d - b.d) || 0);

    const list = filtered.map(({ p, d }) => `
      <button type="button" class="provider-item${p.id === activeId ? ' is-active' : ''}" data-id="${escapeHtml(p.id)}">
        <span class="p-name">${escapeHtml(p.doctor || p.practice)}</span>
        <span class="p-place">${escapeHtml([p.practice, p.city, p.state].filter(Boolean).join(' · '))}${
          Number.isFinite(d) ? ` · ${d.toFixed(0)} mi` : ''
        }</span>
        <span class="p-actions">
          ${p.phone ? `<a href="tel:${escapeHtml(p.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(p.phone)}</a>` : ''}
          ${p.website ? `<a href="${escapeHtml(p.website)}" target="_blank" rel="noopener">Website</a>` : ''}
        </span>
      </button>
    `).join('');

    listEl.innerHTML = list || `<p class="provider-empty">${STATUS.empty}</p>`;

    if (query || origin) {
      setStatus(origin ? STATUS.countNear(filtered.length) : STATUS.count(filtered.length));
    } else {
      setStatus(STATUS.count(filtered.length));
    }

    if (map && window.L) {
      const L = window.L;
      markers.forEach(m => map.removeLayer(m));
      markers = new Map();
      const pts = [];
      filtered.slice(0, 400).forEach(({ p }) => {
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
        const m = L.marker([p.lat, p.lng], { icon: icon(L, p.id === activeId) })
          .addTo(map)
          .on('click', () => focusProvider(p));
        markers.set(p.id, m);
        pts.push([p.lat, p.lng]);
      });
      if (pts.length && !origin) {
        map.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: false });
      }
    }
  }

  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.provider-item');
    if (!item) return;
    if (e.target.closest('a')) return; // let tel / website links through
    const p = providers.find(x => x.id === item.dataset.id);
    if (p) focusProvider(p);
  });

  let debounce = 0;
  searchEl?.addEventListener('input', () => {
    query = searchEl.value.trim();
    window.clearTimeout(debounce);
    debounce = window.setTimeout(render, 140);
  });

  locateBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus(STATUS.denied); return; }
    setStatus(STATUS.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (map && window.L) map.setView([origin.lat, origin.lng], 8, { animate: true });
        render();
      },
      () => setStatus(STATUS.denied),
      { timeout: 10000, maximumAge: 60000 }
    );
  });

  // Deep link: #providers means the map should be ready to look at.
  if (window.location.hash === '#providers' && map) {
    window.setTimeout(() => map.invalidateSize(), 300);
  }
}

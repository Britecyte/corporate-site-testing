/**
 * Provider directory: map + list against data/providers.json.
 * Leaflet is self-hosted from vendor/leaflet.
 *
 * Hybrid of the live site's search and the testing build's presentation:
 *   - live: place search (ZIP via Zippopotam, cities/states via Nominatim), provider-name
 *     suggestions, name matches beat guessed places, featured providers first by default,
 *     the whole network always on the map, lazy map load, keyboard-friendly suggestions.
 *   - testing: miles on every card, Call / Website actions, text filter that also reads
 *     address and specialties, and list scrolling that never moves the page.
 * Analytics are opt-in: set window.LIPODERMA_PROVIDER_ANALYTICS_ENDPOINT to send events,
 * so the testing site never writes into the live site's numbers.
 */

const LEAFLET_JS = new URL('../vendor/leaflet/leaflet.js', import.meta.url).href;
const DATA_URL = new URL('../data/providers.json', import.meta.url).href;

const ANALYTICS_ENDPOINT = window.LIPODERMA_PROVIDER_ANALYTICS_ENDPOINT || '';

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error('leaflet'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function providerLabel(p) {
  return [p.doctor, p.practice].filter(Boolean).join(' · ');
}

function trackProviderClick(eventName, p) {
  if (!ANALYTICS_ENDPOINT || !p?.id) return;
  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      events: [{
        event_name: eventName,
        provider_id: p.id,
        provider_label: providerLabel(p),
        page_path: window.location.pathname || '/',
      }],
    }),
  }).catch(() => {});
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

function tokensMatch(fields, normalized) {
  if (!normalized) return true;
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return normalized.split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

// Free-text filter: name, practice, place, address, ZIP, specialties.
function matchesQuery(p, normalized) {
  return tokensMatch(
    [p.doctor, p.practice, p.city, p.state, p.address, p.zip, ...(p.specialties || [])],
    normalized,
  );
}

// Name search: doctor or practice only. Places are handled by place search.
function matchesName(p, normalized) {
  return Boolean(normalized) && tokensMatch([p.doctor, p.practice], normalized);
}

function featuredRank(p) {
  const rank = Number(p?.featuredRank);
  return Number.isFinite(rank) && rank > 0 ? rank : Number.POSITIVE_INFINITY;
}

function byFeatured(a, b) {
  const diff = featuredRank(a) - featuredRank(b);
  if (diff !== 0) return diff;
  return String(a.doctor || '').localeCompare(String(b.doctor || ''));
}

function websiteLabel(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.includes('lipoderma') || path.includes('allograft-fat') ? 'Lipoderma page' : 'Website';
  } catch {
    return /lipoderma|allograft-fat/i.test(url || '') ? 'Lipoderma page' : 'Website';
  }
}

export async function initProviders() {
  const mapEl = document.getElementById('provider-map');
  const listEl = document.getElementById('provider-list');
  const searchEl = document.querySelector('[data-provider-search]');
  const locateBtn = document.querySelector('[data-provider-locate]');
  const statusEl = document.querySelector('[data-provider-status]');
  const suggestEl = document.querySelector('[data-provider-suggest]');
  if (!mapEl || !listEl) return;

  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
  setStatus('Loading providers…');

  let providers = [];
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const all = Array.isArray(json) ? json : (json.providers || []);
    providers = all.filter((p) => p.verified !== false && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  } catch {
    listEl.innerHTML = '<p class="provider-empty">Provider list unavailable right now.</p>';
    setStatus('');
    return;
  }

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    query: searchEl?.value || '',
    active: null,
    userLocation: null,      // from "Use my location"
    selectedOrigin: null,    // a place picked from the suggestions
    places: [],              // place suggestions for the current query
    placeStatus: 'idle',     // idle | loading | ready | empty
    locationStatus: 'idle',  // idle | loading | ready | blocked
    picked: false,           // a provider was picked from the suggestions
    cursor: -1,              // keyboard position in the suggestion list
  };

  let map = null;
  let mapWanted = false;
  let markers = new Map();
  let geoTimer = 0;
  let geoAbort = null;
  let renderTimer = 0;

  /* ── derived state ───────────────────────────────────────── */
  const normalizedQuery = () => state.query.trim().toLowerCase();

  function queryIsName() {
    const q = normalizedQuery();
    return q.length >= 2 && providers.some((p) => matchesName(p, q));
  }

  function implicitOrigin() {
    if (state.query.trim().length < 2 || !state.places.length) return null;
    if (queryIsName()) return null;          // a real name beats a guessed place
    return state.places[0];
  }

  function sortOrigin() {
    return state.selectedOrigin || state.userLocation || implicitOrigin();
  }

  function visibleProviders(origin) {
    if (origin) {
      return providers
        .map((p) => ({ p, d: distanceMi(origin, p) }))
        .sort((a, b) => a.d - b.d);
    }
    const q = normalizedQuery();
    return providers
      .filter((p) => matchesQuery(p, q))
      .sort(byFeatured)
      .map((p) => ({ p, d: Infinity }));
  }

  function statusText(origin) {
    let text = '';
    if (state.selectedOrigin) text = `Sorted by distance from ${state.selectedOrigin.label}.`;
    else if (state.userLocation) text = 'Sorted by distance from your location.';
    else if (origin) text = `Showing nearest providers to ${origin.label}.`;
    else if (state.query.trim().length >= 2 && queryIsName()) text = `Showing providers matching “${state.query.trim()}”.`;
    else if (state.placeStatus === 'loading') text = 'Looking for matching locations.';
    else if (state.placeStatus === 'empty' && state.query.trim().length >= 2) text = 'No matching place found. Showing text matches.';
    if (state.locationStatus === 'blocked') {
      text += `${text ? ' ' : ''}Location access is off. Search still works by name, city, state, or ZIP.`;
    }
    return text;
  }

  /* ── map ─────────────────────────────────────────────────── */
  function icon(L, active) {
    return L.divIcon({
      className: '',
      html: `<span class="ld-marker${active ? ' is-active' : ''}"></span>`,
      iconSize: [24, 24],
      iconAnchor: [0, 24],   // pin tip = bottom-left corner of the box
    });
  }

  function refreshMarkers() {
    const L = window.L;
    if (!map || !L) return;
    markers.forEach((m, id) => m.setIcon(icon(L, id === state.active)));
  }

  function refreshMapSize() {
    if (!map) return;
    map.invalidateSize({ animate: false });
  }

  function scheduleMapRefresh() {
    refreshMapSize();
    [200, 700, 1200].forEach((ms) => window.setTimeout(refreshMapSize, ms));
  }

  async function initMap() {
    if (map) return;
    try {
      const L = await loadLeaflet();
      for (let i = 0; i < 40 && !(mapEl.offsetWidth && mapEl.offsetHeight); i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      if (map) return;
      map = L.map(mapEl, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        center: [39.5, -98.35],
        zoom: 4,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        updateWhenIdle: true,
        keepBuffer: 1,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', () => map.scrollWheelZoom.enable());
      map.on('mouseout', () => map.scrollWheelZoom.disable());

      // The whole network stays on the map; searching reorders the list, not the pins.
      const pts = [];
      providers.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: icon(L, false) })
          .addTo(map)
          .on('click', () => {
            trackProviderClick('provider_map_marker_select', p);
            focusProvider(p, { fly: false });
          });
        markers.set(p.id, m);
        pts.push([p.lat, p.lng]);
      });
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.12), { animate: false });

      window.addEventListener('resize', refreshMapSize);
      window.addEventListener('orientationchange', refreshMapSize);
      scheduleMapRefresh();
    } catch {
      mapEl.innerHTML = '';
      mapEl.style.display = 'none';
      setStatus('Map unavailable. The list is still current.');
    }
  }

  function wantMap() {
    if (mapWanted) { scheduleMapRefresh(); return; }
    mapWanted = true;
    initMap();
  }

  // Warm Leaflet when idle; build the map when the section is near the viewport.
  const warm = () => loadLeaflet().catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 3000 });
  else window.setTimeout(warm, 1500);
  new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) wantMap(); },
    { threshold: 0.05, rootMargin: '300px 0px 400px 0px' },
  ).observe(mapEl);
  window.addEventListener('lipoderma:providers-target', wantMap);
  if (window.location.hash === '#providers') wantMap();

  /* ── list ────────────────────────────────────────────────── */
  // Scroll only the list. scrollIntoView would also scroll the page.
  function revealInList(el) {
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    let next = listEl.scrollTop;
    if (top < next) next = top;
    else if (bottom > next + listEl.clientHeight) next = bottom - listEl.clientHeight;
    if (next !== listEl.scrollTop) listEl.scrollTo({ top: next, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  function itemEl(id) {
    return listEl.querySelector(`.provider-item[data-id="${CSS.escape(id)}"]`);
  }

  function setActive(p) {
    state.active = p ? p.id : null;
    listEl.querySelectorAll('.provider-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === state.active);
    });
    refreshMarkers();
  }

  function focusProvider(p, { fly = true } = {}) {
    setActive(p);
    if (map && fly) map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 9), { duration: 0.8 });
    revealInList(itemEl(p.id));
  }

  function renderList({ resetScroll = false } = {}) {
    const origin = sortOrigin();
    const rows = visibleProviders(origin);

    listEl.innerHTML = rows.length ? rows.map(({ p, d }) => `
      <article class="provider-item${p.id === state.active ? ' is-active' : ''}" data-id="${escapeHtml(p.id)}">
        <button type="button" class="p-main">
          <span class="p-name">${escapeHtml(p.doctor || p.practice)}</span>
          <span class="p-place">${escapeHtml(p.practice || '')}</span>
          <span class="p-where">${escapeHtml([p.city, p.state].filter(Boolean).join(' · '))}${
            Number.isFinite(d) ? ` · ${d.toFixed(0)} mi` : ''
          }</span>
          ${p.phone ? `<span class="p-phone">${escapeHtml(p.phone)}</span>` : ''}
        </button>
        <span class="p-actions">
          ${p.phone ? `<a class="p-btn" data-track="provider_phone_click" href="tel:${escapeHtml(p.phone.replace(/[^\d+]/g, ''))}">Call</a>` : ''}
          ${p.website ? `<a class="p-btn" data-track="provider_website_click" href="${escapeHtml(p.website)}" target="_blank" rel="noopener">${websiteLabel(p.website)}</a>` : ''}
        </span>
      </article>
    `).join('') : '<p class="provider-empty">No providers match that search. Try a state, city, ZIP, or a provider name.</p>';

    if (resetScroll) listEl.scrollTop = 0;
    setStatus(statusText(origin) || `${rows.length} provider${rows.length === 1 ? '' : 's'}`);

    if (locateBtn) {
      locateBtn.textContent = state.locationStatus === 'loading' ? 'Locating…'
        : state.locationStatus === 'ready' ? 'Nearest first'
        : 'Use my location';
    }
  }

  /* ── suggestions ─────────────────────────────────────────── */
  function providerSuggestions() {
    const q = normalizedQuery();
    if (q.length < 2 || state.selectedOrigin || state.picked) return [];
    return providers.filter((p) => matchesName(p, q))
      .sort((a, b) => String(a.doctor || '').localeCompare(String(b.doctor || '')))
      .slice(0, 5);
  }

  function suggestionItems() {
    const provs = providerSuggestions().map((p) => ({ kind: 'provider', p }));
    const places = (state.selectedOrigin || state.picked ? [] : state.places).map((s) => ({ kind: 'place', s }));
    return [...provs, ...places];
  }

  function renderSuggestions() {
    if (!suggestEl) return;
    const items = suggestionItems();
    if (!items.length) {
      suggestEl.hidden = true;
      suggestEl.innerHTML = '';
      searchEl?.setAttribute('aria-expanded', 'false');
      return;
    }
    state.cursor = Math.min(state.cursor, items.length - 1);
    const provs = items.filter((i) => i.kind === 'provider');
    const places = items.filter((i) => i.kind === 'place');
    let index = 0;
    const row = (item) => {
      const i = index++;
      const on = i === state.cursor ? ' is-cursor' : '';
      if (item.kind === 'provider') {
        const { p } = item;
        return `<button type="button" role="option" class="provider-suggest-item${on}" data-i="${i}" data-pick-provider="${escapeHtml(p.id)}">
          <span>${escapeHtml(p.doctor || p.practice)}</span>
          <small>${escapeHtml([p.practice, [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</small>
        </button>`;
      }
      return `<button type="button" role="option" class="provider-suggest-item${on}" data-i="${i}" data-pick-place="${escapeHtml(item.s.id)}">
        <span>${escapeHtml(item.s.label)}</span>
      </button>`;
    };
    suggestEl.innerHTML = `
      ${provs.length ? `<p class="provider-suggest-head">Providers</p>${provs.map(row).join('')}` : ''}
      ${places.length ? `<p class="provider-suggest-head">${provs.length ? 'Locations' : 'Choose a location to sort by nearest'}</p>${places.map(row).join('')}` : ''}
    `;
    suggestEl.hidden = false;
    searchEl?.setAttribute('aria-expanded', 'true');
  }

  function pickProvider(p) {
    state.picked = true;
    state.selectedOrigin = null;
    state.userLocation = null;
    state.locationStatus = 'idle';
    state.query = p.doctor || p.practice || '';
    if (searchEl) searchEl.value = state.query;
    state.places = [];
    state.placeStatus = 'idle';
    state.cursor = -1;
    window.clearTimeout(geoTimer);
    geoAbort?.abort();
    renderSuggestions();
    renderList({ resetScroll: true });
    trackProviderClick('provider_card_select', p);
    focusProvider(p);
  }

  function pickPlace(s) {
    state.picked = false;
    state.query = s.label;
    if (searchEl) searchEl.value = s.label;
    state.selectedOrigin = s;
    state.userLocation = null;
    state.locationStatus = 'idle';
    state.places = [];
    state.placeStatus = 'idle';
    state.cursor = -1;
    renderSuggestions();
    renderList({ resetScroll: true });
    if (map) map.flyTo([s.lat, s.lng], 6, { duration: 0.8 });
  }

  function pickAt(i) {
    const item = suggestionItems()[i];
    if (!item) return false;
    if (item.kind === 'provider') pickProvider(item.p); else pickPlace(item.s);
    return true;
  }

  /* ── place search (ZIP + city/state) ─────────────────────── */
  function scheduleGeocode(raw) {
    window.clearTimeout(geoTimer);
    geoAbort?.abort();
    if (state.selectedOrigin?.label === raw) return;
    state.selectedOrigin = null;
    if (raw.length < 2) {
      state.places = [];
      state.placeStatus = 'idle';
      renderSuggestions();
      renderList({ resetScroll: true });
      return;
    }
    geoAbort = new AbortController();
    const { signal } = geoAbort;
    geoTimer = window.setTimeout(async () => {
      state.placeStatus = 'loading';
      renderList();
      try {
        const found = [];
        const zip = raw.match(/\b\d{5}\b/)?.[0];
        if (zip) {
          const zr = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal });
          if (zr.ok) {
            const place = (await zr.json()).places?.[0];
            if (place) {
              found.push({
                id: `zip-${zip}`,
                lat: Number(place.latitude),
                lng: Number(place.longitude),
                label: `${place['place name']}, ${place['state abbreviation']} ${zip}`,
              });
            }
          }
        }
        const nr = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us,ca&limit=5&q=${encodeURIComponent(raw)}`,
          { signal },
        );
        if (nr.ok) {
          (await nr.json()).forEach((place) => {
            const label = place.display_name.split(',').slice(0, 4).join(',');
            if (!found.some((f) => f.label === label)) {
              found.push({ id: `place-${place.place_id}`, lat: Number(place.lat), lng: Number(place.lon), label });
            }
          });
        }
        state.places = found.slice(0, 5);
        state.placeStatus = found.length ? 'ready' : 'empty';
      } catch {
        if (signal.aborted) return;
        state.places = [];
        state.placeStatus = 'empty';
      }
      renderSuggestions();
      renderList({ resetScroll: true });
    }, 250);
  }

  /* ── events ──────────────────────────────────────────────── */
  listEl.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-track]');
    const item = e.target.closest('.provider-item');
    const p = item && providers.find((x) => x.id === item.dataset.id);
    if (link) { if (p) trackProviderClick(link.dataset.track, p); return; }
    if (e.target.closest('a')) return;
    if (p) { trackProviderClick('provider_card_select', p); focusProvider(p); }
  });

  searchEl?.addEventListener('input', () => {
    state.query = searchEl.value;
    state.picked = false;
    state.cursor = -1;
    scheduleGeocode(state.query.trim());
    renderSuggestions();
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => renderList({ resetScroll: true }), 140);
    wantMap();
  });

  searchEl?.addEventListener('keydown', (e) => {
    const n = suggestionItems().length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); state.cursor = (state.cursor + 1) % n; renderSuggestions(); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); state.cursor = (state.cursor - 1 + n) % n; renderSuggestions(); }
    else if (e.key === 'Enter') {
      if (state.cursor >= 0) { e.preventDefault(); pickAt(state.cursor); }
      else if (n && !state.selectedOrigin) { e.preventDefault(); pickAt(0); }   // Enter takes the best match
    } else if (e.key === 'Escape' && n) {
      state.places = [];
      state.cursor = -1;
      renderSuggestions();
    }
  });

  suggestEl?.addEventListener('mousedown', (e) => e.preventDefault());   // keep focus in the input
  suggestEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.provider-suggest-item');
    if (btn) pickAt(Number(btn.dataset.i));
  });

  document.addEventListener('click', (e) => {
    if (suggestEl && !suggestEl.hidden && !e.target.closest('.provider-lead')) {
      state.cursor = -1;
      suggestEl.hidden = true;
    }
  });
  searchEl?.addEventListener('focus', () => { if (suggestionItems().length) renderSuggestions(); });

  locateBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) { state.locationStatus = 'blocked'; renderList(); return; }
    state.selectedOrigin = null;
    state.places = [];
    state.placeStatus = 'idle';
    state.locationStatus = 'loading';
    renderSuggestions();
    renderList();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.locationStatus = 'ready';
        if (map) map.flyTo([state.userLocation.lat, state.userLocation.lng], 6, { duration: 0.8 });
        renderList({ resetScroll: true });
      },
      () => { state.locationStatus = 'blocked'; renderList(); },
      { timeout: 10000, maximumAge: 60000 },
    );
  });

  // The shell reveals on scroll; make sure the map is sized once it is visible.
  const shell = document.querySelector('#providers .provider-shell');
  if (shell) {
    new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) scheduleMapRefresh(); },
      { threshold: 0.15 },
    ).observe(shell);
  }

  renderList();
}

/**
 * Lipoderma — shared site chrome: header, mobile menu, and footer.
 * Every page draws these from here, so there is one copy to edit.
 *
 *   <body data-page="home">           home | patients | work | gallery | science
 *   <script src="js/chrome.js" data-part="header"></script>
 *   ...page content...
 *   <script src="js/chrome.js" data-part="footer"></script>
 *
 * Pages one folder down add data-root="../" to both tags.
 * The header behavior (scroll state, menu, collapse) also lives here.
 */
(function () {
  const script = document.currentScript;
  if (!script) return;
  const root = script.dataset.root || '';
  const page = document.body.dataset.page || 'home';

  const FILES = { home: 'index.html', patients: 'patients.html', work: 'work-with-us.html', safety: 'safety.html' };
  const NAV = [
    { label: 'Meet Lipoderma', to: 'home', hash: 'reframe' },
    { label: 'Patients', to: 'patients' },
    { label: 'How it works', to: 'patients', hash: 'structure-detail', nav: false },
    { label: 'Results', to: 'home', hash: 'results', nav: false },
    { label: 'Providers', to: 'home', hash: 'providers', nav: false },
    { label: 'Work with us', to: 'work' },
    { label: 'Safety', to: 'safety' },
    { label: 'FAQ', to: 'home', hash: 'faq' },
    { label: 'Contact', to: 'home', hash: 'contact' },
  ];
  const SOCIAL = [
    ['Britecyte', 'https://britecyte.com'],
    ['Instagram', 'https://www.instagram.com/restorewithlipoderma/'],
    ['YouTube', 'https://www.youtube.com/@lipoderma'],
  ];

  // Same page: a bare #hash, so the jump doesn't reload. Home is "./" rather than index.html.
  const href = (to, hash) => {
    if (to === page && hash) return `#${hash}`;
    const file = to === 'home' ? (root || './') : root + FILES[to];
    return hash ? `${file}#${hash}` : file;
  };
  const current = (item) => (!item.hash && item.to === page ? ' aria-current="page" class="is-current"' : '');
  const linkList = (items) => items.map((item) => `<a href="${href(item.to, item.hash)}"${current(item)}>${item.label}</a>`).join('\n');
  const links = linkList(NAV.filter((item) => item.nav !== false));
  const footerLinks = linkList(NAV);
  const findProvider = href('home', 'providers');

  const HEADER = `
<header class="site-header" id="site-header">
  <div class="header-inner">
    <a class="brand" href="${root || './'}" aria-label="Lipoderma home" data-brand>
      <span class="brand-logo" role="img" aria-label="Lipoderma"></span>
    </a>
    <nav class="header-nav" aria-label="Primary">
${links}
    </nav>
    <div class="header-actions">
      <a class="btn" href="${findProvider}">Find a provider</a>
      <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav" data-menu-toggle>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M1 4h16M1 9h16M1 14h16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</header>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" data-mobile-nav>
  <div class="mobile-nav-links">
${links}
  </div>
  <a class="btn mobile-nav-cta" href="${findProvider}">Find a provider</a>
</nav>`;

  const FOOTER = `
<footer class="site-footer" data-theme="light">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="${root}img/logos/lipoderma-logo.svg" width="124" height="30" alt="Lipoderma" />
        <p class="footer-tagline">Restore what's been lost.<br><span>Not reinvent what's there.</span></p>
      </div>
      <div class="footer-col">
        <h3>Explore</h3>
${footerLinks}
      </div>
      <div class="footer-col">
        <h3>Britecyte</h3>
        <a href="mailto:brighterlives@britecyte.com">Contact</a>
${SOCIAL.map(([label, url]) => `        <a href="${url}" target="_blank" rel="noopener">${label}</a>`).join('\n')}
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Britecyte, Inc. All rights reserved.</span>
      <span>Lipoderma® is a registered trademark of Britecyte, Inc. · Frederick, MD</span>
    </div>
  </div>
</footer>`;

  if (script.dataset.part === 'header') {
    script.insertAdjacentHTML('beforebegin', HEADER);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome, { once: true });
    else initChrome();
  } else if (script.dataset.part === 'footer') {
    script.insertAdjacentHTML('beforebegin', FOOTER);
  }

  function initChrome() {
    initHeader();
    initMobileNav();
    document.querySelector('[data-brand]')?.addEventListener('click', reloadHome);
  }

  /* Header: solid once scrolled, and flips to light-section colors. */
  function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const probe = header.offsetHeight - 2;
      let overLight = false;
      for (const section of document.querySelectorAll('[data-theme="light"]')) {
        const r = section.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) { overLight = true; break; }
      }
      header.classList.toggle('is-stuck', window.scrollY > 24);
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

  /* Menu sheet, and collapsing the bar into it when the links don't fit. */
  function initMobileNav() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const nav = document.querySelector('[data-mobile-nav]');
    if (!toggle || !nav) return;
    const rootEl = document.documentElement;

    const setOpen = (open) => {
      if (open) rootEl.style.setProperty('--scrollbar-w', `${Math.max(0, window.innerWidth - rootEl.clientWidth)}px`);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
      rootEl.classList.toggle('nav-open', open);
      document.body.classList.toggle('nav-open', open);
      if (open) nav.scrollTop = 0;
    };

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    const wide = window.matchMedia('(min-aspect-ratio: 1/1)');
    const headerInner = document.querySelector('.header-inner');
    const bar = document.querySelector('.header-nav');
    const brand = document.querySelector('.brand');
    const actions = document.querySelector('.header-actions');

    let lastWidth = -1;
    const navFits = (force) => {
      if (!wide.matches || !headerInner || !bar || !brand || !actions) {
        rootEl.classList.remove('is-nav-collapsed');
        lastWidth = -1;
        return;
      }
      const w = headerInner.clientWidth;
      if (force !== true && w === lastWidth) return;
      lastWidth = w;
      const was = rootEl.classList.contains('is-nav-collapsed');
      rootEl.classList.remove('is-nav-collapsed');
      const cs = getComputedStyle(headerInner);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const gap = parseFloat(cs.columnGap) || 0;
      const navGap = parseFloat(getComputedStyle(bar).columnGap) || 0;
      const items = Array.from(bar.querySelectorAll(':scope > a'));
      const need = items.reduce((sum, link) => sum + link.getBoundingClientRect().width, 0)
        + navGap * Math.max(0, items.length - 1);
      const available = w - padX
        - brand.getBoundingClientRect().width
        - actions.getBoundingClientRect().width
        - gap * 2;
      rootEl.classList.toggle('is-nav-collapsed', need > available + 1);
      if (was && !rootEl.classList.contains('is-nav-collapsed')) setOpen(false);
    };

    if (headerInner && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => navFits(false)).observe(headerInner);
    }
    wide.addEventListener('change', () => navFits(true));
    window.addEventListener('resize', () => navFits(false));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => navFits(true));
    navFits(true);
  }

  /* The logo always lands on a fresh homepage at the top. */
  function reloadHome(event) {
    const link = event.currentTarget;
    if (!(link instanceof HTMLAnchorElement)) return;
    event.preventDefault();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const dest = new URL(link.href);
    window.location.replace(`${dest.pathname}?reset=1`);
  }
})();

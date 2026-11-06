import { initPipelineMap } from "./pipeline-map.js?v=20261106d";
import "./news-split.js?v=20261106a";
import "./journey-carousel.js?v=20261107b";
import "./team-spotlight.js?v=20261107c";
import "./pathway.js?v=20261106a";
import "./scroll-spy.js?v=20261023m";

document.addEventListener("DOMContentLoaded", () => {
  initPipelineMap();
  initBritecyteAnalytics();
  initMobileNav();
  initScrollReveal();
  initHeaderScroll();
  initContactForm();
  initYear();
});

const BRITECYTE_ANALYTICS_ENDPOINT =
  window.BRITECYTE_ANALYTICS_ENDPOINT ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:3000/provider-directory/events"
    : "https://lipoderma-launchpad.onrender.com/provider-directory/events");

function analyticsSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function trackBritecyteEvent(eventName, targetId, targetLabel) {
  if (!BRITECYTE_ANALYTICS_ENDPOINT || !targetId) return;

  const body = JSON.stringify({
    events: [{
      site_key: "britecyte",
      event_name: eventName,
      provider_id: `britecyte:${targetId}`,
      provider_label: targetLabel,
      page_path: window.location.pathname || "/",
    }],
  });

  fetch(BRITECYTE_ANALYTICS_ENDPOINT, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    keepalive: true,
    headers: { "Content-Type": "text/plain" },
    body,
  }).catch(() => {});
}

function initBritecyteAnalytics() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const label = link.textContent.trim().replace(/\s+/g, ' ') || link.getAttribute('aria-label') || link.href;
    const href = link.getAttribute('href') || '';
    const id = analyticsSlug(`${href}-${label}`);
    trackBritecyteEvent("site_link_click", id, label);
  });
}

function initMobileNav() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-mobile-nav]');
  if (!toggle || !nav) return;

  let backdrop = document.querySelector('[data-mobile-nav-backdrop]');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'mobile-nav-backdrop';
    backdrop.setAttribute('data-mobile-nav-backdrop', '');
    backdrop.setAttribute('aria-label', 'Close menu');
    backdrop.hidden = true;
    nav.before(backdrop);
  }

  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', expanded);
    document.documentElement.classList.toggle('is-menu-open', expanded);
    backdrop.hidden = !expanded;
    backdrop.classList.toggle('is-visible', expanded);
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });

  backdrop.addEventListener('click', () => setExpanded(false));

  nav.querySelectorAll('a, button').forEach((link) => {
    link.addEventListener('click', () => setExpanded(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setExpanded(false);
  });

  const wide = window.matchMedia('(min-aspect-ratio: 1/1)');
  const header = document.querySelector('.site-header-inner');
  const bar = document.querySelector('.site-nav');
  const logo = document.querySelector('.site-logo');
  const actions = document.querySelector('.site-header-actions');

  const navFits = () => {
    if (!wide.matches || !header || !bar || !logo || !actions) return true;
    const root = document.documentElement;
    const was = root.classList.contains('is-nav-collapsed');
    root.classList.remove('is-nav-collapsed');
    const gap = parseFloat(getComputedStyle(header).columnGap) || 0;
    const navGap = parseFloat(getComputedStyle(bar).columnGap) || 0;
    const links = [...bar.querySelectorAll(':scope > a')];
    const need = links.reduce((sum, link) => sum + link.getBoundingClientRect().width, 0)
      + navGap * Math.max(0, links.length - 1);
    const available = header.clientWidth
      - logo.getBoundingClientRect().width
      - actions.getBoundingClientRect().width
      - gap * 2;
    root.classList.toggle('is-nav-collapsed', need > available + 1);
    if (was && !root.classList.contains('is-nav-collapsed')) setExpanded(false);
  };

  const watch = new ResizeObserver(navFits);
  watch.observe(header);
  wide.addEventListener('change', navFits);
  window.addEventListener('resize', navFits);
  navFits();
}

function initScrollReveal() {
  const selectors = [
    ".hero-copy > *",
    ".section-header",
    ".section-intro",
    ".about-aside",
    ".journey-carousel",
    ".proof-stats li",
    ".pipe-row",
    ".pipe-detail",
    ".pathway-step",
    ".record",
    ".team-stage",
    ".contact-form",
    ".contact-aside",
    ".footer-lead",
    ".footer-brand",
    ".footer-nav",
  ];
  document.querySelectorAll(selectors.join(",")).forEach((el) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
  );

  items.forEach((el) => {
    const siblings = el.parentElement
      ? Array.from(el.parentElement.children).filter((child) => child.classList.contains("reveal"))
      : [];
    const order = siblings.indexOf(el);
    if (order > 0) el.style.transitionDelay = `${Math.min(order, 6) * 0.08}s`;
    observer.observe(el);
  });
}

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

const CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/needthefat@britecyte.com';

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  const success = document.querySelector('[data-form-success]');
  const error = document.querySelector('[data-form-error]');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultBtnLabel = submitBtn?.textContent?.trim() || 'Send message';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (success) success.hidden = true;
    if (error) error.hidden = true;
    if (submitBtn) submitBtn.textContent = 'Sending…';

    const subjectField = form.querySelector('[name="subject"]');
    const subjectHidden = form.querySelector('[name="_subject"]');
    let subjectLabel = subjectField instanceof HTMLInputElement
      ? subjectField.value.trim() || 'General inquiry'
      : 'General inquiry';
    if (subjectHidden instanceof HTMLInputElement) {
      subjectHidden.value = `Britecyte website—${subjectLabel}`;
    }
    trackBritecyteEvent("contact_form_submit", `contact-${analyticsSlug(subjectLabel)}`, `Contact form: ${subjectLabel}`);

    // Build payload before disabling — disabled fields are omitted from FormData.
    const payload = Object.fromEntries(new FormData(form));
    const fields = form.querySelectorAll('input, textarea, select, button');
    fields.forEach((el) => { el.disabled = true; });

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === 'false' || result?.success === false) {
        throw new Error(result?.message || 'Submit failed');
      }

      form.reset();
      if (success) success.hidden = false;
      trackBritecyteEvent("contact_form_success", `contact-${analyticsSlug(subjectLabel)}`, `Contact form: ${subjectLabel}`);
    } catch {
      if (error) error.hidden = false;
    } finally {
      fields.forEach((el) => { el.disabled = false; });
      if (submitBtn) submitBtn.textContent = defaultBtnLabel;
    }
  });
}

function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

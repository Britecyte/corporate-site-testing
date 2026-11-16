import { initPipelineMap } from "./pipeline-map.js?v=20261106d";
import "./news-split.js?v=20261106a";
import "./about-ledger.js?v=20261114m";
import "./team-spotlight.js?v=20261114f";
import "./pathway.js?v=20261106a";
import "./scroll-spy.js?v=20261112b";

function reloadHome(event) {
  const link = event.currentTarget;
  if (!(link instanceof HTMLAnchorElement)) return;
  event.preventDefault();
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  const dest = new URL(link.href);
  dest.hash = "";
  dest.search = "";
  const sameDocument = dest.pathname === window.location.pathname && window.location.hash === "" && window.location.search === "";
  if (sameDocument) {
    sessionStorage.setItem("bc-home", "1");
    window.location.reload();
  } else {
    sessionStorage.removeItem("bc-home");
    window.location.assign(dest.pathname);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".site-logo")?.addEventListener("click", reloadHome);
  initPipelineMap();
  initBritecyteAnalytics();
  initMobileNav();
  initScrollReveal();
  initHeaderScroll();
  initContactForm();
  initYear();
});

// The testing site sends NO analytics. Tracking only runs if a page explicitly sets
// window.BRITECYTE_ANALYTICS_ENDPOINT, so previews and local runs never touch live data.
const BRITECYTE_ANALYTICS_ENDPOINT = window.BRITECYTE_ANALYTICS_ENDPOINT || "";

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
    ".section-header",
    ".pipe-matrix",
    ".pathway-grid",
    ".team-stage",
    ".news-split",
    ".contact-intro",
    ".contact-card",
    ".footer-brand",
    ".footer-nav",
  ];
  document.querySelectorAll(selectors.join(",")).forEach((el) => {
    if (el.classList.contains("reveal") || el.closest(".reveal")) return;
    if (el.querySelector(".reveal")) return;
    el.classList.add("reveal");
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = (el, i = 0) => {
    el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-visible")));
  };

  const intro = [...document.querySelectorAll("#hero .about-open .reveal")];
  if (reduced || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(show);
    return;
  }

  intro.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`; });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    intro.forEach((el) => el.classList.add("is-visible"));
  }));

  document.querySelectorAll("main.site-main > section, footer.site-footer").forEach((section) => {
    if (section.id === "hero") return;
    const items = [...section.querySelectorAll(".reveal")];
    if (!items.length) return;

    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.forEach((entry, i) => {
        show(entry.target, i);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -10% 0px" });

    items.forEach((el) => io.observe(el));
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

// The testing site does not send real email. Set window.BRITECYTE_CONTACT_ENDPOINT to
// wire the form to a mailbox for a deliberate end-to-end test.
const CONTACT_ENDPOINT = window.BRITECYTE_CONTACT_ENDPOINT || '';

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  const success = document.querySelector('[data-form-success]');
  const error = document.querySelector('[data-form-error]');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultBtnLabel = submitBtn?.textContent?.trim() || 'Send message';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trap = form.querySelector('[name="company"]');
    if (trap instanceof HTMLInputElement && trap.value) return;

    if (success) success.hidden = true;
    if (error) error.hidden = true;

    const name = form.querySelector('[name="name"]');
    const email = form.querySelector('[name="email"]');
    const message = form.querySelector('[name="message"]');
    const valid = name instanceof HTMLInputElement && name.value.trim()
      && email instanceof HTMLInputElement && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())
      && message instanceof HTMLTextAreaElement && message.value.trim();
    if (!valid) {
      if (error) error.hidden = false;
      return;
    }
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
      if (!CONTACT_ENDPOINT) {
        console.info('Preview build: contact form submission not sent.', payload);
        await new Promise((resolve) => setTimeout(resolve, 400));
      } else {
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

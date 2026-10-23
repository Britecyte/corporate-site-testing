/**
 * Homepage section nav — CSS-first, no scroll hijacking.
 *
 * Browser-native `#section` links handle all scrolling. The only offset is
 * `scroll-margin-top: var(--site-header-h)` on every navigable section, so a
 * section top always rests flush under the fixed header. Smooth scrolling is
 * intentionally disabled so hash navigation lands at a deterministic Y.
 *
 * Public API for agents/tests:
 *   window.Britecyte.scrollToSection("pipeline")
 *   window.Britecyte.getActiveSection()
 *   window.Britecyte.sections() // [{ id, top }]
 *   window.Britecyte.sectionIds
 *
 * Canonical list also lives in data/sections.json.
 */
const SECTION_ORDER = [
  "hero",
  "about",
  "pipeline",
  "platform",
  "team",
  "news",
  "publications",
  "contact",
];

const SECTION_ALIASES = {
  products: "pipeline",
  product: "pipeline",
  science: "platform",
  who: "about",
  home: "hero",
};

const NAV_LINK_SELECTOR =
  '.site-nav a[href^="#"], .site-nav-mobile a[href^="#"], .footer-nav a[href^="#"], .site-logo[href^="#"]';

function normalizeId(raw) {
  const id = String(raw || "")
    .replace(/^#/, "")
    .trim()
    .toLowerCase();
  return SECTION_ALIASES[id] || id;
}

function isKnownSection(id) {
  return SECTION_ORDER.includes(id);
}

function headerHeight() {
  const header = document.getElementById("site-header");
  if (header) {
    const measured = header.getBoundingClientRect().height;
    if (measured > 0) return measured;
  }
  const cssValue = getComputedStyle(document.documentElement)
    .getPropertyValue("--site-header-h")
    .trim();
  const parsed = parseFloat(cssValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 64;
}



function sectionById(id) {
  const section = document.querySelector('main > section[data-section="' + id + '"]');
  return section || null;
}

/** Document Y where a section rests, just below the fixed header. */
function sectionTop(section) {
  const id = section.dataset.section;
  const anchor = document.getElementById(id);
  if (anchor) {
    return Math.max(0, Math.round(window.scrollY + anchor.getBoundingClientRect().top));
  }
  return Math.max(
    0,
    Math.round(window.scrollY + section.getBoundingClientRect().top - headerHeight())
  );
}

let programmaticUntil = 0;

function jumpTo(top) {
  programmaticUntil = Date.now() + 600;
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

function jumpToSection(section) {
  jumpTo(sectionTop(section));
}

function revealWithin(section) {
  section.classList.add("is-direct-target");
  section.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

function revealInViewport() {
  const y = window.scrollY;
  const bottom = y + window.innerHeight;
  document.querySelectorAll(".reveal").forEach((el) => {
    const top = y + el.getBoundingClientRect().top;
    if (top < bottom + 200 && top + el.offsetHeight > y - 200) {
      el.classList.add("is-visible");
    }
  });
}

function setActive(id) {
  document.querySelectorAll(NAV_LINK_SELECTOR).forEach((link) => {
    const target = normalizeId(link.getAttribute("href"));
    const on = target === id;
    link.classList.toggle("is-active", on);
    if (on) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  document.documentElement.dataset.activeSection = id;
}

function getActiveSection() {
  const sections = SECTION_ORDER.map(sectionById).filter(Boolean);
  if (!sections.length) return null;

  const anchorLine = window.scrollY + headerHeight() + 1;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    return sections[sections.length - 1].id;
  }

  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top + window.scrollY <= anchorLine) {
      current = section;
    }
  }
  return current.id;
}

/**
 * Explicit jump used by agents/tests and alias hashes. Never smooth.
 */
function scrollToSection(id, { pushHistory = false } = {}) {
  const targetId = normalizeId(id);
  const section = sectionById(targetId);
  if (!section) return false;

  revealWithin(section);
  jumpToSection(section);
  if (window.location.hash !== `#${targetId}`) {
    const method = pushHistory ? "pushState" : "replaceState";
    history[method](null, "", `#${targetId}`);
  }
  setActive(targetId);
  return true;
}

function getSections() {
  return SECTION_ORDER.map(sectionById)
    .filter(Boolean)
    .map((section) => ({ id: section.id, top: sectionTop(section) }));
}

function currentHashId() {
  return normalizeId(window.location.hash);
}

/** Support legacy aliases (#products, #science) without a duplicate DOM id. */
function applyAliasHash() {
  const raw = normalizeId(window.location.hash);
  if (!isKnownSection(raw)) return false;
  const section = sectionById(raw);
  if (!section) return false;
  revealWithin(section);
  const top = sectionTop(section);
  if (Math.abs(top - window.scrollY) > 2) jumpTo(top);
  setActive(raw);
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const sections = SECTION_ORDER.map(sectionById).filter(Boolean);
  if (!sections.length) return;

  // Own every same-page section link so Safari/Chrome cannot apply their own
  // scroll anchoring or offset. Always lands at the exact computed Y.
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = normalizeId(link.getAttribute("href"));
    if (!isKnownSection(id) || !sectionById(id)) return;
    event.preventDefault();
    scrollToSection(id, { pushHistory: true });
  });

  let userHasScrolled = false;
  let tick = false;

  const updateActive = () => {
    tick = false;
    const id = getActiveSection();
    if (id) setActive(id);
  };

  window.addEventListener(
    "scroll",
    () => {
      if (Date.now() > programmaticUntil) userHasScrolled = true;
      if (tick) return;
      tick = true;
      requestAnimationFrame(updateActive);
    },
    { passive: true }
  );

  window.addEventListener("resize", updateActive);

  window.addEventListener("hashchange", () => {
    if (applyAliasHash()) updateActive();
  });

  let alignFrame = 0;
  const alignHash = () => {
    if (userHasScrolled) return;
    const id = currentHashId();
    const section = sectionById(id);
    if (!section) return;
    const top = sectionTop(section);
    if (Math.abs(top - window.scrollY) <= 2) return;
    jumpTo(top);
    setActive(id);
  };
  const scheduleAlign = () => {
    cancelAnimationFrame(alignFrame);
    alignFrame = requestAnimationFrame(alignHash);
  };

  window.addEventListener("load", scheduleAlign);
  document.addEventListener("britecyte:contentchange", scheduleAlign);

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleAlign);
    sections.forEach((section) => observer.observe(section));
  }

  window.Britecyte = {
    scrollToSection,
    getActiveSection,
    sections: getSections,
    sectionIds: [...SECTION_ORDER],
  };

  applyAliasHash();
  revealInViewport();
  updateActive();
});

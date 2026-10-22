/**
 * Section nav: scroll each <section id> to sit flush under the fixed header,
 * highlight the section that owns the line just below the header.
 */
const SECTION_IDS = ["hero", "about", "pipeline", "platform", "team", "news", "publications", "contact"];

const HASH_ALIASES = {
  products: "pipeline",
};

function headerScrollOffset() {
  const header = document.getElementById("site-header");
  if (header) {
    const h = header.getBoundingClientRect().height;
    if (h > 0) return h;
  }
  const root = getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim();
  const fromVar = parseFloat(root);
  if (Number.isFinite(fromVar) && fromVar > 0) return fromVar;
  return 64;
}

function resolveSectionId(raw) {
  const id = (raw || "").replace(/^#/, "").toLowerCase();
  return HASH_ALIASES[id] || id;
}

/** Document Y of element top (layout top edge). */
function documentTop(el) {
  return el.getBoundingClientRect().top + window.scrollY;
}

/**
 * Scroll so the section's top (CSS scroll-margin-top clears the fixed header) aligns under the bar.
 */
function scrollToSection(id, { behavior = "smooth" } = {}) {
  const section = document.getElementById(id);
  if (!section) return false;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = prefersReduced ? "auto" : behavior;

  section.scrollIntoView({ behavior: scrollBehavior, block: "start" });
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const links = Array.from(
    document.querySelectorAll('.site-nav a[href^="#"], .site-nav-mobile a[href^="#"], .footer-nav a[href^="#"]')
  );
  if (!links.length) return;

  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  let activeId = sections[0].id;
  let scrollTick = false;

  const setActive = (id) => {
    if (!id) return;
    activeId = id;
    links.forEach((link) => {
      const target = resolveSectionId(link.getAttribute("href"));
      const on = target === id;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = resolveSectionId(link.getAttribute("href"));
      if (!SECTION_IDS.includes(id)) return;
      if (!document.getElementById(id)) return;
      event.preventDefault();
      setActive(id);
      history.pushState(null, "", `#${id}`);
      scrollToSection(id);
    });
  });

  const updateActiveFromScroll = () => {
    scrollTick = false;
    const header = headerScrollOffset();
    /** Y in document: a point just under the fixed header (which section "owns" the viewport top). */
    const anchorLine = window.scrollY + header + 1;

    const docHeight = document.documentElement.scrollHeight;
    const viewBottom = window.scrollY + window.innerHeight;
    if (viewBottom >= docHeight - 2) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    let current = sections[0];
    for (const section of sections) {
      const top = documentTop(section);
      if (top <= anchorLine) current = section;
    }
    setActive(current.id);
  };

  const onScroll = () => {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(updateActiveFromScroll);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateActiveFromScroll);

  const hash = resolveSectionId(window.location.hash);
  if (hash && SECTION_IDS.includes(hash)) {
    requestAnimationFrame(() => {
      scrollToSection(hash, { behavior: "auto" });
      updateActiveFromScroll();
    });
  } else {
    updateActiveFromScroll();
  }
});

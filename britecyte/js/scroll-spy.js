/**
 * Highlights the nav link for whichever section is on screen.
 * Clicking a nav link is ordinary browser hash navigation.
 * html { scroll-padding-top } is the only header offset.
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

const NAV_LINK_SELECTOR =
  '.site-nav a[href^="#"], .site-nav-mobile a[href^="#"], .footer-nav a[href^="#"], .site-logo[href^="#"]';

function headerHeight() {
  const header = document.getElementById("site-header");
  const measured = header?.getBoundingClientRect().height || 0;
  return measured > 0 ? measured : 64;
}

function sections() {
  return SECTION_ORDER
    .map((id) => document.getElementById(id))
    .filter((section) => section && section.dataset.section === section.id);
}

function setActive(id) {
  document.querySelectorAll(NAV_LINK_SELECTOR).forEach((link) => {
    const target = (link.getAttribute("href") || "").replace(/^#/, "");
    const on = target === id;
    link.classList.toggle("is-active", on);
    if (on) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

function activeSection() {
  const list = sections();
  if (!list.length) return null;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    return list[list.length - 1].id;
  }
  const line = window.scrollY + headerHeight() + 1;
  let current = list[0];
  for (const section of list) {
    if (section.offsetTop <= line) current = section;
  }
  return current.id;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!sections().length) return;

  let tick = false;
  const update = () => {
    tick = false;
    const id = activeSection();
    if (id) setActive(id);
  };

  window.addEventListener("scroll", () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener("hashchange", update);
  window.addEventListener("resize", update);
  update();
});

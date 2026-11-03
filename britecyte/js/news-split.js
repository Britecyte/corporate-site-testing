/**
 * News and Publications carousels.
 * Same controls as the journey and team carousels: arrow, dots, arrow.
 * Two cards on mobile, a 2×2 page on desktop.
 * - [data-news-split="publication"] → tag "Publication"
 * - [data-news-split="news"]        → everything else
 */

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Resolve first source link to a URL usable from any page on the site. */
function sourceHref(item) {
  const raw = item?.links?.[0]?.url;
  if (!raw) return "";
  if (raw === "#") return "#";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("//") || raw.startsWith("mailto:")) {
    return raw;
  }
  const cleaned = String(raw)
    .replace(/^\.\.\/\.\.\//, "")
    .replace(/^\.\.\//, "")
    .replace(/^\//, "");
  return new URL(`../${cleaned}`, import.meta.url).href;
}

function cardHtml(item) {
  const href = sourceHref(item);
  if (!href) return "";
  const external = /^https?:\/\//i.test(href) || href.includes("/assets/");
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `
    <a class="news-card surface surface-lg" href="${esc(href)}"${target}>
      <time class="microtype news-date" datetime="${esc(item.date)}">${esc(item.dateLabel)}</time>
      <h3 class="font-display news-title">${esc(item.title)}</h3>
      <p class="news-excerpt">${esc(item.excerpt)}</p>
    </a>`;
}

const desktopMq = window.matchMedia("(min-width: 768px)");

function equalizeNewsCards() {
  const cards = [...document.querySelectorAll(".news-card")];
  const slots = [...document.querySelectorAll(".news-slot")];
  cards.forEach((card) => { card.style.minHeight = ""; });
  if (cards.length) {
    const measured = Math.ceil(Math.max(...cards.map((card) => card.offsetHeight)));
    equalizeNewsCards.slotHeight = Math.max(equalizeNewsCards.slotHeight || 0, measured);
  }
  const height = equalizeNewsCards.slotHeight;
  if (!height) return;
  cards.forEach((card) => { card.style.minHeight = `${height}px`; });
  slots.forEach((slot) => { slot.style.minHeight = `${height}px`; });
}

class NewsPager {
  constructor(host, items) {
    this.host = host;
    this.items = items;
    this.page = 0;

    this.grid = document.createElement("div");
    this.grid.className = "news-grid";
    this.bar = document.createElement("div");
    this.bar.className = "news-pager-bar";
    this.prev = document.createElement("button");
    this.prev.type = "button";
    this.prev.className = "news-pager-btn";
    this.prev.setAttribute("aria-label", "Previous page");
    this.prev.textContent = "‹";
    this.next = document.createElement("button");
    this.next.type = "button";
    this.next.className = "news-pager-btn";
    this.next.setAttribute("aria-label", "Next page");
    this.next.textContent = "›";
    this.dots = document.createElement("div");
    this.dots.className = "news-pager-dots";

    this.bar.append(this.prev, this.dots, this.next);
    host.append(this.grid, this.bar);

    this.prev.addEventListener("click", () => this.go(this.page - 1));
    this.next.addEventListener("click", () => this.go(this.page + 1));
    desktopMq.addEventListener("change", () => this.render());
  }

  get pageSize() { return desktopMq.matches ? 4 : 2; }
  get pages() { return Math.max(1, Math.ceil(this.items.length / this.pageSize)); }

  go(page) {
    const pages = this.pages;
    if (pages <= 1) return;
    const next = (page % pages + pages) % pages;
    if (next === this.page) return;
    this.page = next;
    this.render();
  }

  render() {
    const size = this.pageSize;
    this.page = Math.min(this.page, this.pages - 1);
    const start = this.page * size;
    const slice = this.items.slice(start, start + size);
    const blanks = Math.max(0, size - slice.length);
    const slots = Array.from({ length: blanks }, () => '<div class="news-slot" aria-hidden="true"></div>').join("");
    this.grid.innerHTML = slice.map(cardHtml).join("") + slots;
    this.bar.classList.toggle("is-hidden", this.pages <= 1);
    this.syncDots();
    equalizeNewsCards();
    this.syncDots();
  }

  syncDots() {
    const pages = this.pages;
    if (this.dots.children.length !== pages) {
      this.dots.replaceChildren(...Array.from({ length: pages }, (_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "news-pager-dot";
        dot.setAttribute("aria-label", `Show page ${i + 1} of ${pages}`);
        dot.addEventListener("click", () => this.go(i));
        return dot;
      }));
    }
    Array.from(this.dots.children).forEach((dot, i) => {
      dot.classList.toggle("is-active", i === this.page);
      dot.toggleAttribute("aria-current", i === this.page);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const hosts = document.querySelectorAll("[data-news-split]");
  if (!hosts.length) return;

  const file = "../data/news.json";

  let items;
  try {
    const res = await fetch(new URL(file, import.meta.url));
    if (!res.ok) throw new Error(`${file} ${res.status}`);
    items = await res.json();
  } catch (err) {
    console.error("Failed to load news:", err);
    hosts.forEach((host) => {
      host.innerHTML = '<p class="news-load-error">Unable to load news right now.</p>';
    });
    return;
  }

  hosts.forEach((host) => {
    const want = host.dataset.newsSplit;
    const filtered = want === "publication"
      ? items.filter((i) => (i.tag || "") === "Publication")
      : items.filter((i) => (i.tag || "") !== "Publication");
    new NewsPager(host, filtered).render();
  });

  document.dispatchEvent(new CustomEvent("britecyte:contentchange"));
});

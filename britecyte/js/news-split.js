/**
 * Two different records, two different displays.
 * News is a dated log (tag, date, headline).
 * Publications are a citation list (date, title, one-line note).
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

function linkAttrs(item) {
  const href = sourceHref(item);
  if (!href) return null;
  const external = /^https?:\/\//i.test(href) || href.includes("/assets/");
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return { href, target };
}

function newsRow(item) {
  const link = linkAttrs(item);
  if (!link) return "";
  return `
    <a class="record record--news" href="${esc(link.href)}"${link.target}>
      <span class="record-meta">
        <span class="record-tag">${esc(item.tag || "News")}</span>
        <time datetime="${esc(item.date)}">${esc(item.dateLabel)}</time>
      </span>
      <span class="record-copy">
        <span class="record-title font-display">${esc(item.title)}</span>
        <span class="record-note">${esc(item.excerpt)}</span>
      </span>
    </a>`;
}

function citeRow(item) {
  const link = linkAttrs(item);
  if (!link) return "";
  return `
    <a class="record record--cite" href="${esc(link.href)}"${link.target}>
      <time datetime="${esc(item.date)}">${esc(item.dateLabel)}</time>
      <span class="record-copy">
        <span class="record-title">${esc(item.title)}</span>
        <span class="record-note">${esc(item.excerpt)}</span>
      </span>
    </a>`;
}

function renderList(host, items, row) {
  const list = document.createElement("div");
  list.className = "record-list";
  list.innerHTML = items.map(row).join("");
  host.replaceChildren(list);
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
    renderList(host, filtered, want === "publication" ? citeRow : newsRow);
  });

  document.dispatchEvent(new CustomEvent("britecyte:contentchange"));
});

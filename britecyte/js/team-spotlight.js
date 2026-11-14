/**
 * Team: portrait grid with gradient caption and dark bio overlay on hover / click.
 * Content comes from [data-team-data] templates in index.html.
 */
document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector('[data-section="team"]');
  const templates = Array.from(section?.querySelectorAll("[data-team-data] template") || []);
  const grid = section?.querySelector("[data-team-grid]");
  if (!templates.length || !grid) return;

  const cards = templates.map((tpl) => {
    const frag = tpl.content;
    const labels = frag.querySelectorAll(".type-sr");
    const photo = tpl.getAttribute("data-photo") || "";
    const alt = tpl.getAttribute("data-alt") || "";
    const name = labels[0]?.textContent.trim() || "";
    const role = labels[1]?.textContent.trim() || "";
    const bio = frag.querySelector(".team-data-bio")?.innerHTML || "";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "team-card";
    card.setAttribute("data-team-card", "");
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", name);
    card.tabIndex = 0;

    const inner = document.createElement("span");
    inner.className = "team-card-inner";

    const image = document.createElement("img");
    image.className = "team-card-photo";
    image.src = photo;
    image.alt = "";
    image.width = 393;
    image.height = 390;

    const comma = name.indexOf(",");
    const given = comma === -1 ? name : name.slice(0, comma).trim();
    const creds = comma === -1 ? "" : name.slice(comma + 1).trim();
    const roleLines = role.split(",").map((part) => part.trim()).filter(Boolean).join("<br>");

    const caption = document.createElement("span");
    caption.className = "team-card-name";
    caption.innerHTML = `
      <span class="team-card-name-text font-display">${given}</span>
      ${creds ? `<span class="team-card-creds">${creds}</span>` : ""}
      <span class="team-card-title">${roleLines}</span>`;

    const overlay = document.createElement("div");
    overlay.className = "team-card-bio";
    overlay.innerHTML = `<div><p class="team-card-bio-name font-display">${name.split(",")[0]}</p>${bio}</div>`;

    inner.append(image, caption, overlay);
    card.appendChild(inner);
    grid.appendChild(card);

    return card;
  });

  const setActive = (target) => {
    const was = target.classList.contains("is-active");
    cards.forEach((card) => {
      card.classList.remove("is-active");
      card.setAttribute("aria-pressed", "false");
    });
    if (!was) {
      target.classList.add("is-active");
      target.setAttribute("aria-pressed", "true");
    }
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => setActive(card));
  });

  grid.addEventListener("keydown", (event) => {
    if (!event.key.startsWith("Arrow")) return;
    const current = cards.findIndex((el) => el === document.activeElement);
    const base = current >= 0 ? current : 0;
    let next = base;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = Math.min(cards.length - 1, base + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = Math.max(0, base - 1);
    }
    if (next === current && current >= 0) return;
    event.preventDefault();
    cards[next].focus();
    setActive(cards[next]);
  });
});


/**
 * Team roster: every person is a named portrait in a row.
 * Choosing one swaps the panel beside it.
 *
 * NOTE: <template> children live in template.content (a DocumentFragment),
 * so they must be queried via tpl.content — not tpl.querySelector().
 */
document.addEventListener("DOMContentLoaded", () => {
  const templates = Array.from(document.querySelectorAll('[data-section="team"] [data-team-data] template'));
  const panel = document.querySelector("[data-team-spotlight]");
  const rosterHost = document.querySelector("[data-team-dots]");
  if (!templates.length || !panel || !rosterHost) return;

  const img = panel.querySelector("[data-spot-img]");
  const name = panel.querySelector("[data-spot-name]");
  const role = panel.querySelector("[data-spot-role]");
  const bio = panel.querySelector("[data-spot-bio]");

  const people = templates.map((tpl) => {
    const frag = tpl.content;
    const labels = frag.querySelectorAll(".type-sr");
    return {
      photo: tpl.getAttribute("data-photo") || "",
      alt: tpl.getAttribute("data-alt") || "",
      name: labels[0]?.textContent.trim() || "",
      role: labels[1]?.textContent.trim() || "",
      bio: frag.querySelector(".team-data-bio")?.innerHTML || "",
    };
  });

  people.forEach((person, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-portrait";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", person.name);

    const photo = document.createElement("span");
    photo.className = "team-portrait-img";
    const image = document.createElement("img");
    image.src = person.photo;
    image.alt = "";
    photo.appendChild(image);

    const label = document.createElement("span");
    label.className = "team-portrait-name";
    label.textContent = person.name.split(",")[0];

    button.append(photo, label);

    const fold = document.createElement("div");
    fold.className = "team-fold";
    const inner = document.createElement("div");
    inner.className = "team-fold-inner";
    const shot = document.createElement("div");
    shot.className = "team-fold-photo";
    const shotImg = document.createElement("img");
    shotImg.src = person.photo;
    shotImg.alt = person.alt;
    shot.appendChild(shotImg);
    const copy = document.createElement("div");
    copy.innerHTML = `<p class="team-feature-role microtype">${person.role}</p><div class="team-feature-bio">${person.bio}</div>`;
    inner.append(shot, copy);
    fold.appendChild(inner);
    button.appendChild(fold);

    button.addEventListener("click", () => show(i));
    rosterHost.appendChild(button);
  });

  const buttons = Array.from(rosterHost.children);

  function show(i) {
    const next = (i + people.length) % people.length;
    const narrow = window.matchMedia("(max-aspect-ratio: 1/1)").matches;
    if (narrow && buttons[next]?.classList.contains("is-active")) {
      buttons[next].classList.remove("is-active");
      buttons[next].setAttribute("aria-selected", "false");
      buttons[next].setAttribute("aria-expanded", "false");
      return;
    }
    const person = people[next];
    if (!person) return;

    img.src = person.photo;
    img.alt = person.alt;
    name.textContent = person.name;
    role.textContent = person.role;
    bio.innerHTML = person.bio;
    panel.classList.remove("is-swapping");
    requestAnimationFrame(() => panel.classList.add("is-swapping"));

    buttons.forEach((button, j) => {
      const on = j === next;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-selected", String(on));
      button.setAttribute("aria-expanded", String(on));
      button.tabIndex = on ? 0 : -1;
    });
  }

  rosterHost.addEventListener("keydown", (event) => {
    const current = buttons.findIndex((b) => b.classList.contains("is-active"));
    if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); buttons[(current + 1) % buttons.length]?.focus(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); buttons[(current - 1 + buttons.length) % buttons.length]?.focus(); }
  });

  show(0);
});

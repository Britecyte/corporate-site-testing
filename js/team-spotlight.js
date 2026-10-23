/**
 * Team feature card — manual arrows and dots only (no auto-advance).
 *
 * NOTE: <template> children live in template.content (a DocumentFragment),
 * so they must be queried via tpl.content — not tpl.querySelector().
 */
document.addEventListener("DOMContentLoaded", () => {
  const templates = Array.from(document.querySelectorAll('[data-section="team"] [data-team-data] template'));
  const feature = document.querySelector("[data-team-spotlight]");
  if (!templates.length || !feature) return;

  const img = feature.querySelector("[data-spot-img]");
  const name = feature.querySelector("[data-spot-name]");
  const role = feature.querySelector("[data-spot-role]");
  const bio = feature.querySelector("[data-spot-bio]");
  const dotsHost = document.querySelector("[data-team-dots]");
  const prevBtn = document.querySelector("[data-team-prev]");
  const nextBtn = document.querySelector("[data-team-next]");

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

  let active = -1;

  people.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "team-dot";
    dot.setAttribute("aria-label", `Show team member ${i + 1} of ${people.length}`);
    dot.addEventListener("click", () => show(i));
    dotsHost.appendChild(dot);
  });
  const dots = Array.from(dotsHost.children);

  function show(i) {
    const next = (i + people.length) % people.length;
    const person = people[next];
    if (!person) return;
    active = next;

    img.src = person.photo;
    img.alt = person.alt;
    name.textContent = person.name;
    role.textContent = person.role;
    bio.innerHTML = person.bio;

    dots.forEach((dot, j) => {
      dot.classList.toggle("is-active", j === next);
      if (j === next) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  prevBtn?.addEventListener("click", () => show(active - 1));
  nextBtn?.addEventListener("click", () => show(active + 1));

  show(0);
});

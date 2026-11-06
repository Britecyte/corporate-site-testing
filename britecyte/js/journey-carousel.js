/**
 * History timeline. The year rail chooses a milestone, and scrolling through
 * the section advances it too, so the story plays as you pass.
 */
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-journey-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-journey-slide]"));
  if (slides.length < 2) return;

  const rail = root.querySelector("[data-journey-dots]");
  const section = root.closest("section") || root;
  let index = 0;
  let locked = 0;

  slides.forEach((slide, i) => {
    const year = slide.querySelector(".journey-year")?.textContent.trim() || String(i + 1);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey-year-btn";
    button.textContent = year;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", `${year}: ${slide.querySelector("h3")?.textContent.trim() || "milestone"}`);
    button.addEventListener("click", () => {
      locked = performance.now() + 1400;   // pause scroll-driven changes after a choice
      show(i);
    });
    rail.appendChild(button);
  });

  const buttons = Array.from(rail.children);

  function show(i) {
    index = (i + slides.length) % slides.length;
    root.style.setProperty("--journey-i", String(index));
    root.style.setProperty("--journey-n", String(Math.max(1, slides.length - 1)));
    root.style.setProperty("--journey-count", String(slides.length));
    slides.forEach((slide, j) => slide.classList.toggle("is-active", j === index));
    buttons.forEach((button, j) => {
      const on = j === index;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
    });
  }

  function onScroll() {
    if (performance.now() < locked) return;
    const rect = section.getBoundingClientRect();
    const travel = section.offsetHeight - window.innerHeight;
    const progress = travel > 0
      ? Math.min(1, Math.max(0, -rect.top / travel))
      // short sections still advance as they cross the window
      : Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
    const next = Math.min(slides.length - 1, Math.floor(progress * slides.length));
    if (next !== index) show(next);
  }

  rail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); locked = performance.now() + 1400; show(index + 1); buttons[(index) % buttons.length]?.focus(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); locked = performance.now() + 1400; show(index - 1); buttons[(index) % buttons.length]?.focus(); }
  });

  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; onScroll(); });
  }, { passive: true });

  show(0);
});

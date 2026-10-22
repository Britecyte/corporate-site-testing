/**
 * Journey carousel — manual prev/next and dots only (no auto-advance).
 */
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-journey-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-journey-slide]"));
  if (slides.length < 2) return;

  const dotsHost = root.querySelector("[data-journey-dots]");
  let index = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "journey-dot";
    dot.setAttribute("aria-label", `Show milestone ${i + 1} of ${slides.length}`);
    dot.addEventListener("click", () => show(i));
    dotsHost.appendChild(dot);
  });
  const dots = Array.from(dotsHost.children);

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, j) => slide.classList.toggle("is-active", j === index));
    dots.forEach((dot, j) => {
      dot.classList.toggle("is-active", j === index);
      if (j === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  root.querySelector("[data-journey-prev]")?.addEventListener("click", () => show(index - 1));
  root.querySelector("[data-journey-next]")?.addEventListener("click", () => show(index + 1));

  show(0);
});

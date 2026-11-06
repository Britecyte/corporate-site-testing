/**
 * The science section is a process, not a stack of equal cards.
 * One step is open. Choosing another step opens that one.
 */
document.addEventListener("DOMContentLoaded", () => {
  const steps = [...document.querySelectorAll(".pathway-step")];
  if (steps.length < 2) return;

  function open(step) {
    steps.forEach((s) => {
      const on = s === step;
      s.classList.toggle("is-open", on);
      s.setAttribute("aria-expanded", String(on));
    });
  }

  steps.forEach((step, i) => {
    step.tabIndex = 0;
    step.setAttribute("role", "button");
    step.setAttribute("aria-expanded", "false");
    step.addEventListener("click", () => open(step));
    step.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(step);
      }
    });
    if (i === 0) open(step);
  });
});

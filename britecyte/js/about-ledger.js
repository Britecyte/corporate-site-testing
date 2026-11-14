/**
 * Sticky-scroll driver for the Who We Are (#about) section:
 * Act 1 (Replace -> Restore) transitions into Act 2 (Kinetic Ledger + Story).
 */
document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector("[data-about-track]");
  const stage = document.querySelector("[data-about-stage]");
  if (!track || !stage) return;

  const beatCount = Number(stage.dataset.beats || 4);
  const stats = Array.from(stage.querySelectorAll(".about-stat"));
  const beats = Array.from(stage.querySelectorAll(".about-beat"));

  let active = -1;

  function setBeat(idx) {
    if (idx === active) return;
    active = idx;
    stats.forEach((el, i) => el.classList.toggle("is-active", i === idx));
    beats.forEach((el, i) => el.classList.toggle("is-active", i === idx));
  }

  function headerH() {
    return document.getElementById("site-header")?.getBoundingClientRect().height || 64;
  }

  function update() {
    const h = headerH();
    const total = track.offsetHeight - (window.innerHeight - h);
    const scrolled = Math.min(Math.max(h - track.getBoundingClientRect().top, 0), Math.max(1, total));
    const p = total > 0 ? scrolled / total : 0;
    stage.style.setProperty("--p", p.toFixed(4));
    stage.querySelector(".about-open")?.classList.toggle("is-hidden", p > 0.24);

    const beatProgress = Math.min(1, Math.max(0, (p - 0.22) / 0.78));
    const idx = Math.min(beatCount - 1, Math.floor(beatProgress * beatCount));
    setBeat(idx);
  }

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; update(); });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  setBeat(0);
  update();
});

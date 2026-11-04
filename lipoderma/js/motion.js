
/* ── hero provider search: hands the query to the directory ───── */
const heroForm = document.querySelector('[data-hero-find]');
if (heroForm) {
  heroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = heroForm.elements.q.value.trim();
    const target = document.getElementById('providers');
    const input = document.getElementById('provider-search');
    if (input) input.value = q;
    target?.scrollIntoView({ behavior: 'smooth' });
    // the directory module loads async; nudge it once it is listening
    [300, 1200].forEach(ms => setTimeout(() => input?.dispatchEvent(new Event('input', { bubbles: true })), ms));
  });
}

/* ── mobile sticky CTA: hide where the page already has the action ── */
const cta = document.querySelector('[data-sticky-cta]');
if (cta && 'IntersectionObserver' in window) {
  const covered = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => en.isIntersecting ? covered.add(en.target) : covered.delete(en.target));
    cta.classList.toggle('is-hidden', covered.size > 0);
  }, { threshold: 0.15 });
  document.querySelectorAll('.hero, #providers, #contact').forEach(el => io.observe(el));
}

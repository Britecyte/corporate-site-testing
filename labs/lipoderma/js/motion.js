
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


/* ── hero provider search: hands the query to the directory ───── */
const heroForm = document.querySelector('[data-hero-find]');
if (heroForm) {
  heroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = heroForm.elements.q.value.trim();
    const target = document.getElementById('providers');
    const input = document.getElementById('provider-search');
    if (target) {
      const header = document.querySelector('.site-header')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    if (input) {
      input.value = q;
      input.dataset.commit = q ? 'place' : '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
    }
  });
}

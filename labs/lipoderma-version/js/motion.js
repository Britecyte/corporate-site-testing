
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

/* The name "Loren Marie" is burned into the opening frame, from about
   61% to 69% of the 16:9 picture. Keep the form below that band as the
   video is cropped to the window. */
const NAME_BOTTOM = 0.72;
const VIDEO_RATIO = 16 / 9;

function clearHeroName() {
  const hero = document.querySelector('.hero');
  const video = document.querySelector('.hero-laura');
  const form = document.querySelector('.hero-find');
  if (!hero || !video || !form) return;

  form.style.marginTop = '';
  if (window.matchMedia('(max-aspect-ratio: 1/1)').matches) return;
  const box = hero.getBoundingClientRect();
  if (!box.width || !box.height) return;

  const pos = getComputedStyle(video).objectPosition.trim().split(/\s+/);
  const anchorY = (parseFloat(pos[1]) || 50) / 100;
  const boxRatio = box.width / box.height;

  let nameBottom;
  if (boxRatio > VIDEO_RATIO) {
    const renderedH = box.width / VIDEO_RATIO;
    const extra = renderedH - box.height;
    const videoTop = -extra * anchorY;
    nameBottom = videoTop + NAME_BOTTOM * renderedH;
  } else {
    nameBottom = NAME_BOTTOM * box.height;
  }
  nameBottom -= box.height * 0.01;

  const gap = box.height * 0.03;
  const formTop = form.getBoundingClientRect().top - box.top;
  const formHeight = form.getBoundingClientRect().height;
  let need = nameBottom + gap - formTop;
  const room = box.height - (formTop + formHeight) - box.height * 0.04;
  if (need > room) need = Math.max(0, room);
  if (need > 1) {
    const base = parseFloat(getComputedStyle(form).marginTop) || 0;
    form.style.marginTop = ((base + need) / box.height * 100) + 'svh';
  }
}

clearHeroName();
window.addEventListener('resize', clearHeroName);
document.querySelector('.hero-laura')?.addEventListener('loadeddata', clearHeroName);

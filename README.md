# Corporate site testing

Preview fork of [Britecyte/britecyte-website](https://github.com/Britecyte/britecyte-website).

This is **not** the live site. It does not use the britecyte.com domain.

- Live site: https://britecyte.com/
- This preview: https://britecyte.github.io/corporate-site-testing/

## Scrolling contract

Homepage sections are listed in `data/sections.json`. Each is a direct child of `<main>` with a canonical `id` and `data-section`. Use `window.Britecyte.scrollToSection("pipeline")` or a plain `#pipeline` hash; both land the section top just below the fixed header, instantly. Reserved aliases (`#products` → `#pipeline`, `#science` → `#platform`) still work.

## Safety

The production `CNAME` for `britecyte.com` is removed here on purpose. GitHub Pages on this repo is github.io only. If you sync from upstream, delete `CNAME` again before deploying so the live domain cannot attach to this fork.

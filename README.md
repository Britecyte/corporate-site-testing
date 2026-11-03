# Corporate site testing → dev space for both public sites

Two independent sites live in this repo, each in its own folder, each deployable on its own.

| Folder | Site | Local URL |
| --- | --- | --- |
| `lipoderma/` | New Lipoderma build (patient + provider) | http://127.0.0.1:8002/lipoderma/ |
| `britecyte/` | Britecyte company site | http://127.0.0.1:8002/britecyte/ |
| `index.html` | Repo landing page linking both | http://127.0.0.1:8002/ |

Neither site is live. There is no `CNAME` here on purpose, so a GitHub Pages deploy
stays on `britecyte.github.io` and can never attach to `britecyte.com` or `lipoderma.com`.

## Run it locally

```bash
python3 serve.py
```

Serves the repo root on port 8002 with caching disabled, so a reload always shows your edit.
Printed at startup: the phone-accessible URL on the same Wi-Fi.

## How the two sites relate

They share design lineage — the same type pairing (Instrument Serif display, Plus Jakarta Sans
microtype), the same ink/bone palette, the same orange accent. They do not share code. A CSS
change to one never affects the other, which is the point: Lipoderma is a consumer product site
with a campaign voice, Britecyte is a corporate site with an institutional voice.

```
lipoderma/
  index.html            campaign homepage
  gallery/index.html    filterable before/after gallery
  science/index.html    processing pathway + imaging data
  css/site.css          design system (tokens, type, layout, components)
  css/pages.css         rules used only by sub-pages
  js/main.js            header, nav, reveals, anatomy, doors, compare, faq
  js/providers.js       provider map + directory
  js/gallery.js         gallery grid + lightbox
  js/science.js         sub-page shell
  data/providers.json   98 providers, geocoded
  data/gallery.json     case categories and examples
  img/                  optimized webp (hero, gallery, product, platform)
  fonts/                self-hosted woff2
  vendor/leaflet/       self-hosted map library
```

## Lipoderma build notes

**Structure and intent.** The brief is: lead with intrigue, follow with education, connect back to
restoration. The homepage follows that order and nothing else competes with it — the quiz that used
to sit in the hero is gone, because a lead-capture widget in the first screen undercuts the hook.

**The anatomy section is the one signature interaction.** It is a scroll-driven cross-section:
as you move through it, the adipose band grows from nothing to its full thickness, the adipocyte
cells populate the layer, and the measure annotation extends. Four steps of copy cross-fade beside
it. It is not a particle field or a cursor trail — it is the argument of the page, drawn.

**Tone.** No competitor is disparaged. The brand brief explicitly asks for that, so the copy says
what adipose tissue is rather than what filler isn't. Where the old site said "not synthetic gel,"
the new site says "adipose tissue restoring adipose tissue."

**Audience split.** Patients, plastic surgeons, and medspas get genuinely different copy, not the
same paragraph with a different heading. That difference is the whole reason the doors exist.

## Adding a case to the gallery

1. Drop `<slug>-before.webp` and `<slug>-after.webp` into `lipoderma/img/gallery/`.
2. Add the case to the matching category in `lipoderma/data/gallery.json` with a unique `slug`.
3. Nothing else — the grid, filters, and lightbox all read from that file.

## Britecyte site

Unchanged in substance; relocated to `britecyte/` and still self-contained. Its `data/news.json`,
`scripts/build-news.py`, and `content/` pipeline all work the same way relative to its new root.

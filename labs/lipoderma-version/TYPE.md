# Lipoderma type standard

One ladder for every page. The tokens live at the top of `css/site.css`; components use the tokens, never raw sizes.

## Families

- **Bodoni FLF (serif)** — headlines and statements, 400. Italic orange for the emphasized phrase.
- **Open Sauce Sans** — everything else: body, labels, buttons, tables, forms, captions.
- Serif never goes below `--type-lede`. Smaller than that, use the sans.

## Sizes (largest → smallest)

| Token | Max size | Family · weight | Used for |
| --- | --- | --- | --- |
| `--type-numeral` | 8.5rem | serif · 700 | the hero FAT, the 50-states numeral |
| `--type-hero` | 6.5rem | serif · 400 | homepage hero line |
| `--type-title` | 5rem | serif · 400 | page titles (h1 on subpages) |
| `--type-statement` | 4.25rem | serif · 400 | the one loud line in a section ("simply… fat?", "FDA-regulated", sign-offs, contact) |
| `--type-h2` | 3.15rem | serif · 400 | section headings |
| `--type-h3` | 2.15rem | serif · 400 | subsection headings, h1 subtitles |
| `--type-h4` | 1.5rem | serif · 400 | card and list titles (facilities, papers, cases) |
| `--type-lede` | 1.35rem | sans · 400 | intro paragraph under a title; sans 600 for small headings inside glass cards |
| `--type-body` | 1.0625rem | sans · 400 | paragraphs, FAQ questions (600) |
| `--type-small` | 0.875rem | sans · 400 | dense copy: cards, tables, lists, footer links |
| `--type-caption` | 0.75rem | sans · 400 | captions, notes, text links (600) |
| `--type-label` | 0.6875rem | sans · 600 · caps · .16em | kickers, nav, buttons, section numbers |
| `--type-micro` | 0.625rem | sans · 600 · caps | sub-labels under names, filter chips |
| `--type-tag` | 0.5625rem | sans · 600 · caps | Before / After tags on images |

## Weights

- `--weight-body` 400 — all text by default, including every serif headline.
- `--weight-strong` 600 — labels, buttons, nav, FAQ questions, `<strong>`.
- `--weight-display` 700 — only the decorative numerals.

## Leading

`--lead-display` .98 (hero, titles) · `--lead-title` 1.02 (statements) · `--lead-heading` 1.05 (h2) · `--lead-subhead` 1.15 (h3, h4) · `--lead-small` 1.5 (small copy) · `--lead-body` 1.6 (paragraphs) · `--lead-label` 1.2 (labels)

## Tracking

`--track-tight` −.03em on display sizes · `--track-heading` −.02em on headings · 0 on body · `--track-label` .16em on caps labels.

## Rules

1. One loud line per section, at `--type-statement` or bigger.
2. A heading is always followed by a smaller step, never the same size.
3. Uppercase only at label size and below, always with `--track-label`.
4. New CSS picks a token from this table. If nothing fits, add a token here first.

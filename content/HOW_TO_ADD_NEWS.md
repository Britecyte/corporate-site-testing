# How to add or edit news (non-engineers)

You only need to edit **one file**.

## 1. Edit the news list

Open:

`data/news.json`

Copy an existing block and change the fields:

```json
{
  "id": "short-unique-name",
  "date": "2026-03",
  "dateLabel": "March 2026",
  "title": "Your headline here",
  "excerpt": "One or two sentences for the card preview.",
  "links": [
    {
      "label": "Read the press release",
      "url": "https://example.com/full-article"
    }
  ]
}
```

### Field tips

| Field | What to put |
|-------|-------------|
| `id` | Lowercase only, hyphens OK (`fda-clearance-2026`). Internal id only. |
| `date` | `YYYY-MM` or `YYYY-MM-DD` for sorting |
| `dateLabel` | What people see (`March 2026`) |
| `excerpt` | Short preview on the card |
| `links` | First link is what the card opens (PDF, publisher page, or press release) |

For PDFs hosted on this site, use a path like:

`assets/publications/your-file.pdf`

Put **newest items first** in the file.

## 2. Preview

With the local server running (`python3 serve.py`), open:

- http://127.0.0.1:8002/#news

The homepage loads news and publications from `data/news.json`. Clicking a card opens the source link directly.

## Don’t break the JSON

- Keep commas between items
- No trailing comma after the last item
- Use straight quotes `"` only
- If something fails, paste the file into https://jsonlint.com to find the typo

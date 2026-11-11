# Global Art Monitor

The auction and market research platform. Live at https://globalartmonitor.com once the domain is pointed here.

This is a plain static site. There is nothing to install.

## How to change things

| To change | Edit this file |
|---|---|
| A sale, price, estimate or date | `data/sales.json` |
| Article text, glossary, artist notes, contact email, disclosure | `data/content.json` |
| Colours, fonts, spacing | `assets/site.css` |
| Loader, menu, filters, motion | `assets/site.js` |
| Page layouts | `tools/build.py` |

After any change to the first, second or last row, rebuild the pages:

```
python3 tools/build.py
```

Then commit and push. GitHub Pages publishes the `main` branch.

## Adding a sale

Copy an entry in `data/sales.json` and fill it in. Leave a figure as `null` if it is not known and the page will show "To confirm". Set `hammer_basis` to `published` if a house or database states the hammer price, or `calculated` if it was worked back from the total.

## Adding an artist

1. Add the artist under `artists` in `data/sales.json`.
2. Add their sales to the `sales` list with the same slug.
3. Add a short entry for them under `BIOS` in `tools/content.py`.
4. Rebuild.

## Adding images

Save an artist image as `assets/images/<artist-slug>.jpg` (for example `assets/images/zara-muse.jpg`) and rebuild. It appears on that artist's profile page.

## Colours

Blush Pink `#F3C3C8` (60%), Charcoal Ink `#2A2A2F` (30%), Fresh Mint `#22E3A2` (10%).

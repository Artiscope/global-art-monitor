# How Astro builds this site

Since the move to Astro, nothing about the pages, their addresses or how
they are edited has changed.

- The figures still live in `data/sales.json`, the words in
  `data/content.json` and the page layouts in `data/pages.json`. Artiscope
  Digital Home reads and writes those files as before, and its preview
  still matches the published page, because the pages are still made by
  `tools/build.mjs` and `assets/render.js`.
- `src/content.config.ts` turns the auction data rules into checks. A sale
  must name a known artist, a date written as YYYY-MM-DD, a three letter
  currency, prices as whole numbers or null (never text or a guess), a
  hammer basis whenever there is a hammer price, a low estimate no higher
  than the high one, and a source with a working-looking link. Articles
  need a title and their words. A broken entry stops the build with a
  plain message instead of reaching the live site.
- `src/lib/site.mjs` runs `.github/scripts/assemble.sh`, which builds the
  pages and gathers the public files as before. It hands the pages to
  Astro and puts everything else (assets, sitemap, robots.txt, llms.txt,
  the search list) into `public/` unchanged. It adds two things to the
  head of each page: a short cross-fade between pages with the top bar
  held still, and background fetching of a page when a reader rests on
  its link. Browsers that cannot do either simply change page as before.
- Price Explorer, the charts, the results filters, the daily price game
  and site search are the same scripts as before and work the same way.

Commands: `npm ci` once, then `npx astro dev` for a local copy that
reloads as you edit (data files and assets included), or
`npx astro build` to build into `_site`.

`tools/build.mjs` and `assets/render.js` stay the same as the Digital
Home template, so a design change is still made there and copied here.

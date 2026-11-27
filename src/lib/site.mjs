// Makes the site's pages with its own build (tools/build.mjs, which runs assets/render.js), the same
// code Artiscope Digital Home uses for its preview. So the published pages, their checks and
// the preview stay exactly as they were before the move to Astro.
// Pages (index.html and 404.html) are handed to Astro, which adds the smoother page changes.
// Everything else (assets, sitemap, robots.txt, llms.txt, search lists, old-address forwards)
// goes into public/ unchanged.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const BUILT = path.join(ROOT, ".site-build");
const PUBLIC = path.join(ROOT, "public");

// The smoother feel, added to the head of every page:
// - a short cross-fade between pages, with the masthead held still (browsers that cannot do
//   this simply change page as before, and it is switched off for readers who ask for less motion);
// - pages fetched in the background when a reader rests on a link, so the next page opens at once.
//   Only fetched, never run, so visitor statistics are not counted for pages nobody opened.
const FEEL = '<style id="page-changes">@view-transition{navigation:auto}.site-head{view-transition-name:masthead}' +
  "::view-transition-old(root),::view-transition-new(root){animation-duration:.2s}" +
  "@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}</style>\n" +
  '<script type="speculationrules">{"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/preview/*"}}]},"eagerness":"moderate"}]}</script>\n';

const isPage = (rel) => rel === "404.html" || rel === "index.html" || rel.endsWith("/index.html");

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out); else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

export function buildSite() {
  fs.rmSync(BUILT, { recursive: true, force: true });
  // the site's own build and gathering of its public files (the same script the publish used
  // before Astro), with its own checks; a bad edit stops here with a plain message
  execFileSync("bash", [path.join(ROOT, ".github", "scripts", "assemble.sh"), ROOT, BUILT], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  for (const rel of walk(BUILT)) {
    if (isPage(rel)) continue;
    const to = path.join(PUBLIC, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(BUILT, rel), to);
  }
}

// every page's file name
export const pages = () => walk(BUILT).filter(isPage);

// one page, read fresh each time so the local copy shows edits at once, with the smoother feel added
export const pageHtml = (rel) => fs.readFileSync(path.join(BUILT, rel), "utf8").replace("</head>", FEEL + "</head>");

// "stories/x/index.html" -> "stories/x"; the home page -> undefined
export const routeOf = (p) => (p === "index.html" ? undefined : p.replace(/\/index\.html$/, ""));

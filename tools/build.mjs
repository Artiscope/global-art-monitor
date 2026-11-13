// Builds the Global Art Monitor pages into the repository root, from the data files.
// The drawing itself is in assets/render.js, which the page editor in Artiscope
// Digital Home also uses, so the preview and the published page always match.
//   node tools/build.mjs        (python3 tools/build.py does the same)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GAM = createRequire(import.meta.url)(path.join(ROOT, "assets", "render.js"));
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };

const content = read("data/content.json"), sales = read("data/sales.json"), pages = read("data/pages.json");
const images = fs.existsSync(path.join(ROOT, "data/images.json")) ? read("data/images.json") : {};
const imageFiles = fs.existsSync(path.join(ROOT, "assets/images")) ? fs.readdirSync(path.join(ROOT, "assets/images")) : [];

// The colours and typefaces chosen in Artiscope Digital Home, for the page head.
function themeHead() {
  const p = path.join(ROOT, "data", "theme.json");
  if (!fs.existsSync(p)) return "";
  const theme = JSON.parse(fs.readFileSync(p, "utf8"));
  let out = "";
  for (const link of theme.font_links || []) {
    if (typeof link === "string" && link.startsWith("https://fonts.googleapis.com/css2?") && !/["<>\s]/.test(link)) out += '<link href="' + link.replace(/&/g, "&amp;") + '" rel="stylesheet">\n';
  }
  const css = theme.css || "";
  if (css && /^:root\{[^<>{}]*\}$/.test(css)) out += '<style id="theme">' + css + "</style>\n";
  return out;
}

// Refuses to build if the page list would not draw, so a bad edit cannot blank the site.
const KINDS = ["hero", "status", "timeline", "words", "features", "profiles", "page-links", "method", "page-head", "results-table", "latest-result", "glossary", "panel", "prose", "contact-form",
  "announcement", "columns", "space", "quote", "faq", "button",
  "picture-banner", "slideshow", "gallery", "logo-row", "picture", "text-picture",
  "artworks", "exhibitions", "career", "press",
  "signup", "visit"];
function checkPages() {
  for (const key of ["header", "footer"]) {
    const part = (pages.shared || {})[key];
    if (!part || typeof part !== "object" || typeof part.settings !== "object") fail("data/pages.json must have the shared part '" + key + "' with settings.");
  }
  for (const [key, pg] of Object.entries(pages.pages || {})) {
    if (!pg || !Array.isArray(pg.sections) || !String(pg.path || "").endsWith("index.html")) fail("The page '" + key + "' in data/pages.json needs a path ending in index.html and a list of sections.");
    if (pg.path.includes("..") || pg.path.startsWith("/")) fail("The page '" + key + "' has a path that is not allowed.");
    const seen = new Set();
    for (const sec of pg.sections) {
      if (!sec || !KINDS.includes(sec.type)) fail("The page '" + key + "' has a section of a kind the site cannot draw: " + JSON.stringify(sec && sec.type));
      const sid = String(sec.id || "");
      if (!/^[A-Za-z0-9_-]+$/.test(sid) || seen.has(sid)) fail("Every section on page '" + key + "' needs its own id of letters, digits and hyphens: " + JSON.stringify(sid));
      seen.add(sid);
      if (sec.settings != null && typeof sec.settings !== "object") fail("The settings of section '" + sid + "' on page '" + key + "' must be a list of fields.");
    }
  }
}

checkPages();
const data = GAM.fromFiles(content, sales, images, imageFiles);
const site = GAM.Site(data, pages, themeHead());
const written = [];
const write = (p, text) => { const out = path.join(ROOT, p); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, text); written.push(p); };
for (const pg of site.all()) write(pg.path, pg.html);

const url = data.site.url;
const urls = written.filter((p) => p.endsWith("index.html")).map((p) => p.slice(0, -"index.html".length));
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => "<url><loc>" + url + u + "</loc><lastmod>" + data.published + "</lastmod></url>\n").join("") + "</urlset>\n");
write("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: " + url + "sitemap.xml\n");
write(".nojekyll", "");
const mark = (fg) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + GAM.MARK_INNER.split("{fg}").join(fg) + "</svg>\n";
const tile = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#2A2A2F"/><g transform="translate(16.8 16.8) scale(.72)">' + GAM.MARK_INNER.split("{fg}").join("#F3C3C8") + "</g></svg>\n";
write("assets/favicon.svg", tile);
write("assets/brand/gam-tile.svg", tile);
write("assets/brand/gam-mark-charcoal.svg", mark("#2A2A2F"));
write("assets/brand/gam-mark-blush.svg", mark("#F3C3C8"));
console.log("Built " + written.length + " files");

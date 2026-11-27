/* Global Art Monitor: draws every page from the site's data.
   Used twice: by tools/build.mjs to write the published pages, and by the
   page editor in Artiscope Digital Home to redraw a page as it is edited.
   The data is one object (see fromFiles below):
     { published, published_text, site, sections, glossary, articles, artists }
   plus the page list from data/pages.json and the theme block for the head. */
(function (root) {
  "use strict";
  // Every price is shown in the currency of the sale. A currency with no symbol here is shown by its code.
  var SYMBOL = { GBP: "£", USD: "US$", EUR: "€", HKD: "HK$", AUD: "A$", CAD: "C$", SGD: "S$", NZD: "NZ$", JPY: "JP¥", CNY: "CN¥" };
  var MARK_INNER = '<path d="M 88.3 31.7 A 40 40 0 1 0 100 60" fill="none" stroke="{fg}" stroke-width="13" stroke-linecap="round"/>' +
    '<line x1="40" y1="60" x2="78" y2="60" stroke="{fg}" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="40" cy="60" r="6" fill="{fg}"/><circle cx="58" cy="60" r="6" fill="{fg}"/>' +
    '<circle cx="78" cy="60" r="10.5" fill="#3FBF9F"/>';
  var MARK = '<svg class="mark" viewBox="0 0 120 120" aria-hidden="true">' + MARK_INNER.split("{fg}").join("currentColor") + '</svg>';
  var IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];

  // ----- small helpers, written to match the old build exactly -----
  function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;"); }
  function txt(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function commas(n) { n = Number(n); var s = Math.abs(n % 1) === 0.5 ? String(2 * Math.round(n / 2)) : n.toFixed(0), neg = s.charAt(0) === "-"; if (neg) s = s.slice(1); return (neg ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function money(n, cur) {
    if (!cur) return commas(n) + " (currency to confirm)";
    return (SYMBOL[cur] || (cur + " ")) + commas(n);
  }
  // Rough width of a price in ems, so the homepage card can size it to fit on one line.
  function priceWidth(t) {
    var w = 0;
    String(t).split("").forEach(function (ch) {
      w += /[0-9]/.test(ch) ? 0.5 : /[,. ]/.test(ch) ? 0.26 : /[A-Z]/.test(ch) ? 0.7 : 0.56;
    });
    return (w * 1.08).toFixed(2);
  }
  function plain(n) { return commas(n); }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function slugify(t) { return Array.from(String(t).toLowerCase()).map(function (ch) { return /[\p{L}\p{N}]/u.test(ch) ? ch : "-"; }).join("").replace(/^-+|-+$/g, ""); }
  function get(o, k, d) { return o && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined ? o[k] : d; }
  // Python's json.dumps: ", " and ": " between parts, and every character past ASCII written as \uXXXX
  function pyJson(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v).replace(/[\u007f-￿]/g, function (c) { return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4); });
    if (Array.isArray(v)) return "[" + v.map(pyJson).join(", ") + "]";
    return "{" + Object.keys(v).map(function (k) { return pyJson(k) + ": " + pyJson(v[k]); }).join(", ") + "}";
  }

  // ----- turning the data files into one object -----
  // content: data/content.json, sales: data/sales.json, images: data/images.json,
  // imageFiles: the names of the files in assets/images.
  function fromFiles(content, sales, images, imageFiles) {
    images = images || {}; imageFiles = imageFiles || [];
    var artists = Object.keys(sales.artists || {}).map(function (slug) {
      var a = sales.artists[slug], bio = (content.bios || {})[slug] || {}, note = images[slug] || {};
      var image = "";
      if ("file" in note) image = note.file && imageFiles.indexOf(note.file) >= 0 ? note.file : "";
      else for (var i = 0; i < IMAGE_EXTS.length; i++) { if (imageFiles.indexOf(slug + "." + IMAGE_EXTS[i]) >= 0) { image = slug + "." + IMAGE_EXTS[i]; break; } }
      return {
        slug: slug, name: a.name, line: a.line || "", houses: (a.houses || []).slice(),
        summary: bio.summary || "", body: (bio.body || []).slice(), standing: (bio.standing || []).slice(), career: (bio.career || []).slice(), works: (bio.works || []).map(function (w) { return Object.assign({}, w); }), quotes: (bio.quotes || []).map(function (q) { return Object.assign({}, q); }), reading: (bio.reading || []).slice(), compare: (bio.compare || []).slice(), sources: (bio.sources || []).map(function (s) { return s.slice(); }),
        image: image, alt: note.alt || "", caption: note.caption || "",
        sales: (sales.sales || []).filter(function (s) { return s.artist === slug; }).map(function (s) { return Object.assign({}, s); }),
      };
    });
    return {
      published: content.published, published_text: content.published_text, site: Object.assign({}, content.site),
      sections: (content.sections || []).map(function (s) { return s.slice(); }), glossary: (content.glossary || []).map(function (g) { return g.slice(); }),
      articles: (content.features || []).map(function (f) { return Object.assign({}, f); }), artists: artists,
    };
  }

  // ----- one drawing of the site, from one set of data -----
  function Site(D, PAGES, THEME, opts) {
    opts = opts || {};
    var SITE = D.site || {}, PUBLISHED = D.published, PUBLISHED_TEXT = D.published_text;
    // Structured data needs a full date and time with a time zone, not a bare date.
    var PUBLISHED_DT = /^\d{4}-\d{2}-\d{2}$/.test(String(PUBLISHED || "")) ? PUBLISHED + "T00:00:00+00:00" : PUBLISHED;
    var SECTIONS_LIST = D.sections || [], GLOSSARY = D.glossary || [];
    var FEATURES = (D.articles || []).filter(function (f) { return !f.hidden || (opts.show && f.slug === opts.show); });
    var FEATURE_BY_SLUG = {}; FEATURES.forEach(function (f) { FEATURE_BY_SLUG[f.slug] = f; });
    var ARTISTS = {}, ARTIST_KEYS = [];
    (D.artists || []).forEach(function (a) { ARTISTS[a.slug] = a; ARTIST_KEYS.push(a.slug); });
    // Artists in alphabetical order by the name as written, so a new artist lands in the right place by itself.
    // Artists with a priced sale, the most recent sale first.
    function recentArtists() {
      var last = {};
      SALES.forEach(function (s) { if (s.date && (s.premium || s.hammer) && (!last[s.artist] || s.date > last[s.artist])) last[s.artist] = s.date; });
      return ARTIST_KEYS.filter(function (x) { return last[x]; }).sort(function (a, b) { return last[a] < last[b] ? 1 : last[a] > last[b] ? -1 : ARTIST_KEYS.indexOf(a) - ARTIST_KEYS.indexOf(b); });
    }
    function byArtistName(list) {
      return list.slice().sort(function (x, y) { return ARTISTS[x].name.localeCompare(ARTISTS[y].name, "en", { sensitivity: "base" }); });
    }
    var SALES = [];
    // The fixed words of the design. Edit default text in Artiscope Digital Home keeps changed ones in the
    // page list file under "words"; any word not changed keeps the site's own, written beside each W().
    var WORDS = PAGES.words && typeof PAGES.words === "object" ? PAGES.words : {};
    function W(key, dflt, slots) {
      var t = txt(typeof WORDS[key] === "string" && WORDS[key].trim() ? WORDS[key] : dflt).replace(/"/g, "&quot;");
      Object.keys(slots || {}).forEach(function (k) { t = t.split("{" + k + "}").join(slots[k]); });
      return t;
    }
    function wordsTag() { return Object.keys(WORDS).length ? '<script type="application/json" id="adh-words">' + JSON.stringify(WORDS).replace(/</g, "\\u003c") + '</script>\n' : ""; }
    (D.artists || []).forEach(function (a) { (a.sales || []).forEach(function (s, i) { SALES.push(Object.assign({}, s, { artist: a.slug, _i: i })); }); });

    function fill(text, isHtml) {
      text = isHtml ? String(text) : txt(text);
      return text.split("{disclosure}").join(esc(SITE.disclosure || "")).split("{email}").join(SITE.email || "")
        .split("{published}").join(PUBLISHED_TEXT || "").split("{tagline}").join(esc(SITE.tagline || ""))
        .split("{headline}").join(esc(SITE.headline || "")).split("{intro}").join(esc(SITE.intro || ""));
    }
    function shared(key) { var part = (PAGES.shared || {})[key] || {}; return [part.settings || {}, get(part, "visible", true)]; }
    function sortKey(s) { return s.date || "9999"; }
    function salesFor(slug) {
      var rows = SALES.filter(function (s) { return slug == null || s.artist === slug; });
      // Newest sale first; a sale with no date goes last.
      return rows.map(function (s, i) { return [s, i]; }).sort(function (a, b) { var x = sortKey(a[0]), y = sortKey(b[0]); if (x === "9999" || y === "9999") return x === y ? a[1] - b[1] : x === "9999" ? 1 : -1; return x > y ? -1 : x < y ? 1 : b[1] - a[1]; }).map(function (p) { return p[0]; });
    }
    function priced(rows) { return rows.filter(function (s) { return s.premium; }); }
    function maxBy(rows, f) { var best = null; rows.forEach(function (r) { if (best === null || f(r) > f(best)) best = r; }); return best; }
    function minBy(rows, f) { var best = null; rows.forEach(function (r) { if (best === null || f(r) < f(best)) best = r; }); return best; }
    function latestPriced() { return maxBy(priced(SALES).filter(function (s) { return s.date; }), function (s) { return s.date; }); }

    // ----- for the price explorer, the charts and the results finder -----
    // What kind of object was sold, read from the medium as the house described it. A sale can set "kind" to override.
    function kindOf(s) {
      if (s.kind === "unique" || s.kind === "edition") return s.kind;
      var m = String(s.medium || "").toLowerCase();
      if (!m) return "unstated";
      if (/numbered 1 of 1\b/.test(m)) return "unique";
      if (/edition|numbered|proof|unique variants|multiples?\b/.test(m)) return "edition";
      if (/\bunique\b/.test(m)) return "unique";
      // a painting or drawing in paint or ink on a support is one of a kind, even when the house does not say "unique"
      if (/\b(oil|acrylic|gouache|watercolour|oilstick|ink|tempera|spray paint)\b[^,]*\bon (canvas|linen|panel|board|paper|silk|wood)\b/.test(m) && !/screenprint|silkscreen|print/.test(m)) return "unique";
      if (/screenprint|silkscreen|lithograph|etching|aquatint|gicl[eé]e|linocut|woodcut|offset/.test(m)) return "edition";
      return "unstated";
    }
    // How far the sale has been checked: on the house's own page, through the press or a database, or not yet.
    function checkOf(s) {
      var l = String(s.source_label || "");
      if (/not checked/i.test(l)) return "unchecked";
      if (/lot page|sold lots|results listing/i.test(l)) return "house";
      return "press";
    }
    // The one figure a chart can plot for a sale, and what kind of figure it is.
    function chartPrice(s) {
      var m = s.mutualart || {};
      if (s.premium) return { v: s.premium, b: "premium", f: s.premium_basis === "calculated" ? "calc" : "house" };
      if (m.price && m.price_basis !== "hammer") return { v: m.price, b: m.price_basis === "premium" ? "premium" : "unknown", f: "ma" };
      if (s.hammer) return { v: s.hammer, b: "hammer", f: s.hammer_basis === "calculated" ? "calc" : "house" };
      if (m.price) return { v: m.price, b: "hammer", f: "ma" };
      return null;
    }
    function day(d) { var p = String(d).split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
    function pxRow(s) {
      var c = chartPrice(s), m = s.mutualart || {};
      return { id: s.id, a: s.artist, an: ARTISTS[s.artist].name, t: s.title, y: s.year, d: s.date || "", dt: s.date_text || "", h: s.house, sl: s.sale || "", lot: s.lot || m.lot || "",
        m: s.medium || "", k: kindOf(s), c: s.currency || "", el: s.est_low || (m.est_low || null), eh: s.est_high || (m.est_high || null), ham: s.hammer || null, pr: s.premium || null,
        v: c ? c.v : null, vb: c ? c.b : null, vf: c ? c.f : null, chk: checkOf(s), src: s.source_label, srcu: s.source_url };
    }
    function pxData(rows, id) {
      return '<script type="application/json" id="' + (id || "px-data") + '">' + JSON.stringify(rows.map(pxRow)).replace(/</g, "\\u003c") + '</script>';
    }
    var KIND_LABEL = { unique: "Unique work", edition: "Print, multiple or edition", unstated: "Type not stated" };
    var CHECK_LABEL = { house: "Checked on the house page", press: "From press or a sales database", unchecked: "House page not yet checked" };
    // A chart frame that assets/explorer.js fills in. Without scripts the table below still holds every figure.
    function pxFrame(attrs) {
      return '<div class="px" ' + attrs + '><noscript><p class="note">' + W("px.noscript", "The chart needs JavaScript. Every figure is also in the table on this page.") + '</p></noscript></div>';
    }
    // The newest priced sales, one per artist, leaving out the artists given.
    function latestSales(n, skip) {
      var seen = {}, out = [];
      (skip || []).forEach(function (k) { seen[k] = 1; });
      salesFor(null).forEach(function (s) { if (out.length < n && s.date && s.premium && !seen[s.artist]) { seen[s.artist] = 1; out.push(s); } });
      return out;
    }
    function saleLine(s) {
      return money(s.premium, s.currency) + ' with premium' + (s.premium_basis === "calculated" ? ', by our calculation' : "") + '. ' + esc(s.house) + ', ' + esc(s.date_text) + '.';
    }
    function lastPriced(slug) { return priced(salesFor(slug)).filter(function (s) { return s.date; })[0] || null; }
    function relCard(kicker, title, href, text, link, delay) {
      return '<article class="card rel-card" data-reveal style="--d:' + (delay || 0) + 'ms"><p class="kicker">' + kicker + '</p><h3><a href="' + href + '">' + title + '</a></h3>' +
        (text ? '<p>' + text + '</p>' : "") + '<a class="text-link" href="' + href + '">' + link + '</a></article>\n';
    }
    function artistRelCard(slug, kicker, delay) {
      var a = ARTISTS[slug], l = lastPriced(slug), n = salesFor(slug).length;
      var text = l ? W("rel.latest", "Latest priced sale") + ': ' + esc(l.title) + ', ' + saleLine(l) : W("rel.lots", "{n} documented lots, none priced yet.", { n: String(n) });
      return relCard(kicker, esc(a.name), '@@artists/' + slug + '/', text, W("rel.see-artist", "See the market profile"), delay);
    }
    function saleRelCard(s, delay) {
      return relCard(W("rel.recent", "Recent sale"), esc(ARTISTS[s.artist].name) + ', ' + esc(s.title), '@@artists/' + s.artist + '/#work-' + esc(s.id), saleLine(s), W("rel.see-sale", "See the sale"), delay);
    }
    function featureRelCard(f, delay) {
      return relCard(esc(f.kicker), esc(f.title), '@@research/' + f.slug + '/', esc(f.standfirst), W("btn.read-feature", "Read the feature"), delay);
    }
    // Research that names the artist in its title or its words.
    function featuresAbout(slug) {
      var name = ARTISTS[slug].name;
      return FEATURES.filter(function (f) { return f.slug.indexOf(slug) >= 0 || String(f.title).indexOf(name) >= 0 || String(f.body || "").indexOf(name) >= 0; });
    }
    function artistsIn(f) {
      var html = String(f.body || "") + " " + f.title;
      return ARTIST_KEYS.filter(function (k) { return html.indexOf(ARTISTS[k].name) >= 0 || html.indexOf("[[TIMELINE:" + k + "]]") >= 0; });
    }
    function relSection(eyebrow, heading, groups) {
      var cards = "", d = 0;
      groups.forEach(function (g) { g.forEach(function (c) { cards += c.split("--d:0ms").join("--d:" + d + "ms"); d += 70; }); });
      if (!cards) return "";
      return '<section class="shell section rel" aria-labelledby="rel-h">\n<div class="section-head"><p class="eyebrow" data-reveal>' + eyebrow + '</p><h2 class="h2" id="rel-h" data-reveal>' + heading + '</h2></div>\n<div class="cards rel-cards">\n' + cards + '</div>\n</section>';
    }

    function head(rootPath, title, desc, path, extra) {
      // titles over 60 characters drop the site name, so search results show them in full
      title = String(title || ""); var cut = title.lastIndexOf(" | "); if (title.length > 60 && cut > 0) title = title.slice(0, cut);
      var canon = (SITE.url || "") + path;
      return '<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n<link rel="canonical" href="' + canon + '">\n' +
        '<meta name="theme-color" content="#1E2124">\n<meta property="og:site_name" content="Global Art Monitor">\n' +
        '<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
        '<meta property="og:type" content="website">\n<meta property="og:url" content="' + canon + '">\n' +
        (iconOk() ? '<link rel="icon" href="' + rootPath + opts.favicon + '">\n' : '<link rel="icon" href="' + rootPath + 'assets/favicon.svg" type="image/svg+xml">\n') + '<link rel="apple-touch-icon" href="' + rootPath + 'assets/brand/gam-tile-180.png">\n' +
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Franklin:wght@400;500;600&display=swap" rel="stylesheet">\n' +
        '<link rel="stylesheet" href="' + rootPath + 'assets/site.css">\n<script>document.documentElement.className=\'js\';</script>\n' + (THEME || "") + (extra || "") + secCssTag() + wordsTag() + '</head>\n';
    }
    // logos added in the console: each on the left, in the centre or on the right of the menu bar
    function headLogos(st, rootPath, where) {
      return (get(st, "logos", []) || []).map(function (g, k) { return { g: g, k: k }; }).filter(function (x) { return x.g && x.g.hidden !== true && (x.g.place || "L") === where; }).map(function (x) {
        var g = x.g, src = g.image ? (opts.imageSrc ? opts.imageSrc(g.image) : rootPath + "assets/images/" + g.image) : "";
        var inner = src ? '<img src="' + esc(src) + '" alt="' + esc(g.alt || "") + '">' : (opts.mark ? '<span class="hlogo-empty">' + esc(g.alt || "Logo") + "</span>" : "");
        if (!inner) { return ""; }
        var href = String(g.href || ""), cls = "hlogo hlogo-" + ({ S: "s", L: "l" }[g.size] || "m"), tag = opts.mark ? ' data-adh-b="logos.' + x.k + '"' : "";
        if (!/^(#|\/|[a-z0-9-]+\/|https?:\/\/|mailto:)/i.test(href)) { href = ""; }
        if (href && !/^(#|\/|https?:|mailto:)/i.test(href)) { href = rootPath + href; }
        return href ? '<a class="' + cls + '" href="' + esc(href) + '"' + tag + (/^https?:/i.test(href) ? ' rel="noopener"' : "") + ">" + inner + "</a>" : '<span class="' + cls + '"' + tag + ">" + inner + "</span>";
      }).join("");
    }
    function header(rootPath, current) {
      var st = shared("header")[0], name = esc(get(st, "name", "Global Art Monitor")), links = "", menu = "", i = 0;
      var logoL = headLogos(st, rootPath, "L"), logoC = headLogos(st, rootPath, "C"), logoR = headLogos(st, rootPath, "R");
      // Shorter names for the bar only, so six links fit. The pages keep their full names.
      var shortNames = get(st, "nav_short", { "market-intelligence": "Market", "artists": "Artist Profiles", "research": "Research", "collecting-valuation": "Collecting" }) || {};
      SECTIONS_LIST.forEach(function (s, k) {
        i = k + 1;
        var cur = s[0] === current ? ' aria-current="page"' : "";
        links += '<a href="' + rootPath + s[0] + '/"' + cur + '>' + esc(shortNames[s[0]] || s[1]) + '</a>\n';
        menu += '<a href="' + rootPath + s[0] + '/"><span>' + pad2(i) + '</span>' + esc(s[1]) + '</a>\n';
      });
      (get(st, "nav_extra", [["Contact", "contact/"]]) || []).forEach(function (m) {
        var key = String(m[1]).replace(/\/$/, "");
        links += '<a href="' + rootPath + m[1] + '"' + (key === current ? ' aria-current="page"' : "") + '>' + txt(m[0]) + '</a>\n';
      });
      (get(st, "menu_extra", []) || []).forEach(function (m) { i += 1; menu += '<a href="' + rootPath + m[1] + '"><span>' + pad2(i) + '</span>' + txt(m[0]) + '</a>\n'; });
      var brand = '<a class="brand" href="' + rootPath + '">' + MARK + name + '</a>';
      return '<a class="skip" href="#main">' + W("menu.skip", "Skip to content") + '</a>\n<div class="shell head-wrap">\n<header class="site-head' + (logoL || logoC || logoR ? " has-logos" : "") + '">\n' + (logoL ? '<div class="head-logos">' + brand + logoL + '</div>' : brand) + '\n' +
        '<nav class="nav" aria-label="' + W("sr.nav", "Sections") + '">\n' + links + '</nav>\n' + (logoC ? '<div class="head-logos head-mid">' + logoC + '</div>\n' : '') + '<div class="head-actions">\n' + logoR +
        '<a class="pill pill-mint pill-small" href="' + rootPath + get(st, "subscribe_href", "about/#newsletter") + '">' + txt(get(st, "subscribe", "Subscribe")) + '</a>\n' +
        '<button class="menu-btn" type="button" data-menu-open aria-expanded="false" aria-controls="menu">' + W("menu.open", "Menu") + '</button>\n</div>\n</header>\n</div>\n' +
        '<div class="menu" id="menu" aria-hidden="true">\n<div class="shell menu-top"><a class="brand" href="' + rootPath + '">' + MARK + name + '</a><button class="menu-close" type="button" data-menu-close>' + W("menu.close", "Close") + '</button></div>\n' +
        '<nav class="shell menu-list" aria-label="' + W("sr.menu", "All sections") + '">\n' + menu + '</nav>\n<div class="shell menu-foot"><span data-london-time>London</span><span>' + txt(get(st, "menu_tagline", "")) + '</span></div>\n</div>\n';
    }
    // Social media addresses chosen in the theme; nothing is shown until one is filled in.
    function socialHtml() {
      var all = opts.social && typeof opts.social === "object" ? opts.social : {}, out = Object.keys(all).map(function (k) { return all[k]; }).filter(function (x) { return x && /^https:\/\/[^\s<>"']+$/.test(x.href || ""); });
      return out.length ? '<nav class="foot-social" aria-label="' + W("sr.social", "Social media") + '">' + out.map(function (x) { return '<a href="' + esc(x.href) + '" rel="noopener">' + esc(x.label) + '</a>'; }).join("") + '</nav>\n' : "";
    }
    function iconOk() { return typeof opts.favicon === "string" && /^assets\/images\/[A-Za-z0-9._-]{1,120}\.(png|jpe?g|svg|ico)$/.test(opts.favicon); }
    function footer(rootPath, own) {
      if (own) return '<script src="' + rootPath + 'assets/analytics.js" defer></script>\n<script src="' + rootPath + 'assets/site.js" defer></script>\n<script src="' + rootPath + 'assets/explorer.js" defer></script>\n</body>\n</html>\n';
      var sh = shared("footer"), st = sh[0], on = sh[1], hst = shared("header")[0], name = esc(get(hst, "name", "Global Art Monitor"));
      var secs = SECTIONS_LIST.map(function (s) { return '<a href="' + rootPath + s[0] + '/">' + esc(s[1]) + '</a>'; }).join("");
      // The footer names only a few artists, the ones with the most recent priced sale, then links to the full list.
      var footMax = parseInt(get(st, "artists_limit", 6), 10) || 0;
      var footList = footMax && ARTIST_KEYS.length > footMax ? recentArtists().slice(0, footMax) : byArtistName(ARTIST_KEYS);
      var arts = footList.map(function (slug) { return '<a href="' + rootPath + 'artists/' + slug + '/">' + esc(ARTISTS[slug].name) + '</a>'; }).join("");
      if (footList.length < ARTIST_KEYS.length) arts += '<a class="foot-all" href="' + rootPath + 'artists/">' + W("menu.foot-all-artists", "All {n} artists", { n: ARTIST_KEYS.length }) + '</a>';
      var about = (get(st, "about_links", []) || []).map(function (l) { return '<a href="' + rootPath + l[1] + '">' + txt(l[0]) + '</a>'; }).join("");
      var legal = get(st, "legal_link", null) || ["", ""];
      var body = !on ? "" : '<footer class="site-foot">\n<div class="shell foot-inner">\n<div class="foot-cta">\n<h2>' + txt(get(st, "heading", "")) + '</h2>\n' +
        '<a class="pill pill-mint" href="' + rootPath + get(st, "button_href", "about/#newsletter") + '">' + txt(get(st, "button", "")) + '</a>\n</div>\n<div class="foot-cols">\n' +
        '<div><p class="foot-brand">' + MARK + name + '</p><p class="quiet">' + txt(get(st, "blurb", "")) + '</p></div>\n' +
        '<div><h3>' + W("menu.foot-sections", "Sections") + '</h3>' + secs + '</div>\n<div><h3>' + W("menu.foot-artists", "Artists") + '</h3>' + arts + '</div>\n<div><h3>' + W("menu.foot-about", "About") + '</h3>' + about + '</div>\n</div>\n' +
        socialHtml() + '<p class="foot-legal">' + fill(get(st, "legal", "")) + ' <a href="' + rootPath + legal[1] + '">' + txt(legal[0]) + '</a></p>\n</div>\n' +
        '<div class="foot-mark" aria-hidden="true">MONITOR</div>\n</footer>\n';
      return body + '<script src="' + rootPath + 'assets/analytics.js" defer></script>\n<script src="' + rootPath + 'assets/site.js" defer></script>\n<script src="' + rootPath + 'assets/explorer.js" defer></script>\n</body>\n</html>\n';
    }
    // Sections shared by every page: announcement bars above the menu bar, the rest at the top and bottom of the page.
    function groupHtml(where, ann) {
      return (((PAGES.groups || {})[where]) || []).filter(function (sec) { return sec && sec.visible !== false && S[sec.type] && (where !== "top" || (sec.type === "announcement") === !!ann); })
        .map(function (sec) { return mark(cssMark(S[sec.type](sec.settings || {}, { id: sec.id, page: "every" }), sec), sec.id); }).join("\n");
    }

    // ----- add-ons: our own small extras for every page, switched on in Artiscope Digital Home -----
    function aoClosed() { try { return typeof localStorage !== "undefined" && localStorage.getItem("ao-privacy-closed") === "1"; } catch (x) { return false; } }
    function aoHtml(A, kind, url, title, esc, link) {
      A = A || {}; var out = { share: "", fixed: "" }, on = function (id) { return !!(A[id] && A[id].on === true); };
      var fits = function (w) { return w === "all" || (w === "items" ? (kind === "article" || kind === "artist") : kind === "article"); };
      if (on("share") && fits(A.share.where || "articles")) {
        var u = encodeURIComponent(url), t = encodeURIComponent(title || "");
        var nets = { email: ["Email", "mailto:?subject=" + t + "&body=" + u], x: ["X", "https://x.com/intent/post?url=" + u + "&text=" + t], linkedin: ["LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url=" + u], facebook: ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + u] };
        var links = (A.share.networks || []).filter(function (n) { return nets[n]; }).map(function (n) { return '<a href="' + esc(nets[n][1]) + '"' + (n === "email" ? "" : ' target="_blank" rel="noopener noreferrer"') + '>' + nets[n][0] + '</a>'; }).join("");
        if (links) out.share = '<aside class="ao-share" aria-label="' + W("sr.share", "Share this page") + '"><span>' + esc(A.share.heading || "Share this page") + '</span>' + links + '</aside>';
      }
      if (on("progress") && fits(A.progress.where || "articles")) out.fixed += A.progress.style === "percent" ? '<div class="ao-progress pct" aria-hidden="true"><b>0%</b></div>' : '<div class="ao-progress" aria-hidden="true"><i></i></div>';
      if (on("top")) out.fixed += '<button type="button" class="ao-top' + (A.top.side === "left" ? " left" : "") + '" data-after="' + (Number(A.top.after) || 600) + '">' + esc(A.top.label || "Top") + '</button>';
      if (on("privacy")) out.fixed += '<div class="ao-privacy" role="region" aria-label="' + W("sr.privacy", "Privacy") + '"><p>' + esc(A.privacy.text || "") + (A.privacy.link && A.privacy.link_label ? ' <a href="' + esc(link(A.privacy.link)) + '">' + esc(A.privacy.link_label) + '</a>' : "") + '</p><button type="button" data-ao-close>' + esc(A.privacy.button || "Close") + '</button></div>';
      return out;
    }
    var AO_KIND = "page";
    // A page with its own layout ("own") has no menu bar, footer or shared sections; popups show on every page.
    function page(path, title, desc, body, current, intro, extraHead, top, own) {
      var depth = path.split("/").length - 1, rootPath = new Array(depth + 1).join("../");
      var urlPath = /index\.html$/.test(path) ? path.slice(0, -"index.html".length) : path;
      var ao = aoHtml(PAGES.addons, AO_KIND, SITE.url + urlPath, String(title || "").split(" | ")[0], esc, function (x) { return /^(https?:|mailto:|#|\/)/.test(x) ? x : "@@" + x; }); AO_KIND = "page";
      top = own ? "" : [groupHtml("top", true), top || ""].filter(Boolean).join("\n");
      body = (own ? [body, groupHtml("popups"), ao.fixed] : [groupHtml("top", false), body, ao.share, groupHtml("bottom"), groupHtml("popups"), ao.fixed]).filter(Boolean).join("\n");
      body = body.split("@@").join(rootPath);
      return { path: path, html: head(rootPath, title, desc, urlPath, extraHead) + "<body" + (intro && !own ? " data-intro" : "") + ">\n" + (top ? top.split("@@").join(rootPath) + "\n" : "") + (own ? "" : header(rootPath, current || String(path).replace(/\/?index\.html$/, ""))) +
        '<main id="main">\n' + body + '\n</main>\n' + footer(rootPath, own) };
    }

    // ----- auction components -----
    function calcNote(s, which) {
      var tip = which === "hammer"
        ? "The house published only the total. We took off the buyer\'s premium at the rates the house published for this sale to reach the hammer price."
        : "The house reported only the hammer price. We added the buyer\'s premium at the rates the house published for this sale to reach the total.";
      return '<span class="sub calc" title="' + tip + '">' + W("table.calculated", "Our calculation") + '</span>';
    }
    function estCell(s) {
      if (s.est_low && s.est_high) return money(s.est_low, s.currency) + " to " + plain(s.est_high);
      if (s.est_low) return W("table.from", "From {low}", { low: money(s.est_low, s.currency) }) + '<span class="sub">' + W("missing.high", "High estimate to confirm") + '</span>';
      if (s.est_on_request) return W("table.on-request", "On request") + '<span class="sub">' + W("table.on-request-note", "No public estimate was printed") + '</span>';
      var m = s.mutualart;
      if (m && m.est_low && m.est_high) return money(m.est_low, s.currency) + " to " + plain(m.est_high) + maNote(s);
      return '<span class="tbc">' + W("missing.tbc", "To confirm") + '</span>';
    }
    function maNote(s, extra) {
      var tip = "The house page we used does not give this figure. It comes from the MutualArt sale record, linked under Source.";
      return '<span class="sub calc" title="' + tip + '">' + W("table.mutualart", "From MutualArt") + (extra ? ", " + extra : "") + '</span>';
    }
    function hamCell(s) {
      var m = s.mutualart;
      if (!s.hammer && m && m.price && m.price_basis === "hammer") return '<span class="ham">' + money(m.price, s.currency) + '</span>' + maNote(s);
      if (!s.hammer) return '<span class="tbc">' + W("missing.tbc", "To confirm") + '</span>';
      return '<span class="ham">' + money(s.hammer, s.currency) + '</span>' + (s.hammer_basis === "calculated" ? calcNote(s, "hammer") : "");
    }
    function premCell(s) {
      var m = s.mutualart;
      if (!s.premium && m && m.price && m.price_basis !== "hammer") return '<span class="prem">' + money(m.price, s.currency) + '</span>' + maNote(s, m.price_basis === "premium" ? "" : W("table.mutualart-basis", "premium not stated"));
      return !s.premium ? '<span class="tbc">' + W("missing.tbc", "To confirm") + '</span>' : '<span class="prem">' + money(s.premium, s.currency) + '</span>' + (s.premium_basis === "calculated" ? calcNote(s, "premium") : "");
    }
    function sourceCell(s) {
      var out = '<a href="' + esc(s.source_url) + '" rel="noopener">' + esc(s.source_label) + '</a>';
      if (s.source2_url) out += '<span class="sub"><a href="' + esc(s.source2_url) + '" rel="noopener">' + esc(s.source2_label) + '</a></span>';
      if (s.mutualart && s.mutualart.url) out += '<span class="sub"><a href="' + esc(s.mutualart.url) + '" rel="noopener">' + W("table.mutualart-link", "MutualArt sale record") + '</a></span>';
      return out;
    }
    function workHref(s, rootPath) { return rootPath + 'artists/' + s.artist + '/#work-' + s.id; }
    function initials(name) { return String(name || "").split(/[\s.]+/).filter(Boolean).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase(); }
    function workImgSrc(s, rootPath) { return opts.imageSrc ? opts.imageSrc("works/" + s.image.file) : rootPath + "assets/images/works/" + s.image.file; }
    function workAlt(s) { return s.image.alt || (ARTISTS[s.artist].name + ", " + s.title + " (" + s.year + ")"); }
    function thumb(s, rootPath) {
      var inner = s.image && s.image.file ? '<img src="' + workImgSrc(s, rootPath) + '" alt="" loading="lazy" width="56" height="56">'
        : '<span class="thumb-none" aria-hidden="true">' + esc(initials(ARTISTS[s.artist].name)) + '</span>';
      return '<a class="thumb" href="' + workHref(s, rootPath) + '" tabindex="-1" aria-hidden="true">' + inner + '</a>';
    }
    function td(cls, label, html) { return '<td class="' + cls + '" data-label="' + label + '">' + html + '</td>'; }
    function table(rows, tableId, showArtist, rootPath) {
      rootPath = rootPath == null ? "@@" : rootPath;
      var body = "";
      var L = { date: W("table.date", "Sale date"), work: showArtist ? W("table.artist-work", "Artist and work") : W("table.work", "Work"), house: W("table.house", "House and sale"),
        est: W("table.estimate", "Estimate"), ham: W("table.hammer", "Hammer price"), prem: W("table.premium", "With premium"), cur: W("table.currency", "Currency"), src: W("table.source", "Source") };
      rows.forEach(function (s) {
        var lot = s.lot ? '<span class="sub">' + W("table.lot", "Lot {lot}", { lot: esc(s.lot) }) + '</span>'
          : s.mutualart && s.mutualart.lot ? '<span class="sub">' + W("table.lot", "Lot {lot}", { lot: esc(s.mutualart.lot) }) + ', ' + W("table.mutualart-per", "per MutualArt") + '</span>' : "";
        var who = showArtist ? '<a class="who" href="' + rootPath + 'artists/' + s.artist + '/">' + esc(ARTISTS[s.artist].name) + '</a>' : "";
        var work = thumb(s, rootPath) + '<span class="work-text">' + who + '<a class="title" href="' + workHref(s, rootPath) + '">' + esc(s.title) + " (" + esc(s.year) + ")</a>";
        var cp = chartPrice(s);
        body += '<tr' + (opts.mark ? ' data-adh-row="' + s._i + '"' : "") + ' data-artist="' + s.artist + '" data-house="' + esc(s.house) + '" data-currency="' + esc(s.currency || "") + '"' +
          ' data-date="' + esc(s.date || "") + '" data-year="' + esc(String(s.date || "").slice(0, 4)) + '" data-kind="' + kindOf(s) + '" data-check="' + checkOf(s) + '" data-price="' + (cp ? cp.v : "") + '" data-name="' + esc(ARTISTS[s.artist].name) + '">' +
          td("c-date", L.date, esc(s.date_text)) + td("c-work", L.work, work + lot + '</span>') +
          td("c-house", L.house, esc(s.house) + '<span class="sub">' + esc(s.sale) + '</span>') + td("c-est", L.est, estCell(s)) +
          td("c-ham", L.ham, hamCell(s)) + td("c-prem", L.prem, premCell(s)) + td("c-cur", L.cur, esc(s.currency)) + td("c-src", L.src, sourceCell(s)) + '</tr>\n';
      });
      return '<div class="table-wrap" tabindex="0" role="region" aria-label="' + W("sr.table", "Auction results table") + '">\n<table class="tl tl-sales" id="' + tableId + '">\n' +
        '<thead><tr><th scope="col">' + L.date + '</th><th scope="col">' + L.work + '</th><th scope="col">' + L.house + '</th><th scope="col">' + L.est + '</th><th scope="col">' + L.ham + '</th><th scope="col">' + L.prem + '</th><th scope="col">' + L.cur + '</th><th scope="col">' + L.src + '</th></tr></thead>\n' +
        '<tbody>\n' + body + '</tbody>\n</table>\n</div>';
    }
    var LEGEND = '<div class="chips">\n<span class="chip" style="background:var(--ink-2)"><span class="dot dot-mint"></span>' + W("table.key-hammer", "Hammer price") + '</span>\n' +
      '<span class="chip" style="background:var(--ink-2)"><span class="dot dot-blush"></span>' + W("table.key-premium", "Price with premium") + '</span>\n' +
      '<span class="chip" style="background:var(--ink-2)"><span class="dot dot-grey"></span>' + W("table.key-estimate", "Estimate") + '</span>\n</div>';
    var TABLE_NOTE = '<p class="note">Prices come from auction house lot pages and public auction databases, and are shown in the currency of the sale, marked by the symbol or code before each figure. ' +
      '"' + W("table.calculated", "Our calculation") + '" marks a figure the house did not publish. When only the total is published, we work back to the hammer price. When only the hammer price is reported, as with Sotheby\'s, which shows totals only to signed in users, we work forward to the total. ' +
      'Either way we use the buyer\'s premium rates the house published for that sale, and we check the result against what the house or the press reported. Point at the words in a row to see the working. ' +
      '"' + W("missing.tbc", "To confirm") + '" means we have not yet been able to check the figure. <a class="text-link" href="@@about/#method">How we report a price</a></p>';
    function ladder(rows) {
      rows = priced(rows);
      if (!rows.length) return "";
      // Sales in different currencies are never measured against each other: each currency has its own scale.
      var tops = {}, out = "";
      rows.forEach(function (s) { tops[s.currency] = Math.max(tops[s.currency] || 0, s.premium, s.est_high || 0, s.hammer || 0); });
      var mixed = Object.keys(tops).length > 1;
      rows.forEach(function (s) {
        var bars = "", w, top = tops[s.currency];
        if (s.est_high) { w = s.est_high / top * 68; bars += '<div class="bar bar-est"><i style="width:' + w.toFixed(1) + '%"></i>' + W("table.bar-high", "High estimate {price}", { price: money(s.est_high, s.currency) }) + '</div>'; }
        if (s.hammer) { w = s.hammer / top * 68; bars += '<div class="bar bar-ham"><i style="width:' + w.toFixed(1) + '%"></i>' + W("table.bar-hammer", "Hammer {price}", { price: money(s.hammer, s.currency) }) + (s.hammer_basis === "calculated" ? ", " + W("table.calculated", "Our calculation").toLowerCase() : "") + '</div>'; }
        w = s.premium / top * 68;
        bars += '<div class="bar bar-prem"><i style="width:' + w.toFixed(1) + '%"></i>' + W("table.bar-premium", "With premium {price}", { price: money(s.premium, s.currency) }) + '</div>';
        out += '<div class="ladder-row"><div class="ladder-label">' + esc(s.title) + '<span class="sub">' + esc(s.house) + ', ' + esc(s.date_text) + '</span></div>' +
          '<div class="ladder-bars">' + bars + '</div></div>\n';
      });
      return '<div class="ladder" data-reveal role="img" aria-label="' + W("sr.ladder", "Bar comparison of estimate, hammer price and price with premium for each priced sale. The same figures are in the table.") + '">\n' + out + '</div>' +
        (mixed ? '<p class="note">' + W("table.mixed-note", "These sales were held in more than one currency. Each price is shown in the currency of its sale, and the bars are scaled within each currency, so bars in different currencies cannot be compared with each other.") + '</p>' : "");
    }
    function featureCard(f, n, big, delay) {
      var num = n ? pad2(n) + " &nbsp; " : "";
      return '<article class="' + (big ? "card card-big" : "card") + '" data-reveal style="--d:' + (delay || 0) + 'ms"><p class="kicker">' + num + esc(f.kicker) + '</p>' +
        '<h3><a href="@@research/' + f.slug + '/">' + esc(f.title) + '</a></h3><p>' + esc(f.standfirst) + '</p>' +
        '<a class="text-link" href="@@research/' + f.slug + '/">' + W("btn.read-feature", "Read the feature") + '</a></article>\n';
    }
    // The highest priced sale in each currency, most used currency first. Prices in different currencies are not ranked against each other.
    function bestPerCurrency(rows) {
      var groups = {};
      priced(rows).forEach(function (s) { (groups[s.currency] = groups[s.currency] || []).push(s); });
      return Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length || (a < b ? -1 : 1); })
        .map(function (c) { return maxBy(groups[c], function (s) { return s.premium; }); });
    }
    function bestLine(s) { return esc(s.title) + ', ' + esc(s.house) + ', ' + esc(s.date ? s.date_text : "date to confirm"); }
    function profileCard(slug, delay) {
      var a = ARTISTS[slug], rows = salesFor(slug), best = maxBy(priced(rows), function (s) { return s.premium; });
      var houses = (a.houses || []).map(function (h) { return '<span class="chip">' + esc(h) + '</span>'; }).join("");
      var bests = bestPerCurrency(rows);
      var line = bests.length > 1 ? '<p>Highest documented prices, with premium, in each currency of sale: ' + bests.map(function (b) { return money(b.premium, b.currency) + ' (' + bestLine(b) + ')'; }).join("; ") + '.</p>'
        : best ? '<p>Highest documented price: ' + money(best.premium, best.currency) + ' with premium for ' + esc(best.title) + ', ' + esc(best.house) + (best.date ? ", " + best.date_text : "") + '.</p>'
        : '<p>' + W("missing.no-priced", "No priced sale documented yet.") + '</p>';
      return '<article class="card card-profile card-ink on-ink" data-reveal style="--d:' + delay + 'ms"><h3><a href="@@artists/' + slug + '/">' + esc(a.name) + '</a></h3>' +
        '<p class="quiet">' + esc(a.line) + '</p>' + line + '<div class="chips">' + houses + '</div>' +
        '<a class="text-link" href="@@artists/' + slug + '/">' + W("btn.open-profile", "Open the market profile") + '</a></article>\n';
    }
    var MORE_ARTISTS = '<article class="card card-profile" data-reveal style="--d:180ms"><h3>More artists to follow</h3>' +
      '<p>Profiles for further artists are added once an artist has a documented public sale we can source and check.</p>' +
      '<a class="text-link" href="@@about/#newsletter">' + W("btn.tell-me", "Tell me when a profile is added") + '</a></article>\n';
    var METHOD = '<div class="panel on-ink" data-reveal>\n<h2 class="h2" style="max-width:640px">How we report a price</h2>\n<div class="method">\n' +
      '<div><h3>Two prices, never one</h3><p>Hammer and premium-inclusive prices are shown in separate columns and never merged.</p></div>\n' +
      '<div><h3>Currency as sold</h3><p>Figures stay in the currency of the sale. Any conversion carries its date and rate.</p></div>\n' +
      '<div><h3>A source on every row</h3><p>Each result links to the lot page or database it came from. Gaps are labelled, not filled.</p></div>\n' +
      '</div>\n<a class="text-link" href="@@about/#method">' + W("btn.full-method", "Read the full method") + '</a>\n</div>';

    // ----- sections -----
    function wordsBlock(st) {
      var kinds = { ink: "w-ink", light: "w-light", mint: "w-mint", ghost: "w-ghost" };
      var out = '<section class="shell words" aria-label="' + txt(get(st, "label", "")) + '">\n';
      (get(st, "words", []) || []).forEach(function (w, i) {
        if (w && w.hidden === true) return;
        out += '<a class="word" href="@@' + get(w, "href", "") + '" data-reveal style="--d:' + (i * 120) + 'ms"><span class="word-pill ' + (kinds[get(w, "style", "")] || "w-ink") + '">' + txt(get(w, "word", "")) + '</span>' +
          '<p>' + txt(get(w, "text", "")) + '</p></a>\n';
      });
      return out + "</section>";
    }
    function featureList(which) {
      if (which === "all") return FEATURES.slice();
      if (typeof which === "string" && which.indexOf("tag:") === 0) return FEATURES.filter(function (f) { return (f.tags || []).indexOf(which.slice(4)) >= 0; });
      return (Array.isArray(which) ? which : []).filter(function (x) { return FEATURE_BY_SLUG[x]; }).map(function (x) { return FEATURE_BY_SLUG[x]; });
    }
    function featureCards(st) {
      var feats = featureList(get(st, "which", "all")), big = parseInt(get(st, "big", 0) || 0, 10) || 0, numbered = !!get(st, "numbered", false), out = "";
      // "limit" shows only the first few, in the order the articles are kept (newest first).
      var limit = parseInt(get(st, "limit", 0) || 0, 10) || 0;
      if (limit) feats = feats.slice(0, limit);
      feats.forEach(function (f, i) {
        var n = numbered ? i + 1 : null;
        out += i < big ? featureCard(f, n, true, i * 90) : featureCard(f, n, false, (i - big) * 90);
      });
      return out;
    }
    var S = {};
    S.hero = function (st) {
      var s = latestPriced(), a = s ? ARTISTS[s.artist] : null;
      var kinds = { mint: "pill-mint", ink: "pill-ink", blush: "pill-blush" };
      var buttons = (get(st, "buttons", []) || []).map(function (b) { return '<a class="pill ' + (kinds[b.length > 2 ? b[2] : "ink"] || "pill-ink") + '" href="@@' + b[1] + '">' + txt(b[0]) + '</a>\n'; }).join("");
      var card = "";
      if (get(st, "result_card", true) && s) {
        var est = s.est_low && s.est_high ? '<span class="chip">Estimate ' + money(s.est_low, s.currency) + ' to ' + money(s.est_high, s.currency) + '</span>' : "";
        card = '<aside class="result-card on-ink" data-reveal style="--d:260ms" aria-label="' + txt(get(st, "result_label", "Latest documented result")) + '">\n' +
          '<p class="label">' + txt(get(st, "result_label", "Latest documented result")) + '</p>\n<p class="work">' + esc(a.name) + ', ' + esc(s.title) + ' (' + esc(s.year) + ')</p>\n' +
          '<p class="price" style="--w:' + priceWidth(money(s.premium, s.currency)) + '">' + money(s.premium, s.currency) + '</p>\n<p class="where">' + esc(s.house) + ', ' + esc(s.sale) + '. ' + esc(s.date_text) + '.</p>\n' +
          '<div class="chips"><span class="chip">' + W("table.chip-premium", "With buyer's premium") + '</span>' + (s.premium_basis === "calculated" ? '<span class="chip chip-calc" title="The house reported only the hammer price. We added the buyer\'s premium at the rates the house published for this sale to reach the total.">' + W("table.calculated", "Our calculation") + '</span>' : "") + est + '</div>\n' +
          '<a class="text-link" href="@@artists/' + s.artist + '/">' + txt(get(st, "result_link", "See the full timeline")) + '</a>\n</aside>\n';
      }
      return '<section class="shell hero">\n<div class="hero-copy">\n<p class="eyebrow" data-reveal>' + fill(get(st, "eyebrow", "")) + '</p>\n' +
        '<h1 class="h1" data-reveal style="--d:80ms">' + fill(get(st, "headline", "")) + '</h1>\n<p class="lede" data-reveal style="--d:200ms">' + fill(get(st, "lede", "")) + '</p>\n' +
        '<div class="hero-actions" data-reveal style="--d:320ms">\n' + buttons + '</div>\n</div>\n' + card + '</section>\n' +
        '<div class="watermark" aria-hidden="true">' + txt(get(st, "watermark", "MONITOR")) + '</div>';
    };
    S.status = function (st) {
      var items = (get(st, "items", []) || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
      return '<div class="shell status"><div class="status-inner">' + items + '<span data-london-time>' + txt(get(st, "clock", "")) + '</span></div></div>';
    };
    S.timeline = function (st, ctx) {
      var slug = get(st, "artist", "") || ARTIST_KEYS[0];
      return '<section class="shell section" id="' + ctx.id + '">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + txt(get(st, "eyebrow", "")) + '</p>\n' +
        '<div class="split"><h2 class="h2">' + txt(get(st, "heading", "")) + '</h2>\n<p class="intro">' + txt(get(st, "intro", "")) + '</p></div>\n' +
        LEGEND + '\n' + table(salesFor(slug), "home-timeline") + '\n' + TABLE_NOTE + '\n' +
        '<div><a class="pill pill-blush pill-small" href="@@' + get(st, "button_href", "auction-results/") + '">' + txt(get(st, "button", "")) + '</a></div>\n</div>\n</section>';
    };
    S.words = function (st) { return wordsBlock(st); };
    // A plain link under a shortened list, leading to the page that holds all of it.
    function moreLink(label, href) {
      return '<p class="more-link" data-reveal><a class="text-link" href="@@' + esc(href) + '">' + txt(label) + '</a></p>\n';
    }
    S.features = function (st, ctx) {
      var cards = featureCards(st);
      var fLimit = parseInt(get(st, "limit", 0) || 0, 10) || 0, fTotal = featureList(get(st, "which", "all")).length;
      if (fLimit && fTotal > fLimit) cards += '</div>\n' + moreLink(W("btn.all-research", "See all {n} research pieces", { n: fTotal }), get(st, "more_href", "research/")) + '<div hidden>';
      if (get(st, "compact", false)) return '<section class="shell section" id="' + ctx.id + '"><div class="section-head"><h2 class="h2" data-reveal>' + txt(get(st, "heading", "")) + '</h2></div><div class="cards">\n' + cards + '</div></section>';
      if (!get(st, "heading", "") && !get(st, "eyebrow", "")) return '<section class="shell section" id="' + ctx.id + '"><div class="cards">\n' + cards + '</div></section>';
      var eyebrow = get(st, "eyebrow", "") ? '<p class="eyebrow" data-reveal>' + txt(st.eyebrow) + '</p>\n' : "";
      return '<section class="shell section" id="' + ctx.id + '">\n<div class="section-head">' + eyebrow + '<h2 class="h2" data-reveal>' + txt(get(st, "heading", "")) + '</h2></div>\n<div class="cards">\n' + cards + '</div>\n</section>';
    };
    S.profiles = function (st, ctx) {
      var slugs = (get(st, "artists", []) || []).filter(function (x) { return ARTISTS[x]; });
      if (!slugs.length) slugs = ARTIST_KEYS.slice();
      // Alphabetical unless the section is set to "sort": "manual", which keeps the order given.
      if (get(st, "sort", "name") !== "manual") slugs = byArtistName(slugs);
      // "pick": "recent" shows the artists with the most recent priced sale, newest first. "limit" caps how many.
      var pLimit = parseInt(get(st, "limit", 0) || 0, 10) || 0, pTotal = ARTIST_KEYS.length;
      if (get(st, "pick", "") === "recent") slugs = recentArtists();
      if (pLimit) slugs = slugs.slice(0, pLimit);
      var cards = slugs.map(function (x, i) { return profileCard(x, i * 90); }).join("");
      if (get(st, "more_card", true)) cards += MORE_ARTISTS;
      if (pLimit && pTotal > slugs.length) cards += '</div>\n' + moreLink(W("btn.all-artists", "See all {n} artists", { n: pTotal }), get(st, "more_href", "artists/")) + '<div hidden>';
      var headHtml = get(st, "heading", "") ? '<div class="section-head"><h2 class="h2" data-reveal>' + txt(st.heading) + '</h2></div>\n' : "";
      return '<section class="shell section" id="' + ctx.id + '">\n' + headHtml + '<div class="cards">\n' + cards + '</div>\n</section>';
    };
    S["page-links"] = function (st, ctx) {
      var rows = SECTIONS_LIST.map(function (s, k) { var i = k + 1; return '<a class="row" href="@@' + s[0] + '/" data-reveal style="--d:' + ((i - 1) * 80) + 'ms"><span class="n">0' + i + '</span><span class="t">' + esc(s[1]) + '</span><span class="d">' + esc(s[2]) + '</span></a>\n'; }).join("");
      return '<section class="shell section" id="' + ctx.id + '">\n<div class="section-head"><h2 class="h2" data-reveal>' + txt(get(st, "heading", "")) + '</h2></div>\n<div class="rows">\n' + rows + '</div>\n</section>';
    };
    S.method = function () { return '<section class="shell section">\n' + METHOD + '\n</section>'; };
    S["page-head"] = function (st) {
      var all = salesFor(null), houses = Array.from(new Set(all.map(function (x) { return x.house; }))).sort();
      var lede = fill(get(st, "lede", "")).split("{lots}").join(String(all.length)).split("{artists}").join(String(ARTIST_KEYS.length))
        .split("{houses}").join(String(houses.length)).split("{priced}").join(String(priced(all).length));
      var wide = get(st, "wide", true) ? " wide" : "";
      return '<section class="shell page-head' + wide + '">\n<p class="eyebrow" data-reveal>' + get(st, "eyebrow", "") + '</p>\n' +
        '<h1 class="h1" data-reveal style="--d:80ms">' + fill(get(st, "headline", "")) + '</h1>\n<p class="lede" data-reveal style="--d:200ms">' + lede + '</p>\n</section>';
    };
    S["results-table"] = function (st) {
      var all = salesFor(null);
      // One search box and three menus. It stays one row however many artists and houses there are.
      var byName = byArtistName(ARTIST_KEYS.filter(function (k) { return all.some(function (x) { return x.artist === k; }); }));
      var houses = Array.from(new Set(all.map(function (x) { return x.house; }))).sort();
      var currencies = Array.from(new Set(all.map(function (x) { return x.currency; }).filter(Boolean))).sort();
      function menu(key, label, allLabel, options) {
        return '<label class="finder-field"><span>' + label + '</span><span class="finder-select"><select data-key="' + key + '">' +
          '<option value="all">' + allLabel + '</option>' + options + '</select><i aria-hidden="true">' + W("filter.choose", "Choose") + '</i></span></label>\n';
      }
      var artistOpts = byName.map(function (k) { return '<option value="' + k + '">' + esc(ARTISTS[k].name) + '</option>'; }).join("");
      var houseOpts = houses.map(function (h) { return '<option value="' + esc(h) + '">' + esc(h) + '</option>'; }).join("");
      var curOpts = currencies.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + ' (' + esc((SYMBOL[c] || c).trim()) + ')</option>'; }).join("");
      var years = Array.from(new Set(all.map(function (x) { return String(x.date || "").slice(0, 4); }).filter(Boolean))).sort().reverse();
      var yearOpts = years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("");
      var KIND_SHORT = { unique: "Unique works", edition: "Prints and editions", unstated: "Type not stated" };
      var kindOpts = ["unique", "edition", "unstated"].map(function (k) { return '<option value="' + k + '">' + W("kind." + k, KIND_SHORT[k]) + '</option>'; }).join("");
      var checkOpts = ["house", "press", "unchecked"].map(function (k) { return '<option value="' + k + '">' + W("check." + k, CHECK_LABEL[k]) + '</option>'; }).join("");
      var sortOpts = [["newest", W("sort.newest", "Newest sale first")], ["oldest", W("sort.oldest", "Oldest sale first")], ["high", W("sort.high", "Highest price")], ["low", W("sort.low", "Lowest price")], ["artist", W("sort.artist", "Artist, A to Z")], ["house", W("sort.house", "Auction house, A to Z")]]
        .map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join("");
      return '<section class="shell section">\n<div class="panel on-ink" data-reveal>\n<button class="pill pill-ink pill-small finder-toggle" type="button" aria-expanded="false" aria-controls="all-results-finder" hidden>' + W("filter.toggle", "Filter and sort") + '<span class="finder-n" data-active-n></span></button>\n' +
        '<div class="finder" id="all-results-finder" data-filter-group="all-results" data-explorer="results" data-total="' + all.length + '">\n' +
        '<label class="finder-field finder-search"><span>' + W("filter.search", "Search") + '</span><input type="search" data-search placeholder="' + W("filter.search-hint", "Artist, work or sale") + '" autocomplete="off"></label>\n' +
        menu("artist", W("filter.artist", "Artist"), W("filter.all-artists", "All {n} artists", { n: byName.length }), artistOpts) +
        menu("house", W("filter.house", "Auction house"), W("filter.all-houses", "All {n} houses", { n: houses.length }), houseOpts) +
        menu("currency", W("filter.currency", "Currency"), W("filter.all-currencies", "All currencies"), curOpts) +
        menu("kind", W("filter.kind", "Type of work"), W("filter.all-kinds", "All types"), kindOpts) +
        menu("year", W("filter.year", "Year of sale"), W("filter.all-years", "Every year"), yearOpts) +
        menu("check", W("filter.check", "How it was checked"), W("filter.all-checks", "Every source"), checkOpts) +
        '<div class="finder-field finder-price"><span id="price-lbl">' + W("filter.price", "Price, in the chosen currency") + '</span><span class="finder-range"><input type="number" inputmode="numeric" min="0" data-price="min" aria-labelledby="price-lbl" placeholder="' + W("filter.price-from", "From") + '" disabled><input type="number" inputmode="numeric" min="0" data-price="max" aria-labelledby="price-lbl" placeholder="' + W("filter.price-to", "To") + '" disabled></span>' +
        '<span class="finder-hint" data-price-hint>' + W("filter.price-hint", "Choose one currency first. Prices in different currencies are never compared.") + '</span></div>\n' +
        '<label class="finder-field"><span>' + W("filter.sort", "Sort by") + '</span><span class="finder-select"><select data-sort>' + sortOpts + '</select><i aria-hidden="true">' + W("filter.order", "Order") + '</i></span></label>\n' +
        '</div>\n<div class="finder-foot"><p class="finder-count" id="all-results-count" role="status">' + W("filter.showing-all", "Showing all {n} lots", { n: all.length }) + '</p>' +
        '<button class="text-link finder-clear" type="button" data-clear hidden>' + W("filter.clear", "Clear filters") + '</button>' + LEGEND + '</div>\n' +
        table(all, "all-results", true) + '\n<p class="note" id="all-results-empty" hidden>' + txt(get(st, "empty", "")) + '</p>\n' + TABLE_NOTE + '\n</div>\n</section>';
    };
    S["latest-result"] = function (st) {
      var s = latestPriced(); if (!s) return "";
      var a = ARTISTS[s.artist];
      return '<section class="shell section">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + txt(get(st, "eyebrow", "")) + '</p>\n' +
        '<h2 class="h2">' + esc(a.name) + ', ' + esc(s.title) + ': ' + money(s.premium, s.currency) + ' with premium' + (s.premium_basis === "calculated" ? ', by our calculation' : "") + '</h2>\n' +
        '<p class="intro" style="max-width:640px">' + esc(s.house) + ', ' + esc(s.sale) + ', ' + esc(s.date_text) + '. ' + txt(get(st, "text", "")) + '</p>\n' +
        '<div><a class="pill pill-mint pill-small" href="@@artists/' + s.artist + '/">' + txt(get(st, "button", "")) + '</a></div>\n</div>\n</section>';
    };
    S.glossary = function (st, ctx) {
      var terms = GLOSSARY.map(function (g) { return '<div class="term" id="' + slugify(g[0]) + '" data-reveal><dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd></div>\n'; }).join("");
      return '<section class="shell section" id="' + ctx.id + '">\n<div class="section-head"><h2 class="h2" data-reveal>' + txt(get(st, "heading", "")) + '</h2></div>\n<dl class="terms">\n' + terms + '</dl>\n</section>';
    };
    S.panel = function (st) {
      return '<section class="shell section">\n<div class="panel on-ink" data-reveal>\n<h2 class="h2" style="max-width:640px">' + txt(get(st, "heading", "")) + '</h2>\n' +
        '<p class="intro" style="max-width:640px">' + txt(get(st, "text", "")) + '</p>\n</div>\n</section>';
    };
    S.prose = function (st) {
      return '<section class="shell article">\n<div class="article-body prose">\n' + fill(get(st, "html", ""), true) + '\n</div>\n<aside class="article-side">\n' + fill(get(st, "aside", ""), true) + '\n</aside>\n</section>';
    };
    S["contact-form"] = function (st) {
      return '<section class="shell article">\n<div class="article-body">\n' + fill(get(st, "html", ""), true) + '\n</div>\n<aside class="article-side">\n' + fill(get(st, "aside", ""), true) + '\n</aside>\n</section>';
    };

    // ----- sections any page can use: batch 1 -----
    function addrOk(h) { return /^(#|\/|[a-z0-9-]+\/|https?:\/\/|mailto:)/i.test(String(h || "")); }
    function hrefOf(h) { h = String(h || ""); return /^(https?:|mailto:|#|\/)/i.test(h) ? h : "@@" + h; }
    function liveRows(list) { return (Array.isArray(list) ? list : []).map(function (x, i) { return { x: x, i: i }; }).filter(function (r) { return r.x && r.x.hidden !== true; }); }
    function headBlock(st) {
      var e = get(st, "eyebrow", ""), h = get(st, "heading", "");
      if (!e && !h) return "";
      return '<div class="section-head">' + (e ? '<p class="eyebrow" data-reveal>' + txt(e) + '</p>' : "") + (h ? '<h2 class="h2" data-reveal>' + txt(h) + '</h2>' : "") + '</div>\n';
    }
    function paras(t) { t = String(t || "").trim(); return t ? "<p>" + txt(t).split(/\n\s*\n/).join("</p><p>").replace(/\n/g, "<br>") + "</p>" : ""; }
    S.announcement = function (st) {
      var rows = liveRows(get(st, "messages", [])).filter(function (r) { return r.x.text || r.x.link; });
      var look = { ink: "ann-ink", mint: "ann-mint", blush: "ann-blush" }[get(st, "style", "ink")] || "ann-ink";
      var secs = Math.max(3, Math.min(30, Number(get(st, "seconds", 6)) || 6));
      var msgs = rows.map(function (r, k) {
        var m = r.x;
        return '<p class="ann-msg' + (k ? "" : " on") + '" data-adh-b="messages.' + r.i + '"><span>' + txt(m.text || "") + '</span>' + (m.link && addrOk(m.href) ? '<a href="' + esc(hrefOf(m.href)) + '">' + txt(m.link) + '</a>' : "") + '</p>';
      }).join("");
      return '<div class="announce ' + look + '" data-announce data-secs="' + secs + '"><div class="shell ann-in"><div class="ann-msgs">' + msgs + '</div>' +
        (rows.length > 1 ? '<span class="ann-count" aria-hidden="true">' + W("btn.count", "{n} of {total}", { n: "1", total: String(rows.length) }) + '</span>' : "") + '</div></div>';
    };
    S.columns = function (st) {
      var per = { "2": 2, "3": 3, "4": 4 }[String(get(st, "per_row", "3"))] || 3, num = get(st, "numbered", true) !== false;
      var cards = liveRows(get(st, "columns", [])).map(function (r, k) {
        var c = r.x;
        return '<div class="card col-card" data-adh-b="columns.' + r.i + '" data-reveal style="--d:' + (k * 90) + 'ms">' + (num ? '<span class="kicker">' + (k < 9 ? "0" : "") + (k + 1) + '</span>' : "") +
          (c.title ? '<h3>' + txt(c.title) + '</h3>' : "") + (c.text ? '<div class="col-text">' + paras(c.text) + '</div>' : "") +
          (c.link && addrOk(c.href) ? '<a class="col-link" href="' + esc(hrefOf(c.href)) + '">' + txt(c.link) + '</a>' : "") + '</div>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="cols cols-' + per + '">\n' + cards + '\n</div>\n</section>';
    };
    S.space = function (st) { var c = { S: "space-s", M: "space-m", L: "space-l" }[get(st, "size", "M")] || "space-m"; return '<div class="space ' + c + '" aria-hidden="true"></div>'; };
    S.quote = function (st) {
      var who = get(st, "who", "");
      return '<section class="shell section quote-block">\n<blockquote class="big-quote" data-reveal>' + txt(String(get(st, "text", "")).trim()).replace(/\n+/g, "<br>") + '</blockquote>\n' +
        (who ? '<p class="quote-who" data-reveal style="--d:120ms">' + txt(who) + '</p>\n' : "") + '</section>';
    };
    S.faq = function (st) {
      var items = liveRows(get(st, "items", [])).map(function (r) {
        return '<details class="qa" data-adh-b="items.' + r.i + '"><summary><span class="qa-q">' + txt(r.x.q || "") + '</span><span class="qa-word" aria-hidden="true"></span></summary><div class="qa-a">' + paras(r.x.a) + '</div></details>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="qa-list" data-reveal>\n' + items + '\n</div>\n</section>';
    };
    S.button = function (st) {
      var pill = { mint: "pill-mint", ink: "pill-ink", blush: "pill-blush" }[get(st, "colour", "mint")] || "pill-mint", h = get(st, "href", ""), label = get(st, "label", "");
      var inner = (get(st, "heading", "") ? '<h2 class="h2">' + txt(get(st, "heading", "")) + '</h2>\n' : "") + (get(st, "text", "") ? '<p class="intro">' + txt(get(st, "text", "")) + '</p>\n' : "") +
        (label && addrOk(h) ? '<div><a class="pill ' + pill + '" href="' + esc(hrefOf(h)) + '">' + txt(label) + '</a></div>' : "");
      return '<section class="shell section">\n<div class="' + (get(st, "panel", true) === false ? "cta-plain" : "panel on-ink cta-panel") + '" data-reveal>\n' + inner + '\n</div>\n</section>';
    };

    // ----- sections any page can use: batch 2, pictures -----
    function picOf(x) {
      if (x && x.image) return '<img src="' + esc(opts.imageSrc ? opts.imageSrc(x.image) : "@@assets/images/" + x.image) + '" alt="' + esc(x.alt || "") + '" loading="lazy">';
      return opts.mark ? '<span class="supply">' + W("missing.picture", "Picture to supply") + '</span>' : "";
    }
    S["picture-banner"] = function (st) {
      var place = { C: "pb-c", R: "pb-r" }[get(st, "place", "L")] || "pb-l", box = get(st, "box", "ink") === "blush" ? "pb-blush" : "pb-ink";
      var pill = { mint: "pill-mint", ink: "pill-ink", blush: "pill-blush" }[get(st, "colour", "mint")] || "pill-mint", h = get(st, "href", ""), label = get(st, "label", "");
      var e = get(st, "eyebrow", ""), head = get(st, "heading", ""), t = get(st, "text", "");
      return '<section class="shell section pb-wrap">\n<div class="pbanner ' + place + (get(st, "fit", "fill") === "whole" ? " pb-whole" : "") + '" data-reveal>\n<div class="pb-pic">' + picOf(st) + '</div>\n<div class="pb-box ' + box + '">' +
        (e ? '<p class="eyebrow">' + txt(e) + '</p>' : "") + (head ? '<h2 class="h2">' + txt(head) + '</h2>' : "") + (t ? '<p class="pb-text">' + txt(t) + '</p>' : "") +
        (label && addrOk(h) ? '<div><a class="pill ' + pill + '" href="' + esc(hrefOf(h)) + '">' + txt(label) + '</a></div>' : "") + '</div>\n</div>\n</section>';
    };
    S.slideshow = function (st) {
      var rows = liveRows(get(st, "slides", [])), n = rows.length, secs = Math.max(3, Math.min(30, Number(get(st, "seconds", 6)) || 6));
      var slides = rows.map(function (r, k) { return '<figure class="ss-slide' + (k ? "" : " on") + '" data-adh-b="slides.' + r.i + '"><div class="ss-pic">' + picOf(r.x) + '</div><figcaption>' + txt(r.x.caption || "") + '</figcaption></figure>'; }).join("");
      var nav = n > 1 ? '<div class="ss-nav"><button type="button" class="ss-btn" data-ss="prev">' + W("btn.previous", "Previous") + '</button><span class="ss-at" aria-live="polite">' + W("btn.count", "{n} of {total}", { n: "1", total: String(n) }) + '</span><button type="button" class="ss-btn ss-next" data-ss="next">' + W("btn.next", "Next") + '</button></div>' : "";
      return '<section class="shell section">\n' + headBlock(st) + '<div class="ss" data-slides data-auto="' + (get(st, "auto", true) === false ? 0 : 1) + '" data-secs="' + secs + '" aria-roledescription="slideshow" data-reveal>' + slides + nav + '</div>\n</section>';
    };
    S.gallery = function (st) {
      var per = { "2": 2, "3": 3, "4": 4 }[String(get(st, "per_row", "3"))] || 3;
      var items = liveRows(get(st, "photos", [])).map(function (r, k) {
        return '<button type="button" class="gl-item" data-adh-b="photos.' + r.i + '" data-reveal style="--d:' + (k % 4) * 80 + 'ms"><span class="gl-pic">' + picOf(r.x) + '</span>' + (r.x.caption ? '<span class="gl-t">' + txt(r.x.caption) + '</span>' : "") + (r.x.sub ? '<span class="gl-d">' + txt(r.x.sub) + '</span>' : "") + '</button>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="gl gl-' + per + '" data-gallery>\n' + items + '\n</div>\n</section>';
    };
    S["logo-row"] = function (st) {
      var items = liveRows(get(st, "logos", [])).filter(function (r) { return r.x.image || r.x.alt; }).map(function (r) {
        var g = r.x, inner = g.image ? picOf(g) : '<span class="lg-name">' + txt(g.alt) + '</span>';
        return addrOk(g.href) ? '<a class="lg" href="' + esc(hrefOf(g.href)) + '" data-adh-b="logos.' + r.i + '">' + inner + '</a>' : '<span class="lg" data-adh-b="logos.' + r.i + '">' + inner + '</span>';
      }).join("");
      var e = get(st, "eyebrow", "");
      return '<section class="shell section">\n<div class="logo-row' + (get(st, "colour", "one") === "own" ? " own" : "") + '" data-reveal>' + (e ? '<p class="lr-line">' + txt(e) + '</p>' : "") + '<div class="lgs">' + items + '</div></div>\n</section>';
    };
    S.picture = function (st) {
      var cap = get(st, "caption", "");
      return '<section class="shell section"><figure class="pic-block' + (get(st, "size", "") === "contained" ? " contained" : "") + '" data-reveal><div class="pic-frame">' + picOf(st) + '</div>' + (cap ? '<figcaption>' + txt(cap) + '</figcaption>' : "") + '</figure></section>';
    };
    S["text-picture"] = function (st) {
      var cap = get(st, "caption", ""), link = get(st, "link", ""), h = get(st, "href", "");
      return '<section class="shell section"><div class="tp' + (get(st, "side", "right") === "left" ? " tp-flip" : "") + '">\n<div class="tp-words">' + headBlock(st) + '<div class="tp-body">' + paras(get(st, "body", "")) + '</div>' +
        (link && addrOk(h) ? '<a class="col-link" href="' + esc(hrefOf(h)) + '">' + txt(link) + '</a>' : "") + '</div>\n<figure class="tp-pic" data-reveal><div class="pic-frame">' + picOf(st) + '</div>' + (cap ? '<figcaption>' + txt(cap) + '</figcaption>' : "") + '</figure>\n</div></section>';
    };

    // ----- sections any page can use: batch 3, art and reading -----
    function rep(x) { return x && x.reported ? '<span class="rep">' + W("item.reported", "Reported") + '</span> ' : ""; }
    function srcLink(h, words) { return addrOk(h) ? '<a class="src" href="' + esc(hrefOf(h)) + '" rel="noopener">' + (words || W("btn.source", "Source")) + '</a>' : ""; }
    S.artworks = function (st) {
      var per = { "2": 2, "3": 3, "4": 4 }[String(get(st, "per_row", "3"))] || 3;
      var items = liveRows(get(st, "artworks", [])).map(function (r, k) {
        var w = r.x, tag = addrOk(w.href) ? "a" : "div", line = [w.year, w.medium].filter(Boolean).join(", ");
        return '<' + tag + ' class="aw-item"' + (tag === "a" ? ' href="' + esc(hrefOf(w.href)) + '"' : "") + ' data-adh-b="artworks.' + r.i + '" data-reveal style="--d:' + (k % 4) * 80 + 'ms"><span class="aw-pic">' + picOf(w) + '</span>' +
          '<span class="aw-t">' + (w.title ? txt(w.title) : '<span class="tbc">' + W("missing.title", "Title to confirm") + '</span>') + '</span>' + (line ? '<span class="aw-d">' + txt(line) + '</span>' : "") + (w.size ? '<span class="aw-d">' + txt(w.size) + '</span>' : "") + (w.note ? '<span class="aw-n">' + txt(w.note) + '</span>' : "") + '</' + tag + '>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="gl aw gl-' + per + '">\n' + items + '\n</div>\n</section>';
    };
    S.exhibitions = function (st) {
      var rows = liveRows(get(st, "shows", [])).map(function (r) {
        var x = r.x;
        return '<li class="exh-row" data-adh-b="shows.' + r.i + '"><span class="exh-when">' + (x.dates ? txt(x.dates) : '<span class="tbc">' + W("missing.tbc", "To confirm") + '</span>') + '</span><span class="exh-what"><span class="exh-t">' + rep(x) + txt(x.title || "") + '</span>' + (x.place ? '<span class="exh-d">' + txt(x.place) + '</span>' : "") + '</span>' +
          '<span class="exh-side">' + (x.kind ? '<span class="chip">' + txt(x.kind) + '</span>' : "") + srcLink(x.href) + '</span></li>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<ol class="exh" data-reveal>\n' + rows + '\n</ol>\n</section>';
    };
    S.career = function (st) {
      var rows = liveRows(get(st, "events", [])).map(function (r) {
        var x = r.x;
        return '<li class="exh-row car-row" data-adh-b="events.' + r.i + '"><span class="exh-when">' + (x.when ? txt(x.when) : '<span class="tbc">' + W("missing.tbc", "To confirm") + '</span>') + '</span><span class="exh-what"><span class="car-t">' + rep(x) + txt(x.what || "") + '</span></span><span class="exh-side">' + srcLink(x.href) + '</span></li>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<ol class="exh car" data-reveal>\n' + rows + '\n</ol>\n</section>';
    };
    S.press = function (st) {
      var items = liveRows(get(st, "quotes", [])).filter(function (r) { return r.x.quote; }).map(function (r, k) {
        var x = r.x, by = [x.who, x.publication, x.date].filter(Boolean).map(txt).join(", ");
        return '<figure class="card pq-card" data-adh-b="quotes.' + r.i + '" data-reveal style="--d:' + (k % 3) * 90 + 'ms"><blockquote>“' + txt(String(x.quote).trim()) + '”</blockquote>' + (by ? '<figcaption>' + by + '</figcaption>' : "") + srcLink(x.href, W("btn.read-source", "Read it at the source")) + '</figure>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="cols cols-2 pq">\n' + items + '\n</div>\n</section>';
    };

    // ----- sections any page can use: batch 4, sign-up and visiting -----
    // The sign-up sends nothing itself: it opens the visitor's own email app with a request ready to send.
    function mailTo() { return SITE.email || "info@artiscope.co.uk"; }
    S.signup = function (st) {
      var t = get(st, "text", ""), e = get(st, "eyebrow", ""), h = get(st, "heading", "");
      return '<section class="shell section">\n<div class="panel on-ink signup" data-reveal>\n<div class="su-head">' + (e ? '<p class="eyebrow">' + txt(e) + '</p>' : "") + (h ? '<h2 class="h2">' + txt(h) + '</h2>' : "") + (t ? '<p class="intro">' + txt(String(t).trim()) + '</p>' : "") + '</div>\n' +
        '<form class="form su-form" data-mailform="signup" data-email="' + esc(mailTo()) + '" novalidate>\n<div class="su-row"><label class="field">' + W("form.first-name", "First name") + '<input name="name" type="text" autocomplete="given-name"></label><label class="field">' + W("form.email", "Email") + '<input name="email" type="email" autocomplete="email" required></label></div>\n' +
        '<div class="form-foot"><button class="pill pill-mint" type="submit">' + (get(st, "button", "") ? txt(get(st, "button", "")) : W("btn.join", "Ask to join")) + '</button>\n<p class="quiet su-note" role="status">' + W("form.note", "This opens your own email app with a message ready to send to {email}.", { email: esc(mailTo()) }) + '</p></div>\n</form>\n</div>\n</section>';
    };
    // A sign-up box that pops up once a visit; drawn hidden, and shown by the site's script.
    S["signup-popup"] = function (st, ctx) {
      var id = (ctx && ctx.id) || "popup", d = Math.max(3, Math.min(60, Number(get(st, "delay", 8)) || 8)), e = get(st, "eyebrow", ""), t = get(st, "text", "");
      return '<div class="supop on-ink" id="' + esc(id) + '" data-popup data-delay="' + d + '" role="dialog" aria-labelledby="' + esc(id) + '-h" hidden>\n<button type="button" class="supop-x" data-pop-close>' + W("btn.close", "Close") + '</button>\n' +
        (e ? '<p class="eyebrow">' + txt(e) + '</p>' : "") + '<h2 class="supop-h" id="' + esc(id) + '-h">' + txt(get(st, "heading", "")) + '</h2>' + (t ? '<p class="intro">' + txt(String(t).trim()) + '</p>' : "") + '\n' +
        '<form class="form su-form" data-mailform="signup" data-email="' + esc(mailTo()) + '" novalidate>\n<label class="field">' + W("form.email", "Email") + '<input name="email" type="email" autocomplete="email" required></label>\n' +
        '<div class="form-foot"><button class="pill pill-mint" type="submit">' + (get(st, "button", "") ? txt(get(st, "button", "")) : W("btn.join", "Ask to join")) + '</button>\n<p class="quiet su-note" role="status">' + W("form.note", "This opens your own email app with a message ready to send to {email}.", { email: esc(mailTo()) }) + '</p></div>\n</form>\n</div>';
    };
    S.visit = function (st) {
      var mw = get(st, "map_words", ""), m = String(get(st, "map", "") || ""), map = mw && /^https:\/\//i.test(m) ? '<a class="src vis-map" href="' + esc(m) + '" target="_blank" rel="noopener">' + txt(mw) + '</a>' : "";
      var cards = liveRows(get(st, "details", [])).map(function (r, k) {
        var x = r.x;
        return '<div class="card vis-card" data-adh-b="details.' + r.i + '" data-reveal style="--d:' + (k % 3) * 90 + 'ms"><p class="eyebrow vis-label">' + txt(x.title || "") + '</p><p class="vis-words">' + (x.text ? txt(String(x.text).trim()) : '<span class="tbc">' + W("missing.to-add", "To add") + '</span>') + '</p>' + (k === 0 ? map : "") + '</div>';
      }).join("\n");
      return '<section class="shell section">\n' + headBlock(st) + '<div class="cols vis">\n' + cards + '\n</div>\n' + (cards ? "" : map) + '</section>';
    };

    var SEC_CSS;
    // A section's own CSS (set in the editor), kept inside that section: every rule is limited to it.
    function scopeCss(css, scope) {
      var s = String(css || "").replace(/[<>\\]/g, "").replace(/url\s*\(/gi, "none("), out = "", i = 0;
      while (i < s.length) {
        var open = s.indexOf("{", i); if (open < 0) break;
        var sel = s.slice(i, open).replace(/[;}]/g, " ").trim(), depth = 1, j = open + 1;
        while (j < s.length && depth) { if (s[j] === "{") depth++; else if (s[j] === "}") depth--; j++; }
        var body = s.slice(open + 1, depth ? j : j - 1);
        if (/^@(media|supports|container)\b/i.test(sel)) out += sel + "{" + scopeCss(body, scope) + "}\n";
        else if (/^@(-webkit-)?keyframes\b/i.test(sel)) out += sel + "{" + body + "}\n";
        else if (sel && sel.charAt(0) !== "@") out += sel.split(",").map(function (x) { x = x.trim(); return /^:scope\b/.test(x) ? scope + x.slice(6) : /^&/.test(x) ? scope + x.slice(1) : scope + " " + x; }).join(", ") + " {" + body + "}\n";
        i = j;
      }
      return out;
    }
    function cssMark(html, sec) {
      if (!sec || !sec.css || !String(sec.css).trim()) return html;
      (SEC_CSS = SEC_CSS || []).push(scopeCss(sec.css, '[data-css="' + sec.id + '"]'));
      return html.replace(/^(\s*<[a-z]+)/, '$1 data-css="' + sec.id + '"');
    }
    function secCssTag() { var t = SEC_CSS && SEC_CSS.length ? '<style data-sec-css>\n' + SEC_CSS.join("") + '</style>\n' : ""; SEC_CSS = []; return t; }
    // In the editor each section is marked, so a click on the page can find it.
    function mark(html, id) { return opts.mark ? html.replace(/^(\s*<[a-z]+)/, '$1 data-adh="' + id + '"') : html; }
    // A second copy of a section gets its own names for anything already used
    // higher up the page, so its filters, form and links work on their own.
    function own(html, sid, seen) {
      var clash = {};
      html.replace(/ id="([^"]+)"/g, function (m, x) { if (seen[x]) clash[x] = 1; return m; });
      var names = Object.keys(clash);
      if (names.length) {
        var pre = String(sid).replace(/[^a-z0-9-]/gi, "-") + "--";
        html = html.replace(/ (id|for|data-filter-group|aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g, function (m, a, x) { return clash[x] ? " " + a + '="' + pre + x + '"' : m; })
          .replace(/ href="#([^"]+)"/g, function (m, x) { return clash[x] ? ' href="#' + pre + x + '"' : m; });
      }
      html.replace(/ id="([^"]+)"/g, function (m, x) { seen[x] = 1; return m; });
      return html;
    }
    // Templates: an article or an artist page is drawn with the sections of its template around its own content (the "main" section).
    function tplOf(kind, slug) {
      var all = ((PAGES.templates || {})[kind]) || {}, o = opts.tpl;
      var id = o && o.kind === kind && all[o.id] ? o.id : ((((PAGES.assign || {})[kind]) || {})[slug] || "default");
      return all[id] || all["default"] || null;
    }
    // A setting in a template can take its value from the page it is drawn on ("connect stored data").
    function pageFill(v, kind, it) {
      if (!it) return v;
      if (Array.isArray(v)) return v.map(function (x) { return pageFill(x, kind, it); });
      if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = pageFill(v[k], kind, it); }); return o; }
      if (typeof v !== "string" || v.indexOf("{page.") < 0) return v;
      if (v === "{page.artist}") return kind === "artist" ? it.slug : ((it.artists || [])[0] || "");
      if (v === "{page.article}") return kind === "article" ? it.slug : "";
      var plain = function (x) { return String(x == null ? "" : x).replace(/<[^>]*>/g, "").replace(/[<>]/g, ""); };
      var title = kind === "artist" ? it.name : it.title, sum = kind === "artist" ? (it.summary || it.dek || it.role || "") : (it.dek || it.standfirst || it.description || "");
      return v.split("{page.title}").join(plain(title)).split("{page.summary}").join(plain(sum));
    }
    function tplWrap(kind, slug, inner) {
      var t = tplOf(kind, slug); if (!t || !Array.isArray(t.sections)) return inner;
      var item = kind === "article" ? FEATURE_BY_SLUG[slug] : (ARTISTS[slug] ? Object.assign({ slug: slug }, ARTISTS[slug]) : null);
      var placed = false, seen = {};
      inner.replace(/ id="([^"]+)"/g, function (m, x) { seen[x] = 1; return m; });
      var out = t.sections.map(function (sec) {
        if (sec && sec.type === "main") { placed = true; return inner; }
        if (!sec || sec.visible === false || !S[sec.type]) return "";
        return mark(cssMark(own(S[sec.type](pageFill(sec.settings || {}, kind, item), { id: sec.id, page: "tpl" }), sec.id, seen), sec), sec.id);
      });
      if (!placed) out.unshift(inner);
      return out.filter(Boolean).join("\n");
    }
    function sectionsPage(key) {
      var pg = PAGES.pages[key], parts = [];
      var seen = {}, top = [], lead = true;
      (pg.sections || []).forEach(function (sec) {
        if (sec.visible === false || !S[sec.type]) return;
        var html = mark(cssMark(own(S[sec.type](sec.settings || {}, { id: sec.id, page: key }), sec.id, seen), sec), sec.id);
        // announcement bars at the start of a page sit above the menu bar
        if (lead && sec.type === "announcement") top.push(html); else { lead = false; parts.push(html); }
      });
      var extra = "";
      if (key === "home") extra = '<script type="application/ld+json">' + pyJson({ "@context": "https://schema.org", "@type": "WebSite", name: "Global Art Monitor", url: SITE.url, description: SITE.intro }) + '</script>\n';
      else if (/index\.html$/.test(pg.path || "") && pg.path !== "index.html") extra = '<script type="application/ld+json">' + pyJson({ "@context": "https://schema.org", "@type": /^about\//.test(pg.path) ? "AboutPage" : /^contact\//.test(pg.path) ? "ContactPage" : "CollectionPage", name: String(pg.title || "").split(" | ")[0], description: pg.description || "", url: SITE.url + pg.path.slice(0, -"index.html".length), isPartOf: { "@type": "WebSite", name: "Global Art Monitor", url: SITE.url } }) + '</script>\n';
      return page(pg.path, pg.title || "", pg.description || "", (pg.own ? top.concat(parts) : parts).join("\n"), pg.current || "", !!pg.intro, extra, pg.own ? "" : top.join("\n"), !!pg.own);
    }
    function workCard(s) {
      var pic = s.image && s.image.file
        ? '<figure class="work-pic"><img src="' + workImgSrc(s, "@@") + '" alt="' + esc(workAlt(s)) + '" loading="lazy">' + (s.image.credit ? '<figcaption>' + esc(s.image.credit) + '</figcaption>' : "") + '</figure>'
        : '<div class="work-pic work-pic-none"><span>' + W("work.no-photo", "Photo to come") + '</span></div>';
      var line = function (k, v) { return '<div class="work-row"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; };
      var srcs = '<a href="' + esc(s.source_url) + '" rel="noopener">' + esc(s.source_label) + '</a>' + (s.source2_url ? ', <a href="' + esc(s.source2_url) + '" rel="noopener">' + esc(s.source2_label) + '</a>' : "") +
        (s.mutualart && s.mutualart.url ? ', <a href="' + esc(s.mutualart.url) + '" rel="noopener">' + W("table.mutualart-link", "MutualArt sale record") + '</a>' : "");
      return '<article class="aw-card" id="work-' + esc(s.id) + '">' + pic + '<div class="work-body">' +
        '<h3>' + esc(s.title) + ' <span class="yr">(' + esc(s.year) + ')</span></h3>' + (s.medium ? '<p class="work-medium">' + esc(s.medium) + '</p>' : "") +
        line(W("work.sold", "Sale"), esc(s.date_text) + ', ' + esc(s.house) + '<span class="sub">' + esc(s.sale) + (s.lot ? ', ' + W("table.lot", "Lot {lot}", { lot: esc(s.lot) }) : s.mutualart && s.mutualart.lot ? ', ' + W("table.lot", "Lot {lot}", { lot: esc(s.mutualart.lot) }) + ' ' + W("table.mutualart-per", "per MutualArt") : "") + '</span>') +
        line(W("table.estimate", "Estimate"), estCell(s)) + line(W("table.hammer", "Hammer price"), hamCell(s)) + line(W("table.premium", "With premium"), premCell(s)) +
        line(W("table.currency", "Currency"), esc(s.currency)) + line(W("table.source", "Source"), srcs) + '</div></article>\n';
    }
    function artistPage(slug) {
      var a = ARTISTS[slug], rows = salesFor(slug), pr = priced(rows), best = maxBy(pr, function (s) { return s.premium; });
      var dated = rows.filter(function (s) { return s.date; }), first = minBy(dated, function (s) { return s.date; });
      var paras = (a.body || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      var standing = (a.standing || []).length ? '<h2>' + W("item.standing", "Why the work is valued") + '</h2>\n' + a.standing.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + '\n' : "";
      // The fuller profile: life and career, key works, the artist's own words and how to read the prices.
      var P = function (arr) { return (arr || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join(""); };
      var career = (a.career || []).length ? '<h2>' + W("item.career", "Life and career") + '</h2>\n' + P(a.career) + '\n' : "";
      var kworks = (a.works || []).length ? '<h2>' + W("item.key-works", "Key works, and what reaches auction") + '</h2>\n' + a.works.map(function (w) { return '<h3>' + esc(w.t) + (w.y ? ' (' + esc(w.y) + ')' : "") + '</h3>' + (w.m ? '<p class="wmed">' + esc(w.m) + '</p>' : "") + '<p>' + esc(w.note) + '</p>'; }).join("") + '\n' : "";
      var quotes = (a.quotes || []).length ? '<h2>' + W("item.own-words", "In the artist's words") + '</h2>\n' + a.quotes.map(function (q) { return '<figure class="aq"><blockquote>' + esc(q.q) + '</blockquote><figcaption>' + esc(q.who) + '</figcaption></figure>'; }).join("") + '\n' : "";
      var reading = (a.reading || []).length ? '<h2>' + W("item.reading", "Reading the prices") + '</h2>\n' + P(a.reading) + '\n' : "";
      var cmp = (a.compare || []).map(function (c) { return ARTISTS[c] ? '<li><a href="@@artists/' + c + '/">' + esc(ARTISTS[c].name) + '</a></li>' : ""; }).join("");
      var srcs = (a.sources || []).map(function (s) { return '<li><a href="' + esc(s[1]) + '" rel="noopener">' + esc(s[0]) + '</a></li>'; }).join("");
      var related = FEATURES.filter(function (f) { return f.slug.indexOf(slug) >= 0; });
      if (FEATURE_BY_SLUG["why-one-record-sale-does-not-establish-market-value"]) related.push(FEATURE_BY_SLUG["why-one-record-sale-does-not-establish-market-value"]);
      var rel = related.map(function (f) { return '<li><a href="@@research/' + f.slug + '/">' + esc(f.title) + '</a></li>'; }).join("");
      var img = "";
      if (a.image) {
        var alt = a.alt || "Work by " + a.name, cap = a.caption || a.name + ". Image courtesy of the artist.";
        var src = opts.imageSrc ? opts.imageSrc(a.image) : "@@assets/images/" + a.image;
        img = '<figure class="art-slot" data-reveal><img src="' + src + '" alt="' + esc(alt) + '" loading="lazy"><figcaption>' + esc(cap) + '</figcaption></figure>';
      }
      // in the editor, a profile with no picture yet shows where it goes, so a click picks the Picture part
      else if (opts.mark) img = '<figure class="art-slot"><div class="pic-frame" style="aspect-ratio:4/5"><span class="supply">' + W("missing.picture", "Picture to supply") + '</span></div></figure>';
      if (img && opts.mark) img = img.replace('<figure class="art-slot"', '<figure class="art-slot" data-adh="picture"');
      var bests = bestPerCurrency(rows);
      var bestFact = bests.length > 1 ? '<span class="v">' + money(bests[0].premium, bests[0].currency) + '</span><span class="s">With premium. ' + bestLine(bests[0]) + '. ' +
          bests.slice(1).map(function (b) { return 'Highest in ' + esc(b.currency) + ': ' + money(b.premium, b.currency) + ', ' + bestLine(b) + '.'; }).join(" ") + '</span>'
        : best ? '<span class="v">' + money(best.premium, best.currency) + '</span><span class="s">With premium. ' + esc(best.title) + ', ' + esc(best.house) + ', ' + esc(best.date ? best.date_text : "date to confirm") + '.</span>'
        : '<span class="v">' + W("missing.tbc", "To confirm") + '</span><span class="s">' + W("missing.no-priced", "No priced sale documented yet.") + '</span>';
      var firstFact = first ? '<span class="v">' + esc(first.date_text) + '</span><span class="s">' + esc(first.title) + ', ' + esc(first.house) + '.</span>' : '<span class="v">' + W("missing.tbc", "To confirm") + '</span><span class="s">' + W("missing.no-dated", "No dated sale yet.") + '</span>';
      var M = function (h, id) { return opts.mark ? h.replace(/^(\s*<[a-z]+)/, '$1 data-adh="' + id + '"') : h; };
      var body = M('<section class="shell page-head">\n<p class="crumbs" data-reveal><a href="@@artists/">' + W("item.crumb-artists", "Artist Market Profiles") + '</a></p>\n<h1 class="h1" data-reveal style="--d:80ms">' + esc(a.name) + '</h1>\n' +
        '<p class="lede" data-reveal style="--d:200ms">' + esc(a.summary) + '</p>\n</section>', "words") + '\n' +
        M('<section class="shell section" style="padding-top:48px">\n<div class="facts">\n' +
        '<div class="fact" data-reveal><span class="k">' + W("item.highest", "Highest documented price") + '</span>' + bestFact + '</div>\n' +
        '<div class="fact" data-reveal style="--d:90ms"><span class="k">' + W("item.priced", "Priced results") + '</span><span class="v">' + pr.length + '</span><span class="s">' + W("item.out-of", "Out of {total} lots we have found.", { total: String(rows.length) }) + '</span></div>\n' +
        '<div class="fact" data-reveal style="--d:180ms"><span class="k">' + W("item.earliest", "Earliest dated sale") + '</span>' + firstFact + '</div>\n' +
        '<div class="fact" data-reveal style="--d:270ms"><span class="k">' + W("item.houses", "Auction houses") + '</span><span class="v">' + (a.houses || []).length + '</span><span class="s">' + esc((a.houses || []).join(", ")) + '.</span></div>\n' +
        '</div>\n</section>', "words") + '\n' +
        (opts.mark ? "" : '<section class="shell section" id="price-history">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + W("px.eyebrow", "Price history") + '</p>\n<div class="split"><h2 class="h2">' + W("px.heading", "Every priced sale, one dot each") + '</h2>\n' +
        '<p class="intro">' + W("px.intro", "Tap or hover over a dot to see the sale. Each currency has its own chart, and unique works are kept apart from prints and editions.") + '</p></div>\n' +
        pxFrame('data-px="artist" data-src="px-data"') + '\n' + pxData(rows) + '\n<p class="px-links"><a class="text-link" href="@@price-explorer/#compare=' + slug + ((a.compare || []).filter(function (c) { return ARTISTS[c]; })[0] ? "," + (a.compare || []).filter(function (c) { return ARTISTS[c]; })[0] : "") + '">' + W("px.compare-link", "Compare {name} with another artist", { name: esc(a.name) }) + '</a></p>\n</div>\n</section>\n') +
        M('<section class="shell section" id="timeline">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + W("item.timeline", "Artist auction timeline") + '</p>\n<div class="split"><h2 class="h2">' + W("item.at-auction", "{name} at auction", { name: esc(a.name) }) + '</h2>\n' +
        '<p class="intro">Every public sale we can document, newest first. Estimate, hammer price and price with premium each have their own column.</p></div>\n' +
        LEGEND + '\n' + table(rows, "timeline-" + slug) + '\n' + TABLE_NOTE + '\n</div>\n</section>', "sales") + '\n' +
        M('<section class="shell section" id="works">\n<div class="section-head" data-reveal><p class="eyebrow">' + W("item.works-eyebrow", "The works") + '</p>\n<h2 class="h2">' + W("item.works", "Every work in the timeline") + '</h2>\n' +
        '<p class="intro-blush">Each sale above, with the work, what it is made of and the full sale details. Photos appear where we have one we are allowed to show.</p></div>\n' +
        '<div class="works">\n' + rows.map(workCard).join("") + '</div>\n</section>', "sales") + '\n' +
        M('<section class="shell section">\n<div class="panel on-ink" data-reveal>\n<h2 class="h2">' + W("item.side-by-side", "Estimate, hammer and total, side by side") + '</h2>\n' +
        '<p class="intro" style="max-width:620px">' + (bests.length > 1 ? 'Each bar compares the three figures within one sale. Sales in the same currency share a scale.' : 'The bars use one scale, so you can compare sales with each other as well as the three figures within each sale.') + '</p>\n' + ladder(rows) + '\n</div>\n</section>', "sales") + '\n' +
        M('<section class="shell article" style="padding-top:104px">\n<div class="article-body prose" data-reveal>\n<h2 style="margin-top:0">' + W("item.about", "About the artist") + '</h2>\n' + paras + '\n' + career + standing + kworks + quotes + reading +
        '<p>These figures are a record of past public sales. They are not a valuation and they are not advice. For how to read them, start with <a href="@@research/what-an-auction-result-tells-collectors/">what an auction result actually tells collectors</a>.</p>\n</div>\n' +
        '<aside class="article-side" data-reveal style="--d:120ms">\n' + img + '\n<div class="mini"><h2>' + W("item.related", "Related reading") + '</h2><ul>' + rel + '</ul></div>\n' +
        (cmp ? '<div class="mini"><h2>' + W("item.compare", "Compare with") + '</h2><ul>' + cmp + '</ul></div>\n' : "") + '<div class="mini"><h2>' + W("item.sources", "Background sources") + '</h2><ul>' + srcs + '</ul></div>\n' +
        '<div class="mini"><h2>' + W("item.gap", "Spotted a gap?") + '</h2><p>If you can document a sale we have missed, or correct a figure, <a href="@@about/#corrections">tell us</a>.</p></div>\n</aside>\n</section>', "about");
      if (!opts.mark) {
        var relCmp = (a.compare || []).filter(function (c) { return ARTISTS[c]; }).slice(0, 3).map(function (c) { return artistRelCard(c, W("rel.compare", "Compare with"), 0); });
        var relSales = latestSales(3, [slug].concat(a.compare || [])).map(function (s) { return saleRelCard(s, 0); });
        var relRead = featuresAbout(slug).slice(0, 2).map(function (f) { return featureRelCard(f, 0); });
        body += '\n' + relSection(W("rel.eyebrow", "Keep exploring"), W("rel.artist-heading", "More from the record"), [relCmp, relRead, relSales]);
      }
      body = tplWrap("artist", slug, body); AO_KIND = "artist";
      var ld = pyJson({ "@context": "https://schema.org", "@type": "ProfilePage", name: a.name + " market profile", url: SITE.url + "artists/" + slug + "/", dateModified: PUBLISHED_DT, mainEntity: { "@type": "Person", name: a.name } });
      return page("artists/" + slug + "/index.html", a.name + " Auction Results and Market Profile | Global Art Monitor",
        a.name + " auction results: every documented sale with estimate, hammer price and premium-inclusive price, sale dates and sources.",
        body, "artists", false, '<script type="application/ld+json">' + ld + '</script>\n');
    }
    function featurePage(f) {
      var html = String(f.body || "");
      ARTIST_KEYS.forEach(function (slug) {
        var token = "[[TIMELINE:" + slug + "]]";
        if (html.indexOf(token) >= 0) {
          var block = '<div class="panel on-ink" style="padding:28px 22px;gap:18px">' + LEGEND + table(salesFor(slug), "feature-" + slug) +
            '<p class="note">Sources are linked in the last column. "' + W("table.calculated", "Our calculation") + '" means a figure worked out from the other published price using the house\'s published premium rates.</p></div>';
          html = html.split(token).join(block);
        }
      });
      var others = FEATURES.filter(function (o) { return o.slug !== f.slug; }).slice(0, 4);
      var more = others.map(function (o) { return '<li><a href="@@research/' + o.slug + '/">' + esc(o.title) + '</a></li>'; }).join("");
      var M = function (h, id) { return opts.mark ? h.replace(/^(\s*<[a-z]+)/, '$1 data-adh="' + id + '"') : h; };
      var body = M('<section class="shell page-head wide">\n<p class="crumbs" data-reveal><a href="@@research/">' + W("item.crumb-research", "Research Reports") + '</a></p>\n<p class="eyebrow" data-reveal>' + esc(f.kicker) + '</p>\n' +
        '<h1 class="h1" data-reveal style="--d:80ms;font-size:clamp(38px,5vw,62px)">' + esc(f.title) + '</h1>\n' +
        '<p class="byline" data-reveal style="--d:160ms">By the Global Art Monitor research desk. ' + f.mins + ' minute read.</p>\n</section>', "words") + '\n' +
        '<section class="shell article">\n' + M('<article class="article-body prose">\n' + html + '\n</article>', "body") + '\n' +
        '<aside class="article-side">\n<div class="mini"><h2>' + W("item.more", "More research") + '</h2><ul>' + more + '</ul></div>\n' +
        '<div class="mini"><h2>' + W("item.figures", "The figures") + '</h2><p>All prices in this piece are on the <a href="@@auction-results/">auction results</a> page, with a source for each.</p></div>\n' +
        '<div class="mini"><h2>' + W("item.who", "Who publishes this") + '</h2><p>' + esc(SITE.disclosure || "") + '</p></div>\n</aside>\n</section>';
      if (!opts.mark) {
        var inPiece = artistsIn(f).slice(0, 3);
        body += '\n' + relSection(W("rel.eyebrow", "Keep exploring"), inPiece.length ? W("rel.feature-heading", "The artists in this piece") : W("rel.feature-heading-none", "Recent sales on the record"),
          [inPiece.map(function (k) { return artistRelCard(k, W("rel.in-piece", "In this piece"), 0); }), latestSales(inPiece.length ? 2 : 3, inPiece).map(function (s) { return saleRelCard(s, 0); })]);
      }
      body = tplWrap("article", f.slug, body); AO_KIND = "article";
      var ld = pyJson({ "@context": "https://schema.org", "@type": "Article", headline: f.title, description: f.description, datePublished: PUBLISHED_DT, dateModified: PUBLISHED_DT,
        author: { "@type": "Organization", name: "Global Art Monitor" }, publisher: { "@type": "Organization", name: "Global Art Monitor" }, mainEntityOfPage: SITE.url + "research/" + f.slug + "/" });
      return page("research/" + f.slug + "/index.html", f.title + " | Global Art Monitor", f.description || "", body, "research", false, '<script type="application/ld+json">' + ld + '</script>\n');
    }
    // The price explorer: one artist's prices on a chart, and two artists side by side.
    function explorerPage() {
      var all = salesFor(null), withPriced = ARTIST_KEYS.filter(function (k) { return priced(salesFor(k)).length; });
      var head2 = '<section class="shell page-head wide">\n<p class="eyebrow" data-reveal>' + W("px.page-eyebrow", "Price explorer") + '</p>\n' +
        '<h1 class="h1" data-reveal style="--d:80ms">' + W("px.page-title", "Look at the prices, sale by sale.") + '</h1>\n' +
        '<p class="lede" data-reveal style="--d:200ms">' + W("px.page-lede", "Pick an artist to see every priced sale we have documented on one chart, or put two artists side by side. The charts use the same {n} lots as the auction results table, with the same sources.", { n: String(all.length) }) + '</p>\n' +
        '<div class="hero-actions" data-reveal style="--d:260ms"><a class="pill pill-mint pill-small" href="#history">' + W("px.jump-history", "Price history") + '</a><a class="pill pill-ink pill-small" href="#compare">' + W("px.jump-compare", "Compare two artists") + '</a></div>\n</section>';
      var hist = '<section class="shell section" id="history">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + W("px.eyebrow", "Price history") + '</p>\n<div class="split"><h2 class="h2">' + W("px.pick-heading", "One artist, every priced sale") + '</h2>\n' +
        '<p class="intro">' + W("px.pick-intro", "Each dot is one sale. Tap or hover over it for the work, the house and the source. The thin bar behind a dot is the estimate printed before the sale.") + '</p></div>\n' +
        pxFrame('data-px="pick" data-src="px-data" data-artists="' + withPriced.join(" ") + '"') + '\n</div>\n</section>';
      var cmp = '<section class="shell section" id="compare">\n<div class="panel on-ink" data-reveal>\n<p class="eyebrow">' + W("px.cmp-eyebrow", "Side by side") + '</p>\n<div class="split"><h2 class="h2">' + W("px.cmp-heading", "Compare two artists") + '</h2>\n' +
        '<p class="intro">' + W("px.cmp-intro", "Two artists can only share a chart where both sold in the same currency. We never convert prices, so the chart shows one currency at a time.") + '</p></div>\n' +
        pxFrame('data-px="compare" data-src="px-data" data-artists="' + withPriced.join(" ") + '"') + '\n</div>\n</section>';
      var how = '<section class="shell article">\n<div class="article-body prose" data-reveal>\n<h2 style="margin-top:0">' + W("px.how-heading", "How to read the charts") + '</h2>\n' +
        '<p>A filled dot is the price with buyer\'s premium. A hollow dot means only the hammer price is known. A dashed ring is a figure from the MutualArt sale record that we have not yet matched to the house\'s own page. Lots with no confirmed price sit as small marks along the foot of the chart, so the gaps stay in view.</p>\n' +
        '<p>Dots are never joined up. Two sales are two different works, often of different sizes and made in different years, so a line between them would suggest a movement that the figures do not show. Where an artist has only a handful of priced sales in a currency, the chart says so.</p>\n' +
        '<p>Unique works are kept apart from prints, multiples and editions. A signed print and a painting by the same artist are different things and are not compared. The type of work is read from the description the house published. A painting or drawing counts as a unique work. Where the description does not settle it, the sale is marked as type not stated.</p>\n' +
        '<p>These are records of past public sales. They are not valuations and not advice. For the full method, see <a href="@@about/#method">how we report a price</a>, and for every figure with its source, the <a href="@@auction-results/">auction results</a> table.</p>\n</div>\n' +
        '<aside class="article-side" data-reveal style="--d:120ms">\n<div class="mini"><h2>' + W("item.who", "Who publishes this") + '</h2><p>' + esc(SITE.disclosure || "") + '</p></div>\n</aside>\n</section>';
      var body = head2 + '\n' + hist + '\n' + cmp + '\n' + pxData(all) + '\n' + how;
      var ld = pyJson({ "@context": "https://schema.org", "@type": "WebPage", name: "Price explorer", url: SITE.url + "price-explorer/", isPartOf: { "@type": "WebSite", name: "Global Art Monitor", url: SITE.url } });
      return page("price-explorer/index.html", "Price Explorer: Auction Price Charts and Artist Comparison | Global Art Monitor",
        "Chart every documented auction sale for an artist, sale by sale, in the currency of the sale, or compare two artists side by side.", body, "price-explorer", false, '<script type="application/ld+json">' + ld + '</script>\n');
    }
    // Home page: a live chart for one artist, with the way into the explorer.
    S["price-tools"] = function (st, ctx) {
      // by default, the artist with the most priced sales of one type in one currency, spread over the longest time
      var counts = ARTIST_KEYS.map(function (k) {
        var g = {}; salesFor(k).forEach(function (x) { var c = chartPrice(x); if (c && x.date) { var key = x.currency + kindOf(x); (g[key] = g[key] || []).push(x.date); } });
        var best = Object.keys(g).map(function (key) { var d = g[key].sort(); return g[key].length * 1000 + (day(d[d.length - 1]) - day(d[0])) / 864e5 / 10; }).sort(function (x, y) { return y - x; })[0] || 0;
        return [k, best];
      }).sort(function (x, y) { return y[1] - x[1]; });
      var slug = ARTISTS[get(st, "artist", "")] ? st.artist : (counts[0] || [""])[0];
      if (!slug) return "";
      var pair = get(st, "compare", "banksy,kaws");
      return '<section class="shell section" id="' + ctx.id + '">\n<div class="panel on-ink px-teaser" data-reveal>\n<div class="px-teaser-text">\n<p class="eyebrow">' + txt(get(st, "eyebrow", "Price explorer")) + '</p>\n' +
        '<h2 class="h2">' + txt(get(st, "heading", "See the prices for yourself.")) + '</h2>\n<p class="intro">' + txt(get(st, "text", "")).split("{name}").join(esc(ARTISTS[slug].name)) + '</p>\n' +
        '<div class="hero-actions"><a class="pill pill-mint pill-small" href="@@price-explorer/#artist=' + slug + '">' + txt(get(st, "button", "Open the price explorer")) + '</a>' +
        '<a class="pill pill-blush pill-small" href="@@price-explorer/#compare=' + esc(pair) + '">' + txt(get(st, "button2", "Compare two artists")) + '</a></div>\n</div>\n' +
        (opts.mark ? '<div class="px"><p class="note">' + W("px.editor", "The live chart appears on the published page.") + '</p></div>' : pxFrame('data-px="artist" data-src="px-home" data-compact="1"') + '\n' + pxData(salesFor(slug), "px-home")) + '\n</div>\n</section>';
    };
    function notFound() {
      var body = '<section class="shell page-head">\n<p class="eyebrow">' + W("nf.eyebrow", "Page not found") + '</p>\n<h1 class="h1">' + W("nf.title", "That page is not in the record.") + '</h1>\n<p class="lede">' + W("nf.lede", "The link may be old or mistyped.") + '</p>\n' +
        '<div class="hero-actions"><a class="pill pill-ink" href="/">' + W("nf.home", "Go to the home page") + '</a><a class="pill pill-mint" href="/auction-results/">' + W("nf.results", "Browse auction results") + '</a></div>\n</section>';
      // A missing page should never be indexed or point search engines at another address.
      var nfHead = head("/", "Page not found | Global Art Monitor", "Page not found.", "404.html")
        .replace(/<link rel="canonical"[^>]*>\n/, '<meta name="robots" content="noindex">\n')
        .replace(/<meta property="og:url"[^>]*>\n/, "");
      return { path: "404.html", html: nfHead + "<body>\n" + (groupHtml("top", true) ? groupHtml("top", true).split("@@").join("/") + "\n" : "") + header("/", "") + '<main id="main">\n' + [groupHtml("top", false), body, groupHtml("bottom"), groupHtml("popups")].filter(Boolean).join("\n").split("@@").join("/") + '\n</main>\n' + footer("/") };
    }
    // Every published page, in the order the old build wrote them.
    function all() {
      var out = [], keys = Object.keys(PAGES.pages || {}), done = {};
      function p(k) { if (PAGES.pages[k] && !done[k]) { done[k] = 1; out.push(sectionsPage(k)); } }
      p("home"); p("auction-results"); p("artists"); ARTIST_KEYS.forEach(function (s) { out.push(artistPage(s)); });
      p("research"); FEATURES.forEach(function (f) { out.push(featurePage(f)); });
      if (!PAGES.pages["price-explorer"]) out.push(explorerPage());
      ["market-intelligence", "collecting-valuation", "about", "contact"].forEach(p);
      keys.forEach(p);
      out.push(notFound());
      return out;
    }
    return {
      all: all, sectionsPage: sectionsPage, notFound: notFound,
      artistPage: function (slug) { return ARTISTS[slug] ? artistPage(slug) : null; },
      explorerPage: explorerPage,
      featurePage: function (slug) { return FEATURE_BY_SLUG[slug] ? featurePage(FEATURE_BY_SLUG[slug]) : null; },
      // Which page a web address inside the site leads to.
      which: function (path) {
        path = String(path || "").replace(/^\/+/, "").replace(/index\.html$/, "").split("#")[0].split("?")[0];
        var m;
        if ((m = /^artists\/([a-z0-9-]+)\/?$/.exec(path)) && ARTISTS[m[1]]) return { kind: "artist", key: m[1] };
        if ((m = /^research\/([a-z0-9-]+)\/?$/.exec(path)) && (D.articles || []).some(function (f) { return f.slug === m[1]; })) return { kind: "article", key: m[1] };
        var k = Object.keys(PAGES.pages || {}).find(function (x) { return PAGES.pages[x].path === path + (path && !/\/$/.test(path) ? "/" : "") + "index.html"; });
        return k ? { kind: "page", key: k } : null;
      },
    };
  }

  var GAM = { fromFiles: fromFiles, Site: Site, pyJson: pyJson, MARK_INNER: MARK_INNER, slugify: slugify };
  if (typeof module !== "undefined" && module.exports) module.exports = GAM; else root.GAM = GAM;
})(typeof window !== "undefined" ? window : this);

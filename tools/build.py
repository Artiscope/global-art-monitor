#!/usr/bin/env python3
"""Builds the Global Art Monitor site into the repository root.

Run from anywhere:  python3 tools/build.py
Words live in tools/content.py. Sales live in data/sales.json.
Artist images: add assets/images/<artist-slug>.jpg and rebuild.
"""
import html
import json
import re
import os
import sys
from html import escape as esc

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import content as C  # noqa: E402

DATA = json.load(open(os.path.join(ROOT, "data", "sales.json"), encoding="utf-8"))
# Optional description and caption for each artist image, set when a
# photo is sent from Artiscope Digital Home.
_notes = os.path.join(ROOT, "data", "images.json")
IMAGE_NOTES = json.load(open(_notes, encoding="utf-8")) if os.path.exists(_notes) else {}
PAGES = json.load(open(os.path.join(ROOT, "data", "pages.json"), encoding="utf-8"))


def fill(text, is_html=False):
    """Puts the site's own details into a section's words. Plain words are
    made safe for the page first; a section that holds HTML is not."""
    text = str(text) if is_html else html.escape(str(text), quote=False)
    return (text.replace("{disclosure}", esc(C.SITE["disclosure"])).replace("{email}", C.SITE["email"])
            .replace("{published}", C.PUBLISHED_TEXT).replace("{tagline}", esc(C.SITE["tagline"]))
            .replace("{headline}", esc(C.SITE["headline"])).replace("{intro}", esc(C.SITE["intro"])))


def shared(key):
    part = (PAGES.get("shared") or {}).get(key) or {}
    return part.get("settings") or {}, part.get("visible", True)
ARTISTS = DATA["artists"]
SALES = DATA["sales"]
SYMBOL = {"GBP": "£", "USD": "US$", "EUR": "€"}
FEATURE_BY_SLUG = {f["slug"]: f for f in C.FEATURES}
WRITTEN = []


def money(n, cur="GBP"):
    return f"{SYMBOL.get(cur, '')}{n:,.0f}"


def plain(n):
    return f"{n:,.0f}"


def sort_key(s):
    return s["date"] or "9999"


def sales_for(slug=None):
    rows = [s for s in SALES if slug is None or s["artist"] == slug]
    return sorted(rows, key=sort_key)


def priced(rows):
    return [s for s in rows if s["premium"]]


def latest_priced():
    rows = [s for s in priced(SALES) if s["date"]]
    return max(rows, key=lambda s: s["date"])


# ---------- logo ----------

MARK_INNER = ('<path d="M 88.3 31.7 A 40 40 0 1 0 100 60" fill="none" stroke="{fg}" stroke-width="13" stroke-linecap="round"/>'
              '<line x1="40" y1="60" x2="78" y2="60" stroke="{fg}" stroke-width="5" stroke-linecap="round"/>'
              '<circle cx="40" cy="60" r="6" fill="{fg}"/><circle cx="58" cy="60" r="6" fill="{fg}"/>'
              '<circle cx="78" cy="60" r="10.5" fill="#22E3A2"/>')
MARK = '<svg class="mark" viewBox="0 0 120 120" aria-hidden="true">' + MARK_INNER.format(fg="currentColor") + '</svg>'


def mark_file(fg):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + MARK_INNER.format(fg=fg) + '</svg>\n'


TILE_FILE = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#2A2A2F"/>'
             '<g transform="translate(16.8 16.8) scale(.72)">' + MARK_INNER.format(fg="#F3C3C8") + '</g></svg>\n')


# ---------- shared pieces ----------


def theme_head(path):
    """The colours and typefaces chosen in Artiscope Digital Home, as a small
    block for the page head. Empty when the theme is the original one."""
    if not os.path.exists(path):
        return ""
    theme = json.load(open(path, encoding="utf-8"))
    out = ""
    for link in theme.get("font_links") or []:
        if isinstance(link, str) and link.startswith("https://fonts.googleapis.com/css2?") and not re.search(r'["<>\s]', link):
            out += '<link href="%s" rel="stylesheet">\n' % link.replace("&", "&amp;")
    css = theme.get("css") or ""
    if css and re.fullmatch(r":root\{[^<>{}]*\}", css):
        out += '<style id="theme">%s</style>\n' % css
    return out


THEME = theme_head(os.path.join(ROOT, "data", "theme.json"))

def head(root, title, desc, path, extra=""):
    canon = C.SITE["url"] + path
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#F3C3C8">
<meta property="og:site_name" content="Global Art Monitor">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{canon}">
<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{root}assets/brand/gam-tile-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Franklin:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/site.css">
<script>document.documentElement.className='js';</script>
{THEME}{extra}</head>
"""


def header(root, current):
    st, _on = shared("header")
    name = esc(st.get("name", "Global Art Monitor"))
    links = ""
    menu = ""
    i = 0
    for i, (slug, sname, _d) in enumerate(C.SECTIONS, 1):
        cur = ' aria-current="page"' if slug == current else ""
        links += f'<a href="{root}{slug}/"{cur}>{esc(sname)}</a>\n'
        menu += f'<a href="{root}{slug}/"><span>{i:02d}</span>{esc(sname)}</a>\n'
    for label, href in st.get("menu_extra", []):
        i += 1
        menu += f'<a href="{root}{href}"><span>{i:02d}</span>{txt(label)}</a>\n'
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="shell site-head">
<a class="brand" href="{root}">{MARK}{name}</a>
<nav class="nav" aria-label="Sections">
{links}</nav>
<div class="head-actions">
<a class="pill pill-ink pill-small" href="{root}{st.get("subscribe_href", "about/#newsletter")}">{txt(st.get("subscribe", "Subscribe"))}</a>
<button class="menu-btn" type="button" data-menu-open aria-expanded="false" aria-controls="menu">Menu</button>
</div>
</header>
<div class="menu" id="menu" aria-hidden="true">
<div class="shell menu-top"><a class="brand" href="{root}">{MARK}{name}</a><button class="menu-close" type="button" data-menu-close>Close</button></div>
<nav class="shell menu-list" aria-label="All sections">
{menu}</nav>
<div class="shell menu-foot"><span data-london-time>London</span><span>{txt(st.get("menu_tagline", ""))}</span></div>
</div>
"""


def footer(root):
    st, on = shared("footer")
    hst, _h = shared("header")
    name = esc(hst.get("name", "Global Art Monitor"))
    secs = "".join(f'<a href="{root}{s}/">{esc(n)}</a>' for s, n, _ in C.SECTIONS)
    arts = "".join(f'<a href="{root}artists/{slug}/">{esc(a["name"])}</a>' for slug, a in ARTISTS.items())
    about = "".join(f'<a href="{root}{h}">{txt(t)}</a>' for t, h in st.get("about_links", []))
    legal_link = st.get("legal_link") or ["", ""]
    body = "" if not on else f"""<footer class="site-foot">
<div class="shell foot-inner">
<div class="foot-cta">
<h2>{txt(st.get("heading", ""))}</h2>
<a class="pill pill-mint" href="{root}{st.get("button_href", "about/#newsletter")}">{txt(st.get("button", ""))}</a>
</div>
<div class="foot-cols">
<div><p class="foot-brand">{MARK}{name}</p><p class="quiet">{txt(st.get("blurb", ""))}</p></div>
<div><h3>Sections</h3>{secs}</div>
<div><h3>Artists</h3>{arts}</div>
<div><h3>About</h3>{about}</div>
</div>
<p class="foot-legal">{fill(st.get("legal", ""))} <a href="{root}{legal_link[1]}">{txt(legal_link[0])}</a></p>
</div>
<div class="foot-mark" aria-hidden="true">MONITOR</div>
</footer>
"""
    return body + f"""<script src="{root}assets/site.js" defer></script>
</body>
</html>
"""


def write(path, html):
    out = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    WRITTEN.append(path)


def page(path, title, desc, body, current="", intro=False, extra_head=""):
    depth = path.count("/")
    root = "../" * depth
    url_path = path[: -len("index.html")] if path.endswith("index.html") else path
    body = body.replace("@@", root)
    attr = " data-intro" if intro else ""
    html = (head(root, title, desc, url_path, extra_head) + f"<body{attr}>\n" + header(root, current)
            + f'<main id="main">\n{body}\n</main>\n' + footer(root))
    write(path, html)


# ---------- auction components ----------

def est_cell(s):
    if s["est_low"] and s["est_high"]:
        return f'{plain(s["est_low"])} to {plain(s["est_high"])}'
    if s["est_low"]:
        return f'From {plain(s["est_low"])}<span class="sub">High estimate to confirm</span>'
    return '<span class="tbc">To confirm</span>'


def ham_cell(s):
    if not s["hammer"]:
        return '<span class="tbc">To confirm</span>'
    note = '<span class="sub">Our calculation</span>' if s["hammer_basis"] == "calculated" else ""
    return f'<span class="ham">{plain(s["hammer"])}</span>{note}'


def prem_cell(s):
    if not s["premium"]:
        return '<span class="tbc">To confirm</span>'
    return f'<span class="prem">{plain(s["premium"])}</span>'


def source_cell(s):
    out = f'<a href="{esc(s["source_url"])}" rel="noopener">{esc(s["source_label"])}</a>'
    if s.get("source2_url"):
        out += f'<span class="sub"><a href="{esc(s["source2_url"])}" rel="noopener">{esc(s["source2_label"])}</a></span>'
    return out


def table(rows, table_id, show_artist=False, root="@@"):
    head_artist = '<th scope="col">Artist</th>' if show_artist else ""
    body = ""
    for s in rows:
        lot = f'<span class="sub">Lot {esc(s["lot"])}</span>' if s["lot"] else ""
        work = f'{esc(s["title"])} ({esc(s["year"])})'
        artist = ""
        if show_artist:
            a = ARTISTS[s["artist"]]
            artist = f'<td><a href="{root}artists/{s["artist"]}/">{esc(a["name"])}</a></td>'
        body += (f'<tr data-artist="{s["artist"]}" data-house="{esc(s["house"])}">'
                 f'<td>{esc(s["date_text"])}</td>{artist}<td>{work}{lot}</td>'
                 f'<td>{esc(s["house"])}<span class="sub">{esc(s["sale"])}</span></td>'
                 f'<td>{est_cell(s)}</td><td>{ham_cell(s)}</td><td>{prem_cell(s)}</td>'
                 f'<td>{esc(s["currency"])}</td><td>{source_cell(s)}</td></tr>\n')
    return f"""<p class="swipe">Swipe sideways to see every column.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Auction results table">
<table class="tl" id="{table_id}">
<thead><tr><th scope="col">Sale date</th>{head_artist}<th scope="col">Work</th><th scope="col">House and sale</th><th scope="col">Estimate</th><th scope="col">Hammer price</th><th scope="col">With premium</th><th scope="col">Currency</th><th scope="col">Source</th></tr></thead>
<tbody>
{body}</tbody>
</table>
</div>"""


LEGEND = """<div class="chips">
<span class="chip" style="background:var(--ink-2)"><span class="dot dot-mint"></span>Hammer price</span>
<span class="chip" style="background:var(--ink-2)"><span class="dot dot-blush"></span>Price with premium</span>
<span class="chip" style="background:var(--ink-2)"><span class="dot dot-grey"></span>Estimate</span>
</div>"""

TABLE_NOTE = ('<p class="note">Prices come from auction house lot pages and public auction databases, and are shown in the currency of the sale. '
              '"Our calculation" means the hammer price was worked back from the published total using the house\'s buyer\'s premium. '
              '"To confirm" means we have not yet been able to check the figure. <a class="text-link" href="@@about/#method">How we report a price</a></p>')


def ladder(rows):
    rows = priced(rows)
    if not rows:
        return ""
    top = max(s["premium"] for s in rows)
    out = ""
    for s in rows:
        bars = ""
        if s["est_high"]:
            w = s["est_high"] / top * 68
            bars += f'<div class="bar bar-est"><i style="width:{w:.1f}%"></i>High estimate {money(s["est_high"], s["currency"])}</div>'
        if s["hammer"]:
            w = s["hammer"] / top * 68
            tag = ", our calculation" if s["hammer_basis"] == "calculated" else ""
            bars += f'<div class="bar bar-ham"><i style="width:{w:.1f}%"></i>Hammer {money(s["hammer"], s["currency"])}{tag}</div>'
        w = s["premium"] / top * 68
        bars += f'<div class="bar bar-prem"><i style="width:{w:.1f}%"></i>With premium {money(s["premium"], s["currency"])}</div>'
        out += (f'<div class="ladder-row"><div class="ladder-label">{esc(s["title"])}'
                f'<span class="sub">{esc(s["house"])}, {esc(s["date_text"])}</span></div>'
                f'<div class="ladder-bars">{bars}</div></div>\n')
    return f'<div class="ladder" data-reveal role="img" aria-label="Bar comparison of estimate, hammer price and price with premium for each priced sale. The same figures are in the table.">\n{out}</div>'


def feature_card(f, n=None, big=False, delay=0):
    num = f"{n:02d} &nbsp; " if n else ""
    cls = "card card-big" if big else "card"
    return (f'<article class="{cls}" data-reveal style="--d:{delay}ms"><p class="kicker">{num}{esc(f["kicker"])}</p>'
            f'<h3><a href="@@research/{f["slug"]}/">{esc(f["title"])}</a></h3><p>{esc(f["standfirst"])}</p>'
            f'<a class="text-link" href="@@research/{f["slug"]}/">Read the feature</a></article>\n')


def profile_card(slug, delay=0):
    a = ARTISTS[slug]
    rows = sales_for(slug)
    best = max(priced(rows), key=lambda s: s["premium"])
    when = f', {best["date_text"]}' if best["date"] else ""
    houses = "".join(f'<span class="chip">{esc(h)}</span>' for h in a["houses"])
    return (f'<article class="card card-profile card-ink on-ink" data-reveal style="--d:{delay}ms"><h3><a href="@@artists/{slug}/">{esc(a["name"])}</a></h3>'
            f'<p class="quiet">{esc(a["line"])}</p>'
            f'<p>Highest documented price: {money(best["premium"], best["currency"])} with premium for {esc(best["title"])}, {esc(best["house"])}{when}.</p>'
            f'<div class="chips">{houses}</div>'
            f'<a class="text-link" href="@@artists/{slug}/">Open the market profile</a></article>\n')


MORE_ARTISTS = ('<article class="card card-profile" data-reveal style="--d:180ms"><h3>More artists to follow</h3>'
                '<p>Profiles for further Grove Gallery artists are added once an artist has a documented public sale we can source and check.</p>'
                '<a class="text-link" href="@@about/#newsletter">Tell me when a profile is added</a></article>\n')

METHOD = """<div class="panel on-ink" data-reveal>
<h2 class="h2" style="max-width:640px">How we report a price</h2>
<div class="method">
<div><h3>Two prices, never one</h3><p>Hammer and premium-inclusive prices are shown in separate columns and never merged.</p></div>
<div><h3>Currency as sold</h3><p>Figures stay in the currency of the sale. Any conversion carries its date and rate.</p></div>
<div><h3>A source on every row</h3><p>Each result links to the lot page or database it came from. Gaps are labelled, not filled.</p></div>
</div>
<a class="text-link" href="@@about/#method">Read the full method</a>
</div>"""

def slugify(t):
    return "".join(ch if ch.isalnum() else "-" for ch in t.lower()).strip("-")


# ---------- pages built from sections ----------

def txt(v):
    """A section's own words, made safe for the page. Apostrophes are kept as they are."""
    return html.escape(str(v), quote=False)


def words_block(st):
    kinds = {"ink": "w-ink", "light": "w-light", "mint": "w-mint", "ghost": "w-ghost"}
    out = f'<section class="shell words" aria-label="{txt(st.get("label", ""))}">\n'
    for i, w in enumerate(st.get("words", [])):
        out += (f'<a class="word" href="@@{w.get("href", "")}" data-reveal style="--d:{i * 120}ms"><span class="word-pill {kinds.get(w.get("style"), "w-ink")}">{txt(w.get("word", ""))}</span>'
                f'<p>{txt(w.get("text", ""))}</p></a>\n')
    return out + "</section>"


def feature_list(which):
    if which == "all":
        return list(C.FEATURES)
    if isinstance(which, str) and which.startswith("tag:"):
        return [f for f in C.FEATURES if which[4:] in f["tags"]]
    return [FEATURE_BY_SLUG[x] for x in (which or []) if x in FEATURE_BY_SLUG]


def feature_cards(st):
    feats = feature_list(st.get("which", "all"))
    big = int(st.get("big") or 0)
    numbered = bool(st.get("numbered"))
    out = ""
    for i, f in enumerate(feats):
        n = i + 1 if numbered else None
        if i < big:
            out += feature_card(f, n, big=True, delay=i * 90)
        else:
            out += feature_card(f, n, delay=(i - big) * 90)
    return out


def sec_hero(st, ctx):
    s = latest_priced()
    a = ARTISTS[s["artist"]]
    est = (f'<span class="chip">Estimate {money(s["est_low"], s["currency"])} to {money(s["est_high"], s["currency"])}</span>'
           if s["est_low"] and s["est_high"] else "")
    kinds = {"mint": "pill-mint", "ink": "pill-ink", "blush": "pill-blush"}
    buttons = "".join(f'<a class="pill {kinds.get(b[2] if len(b) > 2 else "ink", "pill-ink")}" href="@@{b[1]}">{txt(b[0])}</a>\n' for b in st.get("buttons", []))
    card = "" if not st.get("result_card", True) else f"""<aside class="result-card on-ink" data-reveal style="--d:260ms" aria-label="{txt(st.get("result_label", "Latest documented result"))}">
<p class="label">{txt(st.get("result_label", "Latest documented result"))}</p>
<p class="work">{esc(a["name"])}, {esc(s["title"])} ({esc(s["year"])})</p>
<p class="price">{money(s["premium"], s["currency"])}</p>
<p class="where">{esc(s["house"])}, {esc(s["sale"])}. {esc(s["date_text"])}.</p>
<div class="chips"><span class="chip">With buyer's premium</span>{est}</div>
<a class="text-link" href="@@artists/{s["artist"]}/">{txt(st.get("result_link", "See the full timeline"))}</a>
</aside>
"""
    return f"""<section class="shell hero">
<div class="hero-copy">
<p class="eyebrow" data-reveal>{fill(st.get("eyebrow", ""))}</p>
<h1 class="h1" data-reveal style="--d:80ms">{fill(st.get("headline", ""))}</h1>
<p class="lede" data-reveal style="--d:200ms">{fill(st.get("lede", ""))}</p>
<div class="hero-actions" data-reveal style="--d:320ms">
{buttons}</div>
</div>
{card}</section>
<div class="watermark" aria-hidden="true">{txt(st.get("watermark", "MONITOR"))}</div>"""


def sec_status(st, ctx):
    items = "".join(f"<span>{esc(x)}</span>" for x in st.get("items", []))
    return f'<div class="shell status"><div class="status-inner">{items}<span data-london-time>{txt(st.get("clock", ""))}</span></div></div>'


def sec_timeline(st, ctx):
    slug = st.get("artist") or next(iter(ARTISTS))
    return f"""<section class="shell section" id="{ctx["id"]}">
<div class="panel on-ink" data-reveal>
<p class="eyebrow">{txt(st.get("eyebrow", ""))}</p>
<div class="split"><h2 class="h2">{txt(st.get("heading", ""))}</h2>
<p class="intro">{txt(st.get("intro", ""))}</p></div>
{LEGEND}
{table(sales_for(slug), "home-timeline")}
{TABLE_NOTE}
<div><a class="pill pill-blush pill-small" href="@@{st.get("button_href", "auction-results/")}">{txt(st.get("button", ""))}</a></div>
</div>
</section>"""


def sec_words(st, ctx):
    return words_block(st)


def sec_features(st, ctx):
    cards = feature_cards(st)
    if st.get("compact"):
        return f"""<section class="shell section" id="{ctx["id"]}"><div class="section-head"><h2 class="h2" data-reveal>{txt(st.get("heading", ""))}</h2></div><div class="cards">
{cards}</div></section>"""
    if not st.get("heading") and not st.get("eyebrow"):
        return f"""<section class="shell section" id="{ctx["id"]}"><div class="cards">
{cards}</div></section>"""
    eyebrow = f'<p class="eyebrow" data-reveal>{txt(st["eyebrow"])}</p>\n' if st.get("eyebrow") else ""
    return f"""<section class="shell section" id="{ctx["id"]}">
<div class="section-head">{eyebrow}<h2 class="h2" data-reveal>{txt(st.get("heading", ""))}</h2></div>
<div class="cards">
{cards}</div>
</section>"""


def sec_profiles(st, ctx):
    slugs = [x for x in st.get("artists", []) if x in ARTISTS] or list(ARTISTS)
    cards = "".join(profile_card(x, i * 90) for i, x in enumerate(slugs))
    if st.get("more_card", True):
        cards += MORE_ARTISTS
    head_html = f'<div class="section-head"><h2 class="h2" data-reveal>{txt(st["heading"])}</h2></div>\n' if st.get("heading") else ""
    return f"""<section class="shell section" id="{ctx["id"]}">
{head_html}<div class="cards">
{cards}</div>
</section>"""


def sec_page_links(st, ctx):
    rows = ""
    for i, (slug, name, d) in enumerate(C.SECTIONS, 1):
        rows += f'<a class="row" href="@@{slug}/" data-reveal style="--d:{(i-1)*80}ms"><span class="n">0{i}</span><span class="t">{esc(name)}</span><span class="d">{esc(d)}</span></a>\n'
    return f"""<section class="shell section" id="{ctx["id"]}">
<div class="section-head"><h2 class="h2" data-reveal>{txt(st.get("heading", ""))}</h2></div>
<div class="rows">
{rows}</div>
</section>"""


def sec_method(st, ctx):
    return f"""<section class="shell section">
{METHOD}
</section>"""


def sec_page_head(st, ctx):
    allrows = sales_for()
    houses = sorted({x["house"] for x in allrows})
    lede = (fill(st.get("lede", "")).replace("{lots}", str(len(allrows))).replace("{artists}", str(len(ARTISTS)))
            .replace("{houses}", str(len(houses))).replace("{priced}", str(len(priced(allrows)))))
    wide = " wide" if st.get("wide", True) else ""
    return f"""<section class="shell page-head{wide}">
<p class="eyebrow" data-reveal>{st.get("eyebrow", "")}</p>
<h1 class="h1" data-reveal style="--d:80ms">{fill(st.get("headline", ""))}</h1>
<p class="lede" data-reveal style="--d:200ms">{lede}</p>
</section>"""


def sec_results_table(st, ctx):
    allrows = sales_for()
    artist_btns = f'<button class="filter" type="button" data-key="artist" data-value="all" aria-pressed="true">{txt(st.get("all_artists", "All artists"))}</button>'
    for slug, a in ARTISTS.items():
        artist_btns += f'<button class="filter" type="button" data-key="artist" data-value="{slug}" aria-pressed="false">{esc(a["name"])}</button>'
    houses = sorted({x["house"] for x in allrows})
    house_btns = f'<button class="filter" type="button" data-key="house" data-value="all" aria-pressed="true">{txt(st.get("all_houses", "All houses"))}</button>'
    for h in houses:
        house_btns += f'<button class="filter" type="button" data-key="house" data-value="{esc(h)}" aria-pressed="false">{esc(h)}</button>'
    return f"""<section class="shell section">
<div class="panel on-ink" data-reveal>
<div data-filter-group="all-results" style="display:flex;flex-direction:column;gap:10px">
<div class="filters" role="group" aria-label="Filter by artist">{artist_btns}</div>
<div class="filters" role="group" aria-label="Filter by auction house">{house_btns}</div>
</div>
{LEGEND}
{table(allrows, "all-results", show_artist=True)}
<p class="note" id="all-results-empty" hidden>{txt(st.get("empty", ""))}</p>
{TABLE_NOTE}
</div>
</section>"""


def sec_latest_result(st, ctx):
    s = latest_priced()
    a = ARTISTS[s["artist"]]
    return f"""<section class="shell section">
<div class="panel on-ink" data-reveal>
<p class="eyebrow">{txt(st.get("eyebrow", ""))}</p>
<h2 class="h2">{esc(a["name"])}, {esc(s["title"])}: {money(s["premium"], s["currency"])} with premium</h2>
<p class="intro" style="max-width:640px">{esc(s["house"])}, {esc(s["sale"])}, {esc(s["date_text"])}. {txt(st.get("text", ""))}</p>
<div><a class="pill pill-mint pill-small" href="@@artists/{s["artist"]}/">{txt(st.get("button", ""))}</a></div>
</div>
</section>"""


def sec_glossary(st, ctx):
    terms = "".join(f'<div class="term" id="{slugify(t)}" data-reveal><dt>{esc(t)}</dt><dd>{esc(d)}</dd></div>\n' for t, d in C.GLOSSARY)
    return f"""<section class="shell section" id="{ctx["id"]}">
<div class="section-head"><h2 class="h2" data-reveal>{txt(st.get("heading", ""))}</h2></div>
<dl class="terms">
{terms}</dl>
</section>"""


def sec_panel(st, ctx):
    return f"""<section class="shell section">
<div class="panel on-ink" data-reveal>
<h2 class="h2" style="max-width:640px">{txt(st.get("heading", ""))}</h2>
<p class="intro" style="max-width:640px">{txt(st.get("text", ""))}</p>
</div>
</section>"""


def sec_prose(st, ctx):
    return f"""<section class="shell article">
<div class="article-body prose">
{fill(st.get("html", ""), True)}
</div>
<aside class="article-side">
{fill(st.get("aside", ""), True)}
</aside>
</section>"""


def sec_contact_form(st, ctx):
    return f"""<section class="shell article">
<div class="article-body">
{fill(st.get("html", ""), True)}
</div>
<aside class="article-side">
{fill(st.get("aside", ""), True)}
</aside>
</section>"""


SECTIONS = {
    "hero": sec_hero, "status": sec_status, "timeline": sec_timeline, "words": sec_words, "features": sec_features,
    "profiles": sec_profiles, "page-links": sec_page_links, "method": sec_method, "page-head": sec_page_head,
    "results-table": sec_results_table, "latest-result": sec_latest_result, "glossary": sec_glossary, "panel": sec_panel,
    "prose": sec_prose, "contact-form": sec_contact_form,
}


def check_pages():
    """Refuses to build if the page list would not draw, so a bad edit
    cannot blank the site."""
    for key in ("header", "footer"):
        part = (PAGES.get("shared") or {}).get(key)
        if not isinstance(part, dict) or not isinstance(part.get("settings"), dict):
            sys.exit("data/pages.json must have the shared part '%s' with settings." % key)
    for key, pg in (PAGES.get("pages") or {}).items():
        if not isinstance(pg, dict) or not isinstance(pg.get("sections"), list) or not pg.get("path", "").endswith("index.html"):
            sys.exit("The page '%s' in data/pages.json needs a path ending in index.html and a list of sections." % key)
        if ".." in pg["path"] or pg["path"].startswith("/"):
            sys.exit("The page '%s' has a path that is not allowed." % key)
        seen = set()
        for sec in pg["sections"]:
            if not isinstance(sec, dict) or sec.get("type") not in SECTIONS:
                sys.exit("The page '%s' has a section of a kind the site cannot draw: %r" % (key, sec.get("type") if isinstance(sec, dict) else sec))
            sid = str(sec.get("id") or "")
            if not sid or not all(c.isalnum() or c in "-_" for c in sid) or sid in seen:
                sys.exit("Every section on page '%s' needs its own id of letters, digits and hyphens: %r" % (key, sid))
            seen.add(sid)
            if not isinstance(sec.get("settings", {}), dict):
                sys.exit("The settings of section '%s' on page '%s' must be a list of fields." % (sid, key))


def build_page(key):
    pg = PAGES["pages"][key]
    parts = []
    for sec in pg["sections"]:
        if sec.get("visible", True) is False:
            continue
        parts.append(SECTIONS[sec["type"]](sec.get("settings") or {}, {"id": sec["id"], "page": key}))
    body = "\n".join(parts)
    extra = ""
    if key == "home":
        ld = json.dumps({"@context": "https://schema.org", "@type": "WebSite", "name": "Global Art Monitor", "url": C.SITE["url"],
                         "description": C.SITE["intro"]})
        extra = f'<script type="application/ld+json">{ld}</script>\n'
    page(pg["path"], pg.get("title", ""), pg.get("description", ""), body, current=pg.get("current", ""), intro=bool(pg.get("intro")), extra_head=extra)


def build_home():
    build_page("home")


def build_results():
    build_page("auction-results")


def build_artists():
    build_page("artists")
    for slug, a in ARTISTS.items():
        rows = sales_for(slug)
        pr = priced(rows)
        best = max(pr, key=lambda s: s["premium"])
        dated = [s for s in rows if s["date"]]
        first = min(dated, key=lambda s: s["date"])
        bio = C.BIOS[slug]
        paras = "".join(f"<p>{esc(p)}</p>" for p in bio["body"])
        srcs = "".join(f'<li><a href="{esc(u)}" rel="noopener">{esc(t)}</a></li>' for t, u in bio["sources"])
        related = [f for f in C.FEATURES if slug in f["slug"]] + [FEATURE_BY_SLUG["why-one-record-sale-does-not-establish-market-value"]]
        rel = "".join(f'<li><a href="@@research/{f["slug"]}/">{esc(f["title"])}</a></li>' for f in related)
        img = ""
        for ext in ("jpg", "jpeg", "png", "webp"):
            p = f"assets/images/{slug}.{ext}"
            if os.path.exists(os.path.join(ROOT, p)):
                note = IMAGE_NOTES.get(slug, {})
                alt = note.get("alt") or f'Work by {a["name"]}'
                cap = note.get("caption") or f'{a["name"]}. Image courtesy of the artist.'
                img = f'<figure class="art-slot" data-reveal><img src="@@{p}" alt="{esc(alt)}" loading="lazy"><figcaption>{esc(cap)}</figcaption></figure>'
                break
        best_when = best["date_text"] if best["date"] else "date to confirm"
        body = f"""<section class="shell page-head">
<p class="crumbs" data-reveal><a href="@@artists/">Artist Market Profiles</a></p>
<h1 class="h1" data-reveal style="--d:80ms">{esc(a["name"])}</h1>
<p class="lede" data-reveal style="--d:200ms">{esc(bio["summary"])}</p>
</section>
<section class="shell section" style="padding-top:48px">
<div class="facts">
<div class="fact" data-reveal><span class="k">Highest documented price</span><span class="v">{money(best["premium"], best["currency"])}</span><span class="s">With premium. {esc(best["title"])}, {esc(best["house"])}, {esc(best_when)}.</span></div>
<div class="fact" data-reveal style="--d:90ms"><span class="k">Priced results</span><span class="v">{len(pr)}</span><span class="s">Out of {len(rows)} lots we have found.</span></div>
<div class="fact" data-reveal style="--d:180ms"><span class="k">Earliest dated sale</span><span class="v">{esc(first["date_text"])}</span><span class="s">{esc(first["title"])}, {esc(first["house"])}.</span></div>
<div class="fact" data-reveal style="--d:270ms"><span class="k">Auction houses</span><span class="v">{len(a["houses"])}</span><span class="s">{esc(", ".join(a["houses"]))}.</span></div>
</div>
</section>
<section class="shell section" id="timeline">
<div class="panel on-ink" data-reveal>
<p class="eyebrow">Artist auction timeline</p>
<div class="split"><h2 class="h2">{esc(a["name"])} at auction</h2>
<p class="intro">Every public sale we can document, in date order. Estimate, hammer price and price with premium each have their own column.</p></div>
{LEGEND}
{table(rows, "timeline-" + slug)}
{TABLE_NOTE}
</div>
</section>
<section class="shell section">
<div class="panel on-ink" data-reveal>
<h2 class="h2">Estimate, hammer and total, side by side</h2>
<p class="intro" style="max-width:620px">The bars use one scale, so you can compare sales with each other as well as the three figures within each sale.</p>
{ladder(rows)}
</div>
</section>
<section class="shell article" style="padding-top:104px">
<div class="article-body prose" data-reveal>
<h2 style="margin-top:0">About the artist</h2>
{paras}
<p>These figures are a record of past public sales. They are not a valuation and they are not advice. For how to read them, start with <a href="@@research/what-an-auction-result-tells-collectors/">what an auction result actually tells collectors</a>.</p>
</div>
<aside class="article-side" data-reveal style="--d:120ms">
{img}
<div class="mini"><h2>Related reading</h2><ul>{rel}</ul></div>
<div class="mini"><h2>Background sources</h2><ul>{srcs}</ul></div>
<div class="mini"><h2>Spotted a gap?</h2><p>If you can document a sale we have missed, or correct a figure, <a href="@@about/#corrections">tell us</a>.</p></div>
</aside>
</section>"""
        ld = json.dumps({"@context": "https://schema.org", "@type": "ProfilePage", "name": f'{a["name"]} market profile',
                         "url": f'{C.SITE["url"]}artists/{slug}/', "dateModified": C.PUBLISHED,
                         "mainEntity": {"@type": "Person", "name": a["name"]}})
        page(f"artists/{slug}/index.html", f'{a["name"]} Auction Results and Market Profile | Global Art Monitor',
             f'{a["name"]} auction results: every documented sale with estimate, hammer price and premium-inclusive price, sale dates and sources.',
             body, current="artists", extra_head=f'<script type="application/ld+json">{ld}</script>\n')


def build_features():
    build_page("research")
    for f in C.FEATURES:
        html = f["body"]
        for slug in ARTISTS:
            token = f"[[TIMELINE:{slug}]]"
            if token in html:
                block = (f'<div class="panel on-ink" style="padding:28px 22px;gap:18px">{LEGEND}'
                         f'{table(sales_for(slug), "feature-" + slug)}'
                         f'<p class="note">Sources are linked in the last column. "Our calculation" means a hammer price worked back from the published total.</p></div>')
                html = html.replace(token, block)
        others = [o for o in C.FEATURES if o["slug"] != f["slug"]][:4]
        more = "".join(f'<li><a href="@@research/{o["slug"]}/">{esc(o["title"])}</a></li>' for o in others)
        body = f"""<section class="shell page-head wide">
<p class="crumbs" data-reveal><a href="@@research/">Research Reports</a></p>
<p class="eyebrow" data-reveal>{esc(f["kicker"])}</p>
<h1 class="h1" data-reveal style="--d:80ms;font-size:clamp(38px,5vw,62px)">{esc(f["title"])}</h1>
<p class="byline" data-reveal style="--d:160ms">By the Global Art Monitor research desk. Published {C.PUBLISHED_TEXT}. {f["mins"]} minute read.</p>
</section>
<section class="shell article">
<article class="article-body prose">
{html}
</article>
<aside class="article-side">
<div class="mini"><h2>More research</h2><ul>{more}</ul></div>
<div class="mini"><h2>The figures</h2><p>All prices in this piece are on the <a href="@@auction-results/">auction results</a> page, with a source for each.</p></div>
<div class="mini"><h2>Who publishes this</h2><p>{esc(C.SITE["disclosure"])}</p></div>
</aside>
</section>"""
        ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": f["title"], "description": f["description"],
                         "datePublished": C.PUBLISHED, "dateModified": C.PUBLISHED,
                         "author": {"@type": "Organization", "name": "Global Art Monitor"},
                         "publisher": {"@type": "Organization", "name": "Global Art Monitor"},
                         "mainEntityOfPage": f'{C.SITE["url"]}research/{f["slug"]}/'})
        page(f'research/{f["slug"]}/index.html', f'{f["title"]} | Global Art Monitor', f["description"], body, current="research",
             extra_head=f'<script type="application/ld+json">{ld}</script>\n')


def build_intelligence():
    build_page("market-intelligence")


def build_collecting():
    build_page("collecting-valuation")


def build_about():
    build_page("about")


def build_contact():
    build_page("contact")


def build_extras():
    body = """<section class="shell page-head">
<p class="eyebrow">Page not found</p>
<h1 class="h1">That page is not in the record.</h1>
<p class="lede">The link may be old or mistyped.</p>
<div class="hero-actions"><a class="pill pill-ink" href="/">Go to the home page</a><a class="pill pill-mint" href="/auction-results/">Browse auction results</a></div>
</section>"""
    html = (head("/", "Page not found | Global Art Monitor", "Page not found.", "404.html") + "<body>\n" + header("/", "")
            + f'<main id="main">\n{body}\n</main>\n' + footer("/"))
    write("404.html", html)

    urls = [p[: -len("index.html")] for p in WRITTEN if p.endswith("index.html")]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        sm += f'<url><loc>{C.SITE["url"]}{u}</loc><lastmod>{C.PUBLISHED}</lastmod></url>\n'
    sm += "</urlset>\n"
    write("sitemap.xml", sm)
    write("robots.txt", f'User-agent: *\nAllow: /\n\nSitemap: {C.SITE["url"]}sitemap.xml\n')
    write(".nojekyll", "")
    write("assets/favicon.svg", TILE_FILE)
    write("assets/brand/gam-tile.svg", TILE_FILE)
    write("assets/brand/gam-mark-charcoal.svg", mark_file("#2A2A2F"))
    write("assets/brand/gam-mark-blush.svg", mark_file("#F3C3C8"))


if __name__ == "__main__":
    check_pages()
    build_home()
    build_results()
    build_artists()
    build_features()
    build_intelligence()
    build_collecting()
    build_about()
    build_contact()
    build_extras()
    print(f"Built {len(WRITTEN)} files")

#!/usr/bin/env python3
"""Builds the Global Art Monitor site into the repository root.

Run from anywhere:  python3 tools/build.py
Words live in tools/content.py. Sales live in data/sales.json.
Artist images: add assets/images/<artist-slug>.jpg and rebuild.
"""
import json
import os
import sys
from html import escape as esc

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import content as C  # noqa: E402

DATA = json.load(open(os.path.join(ROOT, "data", "sales.json"), encoding="utf-8"))
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
{extra}</head>
"""


def header(root, current):
    links = ""
    menu = ""
    for i, (slug, name, _d) in enumerate(C.SECTIONS, 1):
        cur = ' aria-current="page"' if slug == current else ""
        links += f'<a href="{root}{slug}/"{cur}>{esc(name)}</a>\n'
        menu += f'<a href="{root}{slug}/"><span>0{i}</span>{esc(name)}</a>\n'
    menu += f'<a href="{root}about/"><span>06</span>About and method</a>\n'
    menu += f'<a href="{root}contact/"><span>07</span>Contact</a>\n'
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="shell site-head">
<a class="brand" href="{root}">{MARK}Global Art Monitor</a>
<nav class="nav" aria-label="Sections">
{links}</nav>
<div class="head-actions">
<a class="pill pill-ink pill-small" href="{root}about/#newsletter">Subscribe</a>
<button class="menu-btn" type="button" data-menu-open aria-expanded="false" aria-controls="menu">Menu</button>
</div>
</header>
<div class="menu" id="menu" aria-hidden="true">
<div class="shell menu-top"><a class="brand" href="{root}">{MARK}Global Art Monitor</a><button class="menu-close" type="button" data-menu-close>Close</button></div>
<nav class="shell menu-list" aria-label="All sections">
{menu}</nav>
<div class="shell menu-foot"><span data-london-time>London</span><span>The auction and market research platform</span></div>
</div>
"""


def footer(root):
    secs = "".join(f'<a href="{root}{s}/">{esc(n)}</a>' for s, n, _ in C.SECTIONS)
    arts = "".join(f'<a href="{root}artists/{slug}/">{esc(a["name"])}</a>' for slug, a in ARTISTS.items())
    return f"""<footer class="site-foot">
<div class="shell foot-inner">
<div class="foot-cta">
<h2>The monthly market note, sent when there is something to report.</h2>
<a class="pill pill-mint" href="{root}about/#newsletter">Subscribe by email</a>
</div>
<div class="foot-cols">
<div><p class="foot-brand">{MARK}Global Art Monitor</p><p class="quiet">Auction and market research for collectors who want the record, not the rumour.</p></div>
<div><h3>Sections</h3>{secs}</div>
<div><h3>Artists</h3>{arts}</div>
<div><h3>About</h3><a href="{root}about/#method">Method</a><a href="{root}about/#sources">Sources</a><a href="{root}about/#corrections">Corrections</a><a href="{root}contact/">Contact</a></div>
</div>
<p class="foot-legal">{esc(C.SITE["disclosure"])} Nothing on this site is investment advice. Past auction results do not predict future prices. <a href="{root}about/#disclosure">More about who we are</a></p>
</div>
<div class="foot-mark" aria-hidden="true">MONITOR</div>
</footer>
<script src="{root}assets/site.js" defer></script>
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

WORDS = """<section class="shell words" aria-label="Four words that change what a price means">
<a class="word" href="@@collecting-valuation/#hammer-price" data-reveal style="--d:0ms"><span class="word-pill w-ink">Hammer</span><p>The winning bid in the room, before any fees.</p></a>
<a class="word" href="@@collecting-valuation/#buyer-s-premium" data-reveal style="--d:120ms"><span class="word-pill w-light">Premium</span><p>The house fee the buyer pays on top of the hammer.</p></a>
<a class="word" href="@@collecting-valuation/#estimate" data-reveal style="--d:240ms"><span class="word-pill w-mint">Estimate</span><p>The house's guide range, set before the sale.</p></a>
<a class="word" href="@@about/#method" data-reveal style="--d:360ms"><span class="word-pill w-ghost">Currency</span><p>Shown as sold. Conversions are always marked.</p></a>
</section>"""


def slugify(t):
    return "".join(ch if ch.isalnum() else "-" for ch in t.lower()).strip("-")


# ---------- pages ----------

def build_home():
    s = latest_priced()
    a = ARTISTS[s["artist"]]
    est = (f'<span class="chip">Estimate {money(s["est_low"], s["currency"])} to {money(s["est_high"], s["currency"])}</span>'
           if s["est_low"] and s["est_high"] else "")
    zara = sales_for("zara-muse")
    feats = C.FEATURES
    cards = feature_card(feats[0], 1, big=True) + feature_card(feats[1], 2, big=True, delay=90)
    for i, f in enumerate(feats[2:], 3):
        cards += feature_card(f, i, delay=(i - 3) * 90)
    rows = ""
    for i, (slug, name, d) in enumerate(C.SECTIONS, 1):
        rows += f'<a class="row" href="@@{slug}/" data-reveal style="--d:{(i-1)*80}ms"><span class="n">0{i}</span><span class="t">{esc(name)}</span><span class="d">{esc(d)}</span></a>\n'
    body = f"""<section class="shell hero">
<div class="hero-copy">
<p class="eyebrow" data-reveal>{esc(C.SITE["tagline"])}</p>
<h1 class="h1" data-reveal style="--d:80ms">{esc(C.SITE["headline"])}</h1>
<p class="lede" data-reveal style="--d:200ms">{esc(C.SITE["intro"])}</p>
<div class="hero-actions" data-reveal style="--d:320ms">
<a class="pill pill-mint" href="@@research/">Read the latest analysis</a>
<a class="pill pill-ink" href="@@auction-results/">Browse auction results</a>
</div>
</div>
<aside class="result-card on-ink" data-reveal style="--d:260ms" aria-label="Latest documented result">
<p class="label">Latest documented result</p>
<p class="work">{esc(a["name"])}, {esc(s["title"])} ({esc(s["year"])})</p>
<p class="price">{money(s["premium"], s["currency"])}</p>
<p class="where">{esc(s["house"])}, {esc(s["sale"])}. {esc(s["date_text"])}.</p>
<div class="chips"><span class="chip">With buyer's premium</span>{est}</div>
<a class="text-link" href="@@artists/{s["artist"]}/">See the full timeline</a>
</aside>
</section>
<div class="watermark" aria-hidden="true">MONITOR</div>
<div class="shell status"><div class="status-inner"><span>Independent market research</span><span>Updated after every documented sale</span><span data-london-time>Published in London</span></div></div>

<section class="shell section" id="timeline">
<div class="panel on-ink" data-reveal>
<p class="eyebrow">Artist auction timeline</p>
<div class="split"><h2 class="h2">Zara Muse: a documented market timeline</h2>
<p class="intro">Each row keeps the estimate, the hammer price and the price with buyer's premium apart, in the currency of the sale. Where we have worked a figure out ourselves, or cannot confirm it, the row says so.</p></div>
{LEGEND}
{table(zara, "home-timeline")}
{TABLE_NOTE}
<div><a class="pill pill-blush pill-small" href="@@auction-results/">See every documented result</a></div>
</div>
</section>

{WORDS}

<section class="shell section" id="features">
<div class="section-head"><p class="eyebrow" data-reveal>Research and features</p>
<h2 class="h2" data-reveal>What the numbers say, and what they do not</h2></div>
<div class="cards">
{cards}</div>
</section>

<section class="shell section" id="profiles">
<div class="section-head"><h2 class="h2" data-reveal>Artist market profiles</h2></div>
<div class="cards">
{profile_card("zara-muse")}{profile_card("konn-artiss", 90)}{MORE_ARTISTS}</div>
</section>

<section class="shell section" id="sections">
<div class="section-head"><h2 class="h2" data-reveal>Where to start</h2></div>
<div class="rows">
{rows}</div>
</section>

<section class="shell section">
{METHOD}
</section>"""
    ld = json.dumps({"@context": "https://schema.org", "@type": "WebSite", "name": "Global Art Monitor", "url": C.SITE["url"],
                     "description": C.SITE["intro"]})
    page("index.html", "Global Art Monitor | Art Market Intelligence, Beyond the Headlines",
         "Auction results, artist market profiles and plain research on the art market. Hammer prices, premium-inclusive prices and estimates shown separately, with sources.",
         body, intro=True, extra_head=f'<script type="application/ld+json">{ld}</script>\n')


def build_results():
    allrows = sales_for()
    artist_btns = '<button class="filter" type="button" data-key="artist" data-value="all" aria-pressed="true">All artists</button>'
    for slug, a in ARTISTS.items():
        artist_btns += f'<button class="filter" type="button" data-key="artist" data-value="{slug}" aria-pressed="false">{esc(a["name"])}</button>'
    houses = sorted({s["house"] for s in allrows})
    house_btns = '<button class="filter" type="button" data-key="house" data-value="all" aria-pressed="true">All houses</button>'
    for h in houses:
        house_btns += f'<button class="filter" type="button" data-key="house" data-value="{esc(h)}" aria-pressed="false">{esc(h)}</button>'
    n_priced = len(priced(allrows))
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Auction Results</p>
<h1 class="h1" data-reveal style="--d:80ms">Every documented sale, with the prices kept apart.</h1>
<p class="lede" data-reveal style="--d:200ms">{len(allrows)} lots across {len(ARTISTS)} artists and {len(houses)} auction houses. {n_priced} have confirmed prices. The rest are listed so the gaps are visible.</p>
</section>
<section class="shell section">
<div class="panel on-ink" data-reveal>
<div data-filter-group="all-results" style="display:flex;flex-direction:column;gap:10px">
<div class="filters" role="group" aria-label="Filter by artist">{artist_btns}</div>
<div class="filters" role="group" aria-label="Filter by auction house">{house_btns}</div>
</div>
{LEGEND}
{table(allrows, "all-results", show_artist=True)}
<p class="note" id="all-results-empty" hidden>No documented sales match those two filters yet.</p>
{TABLE_NOTE}
</div>
</section>
{WORDS}
<section class="shell section">
<div class="section-head"><h2 class="h2" data-reveal>Reading the results</h2></div>
<div class="cards">
{feature_card(FEATURE_BY_SLUG["zara-muse-auction-results"], big=True)}{feature_card(FEATURE_BY_SLUG["konn-artiss-auction-results"], big=True, delay=90)}{feature_card(FEATURE_BY_SLUG["what-an-auction-result-tells-collectors"])}
</div>
</section>
<section class="shell section">
{METHOD}
</section>"""
    page("auction-results/index.html", "Auction Results | Global Art Monitor",
         "Documented auction results for Zara Muse and Konn Artiss at Tate Ward, Bonhams and Christie's, with estimates, hammer prices and premium-inclusive prices in separate columns.",
         body, current="auction-results")


def build_artists():
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Artist Market Profiles</p>
<h1 class="h1" data-reveal style="--d:80ms">One page per artist, built on sourced sales only.</h1>
<p class="lede" data-reveal style="--d:200ms">Each profile sets out an artist's public auction record in full: what sold, where, against what estimate, and what we could not confirm.</p>
</section>
<section class="shell section">
<div class="cards">
{profile_card("zara-muse")}{profile_card("konn-artiss", 90)}{MORE_ARTISTS}</div>
</section>
<section class="shell section">
{METHOD}
</section>"""
    page("artists/index.html", "Artist Market Profiles | Global Art Monitor",
         "Market profiles for artists with a documented public auction record, starting with Zara Muse and Konn Artiss.", body, current="artists")

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
                img = f'<figure class="art-slot" data-reveal><img src="@@{p}" alt="Work by {esc(a["name"])}" loading="lazy"><figcaption>{esc(a["name"])}. Image courtesy of the artist.</figcaption></figure>'
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
    cards = feature_card(C.FEATURES[0], 1, big=True) + feature_card(C.FEATURES[1], 2, big=True, delay=90)
    for i, f in enumerate(C.FEATURES[2:], 3):
        cards += feature_card(f, i, delay=(i - 3) * 90)
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Research Reports</p>
<h1 class="h1" data-reveal style="--d:80ms">Longer studies, with sources and method shown.</h1>
<p class="lede" data-reveal style="--d:200ms">Our commissioned features. Each one states what the evidence supports and where it stops.</p>
</section>
<section class="shell section"><div class="cards">
{cards}</div></section>
<section class="shell section">
{METHOD}
</section>"""
    page("research/index.html", "Research Reports | Global Art Monitor",
         "Research features on auction results, market value, liquidity and how to compare gallery prices with auction prices.", body, current="research")

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
    feats = [f for f in C.FEATURES if "market-intelligence" in f["tags"]]
    cards = "".join(feature_card(f, delay=i * 90) for i, f in enumerate(feats))
    s = latest_priced()
    a = ARTISTS[s["artist"]]
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Market Intelligence</p>
<h1 class="h1" data-reveal style="--d:80ms">The forces behind the prices.</h1>
<p class="lede" data-reveal style="--d:200ms">Analysis of how the art trade works: what results mean, how thin markets behave and why the headline figure is rarely the whole story.</p>
</section>
<section class="shell section"><div class="cards">
{cards}</div></section>
<section class="shell section">
<div class="panel on-ink" data-reveal>
<p class="eyebrow">Latest documented result</p>
<h2 class="h2">{esc(a["name"])}, {esc(s["title"])}: {money(s["premium"], s["currency"])} with premium</h2>
<p class="intro" style="max-width:640px">{esc(s["house"])}, {esc(s["sale"])}, {esc(s["date_text"])}. See how it sits against the artist's other results before drawing a conclusion from it.</p>
<div><a class="pill pill-mint pill-small" href="@@artists/{s["artist"]}/">Open the full timeline</a></div>
</div>
</section>
<section class="shell section">
{METHOD}
</section>"""
    page("market-intelligence/index.html", "Market Intelligence | Global Art Monitor",
         "Analysis of the international art trade: what auction results mean, how liquidity works and why a record price is not market value.",
         body, current="market-intelligence")


def build_collecting():
    feats = [f for f in C.FEATURES if "collecting-valuation" in f["tags"]]
    cards = "".join(feature_card(f, delay=i * 90) for i, f in enumerate(feats))
    terms = "".join(f'<div class="term" id="{slugify(t)}" data-reveal><dt>{esc(t)}</dt><dd>{esc(d)}</dd></div>\n' for t, d in C.GLOSSARY)
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Collecting &amp; Valuation</p>
<h1 class="h1" data-reveal style="--d:80ms">Plain guides to estimates, resale and consignment.</h1>
<p class="lede" data-reveal style="--d:200ms">The working vocabulary of the auction room, and the guides that put it to use.</p>
</section>
<section class="shell section"><div class="section-head"><h2 class="h2" data-reveal>Guides</h2></div><div class="cards">
{cards}</div></section>
<section class="shell section" id="glossary">
<div class="section-head"><h2 class="h2" data-reveal>Auction terms, in plain words</h2></div>
<dl class="terms">
{terms}</dl>
</section>
<section class="shell section">
<div class="panel on-ink" data-reveal>
<h2 class="h2" style="max-width:640px">Need a valuation?</h2>
<p class="intro" style="max-width:640px">We publish records of past sales. We do not value works. For insurance, tax or a sale, ask a qualified valuer who can examine the piece.</p>
</div>
</section>"""
    page("collecting-valuation/index.html", "Collecting & Valuation: Auction Terms Explained | Global Art Monitor",
         "Hammer price, buyer's premium, estimates, reserves, resale and consignment explained in plain words, with guides for collectors.",
         body, current="collecting-valuation")


def build_about():
    email = C.SITE["email"]
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>About</p>
<h1 class="h1" data-reveal style="--d:80ms">Who we are and how we work.</h1>
<p class="lede" data-reveal style="--d:200ms">Global Art Monitor follows auction activity and the structure of the art market, and tries to be exact about what a published price does and does not show.</p>
</section>
<section class="shell article">
<div class="article-body prose">
<h2 id="disclosure" style="margin-top:0">Who publishes this</h2>
<p>{esc(C.SITE["disclosure"])}</p>
<p>We think the best answer to that interest is to show our working. Every figure carries a source. Lower results and unconfirmed lots are listed next to the highest ones. Our features say plainly what a small auction record cannot prove.</p>

<h2 id="method">Method</h2>
<p>We record public auction sales only. For each lot we note the sale date, the house, the sale title, the lot number, the estimate, the hammer price, the price with buyer's premium and the currency.</p>
<ul>
<li><strong>Hammer and premium stay separate.</strong> Where a house publishes only the total, we work the hammer price back using that house's buyer's premium and label it "our calculation".</li>
<li><strong>Currency stays as sold.</strong> We do not convert prices in the tables. If a conversion appears in an article, it carries the date and rate.</li>
<li><strong>Gaps are shown.</strong> If we cannot confirm a figure it reads "to confirm". We do not estimate missing prices.</li>
<li><strong>Unsold lots count.</strong> When we can document a lot that was offered and not sold, it goes in the record.</li>
</ul>

<h2 id="sources">Sources</h2>
<p>Our first source is always the auction house's own lot page. Where a house does not publish a figure, we use public auction databases such as Invaluable, MutualArt and Artnet, and say which. News reports are used for context and are linked.</p>
<p>The source for each result is linked in the last column of every table.</p>

<h2 id="corrections">Corrections</h2>
<p>If a figure here is wrong or out of date, we want to know. Email <a href="mailto:{email}?subject=Correction">{email}</a> with the page, the figure and your source. We correct the record and note material changes on the page concerned.</p>

<h2 id="newsletter">The monthly market note</h2>
<p>A short email with new documented results and new research, sent when there is something to report. To join the list, email <a href="mailto:{email}?subject=Subscribe%20to%20the%20monthly%20market%20note">{email}</a> with the subject line "Subscribe".</p>

<h2 id="contact">Contact</h2>
<p>For questions, press enquiries or anything else, use the <a href="@@contact/">contact page</a>.</p>

<h2 id="advice">Not advice</h2>
<p>Nothing on this site is investment, tax or legal advice. Auction results describe past sales of particular works. They do not predict what any work will sell for in future.</p>
</div>
<aside class="article-side">
<div class="mini"><h2>On this page</h2><ul><li><a href="#disclosure">Who publishes this</a></li><li><a href="#method">Method</a></li><li><a href="#sources">Sources</a></li><li><a href="#corrections">Corrections</a></li><li><a href="#newsletter">Monthly market note</a></li><li><a href="@@contact/">Contact</a></li></ul></div>
<div class="mini"><h2>Last updated</h2><p>{C.PUBLISHED_TEXT}</p></div>
</aside>
</section>"""
    page("about/index.html", "About, Method and Sources | Global Art Monitor",
         "Who publishes Global Art Monitor, how auction prices are recorded, which sources are used and how to send a correction.", body)


def build_contact():
    email = C.SITE["email"]
    body = f"""<section class="shell page-head wide">
<p class="eyebrow" data-reveal>Contact</p>
<h1 class="h1" data-reveal style="--d:80ms">Ask us something.</h1>
<p class="lede" data-reveal style="--d:200ms">Questions about a figure, a sale we have missed, a press enquiry or anything else. We read every message.</p>
</section>
<section class="shell article">
<div class="article-body">
<form class="form" id="contact-form" action="mailto:{email}" method="post" enctype="text/plain" data-email="{email}" data-reveal>
<div class="field"><label for="cf-name">Your name</label><input id="cf-name" name="name" type="text" autocomplete="name" required></div>
<div class="field"><label for="cf-email">Your email</label><input id="cf-email" name="email" type="email" autocomplete="email" required></div>
<div class="field"><label for="cf-topic">What is it about?</label>
<select id="cf-topic" name="topic">
<option>General question</option>
<option>Correction to a figure</option>
<option>A sale or source to add</option>
<option>Press enquiry</option>
<option>Monthly market note</option>
<option>Something else</option>
</select></div>
<div class="field"><label for="cf-message">Your message</label><textarea id="cf-message" name="message" rows="7" required></textarea></div>
<div class="form-foot"><button class="pill pill-ink" type="submit">Send your message</button>
<p class="quiet" id="contact-status" role="status">This opens your email app with the message ready to send.</p></div>
</form>
</div>
<aside class="article-side">
<div class="mini"><h2>Email us directly</h2><p><a href="mailto:{email}">{email}</a></p></div>
<div class="mini"><h2>Corrections</h2><p>Tell us the page, the figure and your source. How we handle them is on the <a href="@@about/#corrections">about page</a>.</p></div>
<div class="mini"><h2>Monthly market note</h2><p>Choose "Monthly market note" in the form, or see <a href="@@about/#newsletter">how to subscribe</a>.</p></div>
<div class="mini"><h2>Valuations</h2><p>We do not value works. For insurance, tax or a sale, please ask a qualified valuer.</p></div>
</aside>
</section>"""
    page("contact/index.html", "Contact | Global Art Monitor",
         "Send a question, a correction or a press enquiry to the Global Art Monitor research desk.", body)


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

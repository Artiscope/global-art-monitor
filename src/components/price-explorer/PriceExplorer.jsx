// The Price Explorer on Global Art Monitor, built as a React island inside the static page.
// The page around it stays plain HTML, and this part is drawn on the server too, so the
// first chart is readable before any script runs. The data rules are in ./lib.mjs.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_ARTISTS, DAY, KIND, KIND_ONE, CHECK, CHECK_ORDER, SERIES, MEDIA, mediumOf,
  money, short, curLabel, curName, count, countLower, listWords, day, dayText,
  basisText, againstEstimate, estimateText, sizeNote, shapePath, priceScale, timeTicks, readHash, writeHash,
} from "./lib.mjs";
// its styles are in ./price-explorer.css, linked by src/pages/price-explorer/index.astro

const START_WIDTH = 860;

function byName(names) { return (a, b) => names[a].localeCompare(names[b], "en", { sensitivity: "base" }); }
function group(rows, f) { const o = {}; rows.forEach((r) => { const k = f(r); (o[k] = o[k] || []).push(r); }); return o; }

export default function PriceExplorer({ data, base = "../" }) {
  // the sales come as one JSON string, which keeps the page small
  const rows = useMemo(() => JSON.parse(data), [data]);
  // ----- the artists on offer: everyone with at least one priced sale -----
  const prepared = useMemo(() => rows.filter((r) => r.d && r.c).map((r) => ({ ...r, t0: day(r.d), md: mediumOf(r.m) })), [rows]);
  const names = useMemo(() => { const n = {}; rows.forEach((r) => { n[r.a] = r.an; }); return n; }, [rows]);
  const slugs = useMemo(() => Object.keys(names).filter((k) => rows.some((r) => r.a === k && r.v)).sort(byName(names)), [rows, names]);
  const valid = useMemo(() => { const v = {}; slugs.forEach((k) => { v[k] = 1; }); return v; }, [slugs]);
  const first = slugs.indexOf("banksy") >= 0 ? "banksy" : slugs[0];

  const blank = { artists: [first], cur: null, kind: null, media: [], houses: [], hide: [], scale: "auto", est: true, range: null, pick: null };
  const [st, setSt] = useState(blank);
  const [hover, setHover] = useState(null);
  const [width, setWidth] = useState(START_WIDTH);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState("");
  const [dragging, setDragging] = useState(false);
  const patch = useCallback((p) => setSt((s) => ({ ...s, ...p })), []);

  // ----- the view, read from the address when the page opens -----
  const rootRef = useRef(null), plotRef = useRef(null), svgRef = useRef(null), cardRef = useRef(null);
  useEffect(() => {
    const fromLink = readHash(window.location.hash, valid);
    if (Object.keys(fromLink).length) {
      setSt((s) => ({ ...s, ...fromLink }));
      // arriving from a link to an artist or a pair: go straight to the chart
      setTimeout(() => { if (rootRef.current) rootRef.current.scrollIntoView(); }, 60);
    }
    setReady(true);
    const onHash = () => { const h = readHash(window.location.hash, valid); if (h.artists) setSt({ ...blank, ...h }); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = plotRef.current;
    if (!el || !window.ResizeObserver) return;
    let t;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => setWidth(Math.max(280, Math.round(el.clientWidth))), 60); });
    ro.observe(el); setWidth(Math.max(280, Math.round(el.clientWidth)));
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  // ----- what the filters leave -----
  const v = useMemo(() => {
    const chosen = prepared.filter((r) => st.artists.includes(r.a));
    const byCur = group(chosen, (r) => r.c);
    const curs = Object.keys(byCur).map((c) => {
      const pr = byCur[c].filter((r) => r.v);
      return { c, n: byCur[c].length, priced: pr.length, who: st.artists.filter((a) => pr.some((r) => r.a === a)).length };
    }).sort((a, b) => b.who - a.who || b.priced - a.priced || b.n - a.n || (a.c < b.c ? -1 : 1));
    const cur = st.cur && byCur[st.cur] ? st.cur : curs.length ? curs[0].c : null;
    const inCur = cur ? byCur[cur] : [];
    const byKind = group(inCur, (r) => r.k);
    const kinds = ["unique", "edition", "unstated"].filter((k) => byKind[k]).map((k) => ({ k, n: byKind[k].length, priced: byKind[k].filter((r) => r.v).length }));
    const best = kinds.slice().sort((a, b) => b.priced - a.priced || b.n - a.n)[0];
    const kind = st.kind && byKind[st.kind] ? st.kind : best ? best.k : "unique";
    const inKind = byKind[kind] || [];
    const mediaN = group(inKind, (r) => r.md), housesN = group(inKind, (r) => r.h);
    const media = MEDIA.filter((m) => mediaN[m[0]]).map((m) => ({ k: m[0], label: m[1], n: mediaN[m[0]].length }));
    const houses = Object.keys(housesN).sort((a, b) => housesN[b].length - housesN[a].length || a.localeCompare(b)).map((h) => ({ k: h, n: housesN[h].length }));
    // a filter that no longer matches anything here is set aside, not applied
    const useMedia = st.media.filter((k) => mediaN[k]), useHouses = st.houses.filter((k) => housesN[k]);
    const checksN = group(inKind, (r) => r.chk);
    const shown = inKind.filter((r) => (!useMedia.length || useMedia.includes(r.md)) && (!useHouses.length || useHouses.includes(r.h)) && !st.hide.includes(r.chk));
    const ts = shown.map((r) => r.t0);
    const full = ts.length ? [Math.min(...ts), Math.max(...ts)] : null;
    let range = st.range && full ? [Math.max(st.range[0], full[0]), Math.min(st.range[1], full[1])] : null;
    if (range && (range[1] - range[0] < DAY || (range[0] <= full[0] && range[1] >= full[1]))) range = null;
    const win = range || full;
    const inView = shown.filter((r) => win && r.t0 >= win[0] && r.t0 <= win[1]);
    return { chosen, curs, cur, kinds, kind, media, houses, useMedia, useHouses, checksN, shown, full, range, win, inView,
      priced: inView.filter((r) => r.v), unpriced: inView.filter((r) => !r.v), pricedAll: shown.filter((r) => r.v) };
  }, [prepared, st]);

  // ----- keep the address up to date, so the view can be shared -----
  useEffect(() => {
    if (!ready) return;
    const h = writeHash({ ...st, cur: st.cur && v.cur === st.cur ? st.cur : null, kind: st.kind && v.kind === st.kind ? st.kind : null, range: v.range });
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search + h); } catch (e) { /* the view still works without the address */ }
  }, [st, v.cur, v.kind, v.range, ready]);

  const seriesOf = useMemo(() => { const o = {}; st.artists.forEach((a, i) => { o[a] = SERIES[i]; }); return o; }, [st.artists]);
  const many = st.artists.length > 1;

  // ----- the chart's geometry -----
  const W = width, small = W < 560;
  const H = small ? 300 : 400;
  const m = { l: small ? 50 : 68, r: small ? 14 : 24, t: 22, b: v.unpriced.length ? 50 : 36 };
  const bottom = H - m.b;
  const g = useMemo(() => {
    if (!v.win) return null;
    const span = Math.max(v.win[1] - v.win[0], DAY);
    const pad = Math.max(span * 0.06, Math.min(40 * DAY, span * 0.5 + 10 * DAY));
    const x0 = v.win[0] - pad, x1 = v.win[1] + pad;
    const X = (t) => m.l + (t - x0) / (x1 - x0) * (W - m.l - m.r);
    const vals = [];
    (v.priced.length ? v.priced : v.pricedAll).forEach((r) => { vals.push(r.v); if (st.est && r.el) vals.push(r.el); if (st.est && r.eh) vals.push(r.eh); });
    const sc = priceScale(vals, st.scale, m.t, bottom);
    // one mark per sale; marks that would sit on top of each other move sideways in turn
    const placed = [], pts = [];
    v.pricedAll.slice().sort((a, b) => a.t0 - b.t0 || (a.id < b.id ? -1 : 1)).forEach((r) => {
      const bx = X(r.t0), y = sc.Y(r.v);
      let x = bx, tries = 0;
      const visible = r.t0 >= v.win[0] && r.t0 <= v.win[1];
      while (visible && tries < 8 && placed.some((q) => Math.abs(q[0] - x) < 14 && Math.abs(q[1] - y) < 14)) { tries++; x = bx + Math.ceil(tries / 2) * 14 * (tries % 2 ? 1 : -1); }
      if (visible) placed.push([x, y]);
      pts.push({ r, x, y, visible });
    });
    return { x0, x1, X, ...sc, pts, ticksX: timeTicks(x0, x1, small) };
  }, [v, W, H, st.scale, st.est, small, m.l, m.r, m.t, bottom]);

  const visiblePts = g ? g.pts.filter((p) => p.visible) : [];
  const newest = visiblePts.slice().sort((a, b) => b.r.t0 - a.r.t0)[0];
  const pickRow = (st.pick && v.inView.find((r) => r.id === st.pick)) || null;
  const hoverRow = hover && v.inView.find((r) => r.id === hover);
  const shownRow = hoverRow || pickRow || (newest && newest.r) || null;

  // ----- pointer: hover for detail, drag across the chart to zoom (mouse), tap to pick -----
  const drag = useRef(null);
  const [band, setBand] = useState(null);
  const toLocal = (e) => { const b = svgRef.current.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
  const nearest = (x, y, limit) => {
    let best = null, bd = limit * limit;
    visiblePts.forEach((p) => { const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = p; } });
    return best;
  };
  const tFromX = (x) => g.x0 + (x - m.l) / (W - m.l - m.r) * (g.x1 - g.x0);
  function onMove(e) {
    if (!g) return;
    const [x, y] = toLocal(e);
    if (drag.current) { drag.current.x1 = x; if (Math.abs(x - drag.current.x0) > 6) setBand([Math.min(drag.current.x0, x), Math.max(drag.current.x0, x)]); return; }
    if (e.pointerType !== "mouse") return;
    const p = nearest(x, y, 34);
    setHover(p ? p.r.id : null);
  }
  function onDown(e) {
    if (!g || e.pointerType !== "mouse" || e.button !== 0) return;
    const [x] = toLocal(e);
    drag.current = { x0: x, x1: x };
  }
  function onUp(e) {
    if (!g) return;
    const d = drag.current; drag.current = null; setBand(null);
    const [x, y] = toLocal(e);
    if (d && Math.abs(d.x1 - d.x0) > 12) {
      const a = tFromX(Math.min(d.x0, d.x1)), b = tFromX(Math.max(d.x0, d.x1));
      if (b - a > DAY * 2) patch({ range: [a, b] });
      return;
    }
    const p = nearest(x, y, e.pointerType === "mouse" ? 34 : 44);
    if (p) pick(p.r.id, e.pointerType !== "mouse");
  }
  function pick(id, scroll) {
    patch({ pick: id }); setHover(null);
    if (scroll && cardRef.current && window.innerWidth < 900) cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function keyOnDot(e, i) {
    const list = visiblePts.slice().sort((a, b) => a.x - b.x);
    const at = list.findIndex((p) => p.r.id === visiblePts[i].r.id);
    const j = e.key === "ArrowRight" || e.key === "ArrowUp" ? at + 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? at - 1 : null;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(visiblePts[i].r.id, false); }
    if (j !== null && list[j]) { e.preventDefault(); const el = svgRef.current.querySelector('[data-id="' + CSS.escape(list[j].r.id) + '"]'); if (el) el.focus(); }
  }

  // ----- zoom -----
  function zoom(f) {
    if (!v.full) return;
    const w = v.win, c = (w[0] + w[1]) / 2, half = Math.max((w[1] - w[0]) * f / 2, 15 * DAY);
    let a = c - half, b = c + half;
    if (a < v.full[0]) { b += v.full[0] - a; a = v.full[0]; }
    if (b > v.full[1]) { a -= b - v.full[1]; b = v.full[1]; }
    patch({ range: [Math.max(a, v.full[0]), Math.min(b, v.full[1])] });
  }
  const canZoomIn = v.full && v.win && v.win[1] - v.win[0] > 45 * DAY && v.priced.length > 1;

  // ----- artists -----
  function addArtist(k) { if (!k || st.artists.includes(k) || st.artists.length >= MAX_ARTISTS) return; patch({ artists: st.artists.concat(k), pick: null, range: null }); }
  function dropArtist(k) { if (st.artists.length < 2) return; patch({ artists: st.artists.filter((a) => a !== k), pick: null, range: null }); }
  function swapIn(k, i) { const list = st.artists.slice(); const j = list.indexOf(k); if (j >= 0) list[j] = list[i]; list[i] = k; patch({ artists: list, pick: null, range: null }); }
  function sharedPair() {
    // a random artist who shares a priced currency with the first one, so there is something to compare
    const a = st.artists[0];
    const mine = {}; prepared.forEach((r) => { if (r.a === a && r.v) mine[r.c] = 1; });
    const others = slugs.filter((k) => !st.artists.includes(k) && prepared.some((r) => r.a === k && r.v && mine[r.c]));
    if (!others.length) return;
    const k = others[Math.floor(Math.random() * others.length)];
    if (st.artists.length < MAX_ARTISTS) addArtist(k); else swapIn(k, st.artists.length - 1);
  }
  function toggle(list, k) { return list.includes(k) ? list.filter((x) => x !== k) : list.concat(k); }

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied("Link copied. Anyone who opens it sees this view."); }
    catch (e) { setCopied("Copy the address from your browser bar to share this view."); }
    setTimeout(() => setCopied(""), 4000);
  }

  // ----- per artist, inside the current view -----
  const perArtist = st.artists.map((a, i) => {
    const pr = v.priced.filter((r) => r.a === a), un = v.unpriced.filter((r) => r.a === a);
    const vs = { above: 0, within: 0, below: 0 };
    pr.concat(un).forEach((r) => { const w = againstEstimate(r); if (w) vs[w]++; });
    const lo = pr.length ? pr.reduce((x, y) => (y.v < x.v ? y : x)) : null, hi = pr.length ? pr.reduce((x, y) => (y.v > x.v ? y : x)) : null;
    const elsewhere = Object.keys(group(prepared.filter((r) => r.a === a && r.v && r.c !== v.cur), (r) => r.c));
    return { a, i, s: SERIES[i], pr, un, vs, lo, hi, elsewhere };
  });
  const list = v.inView.slice().sort((a, b) => b.t0 - a.t0 || (a.id < b.id ? -1 : 1));
  const unused = slugs.filter((k) => !st.artists.includes(k));
  const filtersOn = v.useMedia.length + v.useHouses.length + st.hide.length;
  const label = (r) => (many ? r.an + ", " : "") + r.t + ", " + r.dt + ", " + money(r.v, r.c) + ", " + basisText(r).split(".")[0].toLowerCase();

  return (
    <section className="shell section pe" id="explorer" ref={rootRef}>
      <span id="history" className="pe-anchor" /><span id="compare" className="pe-anchor" />
      <div className="panel on-ink">
        <p className="eyebrow">Price explorer</p>
        <div className="split">
          <h2 className="h2">Up to four artists, every priced sale</h2>
          <p className="intro">Each mark is one sale. Hover or tap for the work, the house and the source. Drag across the strip under the chart to zoom into a stretch of time, and use the filters to narrow it down. The address in your browser changes as you go, so you can share exactly what you see.</p>
        </div>

        {/* who is on the chart */}
        <div className="pe-artists" role="group" aria-label="Artists on the chart">
          {st.artists.map((a, i) => (
            <span key={a} className={"pe-chip " + SERIES[i].cls}>
              <svg viewBox="-9 -9 18 18" width="14" height="14" aria-hidden="true"><path d={shapePath(SERIES[i].shape, 5.5)} /></svg>
              <a href={base + "artists/" + a + "/"}>{names[a]}</a>
              {many && <button type="button" onClick={() => dropArtist(a)} aria-label={"Remove " + names[a]}>Remove</button>}
            </span>
          ))}
          {st.artists.length < MAX_ARTISTS ? (
            <label className="pe-add">
              <span className="pe-vh">Add an artist</span>
              <select value="" onChange={(e) => addArtist(e.target.value)}>
                <option value="">{many ? "Add another artist" : "Compare with another artist"}</option>
                {unused.map((k) => <option key={k} value={k}>{names[k]}</option>)}
              </select>
            </label>
          ) : <span className="pe-full">Four is the most one chart can hold clearly. Remove one to add another.</span>}
          {!many && (
            <label className="pe-add pe-change">
              <span className="pe-vh">Change artist</span>
              <select value="" onChange={(e) => e.target.value && swapIn(e.target.value, 0)}>
                <option value="">Change artist</option>
                {unused.map((k) => <option key={k} value={k}>{names[k]}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="pe-link" onClick={sharedPair}>Suggest someone to compare</button>
        </div>

        {/* currency and type of work: always one of each */}
        <div className="pe-controls">
          <div className="pe-group">
            <p className="pe-label">Currency of sale</p>
            <div className="px-tabs" role="group" aria-label="Currency of sale">
              {v.curs.map((c) => (
                <button key={c.c} type="button" className={"px-tab" + (c.c === v.cur ? " on" : "")} aria-pressed={c.c === v.cur} onClick={() => patch({ cur: c.c, kind: null, pick: null, range: null })}
                  title={curLabel(c.c) + ": " + countLower(c.priced, "priced sale", "priced sales") + (many ? ", " + countLower(c.who, "artist", "artists") : "")}>
                  {c.c}<span>{many ? c.who + "/" + st.artists.length : c.priced}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pe-group">
            <p className="pe-label">Type of work</p>
            <div className="px-tabs px-kinds" role="group" aria-label="Type of work">
              {v.kinds.map((k) => (
                <button key={k.k} type="button" className={"px-tab" + (k.k === v.kind ? " on" : "")} aria-pressed={k.k === v.kind} onClick={() => patch({ kind: k.k, pick: null, range: null })}>
                  {KIND[k.k]}<span>{k.n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <details className="pe-more" open={filtersOn > 0 || undefined}>
          <summary>More filters{filtersOn ? <b> ({filtersOn} on)</b> : null}</summary>
          <div className="pe-more-body">
            {v.media.length > 1 && (
              <div className="pe-group">
                <p className="pe-label">Medium <span>grouped from the house’s description</span></p>
                <div className="pe-toggles" role="group" aria-label="Medium">
                  {v.media.map((x) => {
                    const on = v.useMedia.includes(x.k);
                    return <button key={x.k} type="button" className={"filter" + (on ? " on" : "")} aria-pressed={on} onClick={() => patch({ media: toggle(v.useMedia, x.k), pick: null })}>{x.label} <span>{x.n}</span></button>;
                  })}
                </div>
              </div>
            )}
            {v.houses.length > 1 && (
              <div className="pe-group">
                <p className="pe-label">Auction house</p>
                <div className="pe-toggles" role="group" aria-label="Auction house">
                  {v.houses.map((x) => {
                    const on = v.useHouses.includes(x.k);
                    return <button key={x.k} type="button" className={"filter" + (on ? " on" : "")} aria-pressed={on} onClick={() => patch({ houses: toggle(v.useHouses, x.k), pick: null })}>{x.k} <span>{x.n}</span></button>;
                  })}
                </div>
              </div>
            )}
            <div className="pe-group">
              <p className="pe-label">How far each sale has been checked</p>
              <div className="pe-toggles" role="group" aria-label="How far each sale has been checked">
                {CHECK_ORDER.filter((k) => v.checksN[k]).map((k) => {
                  const on = !st.hide.includes(k);
                  return <button key={k} type="button" className={"filter pe-chk-" + k + (on ? " on" : "")} aria-pressed={on} onClick={() => patch({ hide: toggle(st.hide, k), pick: null })}>{CHECK[k]} <span>{v.checksN[k].length}</span></button>;
                })}
              </div>
            </div>
            {filtersOn > 0 && <button type="button" className="pe-link" onClick={() => patch({ media: [], houses: [], hide: [], pick: null })}>Clear these filters</button>}
          </div>
        </details>

        {/* the chart and the detail card */}
        <div className="px-body pe-body">
          <div className="px-main">
            <figure className="px-fig pe-fig">
              <div className="pe-bar">
                <div className="pe-zoom" role="group" aria-label="Zoom">
                  <button type="button" className="px-tab" onClick={() => zoom(0.5)} disabled={!canZoomIn}>Zoom in</button>
                  <button type="button" className="px-tab" onClick={() => zoom(2)} disabled={!v.range}>Zoom out</button>
                  <button type="button" className="px-tab" onClick={() => patch({ range: null })} disabled={!v.range}>All dates</button>
                </div>
                <div className="px-scale" role="group" aria-label="Price scale">
                  <button type="button" className={"px-tab" + (g && g.eff === "lin" ? " on" : "")} aria-pressed={!!g && g.eff === "lin"} onClick={() => patch({ scale: "lin" })}>Even</button>
                  <button type="button" className={"px-tab" + (g && g.eff === "log" ? " on" : "")} aria-pressed={!!g && g.eff === "log"} onClick={() => patch({ scale: "log" })}>Log</button>
                  <button type="button" className={"px-tab" + (st.est ? " on" : "")} aria-pressed={st.est} onClick={() => patch({ est: !st.est })}>Estimates</button>
                </div>
              </div>
              <div className="px-plot pe-plot" ref={plotRef}>
                {g ? (
                  <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"pe-svg" + (dragging || band ? " pe-still" : "")}
                    role="group" aria-label={"Chart of " + v.priced.length + " priced sales in " + curLabel(v.cur) + (many ? " by " + listWords(st.artists.map((a) => names[a])) : "") + ". Use the arrow keys to move between sales. Every sale is also listed below the chart."}
                    onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={() => { setHover(null); drag.current = null; setBand(null); }}>
                    <defs><clipPath id="pe-clip"><rect x={m.l - 12} y={0} width={W - m.l - m.r + 24} height={H} /></clipPath></defs>
                    {g.ticks.map((t) => (
                      <g key={"y" + t} className="pe-ytick">
                        <line x1={m.l - 8} x2={W - m.r} y1={g.Y(t)} y2={g.Y(t)} className="pe-grid" />
                        <text x={m.l - 12} y={g.Y(t) + 4} textAnchor="end" className="px-axis">{short(t, v.cur)}</text>
                      </g>
                    ))}
                    {g.ticksX.map((t) => <text key={"x" + t[0]} x={g.X(t[0])} y={H - 10} textAnchor="middle" className="px-axis">{t[1]}</text>)}
                    <g clipPath="url(#pe-clip)">
                      {v.unpriced.map((r) => (
                        <g key={r.id} className="px-none"><line x1={g.X(r.t0)} x2={g.X(r.t0)} y1={bottom + 8} y2={bottom + 18} /><title>{r.an + ": " + r.t + ", " + r.dt + ", price to confirm"}</title></g>
                      ))}
                      {g.pts.map((p, i) => {
                        const r = p.r, s = seriesOf[r.a] || SERIES[0], on = shownRow && shownRow.id === r.id;
                        const showEst = st.est && r.el;
                        const ey0 = showEst ? g.Y(Math.max(r.el, g.y0 || r.el)) - p.y : 0, ey1 = showEst ? g.Y(r.eh || r.el) - p.y - (r.eh ? 0 : 3) : 0;
                        return (
                          <g key={r.id} data-id={r.id} className={"px-pt pe-pt " + s.cls + " f-" + (r.vf === "ma" ? "ma" : r.vb === "hammer" ? "ham" : "prem") + (on ? " on" : "") + (p.visible ? "" : " pe-out")}
                            style={{ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)` }}
                            tabIndex={p.visible ? 0 : -1} role="button" aria-label={label(r)} aria-hidden={p.visible ? undefined : true}
                            onFocus={() => setHover(r.id)} onBlur={() => setHover(null)} onKeyDown={(e) => keyOnDot(e, visiblePts.indexOf(p))}>
                            {showEst ? <line className="px-est" x1={0} x2={0} y1={ey0} y2={ey1} /> : null}
                            <path className="px-dot" d={shapePath(s.shape, small ? 6 : 7)} />
                          </g>
                        );
                      })}
                    </g>
                    {band && <rect className="pe-band" x={band[0]} y={m.t} width={band[1] - band[0]} height={bottom - m.t} />}
                    {v.unpriced.length > 0 && !small && <text x={m.l} y={bottom + 32} className="px-axis">{v.unpriced.length + " to confirm"}</text>}
                  </svg>
                ) : <p className="px-note">Nothing to chart with these choices. Try another currency or type of work, or clear the filters.</p>}
              </div>
              {v.full && v.shown.length > 0 && (
                <Brush full={v.full} win={v.win} range={v.range} rows={v.shown} seriesOf={seriesOf} width={W} m={m}
                  onRange={(r) => patch({ range: r })} onDrag={setDragging} />
              )}
              <figcaption className={"px-legend" + (many ? "" : " px-legend-one")}>
                {many && st.artists.map((a, i) => (
                  <span key={a}><svg className={"pe-key " + SERIES[i].cls} viewBox="-9 -9 18 18" width="13" height="13" aria-hidden="true"><path d={shapePath(SERIES[i].shape, 5.5)} /></svg>{names[a]}</span>
                ))}
                <span><i className="lg-dot f-prem" />With premium</span>
                <span><i className="lg-dot f-ham" />Hammer price only</span>
                <span><i className="lg-dot f-ma" />From MutualArt</span>
                {st.est && <span><i className="lg-est" />Estimate</span>}
                <span><i className="lg-none" />Price to confirm</span>
              </figcaption>
            </figure>
            <p className="px-note" role="status">
              {v.cur ? sizeNote(v.priced.length, v.kind, v.cur) : ""}
              {v.range ? " Showing " + dayText(v.range[0]) + " to " + dayText(v.range[1]) + "." : ""}
              {v.unpriced.length ? " " + count(v.unpriced.length, "more lot", "more lots") + " in view still " + (v.unpriced.length === 1 ? "has" : "have") + " no confirmed price." : ""}
            </p>
          </div>
          <div className="px-card pe-card" ref={cardRef} aria-live="polite">
            {shownRow ? <Card r={shownRow} many={many} base={base} s={seriesOf[shownRow.a]} /> : <p className="px-card-empty">Nothing priced to show here yet. The list below has every lot, priced or not.</p>}
          </div>
        </div>

        {/* each artist in this view */}
        <div className={"pe-stats" + (many ? "" : " pe-stats-one")}>
          {perArtist.map((x) => (
            <article key={x.a} className={"pe-stat " + x.s.cls}>
              <h3><svg className={"pe-key " + x.s.cls} viewBox="-9 -9 18 18" width="14" height="14" aria-hidden="true"><path d={shapePath(x.s.shape, 5.5)} /></svg><a href={base + "artists/" + x.a + "/"}>{names[x.a]}</a></h3>
              {x.pr.length ? (
                <>
                  <p className="pe-big">{x.pr.length}<span>{x.pr.length === 1 ? "priced sale in view" : "priced sales in view"}</span></p>
                  {x.pr.length > 1 ? <p>Lowest <b className={x.lo.vb === "premium" ? "pe-prem" : "pe-ham"}>{money(x.lo.v, x.lo.c)}</b>, highest <b className={x.hi.vb === "premium" ? "pe-prem" : "pe-ham"}>{money(x.hi.v, x.hi.c)}</b>.</p>
                    : <p>{money(x.pr[0].v, x.pr[0].c)}, {x.pr[0].t}.</p>}
                </>
              ) : <p>No priced {KIND[v.kind].toLowerCase()} in {curName(v.cur)} in this view.{x.elsewhere.length ? " Priced sales in " + listWords(x.elsewhere.map(curName)) + "." : ""}</p>}
              {x.vs.above + x.vs.within + x.vs.below > 0 && (
                <p className="pe-vs">Hammer against the estimate: {[x.vs.above && x.vs.above + " above", x.vs.within && x.vs.within + " within", x.vs.below && x.vs.below + " below"].filter(Boolean).join(", ")}.</p>
              )}
              {x.un.length > 0 && <p className="pe-quiet">{count(x.un.length, "lot", "lots")} with no confirmed price yet.</p>}
            </article>
          ))}
        </div>

        <div className="pe-share">
          <button type="button" className="pill pill-mint pill-small" onClick={copyLink}>Copy a link to this view</button>
          <span role="status">{copied}</span>
        </div>

        {/* every sale in view, newest first: the chart in words */}
        <div className="pe-list">
          <h3 className="px-sub">The sales on the chart</h3>
          <p className="px-note">{list.length ? count(list.length, "lot", "lots") + ", newest first. Choose one to see it on the chart." : "No lots with these choices."}</p>
          {list.length > 0 && (
            <ol className="pe-rows">
              {list.map((r) => {
                const s = seriesOf[r.a] || SERIES[0], on = shownRow && shownRow.id === r.id;
                return (
                  <li key={r.id} className={on ? "on" : ""}>
                    <button type="button" onClick={() => r.v ? pick(r.id, true) : null} disabled={!r.v} aria-pressed={on}>
                      {many && <svg className={"pe-key " + s.cls} viewBox="-9 -9 18 18" width="12" height="12" aria-hidden="true"><path d={shapePath(s.shape, 5.5)} /></svg>}
                      <span className="pe-r-t">{many ? r.an + ", " : ""}<em>{r.t}</em>{r.y ? " (" + r.y + ")" : ""}</span>
                      <span className="pe-r-s">{r.h}, {r.dt}{r.lot ? ", lot " + r.lot : ""}</span>
                      <span className={"pe-r-v " + (r.v ? (r.vb === "premium" ? "pe-prem" : "pe-ham") : "pe-quiet")}>{r.v ? money(r.v, r.c) : "Price to confirm"}<small>{r.v ? (r.vb === "premium" ? "with premium" : r.vb === "hammer" ? "hammer" : "basis not stated") : ""}</small></span>
                      <span className={"px-chk px-chk-" + r.chk}>{CHECK[r.chk]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

// The detail for one sale: every known figure, each in its own colour, and where it came from.
function Card({ r, many, base, s }) {
  return (
    <>
      <p className="px-card-k">{many && s ? <svg className={"pe-key " + s.cls} viewBox="-9 -9 18 18" width="12" height="12" aria-hidden="true"><path d={shapePath(s.shape, 5.5)} /></svg> : null}{many ? r.an + ", " + KIND_ONE[r.k].toLowerCase() : KIND_ONE[r.k]}</p>
      <h3>{r.t}{r.y ? <span> ({r.y})</span> : null}</h3>
      {r.v ? <p className={"px-card-v " + (r.vb === "premium" ? "pe-prem" : "pe-ham")}>{money(r.v, r.c)}</p> : <p className="px-card-v pe-quiet">Price to confirm</p>}
      {r.v ? <p className="px-card-b">{basisText(r)}.</p> : null}
      <dl>
        {(r.ham || r.pr) && r.vf !== "ma" ? (
          <div><dt>Figures</dt><dd className="pe-figs">
            {r.ham ? <span><i className="pe-ham">{money(r.ham, r.c)}</i> hammer</span> : null}
            {r.pr ? <span><i className="pe-prem">{money(r.pr, r.c)}</i> with premium</span> : null}
          </dd></div>
        ) : null}
        <div><dt>Estimate</dt><dd className={r.el ? "pe-est" : ""}>{estimateText(r)}</dd></div>
        <div><dt>Sale</dt><dd>{r.h}, {r.dt}{r.lot ? ", lot " + r.lot : ""}{r.sl ? <span>{r.sl}</span> : null}</dd></div>
        {r.m ? <div><dt>Medium</dt><dd>{r.m}</dd></div> : null}
        <div><dt>Checked</dt><dd><span className={"px-chk px-chk-" + r.chk}>{CHECK[r.chk]}</span></dd></div>
      </dl>
      <p className="px-card-links">
        <a className="text-link" href={base + "artists/" + r.a + "/#work-" + encodeURIComponent(r.id)}>See the sale in full</a>
        {r.srcu ? <a className="text-link" href={r.srcu} rel="noopener">{r.src}</a> : null}
      </p>
    </>
  );
}

// The strip under the chart: every sale in the current filters across all dates, with a window
// that can be dragged, stretched from either edge, or drawn afresh. Works with touch.
function Brush({ full, win, range, rows, seriesOf, width, m, onRange, onDrag }) {
  const H = 58, ref = useRef(null), act = useRef(null);
  const span = Math.max(full[1] - full[0], DAY), pad = Math.max(span * 0.03, 10 * DAY);
  const a0 = full[0] - pad, a1 = full[1] + pad;
  const X = (t) => m.l + (t - a0) / (a1 - a0) * (width - m.l - m.r);
  const T = (x) => a0 + (x - m.l) / (width - m.l - m.r) * (a1 - a0);
  const vals = rows.filter((r) => r.v).map((r) => r.v);
  const lo = vals.length ? Math.log10(Math.min(...vals)) : 0, hi = vals.length ? Math.log10(Math.max(...vals)) : 1;
  const Y = (v) => H - 12 - (hi > lo ? (Math.log10(v) - lo) / (hi - lo) : 0.5) * (H - 22);
  const wx0 = X(win[0]), wx1 = X(win[1]);
  const clamp = (r) => {
    let [x, y] = r;
    if (y - x < 7 * DAY) { const c = (x + y) / 2; x = c - 3.5 * DAY; y = c + 3.5 * DAY; }
    if (x < full[0]) { y += full[0] - x; x = full[0]; }
    if (y > full[1]) { x -= y - full[1]; y = full[1]; }
    return [Math.max(x, full[0]), Math.min(y, full[1])];
  };
  const local = (e) => { const b = ref.current.getBoundingClientRect(); return (e.clientX - b.left) * width / b.width; };
  function down(e, mode) {
    e.stopPropagation(); e.preventDefault();
    const x = local(e);
    act.current = { mode, x, w: [win[0], win[1]], moved: false };
    try { ref.current.setPointerCapture(e.pointerId); } catch (er) { /* capture is a nicety */ }
    onDrag(true);
  }
  function move(e) {
    const s = act.current; if (!s) return;
    const x = local(e), dt = T(x) - T(s.x);
    if (Math.abs(x - s.x) > 3) s.moved = true;
    if (!s.moved) return;
    if (s.mode === "move") onRange(clamp([s.w[0] + dt, s.w[1] + dt]));
    else if (s.mode === "l") onRange(clamp([Math.min(s.w[0] + dt, s.w[1] - 7 * DAY), s.w[1]]));
    else if (s.mode === "r") onRange(clamp([s.w[0], Math.max(s.w[1] + dt, s.w[0] + 7 * DAY)]));
    else { const t0 = T(s.x), t1 = T(x); onRange(clamp([Math.min(t0, t1), Math.max(t0, t1)])); }
  }
  function up() {
    const s = act.current; act.current = null; onDrag(false);
    if (!s || s.moved) return;
    // a tap on the strip outside the window moves the window there
    if (s.mode === "new" && range) { const half = (range[1] - range[0]) / 2, c = T(s.x); onRange(clamp([c - half, c + half])); }
  }
  function key(e) {
    const w = win[1] - win[0], step = w * 0.15;
    if (e.key === "ArrowLeft") { e.preventDefault(); onRange(clamp([win[0] - step, win[1] - step])); }
    if (e.key === "ArrowRight") { e.preventDefault(); onRange(clamp([win[0] + step, win[1] + step])); }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); onRange(clamp([win[0] + w / 4, win[1] - w / 4])); }
    if (e.key === "-") { e.preventDefault(); onRange(clamp([win[0] - w / 2, win[1] + w / 2])); }
    if (e.key === "Escape" || e.key === "Home") { e.preventDefault(); onRange(null); }
  }
  return (
    <div className="pe-brush">
      <svg ref={ref} viewBox={`0 0 ${width} ${H}`} width={width} height={H} onPointerDown={(e) => down(e, "new")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <rect className="pe-brush-bg" x={m.l - 6} y={2} width={width - m.l - m.r + 12} height={H - 4} rx={12} />
        {rows.map((r) => r.v
          ? <circle key={r.id} className={"pe-mini " + ((seriesOf[r.a] || SERIES[0]).cls)} cx={X(r.t0)} cy={Y(r.v)} r={2.6} />
          : <line key={r.id} className="pe-mini-none" x1={X(r.t0)} x2={X(r.t0)} y1={H - 9} y2={H - 4} />)}
        {range && <rect className="pe-shade" x={m.l - 6} y={2} width={Math.max(0, wx0 - m.l + 6)} height={H - 4} />}
        {range && <rect className="pe-shade" x={wx1} y={2} width={Math.max(0, width - m.r + 6 - wx1)} height={H - 4} />}
        <rect className={"pe-win" + (range ? " on" : "")} x={wx0 - 4} y={2} width={Math.max(8, wx1 - wx0 + 8)} height={H - 4} rx={10}
          tabIndex={0} role="slider" aria-label="Dates shown on the chart. Left and right arrows move the window, plus and minus zoom, Escape shows all dates."
          aria-valuetext={dayText(win[0]) + " to " + dayText(win[1])} aria-valuemin={full[0]} aria-valuemax={full[1]} aria-valuenow={win[0]}
          onPointerDown={(e) => down(e, range ? "move" : "new")} onKeyDown={key} />
        <g className="pe-handle" onPointerDown={(e) => down(e, "l")}>
          <rect className="pe-hit" x={wx0 - 22} y={0} width={30} height={H} />
          <rect className="pe-grip" x={wx0 - 6} y={H / 2 - 12} width={6} height={24} rx={3} />
        </g>
        <g className="pe-handle" onPointerDown={(e) => down(e, "r")}>
          <rect className="pe-hit" x={wx1 - 8} y={0} width={30} height={H} />
          <rect className="pe-grip" x={wx1} y={H / 2 - 12} width={6} height={24} rx={3} />
        </g>
      </svg>
      <p className="pe-brush-note">{range ? "Drag the window, or stretch it from either end." : "Drag across this strip to zoom into a stretch of time."}</p>
    </div>
  );
}

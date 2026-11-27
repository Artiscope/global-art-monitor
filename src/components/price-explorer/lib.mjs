// Small helpers for the Price Explorer. The figures come from the page (written by
// assets/render.js from data/sales.json), so the explorer always matches the tables.
// Rules kept here, as in assets/explorer.js:
// - every price stays in the currency of its sale, and a chart shows one currency;
// - unique works, editions and lots of unstated type are never on the same chart;
// - dots are never joined up, and small numbers of sales are called small.

export const MAX_ARTISTS = 4;
export const DAY = 864e5;

const SYMBOL = { GBP: "£", USD: "US$", EUR: "€", HKD: "HK$", AUD: "A$", CAD: "C$", SGD: "S$", NZD: "NZ$", JPY: "JP¥", CNY: "CN¥" };
const CUR_NAME = { GBP: "pounds", USD: "US dollars", EUR: "euros", HKD: "Hong Kong dollars", KRW: "Korean won", ZAR: "South African rand", INR: "Indian rupees",
  CHF: "Swiss francs", CNY: "Chinese yuan", DKK: "Danish kroner", JPY: "Japanese yen", AUD: "Australian dollars", CAD: "Canadian dollars", SGD: "Singapore dollars" };
const NUM = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const KIND = { unique: "Unique works", edition: "Prints and editions", unstated: "Type not stated" };
export const KIND_ONE = { unique: "Unique work", edition: "Print, multiple or edition", unstated: "Type not stated" };
export const KIND_MANY = { unique: ["unique work", "unique works"], edition: ["print, multiple or edition", "prints, multiples and editions"], unstated: ["lot of unstated type", "lots of unstated type"] };
export const CHECK = { house: "Checked on the house page", press: "From press or a sales database", unchecked: "House page not yet checked" };
export const CHECK_ORDER = ["house", "press", "unchecked"];

// Each artist keeps a colour and a shape, so the chart never relies on colour alone.
// The first two match the comparison chart already on the site (mint circle, lilac diamond).
export const SERIES = [
  { cls: "s0", shape: "circle", word: "circle" },
  { cls: "s1", shape: "diamond", word: "diamond" },
  { cls: "s2", shape: "square", word: "square" },
  { cls: "s3", shape: "triangle", word: "triangle" },
];

// Medium groups, read from the description the house published. Only a way of narrowing
// the chart: the full wording is always shown on the sale itself.
export const MEDIA = [
  ["painting", "Paintings"],
  ["paper", "Works on paper"],
  ["print", "Prints"],
  ["photo", "Photographs"],
  ["object", "Sculpture and objects"],
  ["mixed", "Textiles and mixed media"],
  ["unstated", "Medium not stated"],
];
export function mediumOf(text) {
  const m = String(text || "").toLowerCase();
  if (!m) return "unstated";
  if (/photograph|c-print|gelatin silver|cibachrome|chromogenic|pigment print/.test(m)) return "photo";
  if (/screenprint|lithograph|etching|aquatint|linocut|woodcut|gicl[eé]e|offset|drypoint|inkjet|colour copier|silkscreen in colou?rs|^silkscreen/.test(m)) return "print";
  if (/bronze|stoneware|earthenware|porcelain|ceramic|resin|fibreglass|\bfrp\b|steel|glass|quartz|selenite|amethyst|rubber|vinyl|plaque|sculpture|hydrostone|^wood\b|customs arch/.test(m)) return "object";
  if (/on paper|on wove|watercolou?r|drawing|pencil|crayon/.test(m)) return "paper";
  if (/\b(oil|acrylic|spray|gouache|oilstick|enamel|gloss|paint|tempera|painting|squeegee)/.test(m)) return "painting";
  if (/mixed media|batik|embroidery|bottle caps|aluminium|posters|collage|fabric|stamp/.test(m)) return "mixed";
  return "unstated";
}

export function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
export function money(n, c) { return (SYMBOL[c] || c + " ") + commas(n); }
export function short(n, c) {
  let v = n, u = "";
  if (n >= 1e9) { v = n / 1e9; u = "bn"; } else if (n >= 1e6) { v = n / 1e6; u = "m"; } else if (n >= 1e3) { v = n / 1e3; u = "k"; }
  const t = v >= 100 || v === Math.round(v) ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  return (SYMBOL[c] || c + " ") + t + u;
}
export function symbol(c) { return (SYMBOL[c] || "").trim(); }
export function curLabel(c) { return CUR_NAME[c] ? CUR_NAME[c] + " (" + c + ")" : c; }
export function curName(c) { return CUR_NAME[c] || c; }
export function count(n, one, many) { return (n < 10 ? NUM[n] : String(n)) + " " + (n === 1 ? one : many); }
export function countLower(n, one, many) { const s = count(n, one, many); return n < 10 ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
export function listWords(xs) { return xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; }
export function day(d) { const p = String(d).split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
export function iso(t) { return new Date(t).toISOString().slice(0, 10); }
export function dayText(t) { const d = new Date(t); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }

// What the plotted figure is, in words.
export function basisText(r) {
  if (r.vf === "ma") return r.vb === "premium" ? "With premium, from the MutualArt sale record" : r.vb === "hammer" ? "Hammer price, from the MutualArt sale record" : "From the MutualArt sale record, which does not say whether premium is included";
  if (r.vb === "premium") return "With buyer’s premium" + (r.vf === "calc" ? ", by our calculation" : "");
  return "Hammer price" + (r.vf === "calc" ? ", by our calculation" : "") + ". The price with premium is still to confirm";
}
// Where the hammer price fell against the estimate printed before the sale.
export function againstEstimate(r) {
  if (!r.ham || !r.el) return null;
  if (r.eh && r.ham > r.eh) return "above";
  if (!r.eh && r.ham > r.el) return null;
  if (r.ham < r.el) return "below";
  return "within";
}
export function estimateText(r) {
  if (!r.el) return "No estimate published.";
  const e = money(r.el, r.c) + (r.eh ? " to " + commas(r.eh) : "");
  const a = againstEstimate(r);
  if (a === "above") return e + ". The hammer price was above the high estimate.";
  if (a === "below") return e + ". The hammer price was below the low estimate.";
  if (a === "within") return e + ". The hammer price fell within the estimate.";
  return e + ".";
}
export function sizeNote(n, kind, cur) {
  const [one, many] = KIND_MANY[kind];
  if (n === 0) return "No priced " + many + " in " + curLabel(cur) + " in this view.";
  const head = count(n, one, many) + " with a known price in " + curLabel(cur) + ". ";
  if (n <= 2) return head + (n === 1 ? "One sale is a single data point, not a pattern." : "Two sales are too few to describe a trend.");
  if (n < 6) return head + "That is a small number of sales, so read each dot on its own.";
  return head + "Each dot is a different work, so the spread shows the range of documented prices, not a direction.";
}

// The outline of each artist's mark, drawn round 0,0.
export function shapePath(shape, r) {
  if (shape === "diamond") { const d = r + 2; return `M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`; }
  if (shape === "square") { const d = r * 0.88; return `M${-d} ${-d}H${d}V${d}H${-d}Z`; }
  if (shape === "triangle") { const d = r + 2.5; return `M0 ${-d}L${(d * 0.95).toFixed(2)} ${(d * 0.68).toFixed(2)}H${(-d * 0.95).toFixed(2)}Z`; }
  return `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

// Price axis: an even scale from zero, or a log scale when prices differ by a factor of 15 or more.
export function priceScale(vals, mode, top, bottom) {
  const lo = vals.length ? Math.min(...vals) : 1, hi = vals.length ? Math.max(...vals) : 10;
  const eff = mode === "auto" ? (hi / Math.max(lo, 1) >= 15 ? "log" : "lin") : mode;
  let y0, y1, Y, ticks = [];
  if (eff === "log") {
    y0 = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1)) * 2) / 2); y1 = Math.pow(10, Math.ceil(Math.log10(Math.max(hi, 1)) * 2) / 2);
    if (y1 <= y0) y1 = y0 * 10;
    const l0 = Math.log10(y0), l1 = Math.log10(y1);
    Y = (v) => bottom - (Math.log10(Math.max(v, y0)) - l0) / (l1 - l0) * (bottom - top);
    for (let e = Math.floor(l0); e <= Math.ceil(l1); e++) [1, 2, 5].forEach((k) => { const v = k * Math.pow(10, e); if (v >= y0 * 0.999 && v <= y1 * 1.001) ticks.push(v); });
    if (ticks.length > 7) ticks = ticks.filter((v) => String(v).charAt(0) === "1");
  } else {
    let step = Math.pow(10, Math.floor(Math.log10(hi || 1)));
    const t = Math.ceil(hi * 1.08 / step) * step;
    if (t / step < 3) step /= 2; if (t / step > 7) step *= 2;
    y0 = 0; y1 = t || 1;
    Y = (v) => bottom - (v - y0) / (y1 - y0) * (bottom - top);
    for (let v = 0; v <= y1 + 1e-9; v += step) ticks.push(v);
  }
  return { Y, ticks, eff, y0, y1 };
}

// Date axis labels: months when the view is short, years otherwise.
export function timeTicks(x0, x1, small) {
  const d0 = new Date(x0), d1 = new Date(x1), out = [];
  if (x1 - x0 < 500 * DAY) {
    const stepM = (x1 - x0) < 150 * DAY ? 1 : small ? 3 : 2;
    for (let mm = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); mm < d1; mm = new Date(Date.UTC(mm.getUTCFullYear(), mm.getUTCMonth() + stepM, 1)))
      out.push([mm.getTime(), MONTHS[mm.getUTCMonth()] + (mm.getUTCMonth() < stepM ? " " + mm.getUTCFullYear() : "")]);
  } else {
    const years = d1.getUTCFullYear() - d0.getUTCFullYear();
    const yStep = years > (small ? 24 : 40) ? 10 : years > (small ? 12 : 20) ? 5 : years > (small ? 5 : 9) ? 2 : 1;
    for (let yy = Math.ceil((d0.getUTCFullYear() + 1) / yStep) * yStep; yy <= d1.getUTCFullYear(); yy += yStep) out.push([Date.UTC(yy, 0, 1), String(yy)]);
  }
  return out;
}

// The state of the explorer lives in the address after the #, so a view can be shared.
// Old links (#artist=banksy and #compare=banksy,kaws) still open the right artists.
export function readHash(hash, valid) {
  const out = {};
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return out;
  const q = {};
  raw.split("&").forEach((p) => { const i = p.indexOf("="); if (i > 0) { try { q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); } catch (e) { /* a broken link part is skipped */ } } });
  const a = q.artists || q.compare || q.artist;
  if (a) { const list = a.split(",").filter((k, i, arr) => valid[k] && arr.indexOf(k) === i).slice(0, MAX_ARTISTS); if (list.length) out.artists = list; }
  if (q.cur && /^[A-Z]{3}$/.test(q.cur)) out.cur = q.cur;
  if (q.kind && KIND[q.kind]) out.kind = q.kind;
  if (q.medium) out.media = q.medium.split(",").filter((k) => MEDIA.some((m) => m[0] === k));
  if (q.house) out.houses = q.house.split(",").filter(Boolean);
  if (q.hide) out.hide = q.hide.split(",").filter((k) => CHECK[k]);
  if (q.scale === "log" || q.scale === "lin") out.scale = q.scale;
  if (q.est === "off") out.est = false;
  if (q.from && q.to && /^\d{4}-\d\d-\d\d$/.test(q.from) && /^\d{4}-\d\d-\d\d$/.test(q.to) && q.from < q.to) out.range = [day(q.from), day(q.to)];
  if (q.sale) out.pick = q.sale;
  return out;
}
export function writeHash(st) {
  const parts = [];
  const put = (k, v) => parts.push(k + "=" + encodeURIComponent(v).replace(/%2C/g, ",").replace(/%20/g, "+"));
  put("artists", st.artists.join(","));
  if (st.cur) put("cur", st.cur);
  if (st.kind) put("kind", st.kind);
  if (st.media.length) put("medium", st.media.join(","));
  if (st.houses.length) put("house", st.houses.join(","));
  if (st.hide.length) put("hide", st.hide.join(","));
  if (st.scale !== "auto") put("scale", st.scale);
  if (!st.est) put("est", "off");
  if (st.range) { put("from", iso(st.range[0])); put("to", iso(st.range[1])); }
  if (st.pick) put("sale", st.pick);
  return "#" + parts.join("&");
}

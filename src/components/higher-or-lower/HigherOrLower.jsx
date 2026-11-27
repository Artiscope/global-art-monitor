// Global Art Monitor: Higher or lower.
// Two real sales side by side; the reader picks the one with the higher hammer price.
// The lots come from the page (written by assets/render.js, holPage and holLots, from data/sales.json),
// so every answer matches the auction results table. Rules kept here:
// - two lots are only paired when they share the currency, the type (unique work, or print and edition)
//   and how the hammer price was reached (published by the house, or worked back by us);
// - prices stay in the currency of the sale, with no conversion;
// - every answer shows both hammer prices with a link to each source;
// - the best run stays in this browser. Nothing is sent anywhere.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SYMBOL = { GBP: "£", USD: "US$", EUR: "€", HKD: "HK$", CHF: "CHF ", CNY: "CN¥", DKK: "DKK ", KRW: "₩", INR: "₹", ZAR: "R", JPY: "JP¥" };
const CUR_NAME = { GBP: "pounds", USD: "US dollars", EUR: "euros", HKD: "Hong Kong dollars", KRW: "Korean won", ZAR: "South African rand",
  INR: "Indian rupees", CHF: "Swiss francs", CNY: "Chinese yuan", DKK: "Danish kroner", JPY: "Japanese yen" };
const KIND = { unique: "Unique work", edition: "Print, multiple or edition" };
const KIND_PAIR = { unique: "Both are unique works", edition: "Both are prints, multiples or editions" };
const CHECK = { house: "Checked on the house page", press: "From press or a sales database" };
const BEST_KEY = "gam-hol-best-v1";

const commas = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const money = (n, c) => (SYMBOL[c] || c + " ") + commas(n);
const curLabel = (c) => (CUR_NAME[c] ? CUR_NAME[c] + " (" + c + ")" : c);
const groupOf = (r) => r.c + "|" + r.k + "|" + r.hb;

function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// every fair pair: same group, different hammer prices; which lot shows on the left is part of the shuffle
function allPairs(lots) {
  const groups = {};
  lots.forEach((r) => { (groups[groupOf(r)] = groups[groupOf(r)] || []).push(r); });
  const out = [];
  Object.keys(groups).sort().forEach((g) => {
    const list = groups[g];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (list[i].ham !== list[j].ham) out.push([list[i], list[j]]);
  });
  return out;
}
function deal(pairs, rand) {
  return shuffle(pairs, rand).map((p) => (rand() < 0.5 ? p : [p[1], p[0]]));
}
function times(x) {
  if (x < 10) return (Math.round(x * 10) / 10) + " times";
  return "about " + commas(x < 100 ? Math.round(x) : Math.round(x / 10) * 10) + " times";
}
function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
}

// the hammer price, counted up from nothing on reveal
function CountUp({ value, currency, run }) {
  const [shown, setShown] = useState(run ? 0 : value);
  useEffect(() => {
    if (!run || reducedMotion()) { setShown(value); return undefined; }
    let raf = 0; const start = performance.now(), dur = 650;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
      setShown(t < 1 ? value * eased : value);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, run]);
  return <span className="hol-price-n">{money(shown, currency)}</span>;
}

function LotCard({ r, side, phase, picked, higher, onPick, animate }) {
  const shown = phase !== "ask";
  const isHigher = shown && r.id === higher.id;
  const isPicked = picked && picked.id === r.id;
  let cls = "hol-card hol-" + side;
  if (shown) cls += isHigher ? " is-higher" : " is-lower";
  if (isPicked) cls += " is-picked";
  const facts = (
    <>
      <p className="hol-side">{side === "a" ? "Lot A" : "Lot B"}</p>
      <h3 className="hol-artist">{r.an}</h3>
      <p className="hol-title"><i>{r.t}</i>{r.y ? ", " + r.y : ""}</p>
      <p className={"hol-kind hol-kind-" + r.k}>{KIND[r.k]}</p>
      <p className="hol-medium">{r.m}</p>
      <p className="hol-house">{r.h}{r.sl ? <span>{r.sl}</span> : null}{r.lot ? <span>Lot {r.lot}</span> : null}</p>
    </>
  );
  if (!shown) {
    return (
      <button type="button" className={cls} onClick={() => onPick(r)} aria-label={"Pick " + r.an + ", " + r.t + " as the higher hammer price"}>
        {facts}
        <span className="hol-pick">This one sold for more</span>
      </button>
    );
  }
  return (
    <div className={cls}>
      {facts}
      <div className="hol-result">
        <span className="hol-badge">{isHigher ? "Higher" : "Lower"}{isPicked ? ", your pick" : ""}</span>
        <p className="hol-price"><span className="hol-price-k">Hammer price</span><CountUp value={r.ham} currency={r.c} run={animate} /></p>
        <p className="hol-basis">{r.hb === "calc"
          ? "Our calculation. The house published the total, and we took off the buyer's premium at the rates it published for this sale."
          : "As published."}</p>
        <p className="hol-src">
          <span className={"px-chk px-chk-" + r.chk}>{CHECK[r.chk]}</span>
          {r.srcu ? <a className="text-link" href={r.srcu} rel="noopener" target="_blank">Source: {r.src || "lot result"}</a> : null}
        </p>
      </div>
    </div>
  );
}

export default function HigherOrLower({ lots }) {
  const pairs = useMemo(() => allPairs(lots || []), [lots]);
  // the first deal is fixed, so the page as served and the page in the browser match
  const [order, setOrder] = useState(() => deal(pairs, seeded(20261127)));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState("ask"); // ask, right, wrong, done
  const [picked, setPicked] = useState(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [animate, setAnimate] = useState(false);
  const [dealt, setDealt] = useState(false); // the first pair shows at once; later ones slide in
  const host = useRef(null);
  const nextBtn = useRef(null);
  const after = useRef(null);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0); } catch (e) { /* private window: the game still works */ }
  }, []);

  const pair = order[round];
  const higher = pair ? (pair[0].ham > pair[1].ham ? pair[0] : pair[1]) : null;
  const lower = pair ? (higher === pair[0] ? pair[1] : pair[0]) : null;

  const pick = useCallback((r) => {
    if (phase !== "ask" || !pair) return;
    const right = r.id === higher.id;
    setPicked(r); setAnimate(true); setShareMsg("");
    if (right) {
      const s = streak + 1;
      setStreak(s);
      if (s > best) { setBest(s); setNewBest(true); try { localStorage.setItem(BEST_KEY, String(s)); } catch (e) { /* ignore */ } }
      setPhase(round + 1 >= order.length ? "done" : "right");
    } else {
      setPhase("wrong");
    }
  }, [phase, pair, higher, streak, best, round, order.length]);

  const next = useCallback(() => {
    setPicked(null); setAnimate(false); setPhase("ask"); setShareMsg("");
    setRound((n) => n + 1);
    if (host.current && host.current.getBoundingClientRect().top < 0) host.current.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  }, []);
  const again = useCallback(() => {
    setOrder(deal(pairs, Math.random));
    setDealt(true); setRound(0); setStreak(0); setPicked(null); setAnimate(false); setPhase("ask"); setNewBest(false); setShareMsg("");
    if (host.current && host.current.getBoundingClientRect().top < 0) host.current.scrollIntoView({ block: "start" });
  }, [pairs]);

  // after an answer, move focus to the next step, so keyboard and screen reader users carry on from there
  // on a phone the two lots are stacked, so bring the answer and the next button into view
  useEffect(() => {
    if (phase === "ask") return;
    if (nextBtn.current) nextBtn.current.focus({ preventScroll: true });
    if (after.current && window.innerWidth < 760) {
      const box = after.current.getBoundingClientRect();
      if (box.bottom > window.innerHeight) after.current.scrollIntoView({ block: "end", behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }, [phase]);

  // keys: left arrow or 1 for the left lot, right arrow or 2 for the right lot
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !pair) return;
      const tag = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (phase === "ask" && (e.key === "ArrowLeft" || e.key === "1")) { e.preventDefault(); pick(pair[0]); }
      else if (phase === "ask" && (e.key === "ArrowRight" || e.key === "2")) { e.preventDefault(); pick(pair[1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pair, pick]);

  const share = useCallback(() => {
    const url = location.origin + location.pathname;
    const text = streak === 1
      ? "I called 1 auction result right on Higher or lower at Global Art Monitor. Can you beat it?"
      : "I called " + streak + " auction results in a row on Higher or lower at Global Art Monitor. Can you beat it?";
    if (navigator.share) { navigator.share({ title: "Higher or lower", text, url }).catch(() => {}); return; }
    const full = text + " " + url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(() => setShareMsg("Copied. Paste it wherever you like."), () => setShareMsg(full));
    } else setShareMsg(full);
  }, [streak]);

  if (!pair) return <p className="note">No lots to compare yet.</p>;

  const a = pair[0], b = pair[1];
  const ratio = higher.ham / lower.ham;
  const them = lower.an === higher.an ? "the other " + lower.an : lower.an + "'s";
  const gap = ratio < 1.05
    ? higher.an + "'s lot made a little more than " + them + "."
    : higher.an + "'s lot made " + times(ratio) + " the hammer price of " + them + ".";

  let verdict = null;
  if (phase === "right" || phase === "done") verdict = <p className="hol-verdict is-right"><b>Right.</b> {gap}</p>;
  if (phase === "wrong") verdict = <p className="hol-verdict is-wrong">{streak ? <b>Not this time.</b> : null}{streak ? " " : ""}{gap}</p>;

  return (
    <div className="hol" ref={host}>
      <div className="hol-bar">
        <div className="hol-stat">
          <span>Run</span>
          <b key={"s" + streak} className={streak ? "bump" : ""}>{streak}</b>
        </div>
        <div className="hol-stat">
          <span>Best</span>
          <b>{best}</b>
        </div>
        <p className="hol-fair">
          <span>{curLabel(a.c)}</span>
          <span>{KIND_PAIR[a.k]}</span>
          <span>{a.hb === "calc" ? "Both hammer prices worked back by us" : "Both hammer prices published"}</span>
        </p>
      </div>

      <h2 className="hol-q" aria-live="polite">{phase === "ask" ? "Which one made the higher hammer price?" : phase === "wrong" ? (streak ? "Your run ends at " + streak + "." : "Not this one.") : phase === "done" ? "You have been through every pair we have." : "Keep going."}</h2>

      <div className={"hol-pair" + (phase === "ask" ? "" : " is-shown") + (round > 0 || dealt ? " is-dealt" : "")} key={"r" + round + "-" + order.length}>
        <LotCard r={a} side="a" phase={phase} picked={picked} higher={higher} onPick={pick} animate={animate} />
        <div className="hol-or" aria-hidden="true">or</div>
        <LotCard r={b} side="b" phase={phase} picked={picked} higher={higher} onPick={pick} animate={animate} />
      </div>

      {phase === "ask" ? (
        <p className="hol-hint">Tap a lot to choose it. On a keyboard, use the left and right arrows.</p>
      ) : (
        <div className="hol-after" role="status" ref={after}>
          {verdict}
          {newBest && phase !== "right" ? <p className="hol-best">That is your best run so far.</p> : null}
          {a.k === "edition" ? <p className="hol-note">These are prints or editions, so compare them only with other prints and editions, not with unique works.</p> : null}
          <div className="hol-acts">
            {phase === "right" ? (
              <button ref={nextBtn} type="button" className="pill pill-mint pill-small" onClick={next}>Next pair</button>
            ) : (
              <button ref={nextBtn} type="button" className="pill pill-mint pill-small" onClick={again}>Play again</button>
            )}
            {streak > 0 && phase !== "right" ? (
              <button type="button" className="pill pill-blush pill-small" onClick={share}>Share my run</button>
            ) : null}
          </div>
          {shareMsg ? <p className="hol-shared">{shareMsg}</p> : null}
        </div>
      )}
      <p className="hol-count">Pair {Math.min(round + 1, order.length)} of {order.length}</p>
    </div>
  );
}

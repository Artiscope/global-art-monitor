/* Global Art Monitor: Guess the hammer price.
   The lots come from the page itself (a JSON block written by assets/render.js from data/sales.json),
   so every answer matches the auction results table. Rules kept here:
   - the reader guesses the hammer price, and the answer shows hammer and premium apart;
   - every price stays in the currency of its sale, with no conversion;
   - each lot is scored against its own result only, and its type (unique work or edition) is shown before the guess;
   - scores stay in this browser. Nothing is sent anywhere. */
(function () {
  'use strict';

  var host = document.querySelector('[data-gp]');
  if (!host) return;
  var LOTS = [];
  try { LOTS = JSON.parse((document.getElementById(host.getAttribute('data-src')) || {}).textContent || '[]'); } catch (e) { LOTS = []; }
  if (!LOTS.length) return;

  var SYMBOL = { GBP: '£', USD: 'US$', EUR: '€', HKD: 'HK$', CHF: 'CHF ', CNY: 'CN¥', DKK: 'DKK ', KRW: '₩', INR: '₹', ZAR: 'R', JPY: 'JP¥' };
  var CUR_NAME = { GBP: 'pounds', USD: 'US dollars', EUR: 'euros', HKD: 'Hong Kong dollars', KRW: 'Korean won', ZAR: 'South African rand', INR: 'Indian rupees',
    CHF: 'Swiss francs', CNY: 'Chinese yuan', DKK: 'Danish kroner', JPY: 'Japanese yen' };
  // The slider covers a wide spread in each currency, so its ends give nothing away.
  var RANGE = { KRW: [1e6, 1e12], INR: [1e4, 1e10], JPY: [1e4, 1e11], ZAR: [1e3, 1e10], HKD: [1e3, 3e9], CNY: [1e3, 3e9], DKK: [1e3, 3e9] };
  var KIND = { unique: 'Unique work', edition: 'Print, multiple or edition', unstated: 'Type not stated' };
  var KIND_NOTE = {
    unique: 'One of a kind, as the house described it.',
    edition: 'One of several made. Prints and editions usually sell for far less than unique works by the same artist.',
    unstated: 'The house description does not settle whether this is unique or one of an edition.'
  };
  var CHECK = { house: 'Checked on the house page', press: 'From press or a sales database' };
  var LAUNCH = Date.UTC(2026, 10, 27); // lot No. 1
  var KEY = 'gam-gp-v1';

  function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function money(n, c) { return (SYMBOL[c] || (c + ' ')) + commas(n); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function curLabel(c) { return CUR_NAME[c] ? CUR_NAME[c] + ' (' + c + ')' : c; }
  function range(c) { return RANGE[c] || [100, 3e8]; }

  // Today's date in London, so every reader gets the same lot on the same day.
  function londonToday() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return o.year + '-' + o.month + '-' + o.day;
    } catch (e) { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  }
  function dayNumber(iso) { var p = iso.split('-'); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - LAUNCH) / 864e5); }

  // A fixed shuffle of the lots, the same for everyone, so the daily lot does not repeat until all have been shown.
  function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var ORDER = LOTS.slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  (function () { var r = seeded(20261127); for (var i = ORDER.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = ORDER[i]; ORDER[i] = ORDER[j]; ORDER[j] = t; } })();

  var today = londonToday(), dayNo = dayNumber(today), lotNo = dayNo + 1;
  var daily = ORDER[((dayNo % ORDER.length) + ORDER.length) % ORDER.length];

  // ----- the reader's own record, kept only in this browser -----
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private window: the game still works */ } }
  var store = load(); store.days = store.days || {};

  function stats() {
    var keys = Object.keys(store.days).sort(), n = keys.length, total = 0;
    keys.forEach(function (k) { total += store.days[k].score; });
    var streak = 0, d = dayNo;
    if (!store.days[today]) d -= 1; // a streak survives until the end of today
    while (true) {
      var iso = new Date(LAUNCH + d * 864e5).toISOString().slice(0, 10);
      if (store.days[iso]) { streak++; d--; } else break;
    }
    return { played: n, avg: n ? Math.round(total / n) : 0, streak: streak };
  }

  // ----- scoring: how far off, in proportion -----
  function score(guess, real) {
    var off = Math.abs(Math.log(guess / real));
    return Math.max(0, Math.round(100 * (1 - off / Math.log(5))));
  }
  function verdict(guess, real) {
    var r = guess / real, pct = Math.round(Math.abs(r - 1) * 100);
    if (pct <= 5) return 'Spot on. You were within ' + Math.max(pct, 1) + '% of the hammer price.';
    if (pct <= 15) return 'Very close. You were ' + pct + '% ' + (r > 1 ? 'over' : 'under') + ' the hammer price.';
    if (r >= 0.65 && r <= 1.35) return 'Close. You were ' + pct + '% ' + (r > 1 ? 'over' : 'under') + ' the hammer price.';
    if (r >= 0.5 && r <= 2) return 'In the right range. You were ' + pct + '% ' + (r > 1 ? 'over' : 'under') + ' the hammer price.';
    if (r > 2) return 'Too high. Your guess was ' + times(r) + ' the hammer price.';
    return 'Too low. The hammer price was ' + times(1 / r) + ' your guess.';
  }
  function times(x) { return x < 10 ? (Math.round(x * 10) / 10) + ' times' : 'about ' + commas(x < 100 ? Math.round(x) : Math.round(x / 10) * 10) + ' times'; }
  function offText(guess, real) { var pct = Math.round(Math.abs(guess / real - 1) * 100); return pct <= 1 ? 'within 1%' : pct + '% ' + (guess > real ? 'over' : 'under'); }

  function estimateText(r) {
    if (!r.el) return 'The house did not publish an estimate.';
    var e = 'Estimate ' + money(r.el, r.c) + (r.eh ? ' to ' + commas(r.eh) : '') + '. ';
    if (r.eh && r.ham > r.eh) return e + 'The hammer fell above the high estimate.';
    if (r.ham < r.el) return e + 'The hammer fell below the low estimate.';
    if (r.eh) return e + 'The hammer fell within the estimate.';
    return e;
  }

  // ----- drawing -----
  var mode = 'daily', current = daily, practiceSeen = {};

  function lotCard(r, label) {
    var bits = [];
    bits.push('<p class="gp-k">' + esc(label) + '</p>');
    bits.push('<h2 class="gp-artist">' + esc(r.an) + '</h2>');
    if (r.al) bits.push('<p class="gp-line">' + esc(r.al) + '</p>');
    bits.push('<p class="gp-title"><i>' + esc(r.t) + '</i>' + (r.y ? ', ' + esc(r.y) : '') + '</p>');
    bits.push('<p class="gp-kind gp-kind-' + r.k + '"><span>' + KIND[r.k] + '</span>' + KIND_NOTE[r.k] + '</p>');
    bits.push('<dl class="gp-facts">' +
      '<div><dt>Medium</dt><dd>' + (r.m ? esc(r.m) : 'To confirm') + '</dd></div>' +
      '<div><dt>Sold at</dt><dd>' + esc(r.h) + (r.sl ? '<span>' + esc(r.sl) + '</span>' : '') + '</dd></div>' +
      '<div><dt>Sale date</dt><dd>' + esc(r.dt || r.d) + (r.lot ? '<span>Lot ' + esc(r.lot) + '</span>' : '') + '</dd></div>' +
      '<div><dt>Currency</dt><dd>' + esc(curLabel(r.c)) + '</dd></div>' +
      '</dl>');
    return bits.join('');
  }

  function draw() {
    host.innerHTML = '';
    var r = current, done = mode === 'daily' ? store.days[today] : null;
    var wrap = h('div', 'gp-wrap');
    var left = h('div', 'gp-lot', lotCard(r, mode === 'daily' ? 'Lot of the day, No. ' + lotNo : 'Practice lot. This one does not count towards your score'));
    var right = h('div', 'gp-play');
    wrap.appendChild(left); wrap.appendChild(right);
    host.appendChild(wrap);
    if (done && done.id === r.id) { answer(right, r, done.guess, true); return; }
    ask(right, r);
  }

  function ask(box, r) {
    var lo = range(r.c)[0], hi = range(r.c)[1];
    var start = Math.sqrt(lo * hi);
    box.innerHTML = '<h3 class="gp-q">What was the hammer price?</h3>' +
      '<p class="gp-help">The hammer price is the winning bid, before the buyer\'s premium is added. Guess in ' + esc(curLabel(r.c)) + ', the currency the lot was sold in. The estimate is hidden until you answer.</p>';
    var form = h('form', 'gp-form'); form.setAttribute('novalidate', '');
    var id = 'gp-in-' + r.id;
    form.innerHTML = '<label class="gp-label" for="' + id + '">Your guess</label>' +
      '<div class="gp-field"><span class="gp-sym" aria-hidden="true">' + esc((SYMBOL[r.c] || r.c + ' ').trim()) + '</span><input id="' + id + '" class="gp-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Type a figure"></div>' +
      '<input class="gp-range" type="range" min="0" max="1000" step="1" aria-label="Or slide to set your guess">' +
      '<div class="gp-ends" aria-hidden="true"><span>' + money(lo, r.c) + '</span><span>' + money(hi, r.c) + '</span></div>' +
      '<p class="gp-err" role="alert" hidden></p>' +
      '<button class="pill pill-mint gp-go" type="submit">Lock in my guess</button>';
    box.appendChild(form);
    var input = form.querySelector('.gp-input'), slider = form.querySelector('.gp-range'), err = form.querySelector('.gp-err');
    function fromSlider(v) { var x = Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * v / 1000); var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / p) * p; }
    function toSlider(x) { return Math.round(1000 * (Math.log(Math.min(Math.max(x, lo), hi)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))); }
    function read() { var n = Number(String(input.value).replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? n : 0; }
    slider.value = toSlider(start);
    slider.addEventListener('input', function () { input.value = commas(fromSlider(+slider.value)); err.hidden = true; });
    input.addEventListener('input', function () { var n = read(); if (n) slider.value = toSlider(n); err.hidden = true; });
    input.addEventListener('blur', function () { var n = read(); if (n) input.value = commas(n); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = read();
      if (!g) { err.textContent = 'Type a figure, or use the slider.'; err.hidden = false; input.focus(); return; }
      if (mode === 'daily') { store.days[today] = { id: r.id, guess: g, score: score(g, r.ham) }; save(store); }
      answer(box, r, g, false);
    });
  }

  function answer(box, r, g, again) {
    var sc = score(g, r.ham);
    var ham = '<div class="gp-fig gp-fig-ham"><span>Hammer price</span><b>' + money(r.ham, r.c) + '</b>' +
      (r.hb === 'calc' ? '<em>Our calculation. The house published the total, and we took off the buyer\'s premium at the rates it published for this sale.</em>' : '<em>As published.</em>') + '</div>';
    var prem = '<div class="gp-fig gp-fig-prem"><span>With buyer\'s premium</span><b>' + (r.pr ? money(r.pr, r.c) : 'To confirm') + '</b>' +
      (r.pr ? (r.pb === 'calc' ? '<em>Our calculation, from the hammer price and the house\'s published rates.</em>' : '<em>What the buyer paid the house, as published.</em>') : '') + '</div>';
    box.innerHTML = '<p class="gp-k">' + (again ? 'You have played today\'s lot' : 'The result') + '</p>' +
      '<div class="gp-score"><b>' + sc + '</b><span>out of 100</span></div>' +
      '<p class="gp-verdict">' + esc(verdict(g, r.ham)) + '</p>' +
      '<p class="gp-yours">Your guess: ' + money(g, r.c) + '</p>' +
      '<div class="gp-figs">' + ham + prem + '</div>' +
      '<p class="gp-est">' + esc(estimateText(r)) + '</p>' +
      '<p class="gp-src"><span class="px-chk px-chk-' + r.chk + '">' + CHECK[r.chk] + '</span> <a class="text-link" href="' + esc(r.srcu) + '" rel="noopener">Source: ' + esc(r.src) + '</a></p>' +
      (r.k === 'edition' ? '<p class="gp-note">This was one of an edition. Compare it only with other prints and editions, not with unique works.</p>' : '');
    var acts = h('div', 'gp-acts');
    if (mode === 'daily') {
      var share = h('button', 'pill pill-mint pill-small', 'Share my score'); share.type = 'button';
      share.addEventListener('click', function () { doShare(sc, g, r, share); });
      acts.appendChild(share);
    }
    var more = h('button', 'pill pill-blush pill-small', mode === 'daily' ? 'Practise with another lot' : 'Try another practice lot'); more.type = 'button';
    more.addEventListener('click', practice);
    acts.appendChild(more);
    if (mode !== 'daily') {
      var back = h('button', 'pill pill-ink pill-small', 'Back to today\'s lot'); back.type = 'button';
      back.addEventListener('click', function () { mode = 'daily'; current = daily; draw(); host.scrollIntoView({ block: 'start' }); });
      acts.appendChild(back);
    }
    box.appendChild(acts);
    var msg = h('p', 'gp-shared'); msg.setAttribute('role', 'status'); box.appendChild(msg);
    if (mode === 'daily') {
      var st = stats();
      box.appendChild(h('dl', 'gp-stats', '<div><dt>Days played</dt><dd>' + st.played + '</dd></div><div><dt>Average score</dt><dd>' + st.avg + '</dd></div><div><dt>Days in a row</dt><dd>' + st.streak + '</dd></div>'));
      box.appendChild(h('p', 'gp-next', 'A new lot appears at midnight, London time.'));
    }
    if (!again) { var b = box.querySelector('.gp-score'); if (b) b.classList.add('in'); }
  }

  function practice() {
    mode = 'practice';
    practiceSeen[current.id] = 1;
    var pool = LOTS.filter(function (x) { return x.id !== daily.id && !practiceSeen[x.id]; });
    if (!pool.length) { practiceSeen = {}; pool = LOTS.filter(function (x) { return x.id !== daily.id && x.id !== current.id; }); }
    current = pool[Math.floor(Math.random() * pool.length)] || daily;
    draw();
    host.scrollIntoView({ block: 'start' });
  }

  function doShare(sc, g, r, btn) {
    var url = location.origin + location.pathname;
    var text = 'Guess the hammer price, No. ' + lotNo + ': ' + sc + ' out of 100 (' + offText(g, r.ham) + '). Global Art Monitor';
    var msg = btn.parentNode.parentNode.querySelector('.gp-shared');
    function said(t) { if (msg) msg.textContent = t; }
    if (navigator.share) { navigator.share({ title: 'Guess the hammer price', text: text, url: url }).catch(function () { }); return; }
    var full = text + ' ' + url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(function () { said('Copied. Paste it wherever you like.'); }, function () { said(full); });
    } else said(full);
  }

  draw();
})();

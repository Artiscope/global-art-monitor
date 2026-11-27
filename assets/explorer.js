/* Global Art Monitor: the price charts, the artist comparison and the results finder.
   The figures come from the page itself (a JSON block written by assets/render.js from
   data/sales.json), so the charts always match the tables. Rules kept here:
   - every price stays in the currency of its sale, and each chart shows one currency;
   - unique works, editions and lots of unstated type are never on the same chart;
   - dots are never joined up, and small numbers of sales are called small. */
(function () {
  'use strict';

  var SYMBOL = { GBP: '£', USD: 'US$', EUR: '€', HKD: 'HK$', AUD: 'A$', CAD: 'C$', SGD: 'S$', NZD: 'NZ$', JPY: 'JP¥', CNY: 'CN¥' };
  var CUR_NAME = { GBP: 'pounds', USD: 'US dollars', EUR: 'euros', HKD: 'Hong Kong dollars', KRW: 'Korean won', ZAR: 'South African rand', INR: 'Indian rupees',
    CHF: 'Swiss francs', CNY: 'Chinese yuan', DKK: 'Danish kroner', JPY: 'Japanese yen', AUD: 'Australian dollars', CAD: 'Canadian dollars', SGD: 'Singapore dollars' };
  var KIND = { unique: ['Unique works', 'unique work', 'unique works'], edition: ['Prints and editions', 'print, multiple or edition', 'prints, multiples and editions'], unstated: ['Type not stated', 'lot of unstated type', 'lots of unstated type'] };
  var KIND1 = { unique: 'Unique work', edition: 'Print, multiple or edition', unstated: 'Type not stated' };
  var CHECK = { house: 'Checked on the house page', press: 'From press or a sales database', unchecked: 'House page not yet checked' };
  var NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SVGNS = 'http://www.w3.org/2000/svg';
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function money(n, c) { return (SYMBOL[c] || (c + ' ')) + commas(n); }
  function short(n, c) {
    var v = n, u = '';
    if (n >= 1e9) { v = n / 1e9; u = 'bn'; } else if (n >= 1e6) { v = n / 1e6; u = 'm'; } else if (n >= 1e3) { v = n / 1e3; u = 'k'; }
    var t = v >= 100 || v === Math.round(v) ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
    return (SYMBOL[c] || (c + ' ')) + t + u;
  }
  function count(n, one, many) { return (n < 10 ? NUM[n] : String(n)) + ' ' + (n === 1 ? one : many); }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function s(tag, attrs) { var e = document.createElementNS(SVGNS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }
  function day(d) { var p = String(d).split('-'); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function root() { var a = document.querySelector('link[rel="stylesheet"][href$="assets/site.css"]'); return a ? a.getAttribute('href').replace(/assets\/site\.css$/, '') : '/'; }
  function data(id) { var el = document.getElementById(id); if (!el) return []; try { return JSON.parse(el.textContent); } catch (e) { return []; } }
  function by(rows, f) { var o = {}; rows.forEach(function (r) { var k = f(r); (o[k] = o[k] || []).push(r); }); return o; }
  function curLabel(c) { return CUR_NAME[c] ? CUR_NAME[c] + ' (' + c + ')' : c; }

  // What the plotted figure is, in words.
  function basisText(r) {
    if (r.vf === 'ma') return r.vb === 'premium' ? 'with premium, from the MutualArt sale record' : r.vb === 'hammer' ? 'hammer price, from the MutualArt sale record' : 'from the MutualArt sale record, which does not say whether premium is included';
    if (r.vb === 'premium') return 'with buyer’s premium' + (r.vf === 'calc' ? ', by our calculation' : '');
    return 'hammer price' + (r.vf === 'calc' ? ', by our calculation' : '') + '. The price with premium is still to confirm';
  }
  function estimateText(r) {
    if (!r.el) return 'No estimate published';
    var e = 'Estimate ' + money(r.el, r.c) + (r.eh ? ' to ' + commas(r.eh) : '');
    if (r.ham && r.eh && r.ham > r.eh) return e + '. The hammer price was above the high estimate.';
    if (r.ham && r.ham < r.el) return e + '. The hammer price was below the low estimate.';
    if (r.ham && r.eh) return e + '. The hammer price fell within the estimate.';
    return e + '.';
  }
  function trendNote(n, kindMany, cur) {
    var head = count(n, KIND[kindMany][1], KIND[kindMany][2]) + ' with a known price in ' + curLabel(cur) + '. ';
    if (n === 0) return 'No priced ' + KIND[kindMany][2] + ' in ' + curLabel(cur) + ' yet. ';
    if (n <= 2) return head + (n === 1 ? 'One sale is a single data point, not a pattern.' : 'Two sales are too few to describe a trend.');
    if (n < 6) return head + 'That is a small number of sales, so read each dot on its own.';
    return head + 'Each dot is a different work, so the spread shows the range of documented prices, not a direction.';
  }

  // ---------- the chart ----------
  // host: an empty element. rows: sales of one or two artists. series: [{a, name, cls}].
  function Chart(host, rows, series, opt) {
    opt = opt || {};
    var state = { cur: null, kind: null, scale: 'auto', pick: null };
    host.innerHTML = '';
    var controls = h('div', 'px-controls');
    var curBox = h('div', 'px-tabs'); curBox.setAttribute('role', 'group'); curBox.setAttribute('aria-label', 'Currency of sale');
    var kindBox = h('div', 'px-tabs px-kinds'); kindBox.setAttribute('role', 'group'); kindBox.setAttribute('aria-label', 'Type of work');
    var scaleBox = h('div', 'px-scale'); scaleBox.setAttribute('role', 'group'); scaleBox.setAttribute('aria-label', 'Price scale');
    controls.appendChild(curBox); controls.appendChild(kindBox); controls.appendChild(scaleBox);
    var fig = h('figure', 'px-fig');
    var plot = h('div', 'px-plot');
    var legend = h('figcaption', 'px-legend');
    fig.appendChild(plot); fig.appendChild(legend);
    var note = h('p', 'px-note'); note.setAttribute('role', 'status');
    var card = h('div', 'px-card'); card.setAttribute('aria-live', 'polite');
    var wrap = h('div', 'px-body');
    var left = h('div', 'px-main'); left.appendChild(fig); left.appendChild(note);
    wrap.appendChild(left); wrap.appendChild(card);
    host.appendChild(controls); host.appendChild(wrap);

    var dated = rows.filter(function (r) { return r.d && r.c; });
    var curs = by(dated, function (r) { return r.c; });
    var curList = Object.keys(curs).sort(function (a, b) {
      var pa = curs[a].filter(function (r) { return r.v; }).length, pb = curs[b].filter(function (r) { return r.v; }).length;
      return pb - pa || curs[b].length - curs[a].length || (a < b ? -1 : 1);
    });
    if (opt.only) curList = curList.filter(function (c) { return opt.only.indexOf(c) >= 0; });

    function tab(box, label, on, fn, sub) {
      var b = h('button', 'px-tab' + (on ? ' on' : ''), esc(label) + (sub != null ? '<span>' + esc(sub) + '</span>' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', fn); box.appendChild(b); return b;
    }
    function kindsIn(cur) {
      var k = by(curs[cur] || [], function (r) { return r.k; });
      return ['unique', 'edition', 'unstated'].filter(function (x) { return k[x]; }).map(function (x) { return [x, k[x]]; });
    }
    function bestKind(cur) {
      var ks = kindsIn(cur), best = null;
      ks.forEach(function (x) { var p = x[1].filter(function (r) { return r.v; }).length; if (!best || p > best[1]) best = [x[0], p]; });
      return best ? best[0] : 'unique';
    }
    function drawControls() {
      curBox.innerHTML = ''; kindBox.innerHTML = ''; scaleBox.innerHTML = '';
      if (curList.length > 1 || !opt.compact) curList.forEach(function (c) {
        tab(curBox, c, c === state.cur, function () { state.cur = c; state.kind = bestKind(c); state.pick = null; state.scale = 'auto'; update(); }, (SYMBOL[c] || '').trim() || null);
      });
      kindsIn(state.cur).forEach(function (x) {
        tab(kindBox, KIND[x[0]][0], x[0] === state.kind, function () { state.kind = x[0]; state.pick = null; state.scale = 'auto'; update(); }, String(x[1].length));
      });
      tab(scaleBox, 'Even', state.eff === 'lin', function () { state.scale = 'lin'; update(); });
      tab(scaleBox, 'Log', state.eff === 'log', function () { state.scale = 'log'; update(); });
      scaleBox.hidden = state.priced < 2;
    }

    var pts = [], drawn = false;
    function draw() {
      var all = (curs[state.cur] || []).filter(function (r) { return r.k === state.kind; });
      var pr = all.filter(function (r) { return r.v; }), none = all.filter(function (r) { return !r.v; });
      state.priced = pr.length;
      var W = Math.max(280, plot.clientWidth || 600), small = W < 560;
      var H = opt.compact ? (small ? 250 : 300) : (small ? 300 : 380);
      var m = { l: small ? 52 : 70, r: small ? 12 : 22, t: 18, b: none.length ? 52 : 38 };
      var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'group', 'aria-label': 'Chart of ' + pr.length + ' priced sales in ' + curLabel(state.cur) + '. Use the arrow keys to move between sales.' });
      // time axis
      var ds = all.map(function (r) { return day(r.d); }), x0 = Math.min.apply(null, ds), x1 = Math.max.apply(null, ds);
      var span = Math.max(x1 - x0, 1), pad = Math.max(span * 0.08, Math.min(45 * 864e5, span * 0.5 + 10 * 864e5));
      x0 -= pad; x1 += pad;
      var X = function (t) { return m.l + (t - x0) / (x1 - x0) * (W - m.l - m.r); };
      // price axis, never mixing currencies
      var vals = []; pr.forEach(function (r) { vals.push(r.v); if (r.el) vals.push(r.el); if (r.eh) vals.push(r.eh); });
      var lo = vals.length ? Math.min.apply(null, vals) : 1, hi = vals.length ? Math.max.apply(null, vals) : 10;
      var eff = state.scale === 'auto' ? (hi / Math.max(lo, 1) >= 15 ? 'log' : 'lin') : state.scale;
      state.eff = eff;
      var y0, y1, Y, ticks = [];
      var bottom = H - m.b;
      if (eff === 'log') {
        y0 = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1)) * 2) / 2); y1 = Math.pow(10, Math.ceil(Math.log10(hi) * 2) / 2);
        if (y1 <= y0) y1 = y0 * 10;
        Y = function (v) { return bottom - (Math.log10(v) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0)) * (bottom - m.t); };
        for (var e = Math.floor(Math.log10(y0)); e <= Math.ceil(Math.log10(y1)); e++) [1, 2, 5].forEach(function (k) { var v = k * Math.pow(10, e); if (v >= y0 * 0.999 && v <= y1 * 1.001) ticks.push(v); });
        if (ticks.length > 7) ticks = ticks.filter(function (v) { return String(v).charAt(0) === '1'; });
      } else {
        var step = Math.pow(10, Math.floor(Math.log10(hi || 1))), top = Math.ceil(hi * 1.08 / step) * step;
        if (top / step < 3) { step /= 2; } if (top / step > 7) step *= 2;
        y0 = 0; y1 = top || 1;
        Y = function (v) { return bottom - (v - y0) / (y1 - y0) * (bottom - m.t); };
        for (var v = 0; v <= y1 + 1e-9; v += step) ticks.push(v);
      }
      ticks.forEach(function (v) {
        var y = Y(v);
        svg.appendChild(s('line', { x1: m.l - 8, x2: m.l - 2, y1: y, y2: y, class: 'px-tick' }));
        var t = s('text', { x: m.l - 12, y: y + 4, 'text-anchor': 'end', class: 'px-axis' }); t.textContent = short(v, state.cur); svg.appendChild(t);
      });
      // years, or months when the sales are close together
      var months = (x1 - x0) < 500 * 864e5, d0 = new Date(x0), d1 = new Date(x1), xt = [];
      if (months) { for (var mm = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); mm < d1; mm = new Date(Date.UTC(mm.getUTCFullYear(), mm.getUTCMonth() + (small ? 3 : 2), 1))) xt.push([mm.getTime(), MONTHS[mm.getUTCMonth()] + (mm.getUTCMonth() < (small ? 3 : 2) ? ' ' + mm.getUTCFullYear() : '')]); }
      else { var yStep = (d1.getUTCFullYear() - d0.getUTCFullYear()) > (small ? 5 : 9) ? 2 : 1; for (var yy = d0.getUTCFullYear() + 1; yy <= d1.getUTCFullYear(); yy += yStep) xt.push([Date.UTC(yy, 0, 1), String(yy)]); }
      if (xt.length < 2) { var fmt = function (t) { var d = new Date(t); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }; xt = [[Math.min.apply(null, ds), fmt(Math.min.apply(null, ds))]]; if (Math.max.apply(null, ds) - Math.min.apply(null, ds) > 6 * 864e5) xt.push([Math.max.apply(null, ds), fmt(Math.max.apply(null, ds))]); }
      xt.forEach(function (x) {
        var t = s('text', { x: X(x[0]), y: H - 10, 'text-anchor': 'middle', class: 'px-axis' }); t.textContent = x[1]; svg.appendChild(t);
      });
      // lots with no confirmed price, as small marks along the foot
      none.forEach(function (r) {
        var g = s('g', { class: 'px-none', tabindex: '-1' });
        var x = X(day(r.d));
        g.appendChild(s('line', { x1: x, x2: x, y1: bottom + 8, y2: bottom + 18 }));
        var tt = s('title', {}); tt.textContent = r.t + ', ' + r.dt + ': price to confirm'; g.appendChild(tt);
        svg.appendChild(g);
      });
      if (none.length) { var nl = s('text', { x: m.l, y: bottom + 32, class: 'px-axis px-none-l' }); nl.textContent = none.length + ' to confirm'; if (!small) svg.appendChild(nl); }
      // one dot per sale, nudged apart when sales share a day
      var idx = 0, placed = [];
      pts = [];
      pr.slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; }).forEach(function (r) {
        var x = X(day(r.d)), y = Y(r.v), tries = 0;
        // dots that would sit on top of each other are moved sideways, alternately right and left
        while (tries < 8 && placed.some(function (q) { return Math.abs(q[0] - x) < 15 && Math.abs(q[1] - y) < 15; })) { tries++; x = X(day(r.d)) + Math.ceil(tries / 2) * 15 * (tries % 2 ? 1 : -1); }
        placed.push([x, y]);
        var ser = series.length > 1 ? series.filter(function (q) { return q.a === r.a; })[0] : series[0];
        var g = s('g', { class: 'px-pt ' + (ser ? ser.cls : 's0') + ' f-' + (r.vf === 'ma' ? 'ma' : r.vb === 'hammer' ? 'ham' : 'prem'), tabindex: '0', role: 'button', style: '--i:' + (idx++) });
        g.setAttribute('aria-label', (series.length > 1 ? r.an + ', ' : '') + r.t + ', ' + r.dt + ', ' + money(r.v, r.c) + ' ' + basisText(r).split('.')[0]);
        if (r.el) g.appendChild(s('line', { class: 'px-est', x1: x, x2: x, y1: Y(Math.max(r.el, y0 || r.el)), y2: Y(r.eh || r.el) - (r.eh ? 0 : 3) }));
        g.appendChild(s('circle', { class: 'px-hit', cx: x, cy: y, r: 16 }));
        g.appendChild(s('circle', { class: 'px-dot', cx: x, cy: y, r: opt.compact && small ? 6 : 7 }));
        svg.appendChild(g);
        var p = { r: r, g: g };
        pts.push(p);
        g.addEventListener('mouseenter', function () { select(p, false); });
        g.addEventListener('focus', function () { select(p, false); });
        g.addEventListener('click', function () { select(p, true); });
        g.addEventListener('keydown', function (e) {
          var i = pts.indexOf(p), j = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? i - 1 : -2;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p, true); }
          if (j > -2 && pts[j]) { e.preventDefault(); pts[j].g.focus(); }
        });
      });
      plot.innerHTML = ''; plot.appendChild(svg);
      if (!drawn && !still) { svg.classList.add('grow'); requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.remove('grow'); }); }); }
      drawn = true;
      var split = series.length > 1 ? ' ' + series.map(function (q) { var n = pr.filter(function (r) { return r.a === q.a; }).length; return count(n, '', '').trim() + ' by ' + q.name; }).join(' and ') + '.' : '';
      note.textContent = trendNote(pr.length, state.kind, state.cur) + split + (none.length ? ' ' + count(none.length, 'more lot', 'more lots') + ' in this group still ' + (none.length === 1 ? 'has' : 'have') + ' no confirmed price.' : '');
      var keep = state.pick && pts.filter(function (p) { return p.r.id === state.pick; })[0];
      select(keep || pts[pts.length - 1] || null, false);
    }
    function select(p, pinned) {
      pts.forEach(function (q) { q.g.classList.toggle('on', q === p); });
      if (!p) { card.innerHTML = '<p class="px-card-empty">' + 'Nothing priced to show here yet. The table on this page lists every lot, priced or not.' + '</p>'; return; }
      state.pick = p.r.id;
      var r = p.r, base = root();
      card.innerHTML = '<p class="px-card-k">' + esc(series.length > 1 ? r.an + ', ' + lower(KIND1[r.k]) : KIND1[r.k]) + '</p>' +
        '<h3>' + esc(r.t) + (r.y ? ' <span>(' + esc(r.y) + ')</span>' : '') + '</h3>' +
        '<p class="px-card-v">' + money(r.v, r.c) + '</p><p class="px-card-b">' + esc(basisText(r)) + '.</p>' +
        '<dl><div><dt>Sale</dt><dd>' + esc(r.h) + ', ' + esc(r.dt) + (r.lot ? ', lot ' + esc(r.lot) : '') + (r.sl ? '<span>' + esc(r.sl) + '</span>' : '') + '</dd></div>' +
        '<div><dt>Estimate</dt><dd>' + esc(estimateText(r)) + '</dd></div>' +
        (r.m ? '<div><dt>Medium</dt><dd>' + esc(r.m) + '</dd></div>' : '') +
        '<div><dt>Checked</dt><dd><span class="px-chk px-chk-' + r.chk + '">' + esc(CHECK[r.chk]) + '</span></dd></div></dl>' +
        '<p class="px-card-links"><a class="text-link" href="' + base + 'artists/' + r.a + '/#work-' + encodeURIComponent(r.id) + '">See the sale in full</a>' +
        (r.srcu ? '<a class="text-link" href="' + esc(r.srcu) + '" rel="noopener">' + esc(r.src) + '</a>' : '') + '</p>';
      if (pinned && window.innerWidth < 900) card.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
    }
    function drawLegend() {
      var keys = series.length > 1 ? series.map(function (q) { return '<span><i class="lg-dot ' + q.cls + '"></i>' + esc(q.name) + '</span>'; }).join('') : '';
      legend.innerHTML = keys + '<span><i class="lg-dot f-prem"></i>With premium</span><span><i class="lg-dot f-ham"></i>Hammer price only</span>' +
        '<span><i class="lg-dot f-ma"></i>From MutualArt</span><span><i class="lg-est"></i>Estimate</span><span><i class="lg-none"></i>Price to confirm</span>';
    }
    function update() { draw(); drawControls(); }
    if (!curList.length) { host.innerHTML = '<p class="px-note">No dated sales in a shared currency to chart yet.</p>'; return { destroy: function () {} }; }
    state.cur = curList[0]; state.kind = bestKind(state.cur);
    drawLegend(); update();
    var t, ro = window.ResizeObserver ? new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { draw(); }, 120); }) : null;
    if (ro) ro.observe(plot);
    return { destroy: function () { if (ro) ro.disconnect(); } };
  }

  // ---------- one artist, picked from a menu ----------
  function artistMenu(label, slugs, names, value) {
    var opts = slugs.map(function (k) { return '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + esc(names[k]) + '</option>'; }).join('');
    return '<label class="finder-field"><span>' + esc(label) + '</span><span class="finder-select"><select class="on">' + opts + '</select><i aria-hidden="true">Change</i></span></label>';
  }
  function namesOf(rows) { var n = {}; rows.forEach(function (r) { n[r.a] = r.an; }); return n; }
  function bySurname(slugs, names) { return slugs.slice().sort(function (a, b) { return names[a].localeCompare(names[b], 'en', { sensitivity: 'base' }); }); }
  function hashParam(key) { var m = new RegExp('[#&]' + key + '=([^&]+)').exec(location.hash); return m ? decodeURIComponent(m[1]) : ''; }
  function setHash(key, val) { try { history.replaceState(null, '', '#' + key + '=' + val); } catch (e) {} }

  function setupPick(host, rows) {
    var names = namesOf(rows), slugs = bySurname(host.getAttribute('data-artists').split(' ').filter(function (k) { return names[k]; }), names);
    var start = hashParam('artist'); if (slugs.indexOf(start) < 0) start = slugs.indexOf('banksy') >= 0 ? 'banksy' : slugs[0];
    host.innerHTML = '';
    var bar = h('div', 'finder px-pickbar', artistMenu('Artist', slugs, names, start));
    var again = h('button', 'pill pill-blush pill-small', 'Show another artist'); again.type = 'button';
    bar.appendChild(again);
    var box = h('div', 'px-box'), chart = null;
    host.appendChild(bar); host.appendChild(box);
    var sel = bar.querySelector('select');
    function show(k, write) {
      if (chart) chart.destroy();
      chart = Chart(box, rows.filter(function (r) { return r.a === k; }), [{ a: k, name: names[k], cls: 's0' }]);
      if (write) setHash('artist', k);
    }
    sel.addEventListener('change', function () { show(sel.value, true); });
    again.addEventListener('click', function () { var k; do { k = slugs[Math.floor(Math.random() * slugs.length)]; } while (slugs.length > 1 && k === sel.value); sel.value = k; show(k, true); });
    show(start, false);
    return { set: function (k) { if (slugs.indexOf(k) >= 0) { sel.value = k; show(k, false); } } };
  }

  // ---------- two artists side by side ----------
  function stats(rows) {
    var pr = rows.filter(function (r) { return r.pr; }), ds = rows.filter(function (r) { return r.d; }).map(function (r) { return r.d; }).sort();
    var k = by(rows, function (r) { return r.k; }), houses = Object.keys(by(rows, function (r) { return r.h; }));
    var cur = by(pr, function (r) { return r.c; }), best = Object.keys(cur).sort(function (a, b) { return cur[b].length - cur[a].length; }).slice(0, 3).map(function (c) {
      return cur[c].reduce(function (x, y) { return y.pr > x.pr ? y : x; });
    });
    var first = rows.filter(function (r) { return r.d === ds[0]; })[0], last = rows.filter(function (r) { return r.d === ds[ds.length - 1]; })[0];
    return { n: rows.length, priced: rows.filter(function (r) { return r.v; }).length, uniq: (k.unique || []).length, ed: (k.edition || []).length, un: (k.unstated || []).length,
      houses: houses, best: best, first: first, last: last, checked: rows.filter(function (r) { return r.chk === 'house'; }).length };
  }
  function statCard(slug, name, st, cls) {
    var base = root();
    var bestHtml = st.best.length ? st.best.map(function (b) { return '<li><b>' + money(b.pr, b.c) + '</b><span>' + esc(b.t) + ', ' + esc(b.h) + ', ' + esc(b.dt) + '. ' + esc(KIND1[b.k]) + '.</span></li>'; }).join('')
      : '<li><span>No sale with a confirmed price including premium yet.</span></li>';
    return '<article class="px-stat ' + cls + '"><h3><a href="' + base + 'artists/' + slug + '/">' + esc(name) + '</a></h3>' +
      '<dl class="px-nums"><div><dt>Documented lots</dt><dd>' + st.n + '</dd></div><div><dt>With a known price</dt><dd>' + st.priced + '</dd></div>' +
      '<div><dt>Unique works</dt><dd>' + st.uniq + '</dd></div><div><dt>Prints and editions</dt><dd>' + st.ed + '</dd></div>' +
      '<div><dt>Auction houses</dt><dd>' + st.houses.length + '</dd></div><div><dt>Checked on the house page</dt><dd>' + st.checked + '</dd></div></dl>' +
      '<p class="px-span">' + (st.first ? 'Documented sales run from ' + esc(st.first.dt) + ' to ' + esc(st.last.dt) + '.' : '') + (st.un ? ' ' + count(st.un, 'lot does', 'lots do') + ' not state the type of work.' : '') + '</p>' +
      '<h4>Highest price with premium, by currency</h4><ul class="px-best">' + bestHtml + '</ul></article>';
  }
  function setupCompare(host, rows) {
    var names = namesOf(rows), slugs = bySurname(host.getAttribute('data-artists').split(' ').filter(function (k) { return names[k]; }), names);
    var pair = hashParam('compare').split(','), A = slugs.indexOf(pair[0]) >= 0 ? pair[0] : (slugs.indexOf('banksy') >= 0 ? 'banksy' : slugs[0]);
    var B = slugs.indexOf(pair[1]) >= 0 && pair[1] !== A ? pair[1] : (slugs.indexOf('kaws') >= 0 && A !== 'kaws' ? 'kaws' : slugs.filter(function (k) { return k !== A; })[0]);
    host.innerHTML = '';
    var bar = h('div', 'finder px-pickbar', artistMenu('First artist', slugs, names, A) + artistMenu('Second artist', slugs, names, B));
    var swap = h('button', 'pill pill-blush pill-small', 'Swap'); swap.type = 'button';
    var again = h('button', 'pill pill-blush pill-small', 'Try another pair'); again.type = 'button';
    bar.appendChild(swap); bar.appendChild(again);
    var grid = h('div', 'px-stats'), shared = h('div', 'px-shared'), box = h('div', 'px-box'), chart = null;
    host.appendChild(bar); host.appendChild(grid); host.appendChild(shared); host.appendChild(box);
    var sels = bar.querySelectorAll('select');
    function show(write) {
      var a = sels[0].value, b = sels[1].value;
      if (a === b) { b = slugs.filter(function (k) { return k !== a; })[0]; sels[1].value = b; }
      var ra = rows.filter(function (r) { return r.a === a; }), rb = rows.filter(function (r) { return r.a === b; });
      grid.innerHTML = statCard(a, names[a], stats(ra), 's0') + statCard(b, names[b], stats(rb), 's1');
      var ca = by(ra.filter(function (r) { return r.v; }), function (r) { return r.c; }), cb = by(rb.filter(function (r) { return r.v; }), function (r) { return r.c; });
      var both = Object.keys(ca).filter(function (c) { return cb[c]; });
      if (chart) { chart.destroy(); chart = null; }
      box.innerHTML = '';
      if (both.length) {
        shared.innerHTML = '<h3 class="px-sub">On one chart</h3><p class="px-note">' + esc(names[a]) + ' and ' + esc(names[b]) + ' both have priced sales in ' + both.map(curLabel).join(', ').replace(/, ([^,]*)$/, ' and $1') + '. ' +
          'Pick a currency and a type of work. Each dot is still one sale of one work.</p>';
        chart = Chart(box, ra.concat(rb), [{ a: a, name: names[a], cls: 's0' }, { a: b, name: names[b], cls: 's1' }], { only: both });
      } else {
        var base = root();
        shared.innerHTML = '<h3 class="px-sub">No shared chart</h3><p class="px-note">These two artists have no priced sales in the same currency, so their prices cannot share a scale. We do not convert currencies. ' +
          'You can still look at <a class="text-link" href="#artist=' + a + '" data-show="' + a + '">' + esc(names[a]) + '</a> and <a class="text-link" href="#artist=' + b + '" data-show="' + b + '">' + esc(names[b]) + '</a> one at a time, or <a class="text-link" href="' + base + 'auction-results/">browse the full table</a>.</p>';
      }
      if (write) setHash('compare', a + ',' + b);
    }
    sels.forEach(function (sel) { sel.addEventListener('change', function () { show(true); }); });
    swap.addEventListener('click', function () { var t = sels[0].value; sels[0].value = sels[1].value; sels[1].value = t; show(true); });
    again.addEventListener('click', function () {
      // a pair that shares at least one currency, so the shared chart has something to show
      var tries = 0, a, b, ok = false;
      while (!ok && tries++ < 60) {
        a = slugs[Math.floor(Math.random() * slugs.length)]; b = slugs[Math.floor(Math.random() * slugs.length)];
        if (a === b) continue;
        var ca = {}; rows.forEach(function (r) { if (r.a === a && r.v) ca[r.c] = 1; });
        ok = rows.some(function (r) { return r.a === b && r.v && ca[r.c]; });
      }
      sels[0].value = a; sels[1].value = b; show(true);
    });
    shared.addEventListener('click', function (e) {
      var t = e.target.closest('[data-show]'); if (!t || !window.GAMPick) return;
      e.preventDefault(); window.GAMPick.set(t.getAttribute('data-show')); document.getElementById('history').scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
    });
    show(false);
  }

  // ---------- the auction results finder: filter, sort and share ----------
  function setupFinder(group) {
    var table = document.getElementById(group.getAttribute('data-filter-group'));
    if (!table) return;
    var tbody = table.querySelector('tbody'), rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    rows.forEach(function (tr, i) { tr._i = i; });
    var countEl = document.getElementById(table.id + '-count'), empty = document.getElementById(table.id + '-empty');
    var clear = countEl ? countEl.parentNode.querySelector('[data-clear]') : null;
    var search = group.querySelector('[data-search]'), selects = Array.prototype.slice.call(group.querySelectorAll('select[data-key]'));
    var sortSel = group.querySelector('[data-sort]'), pmin = group.querySelector('[data-price="min"]'), pmax = group.querySelector('[data-price="max"]'), hint = group.querySelector('[data-price-hint]');
    var toggle = group.parentNode.querySelector('.finder-toggle'), activeN = toggle ? toggle.querySelector('[data-active-n]') : null;
    var KEYS = { artist: 'artist', house: 'house', currency: 'cur', kind: 'type', year: 'year', check: 'checked' };
    function mark(sel) { var on = sel.value !== 'all', i = sel.parentNode.querySelector('i'); sel.classList.toggle('on', on); if (i) i.textContent = on ? 'Change' : 'Choose'; }
    function state() {
      var st = { q: (search ? search.value : '').toLowerCase().split(/\s+/).filter(Boolean), sort: sortSel ? sortSel.value : 'newest' };
      selects.forEach(function (sel) { st[sel.getAttribute('data-key')] = sel.value; });
      st.min = pmin && !pmin.disabled && pmin.value !== '' ? +pmin.value : null;
      st.max = pmax && !pmax.disabled && pmax.value !== '' ? +pmax.value : null;
      return st;
    }
    function apply(write) {
      var st = state(), shown = 0, active = 0;
      var oneCur = st.currency && st.currency !== 'all';
      if (pmin) { pmin.disabled = pmax.disabled = !oneCur; if (!oneCur) { pmin.value = pmax.value = ''; st.min = st.max = null; } }
      if (hint) hint.textContent = oneCur ? 'Price with premium where known, otherwise the hammer price, in ' + curLabel(st.currency) + '.' : 'Choose one currency first. Prices in different currencies are never compared.';
      rows.forEach(function (tr) {
        var ok = selects.every(function (sel) { var k = sel.getAttribute('data-key'); return st[k] === 'all' || tr.getAttribute('data-' + k) === st[k]; });
        if (ok && st.q.length) { var t = tr.textContent.toLowerCase(); ok = st.q.every(function (w) { return t.indexOf(w) !== -1; }); }
        var p = tr.getAttribute('data-price');
        if (ok && (st.min != null || st.max != null)) ok = p !== '' && (st.min == null || +p >= st.min) && (st.max == null || +p <= st.max);
        tr.hidden = !ok; if (ok) shown += 1;
      });
      // sort: dates as written, prices only within a currency (the currencies stay grouped, largest group first)
      var curN = {}; rows.forEach(function (tr) { var c = tr.getAttribute('data-currency'); curN[c] = (curN[c] || 0) + (tr.hidden ? 0 : 1); });
      var cmp = {
        newest: function (a, b) { return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '') || a._i - b._i; },
        oldest: function (a, b) { return (a.getAttribute('data-date') || '9999').localeCompare(b.getAttribute('data-date') || '9999') || a._i - b._i; },
        artist: function (a, b) { return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'), 'en', { sensitivity: 'base' }) || a._i - b._i; },
        house: function (a, b) { return a.getAttribute('data-house').localeCompare(b.getAttribute('data-house'), 'en', { sensitivity: 'base' }) || a._i - b._i; }
      };
      function byPrice(dir) {
        return function (a, b) {
          var ca = a.getAttribute('data-currency'), cb = b.getAttribute('data-currency');
          if (ca !== cb) return (curN[cb] - curN[ca]) || ca.localeCompare(cb);
          var pa = a.getAttribute('data-price'), pb = b.getAttribute('data-price');
          if (pa === '' || pb === '') return (pa === '') - (pb === '') || a._i - b._i;
          return dir * (+pb - +pa) || a._i - b._i;
        };
      }
      cmp.high = byPrice(1); cmp.low = byPrice(-1);
      rows.slice().sort(cmp[st.sort] || cmp.newest).forEach(function (tr) { tbody.appendChild(tr); });
      table.setAttribute('data-sorted', st.sort);
      // header buttons follow the menu
      table.querySelectorAll('th[data-sortable]').forEach(function (th) {
        var k = th.getAttribute('data-sortable'), on = (k === 'date' && (st.sort === 'newest' || st.sort === 'oldest')) || (k === 'price' && (st.sort === 'high' || st.sort === 'low'));
        th.setAttribute('aria-sort', on ? (st.sort === 'oldest' || st.sort === 'low' ? 'ascending' : 'descending') : 'none');
      });
      selects.forEach(function (sel) { if (sel.value !== 'all') active++; });
      if (st.q.length) active++; if (st.min != null || st.max != null) active++;
      var filtered = shown !== rows.length;
      if (empty) empty.hidden = shown !== 0;
      if (countEl) {
        var cs = Object.keys(curN).filter(function (c) { return curN[c]; });
        countEl.textContent = (filtered ? 'Showing ' + shown + ' of ' + rows.length + ' lots' : 'Showing all ' + rows.length + ' lots') + (shown ? ', in ' + count2(cs.length) : '') +
          (st.sort === 'high' || st.sort === 'low' ? '. Prices are sorted within each currency' : '') + '.';
      }
      if (clear) clear.hidden = !active && st.sort === 'newest';
      if (activeN) activeN.textContent = active ? ' (' + active + ')' : '';
      if (write) {
        var q = [];
        selects.forEach(function (sel) { if (sel.value !== 'all') q.push(KEYS[sel.getAttribute('data-key')] + '=' + encodeURIComponent(sel.value)); });
        if (search && search.value.trim()) q.push('q=' + encodeURIComponent(search.value.trim()));
        if (st.min != null) q.push('from=' + st.min); if (st.max != null) q.push('to=' + st.max);
        if (st.sort !== 'newest') q.push('sort=' + st.sort);
        try { history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash); } catch (e) {}
      }
    }
    function count2(n) { return n === 1 ? 'one currency' : count(n, 'currency', 'currencies').toLowerCase(); }
    // read a shared link
    var qs = {}; location.search.replace(/^\?/, '').split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) qs[kv[0]] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
    selects.forEach(function (sel) {
      var v = qs[KEYS[sel.getAttribute('data-key')]];
      if (v && sel.querySelector('option[value="' + v.replace(/"/g, '') + '"]')) sel.value = v;
      mark(sel);
      sel.addEventListener('change', function () { mark(sel); apply(true); });
    });
    if (search) { if (qs.q) search.value = qs.q; search.addEventListener('input', function () { apply(true); }); }
    if (sortSel) { if (qs.sort && sortSel.querySelector('option[value="' + qs.sort + '"]')) sortSel.value = qs.sort; sortSel.addEventListener('change', function () { sortSel.classList.toggle('on', sortSel.value !== 'newest'); apply(true); }); sortSel.classList.toggle('on', sortSel.value !== 'newest'); }
    if (pmin) { if (qs.from) pmin.value = qs.from; if (qs.to) pmax.value = qs.to; [pmin, pmax].forEach(function (i) { i.addEventListener('input', function () { apply(true); }); }); }
    if (clear) clear.addEventListener('click', function () {
      selects.forEach(function (sel) { sel.value = 'all'; mark(sel); });
      if (search) search.value = ''; if (pmin) pmin.value = pmax.value = '';
      if (sortSel) { sortSel.value = 'newest'; sortSel.classList.remove('on'); }
      apply(true);
    });
    // sortable column headings: sale date and price with premium
    var ths = table.querySelectorAll('thead th');
    [[0, 'date', 'newest', 'oldest'], [5, 'price', 'high', 'low']].forEach(function (c) {
      var th = ths[c[0]]; if (!th || !sortSel) return;
      th.setAttribute('data-sortable', c[1]);
      var b = h('button', 'th-sort', th.innerHTML); b.type = 'button';
      th.innerHTML = ''; th.appendChild(b);
      b.addEventListener('click', function () { sortSel.value = sortSel.value === c[2] ? c[3] : c[2]; sortSel.classList.toggle('on', sortSel.value !== 'newest'); apply(true); });
    });
    // phones: the menus fold away behind one button
    if (toggle) {
      toggle.hidden = false;
      var mq = window.matchMedia('(max-width: 700px)');
      var set = function (open) { group.classList.toggle('finder-open', open); toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      toggle.addEventListener('click', function () { set(!group.classList.contains('finder-open')); });
      set(!mq.matches || Object.keys(qs).length > 0);
    }
    apply(false);
  }

  function start() {
    document.querySelectorAll('[data-explorer="results"]').forEach(setupFinder);
    var cache = {};
    function rowsFor(el) { var id = el.getAttribute('data-src') || 'px-data'; return cache[id] = cache[id] || data(id); }
    document.querySelectorAll('.px[data-px="artist"]').forEach(function (el) {
      var rows = rowsFor(el); if (!rows.length) return;
      Chart(el, rows, [{ a: rows[0].a, name: rows[0].an, cls: 's0' }], { compact: el.hasAttribute('data-compact') });
    });
    document.querySelectorAll('.px[data-px="pick"]').forEach(function (el) { window.GAMPick = setupPick(el, rowsFor(el)); });
    document.querySelectorAll('.px[data-px="compare"]').forEach(function (el) { setupCompare(el, rowsFor(el)); });
    // arriving from a link to one artist or one pair: go straight to that part of the page
    var to = hashParam('compare') ? 'compare' : hashParam('artist') ? 'history' : '';
    if (to && document.getElementById(to)) setTimeout(function () { document.getElementById(to).scrollIntoView(); }, 60);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

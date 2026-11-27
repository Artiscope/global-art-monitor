// Global Art Monitor. Small, dependency-light page behaviour.
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // where the site starts, worked out from this script's own address (assets/site.js)
  var ME = document.currentScript;
  var ROOT = ME && ME.src ? new URL('..', ME.src).href : new URL('/', location.href).href;

  // The site's fixed words. Edit default text in Artiscope Digital Home keeps changed ones, which the page
  // carries in #adh-words (the editor sets window.ADH_WORDS); every call here carries the site's own words.
  function SW(key, dflt, slots) {
    var w = window.ADH_WORDS || null;
    if (!w) { try { var el = document.getElementById('adh-words'); w = el ? JSON.parse(el.textContent) : {}; } catch (x) { w = {}; } }
    var t = w && typeof w[key] === 'string' && w[key].trim() ? w[key] : dflt;
    Object.keys(slots || {}).forEach(function (k) { t = t.split('{' + k + '}').join(slots[k]); });
    return t;
  }
  function SWh(key, dflt) { return SW(key, dflt).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function lockScroll(lock) {
    doc.style.overflow = lock ? 'hidden' : '';
  }

  // Content shows straight away. The old loader and fade-in hid each page for several seconds, so both are gone.
  // Anything still marked to fade in is shown at once.
  function showAll() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  }

  // A link to a part of a page (about/#method, artists/x/#work-y) lands on that part even if the page
  // grows a little after it opens, for example when the web fonts arrive.
  function settleHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id || id.indexOf('=') >= 0) { return; }
    var el = document.getElementById(id);
    if (!el) { return; }
    var moved = false;
    var mark = function () { moved = true; };
    window.addEventListener('wheel', mark, { once: true, passive: true });
    window.addEventListener('touchstart', mark, { once: true, passive: true });
    window.addEventListener('keydown', mark, { once: true });
    var go = function () { if (!moved) { el.scrollIntoView({ block: 'start' }); } };
    go();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); }
    window.addEventListener('load', go, { once: true });
  }

  // Full screen menu
  function setupMenu() {
    var menu = document.getElementById('menu');
    var open = document.querySelector('[data-menu-open]');
    if (!menu || !open) { return; }
    var close = menu.querySelector('[data-menu-close]');
    function set(state) {
      menu.classList.toggle('open', state);
      menu.setAttribute('aria-hidden', state ? 'false' : 'true');
      open.setAttribute('aria-expanded', state ? 'true' : 'false');
      lockScroll(state);
      if (state) { close.focus(); } else { open.focus(); }
    }
    open.addEventListener('click', function () { set(true); });
    close.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); }
    });
    if (!reduce) {
      menu.querySelectorAll('.menu-list a').forEach(function (a, i) {
        a.style.transitionDelay = (i * 30 + 60) + 'ms';
      });
    }
  }

  // Auction table filters
  function setupFilters() {
    document.querySelectorAll('[data-filter-group]').forEach(function (group) {
      var table = document.getElementById(group.getAttribute('data-filter-group'));
      // the full results finder is run by assets/explorer.js, which also sorts
      if (!table || group.hasAttribute('data-explorer')) { return; }
      var state = {}, words = '';
      var empty = document.getElementById(table.id + '-empty');
      var count = document.getElementById(table.id + '-count');
      var foot = count ? count.parentNode : null;
      var clear = foot ? foot.querySelector('[data-clear]') : null;
      var search = group.querySelector('[data-search]');
      var selects = group.querySelectorAll('select[data-key]');
      var rows = table.querySelectorAll('tbody tr');
      function apply() {
        var shown = 0, terms = words.toLowerCase().split(/\s+/).filter(Boolean);
        rows.forEach(function (tr) {
          var ok = Object.keys(state).every(function (k) {
            return state[k] === 'all' || tr.getAttribute('data-' + k) === state[k];
          });
          if (ok && terms.length) {
            var text = tr.textContent.toLowerCase();
            ok = terms.every(function (t) { return text.indexOf(t) !== -1; });
          }
          tr.hidden = !ok;
          if (ok) { shown += 1; }
        });
        var filtered = shown !== rows.length;
        if (empty) { empty.hidden = shown !== 0; }
        if (count) { count.textContent = filtered ? 'Showing ' + shown + ' of ' + rows.length + ' lots' : 'Showing all ' + rows.length + ' lots'; }
        if (clear) { clear.hidden = !filtered && !terms.length; }
      }
      // a chosen menu turns mint and its hint reads "Change"
      function mark(sel) {
        var on = sel.value !== 'all', hint = sel.parentNode.querySelector('i');
        sel.classList.toggle('on', on);
        if (hint) { hint.textContent = on ? 'Change' : 'Choose'; }
      }
      selects.forEach(function (sel) {
        var key = sel.getAttribute('data-key');
        state[key] = sel.value;
        sel.addEventListener('change', function () {
          state[key] = sel.value;
          mark(sel);
          apply();
        });
      });
      if (search) {
        search.addEventListener('input', function () { words = search.value; apply(); });
      }
      if (clear) {
        clear.addEventListener('click', function () {
          selects.forEach(function (sel) { sel.value = 'all'; mark(sel); state[sel.getAttribute('data-key')] = 'all'; });
          if (search) { search.value = ''; }
          words = '';
          apply();
        });
      }
      // older pages: a row of buttons per filter
      group.querySelectorAll('.filter').forEach(function (btn) {
        var key = btn.getAttribute('data-key');
        if (btn.getAttribute('aria-pressed') === 'true') { state[key] = btn.getAttribute('data-value'); }
        btn.addEventListener('click', function () {
          state[key] = btn.getAttribute('data-value');
          group.querySelectorAll('.filter[data-key="' + key + '"]').forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          apply();
        });
      });
    });
  }

  // London clock
  // Homepage result card: make sure the price fits the card with the real font loaded
  function fitPrice() {
    var el = document.querySelector('.result-card .price');
    if (!el) { return; }
    el.style.fontSize = '';
    var room = el.clientWidth, need = el.scrollWidth;
    if (need > room && room > 0) {
      el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * room / need * 0.98) + 'px';
    }
  }
  function setupPriceFit() {
    fitPrice();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitPrice); }
    window.addEventListener('resize', fitPrice);
  }

  // Header bar tightens a little once the reader scrolls
  function setupHeadBar() {
    var wrap = document.querySelector('.head-wrap');
    if (!wrap) { return; }
    function check() { wrap.classList.toggle('scrolled', window.scrollY > 40); }
    check();
    window.addEventListener('scroll', check, { passive: true });
  }

  function setupClock() {
    var el = document.querySelector('[data-london-time]');
    if (!el) { return; }
    function tick() {
      try {
        var t = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).format(new Date());
        el.textContent = 'London, ' + t.replace(' ', '');
      } catch (e) {}
    }
    tick();
    if (window.__gamClock) { clearInterval(window.__gamClock); }
    window.__gamClock = setInterval(tick, 30000);
  }

  // Site search: one box for artists, sales, research and pages. The list it searches is
  // assets/search.json, written by the build from the same files as the pages.
  var SEARCH = null, searchList = null;
  function searchBox() {
    if (SEARCH) { return SEARCH; }
    var d = document.createElement('div');
    d.className = 'search'; d.id = 'site-search'; d.hidden = true;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'search-h');
    d.innerHTML = '<div class="shell search-in"><div class="search-top"><h2 class="search-h" id="search-h">' + SWh('search.heading', 'Search the site') + '</h2>' +
      '<button type="button" class="menu-close" data-search-close>' + SWh('btn.close', 'Close') + '</button></div>' +
      '<label class="search-field"><span class="sr-only">' + SWh('search.label', 'Search for an artist, a work, an auction house or a topic') + '</span>' +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="' + SWh('search.placeholder', 'Artist, work, auction house or topic') + '"></label>' +
      '<p class="search-count" role="status" aria-live="polite"></p><div class="search-results"></div></div>';
    document.body.appendChild(d);
    var input = d.querySelector('input'), out = d.querySelector('.search-results'), count = d.querySelector('.search-count'), back = null;
    var KIND = { artist: SW('search.kind-artist', 'Artist profile'), sale: SW('search.kind-sale', 'Auction result'), research: SW('search.kind-research', 'Research'), page: SW('search.kind-page', 'Page'), term: SW('search.kind-term', 'Glossary') };
    var ORDER = ['artist', 'research', 'sale', 'term', 'page'];
    function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function load(done) {
      if (searchList) { done(); return; }
      fetch(ROOT + 'assets/search.json').then(function (r) { return r.json(); }).then(function (list) {
        searchList = list.map(function (x) { x._t = norm(x.t); x._all = norm([x.t, x.d, x.x].join(' ')); return x; }); done();
      }).catch(function () { count.textContent = SW('search.failed', 'Search could not load just now. Try the menu, or the auction results page.'); });
    }
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function run() {
      var q = norm(input.value).trim(), words = q.split(/\s+/).filter(Boolean);
      if (!words.length) { out.innerHTML = ''; count.textContent = SW('search.hint', 'Try an artist such as Richter, a house such as Sotheby\'s, or a word such as premium.'); return; }
      if (!searchList) { load(run); return; }
      var hits = searchList.filter(function (x) { return words.every(function (w) { return x._all.indexOf(w) !== -1; }); });
      hits.forEach(function (x) { x._s = (x._t.indexOf(q) === 0 ? 0 : x._t.indexOf(q) > 0 ? 1 : words.every(function (w) { return x._t.indexOf(w) !== -1; }) ? 2 : 3); });
      var html = '', shown = 0;
      // the kind with the closest title match comes first; otherwise artists, research, sales, terms, pages
      var best = {}; hits.forEach(function (x) { best[x.k] = Math.min(best[x.k] == null ? 9 : best[x.k], x._s); });
      ORDER.slice().sort(function (a, b) { return (best[a] == null ? 9 : best[a]) - (best[b] == null ? 9 : best[b]) || ORDER.indexOf(a) - ORDER.indexOf(b); }).forEach(function (k) {
        var group = hits.filter(function (x) { return x.k === k; }).sort(function (a, b) { return a._s - b._s; });
        if (!group.length) { return; }
        var cap = k === 'sale' ? 12 : 8;
        html += '<section class="search-group"><h3>' + esc(KIND[k]) + ' <span>' + group.length + '</span></h3><ul>' +
          group.slice(0, cap).map(function (x) { return '<li><a href="' + esc(ROOT + x.u) + '"><b>' + esc(x.t) + '</b>' + (x.d ? '<span>' + esc(x.d) + '</span>' : '') + '</a></li>'; }).join('') +
          (group.length > cap && k === 'sale' ? '<li class="search-more"><a href="' + esc(ROOT + 'auction-results/?q=' + encodeURIComponent(input.value.trim())) + '">' + esc(SW('search.all-sales', 'See all {n} matching sales in the auction results', { n: String(group.length) })) + '</a></li>' : '') +
          '</ul></section>';
        shown += group.length;
      });
      out.innerHTML = html;
      count.textContent = shown ? SW('search.found', '{n} found for "{q}".', { n: String(shown), q: input.value.trim() }) :
        SW('search.none', 'Nothing found for "{q}". Check the spelling, try fewer words, or browse the artist profiles.', { q: input.value.trim() });
    }
    input.addEventListener('input', run);
    function close() { d.hidden = true; lockScroll(false); document.querySelectorAll('[data-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); if (back) { back.focus(); } }
    d.querySelector('[data-search-close]').addEventListener('click', close);
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = d.querySelectorAll('input, button, a[href]'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    SEARCH = { open: function (from) {
      back = from || document.activeElement;
      var m = document.getElementById('menu'); if (m && m.classList.contains('open')) { var c = m.querySelector('[data-menu-close]'); if (c) { c.click(); } }
      d.hidden = false; lockScroll(true); input.focus(); input.select(); run(); load(function () {});
      document.querySelectorAll('[data-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    } };
    return SEARCH;
  }
  function setupSearch() {
    document.querySelectorAll('[data-search-open]').forEach(function (b) {
      b.hidden = false;
      if (b.getAttribute('data-wired')) { return; }
      b.setAttribute('data-wired', '1');
      b.addEventListener('click', function (e) { e.preventDefault(); searchBox().open(b); });
    });
    if (window.__gamSearchKeys) { return; }
    window.__gamSearchKeys = true;
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        if (!document.querySelector('[data-search-open]')) { return; }
        e.preventDefault(); searchBox().open();
      }
    });
  }

  // Wide tables: say so, and fade the right-hand edge, only when a table really is wider than its box.
  function setupTableHints() {
    var wraps = document.querySelectorAll('.table-wrap');
    if (!wraps.length) { return; }
    function check() {
      wraps.forEach(function (w) {
        var more = w.scrollWidth > w.clientWidth + 2;
        w.classList.toggle('can-scroll', more);
        w.classList.toggle('at-end', !more || w.scrollLeft + w.clientWidth >= w.scrollWidth - 2);
        var hint = w.previousElementSibling;
        if (hint && hint.classList.contains('swipe')) { hint.classList.toggle('show', more); }
      });
    }
    wraps.forEach(function (w) {
      if (w.getAttribute('data-hint')) { return; }
      w.setAttribute('data-hint', '1');
      w.addEventListener('scroll', function () { w.classList.toggle('at-end', w.scrollLeft + w.clientWidth >= w.scrollWidth - 2); }, { passive: true });
    });
    check();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(check); }
    if (!window.__gamTableHints) { window.__gamTableHints = true; window.addEventListener('resize', function () { requestAnimationFrame(setupTableHints); }); }
  }

  /* Contact form: each message is saved to the Artiscope enquiries table on Supabase. The key below is the
     public (publishable) one. It can only add a message; it cannot read, change or delete any. */
  var ENQ={url:'https://qjfutwulufvmhetztubt.supabase.co/rest/v1/enquiries',key:'sb_publishable_6X_IS-AOOVGNpzp73QPU8w_l_qSEnhX',site:'global-art-monitor'};
  var ENQ_EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function sendEnquiry(form,say,to){
    if(form.getAttribute('data-busy'))return;
    var v=function(n){var el=form.elements[n];return el?String(el.value||'').trim():''};
    var bad=function(n,t){var el=form.elements[n];if(el){el.setAttribute('aria-invalid','true');el.focus();el.addEventListener('input',function(){el.removeAttribute('aria-invalid')},{once:true})}say(t,true)};
    if(form.elements.name&&!v('name'))return bad('name',SW('form.need-name','Please add your name, so we know who we are replying to.'));
    if(!ENQ_EMAIL.test(v('email'))||(form.elements.email&&!form.elements.email.checkValidity()))return bad('email',SW('form.need-email','We need a working email address, so we can reply.'));
    if(!v('message'))return bad('message',SW('form.need-message','Please write your message first.'));
    if(v('message').length>5000)return bad('message',SW('form.too-long','That is longer than the form allows. Please keep it under 5,000 characters, or write to {email}.',{email:to}));
    if(window.ADH_EDIT)return say(SW('form.preview','The form does not send while the page is being edited.'));
    var thanks=function(){form.reset();say(SW('form.thanks-contact','Thank you. Your message has reached us and we will reply by email.'))};
    // The hidden "website" box is only ever filled in by spam robots. Thank them and send nothing.
    if(v('website'))return thanks();
    var btn=form.querySelector('[type="submit"]'),busy=function(on){if(on){form.setAttribute('data-busy','1');form.setAttribute('aria-busy','true')}else{form.removeAttribute('data-busy');form.removeAttribute('aria-busy')}if(btn)btn.disabled=on};
    busy(true);say(SW('form.sending','Sending your message.'));
    fetch(ENQ.url,{method:'POST',headers:{'apikey':ENQ.key,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({site:ENQ.site,name:v('name').slice(0,120),email:v('email').slice(0,254),subject:v('topic').slice(0,200)||null,message:v('message')})})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);busy(false);thanks()})
      .catch(function(){busy(false);say(SW('form.failed','Sorry, your message did not go through. Please try again in a moment, or write to {email}.',{email:to}),true)});
  }
  function setupContact() {
    document.querySelectorAll('form[id$="contact-form"]').forEach(function (form) {
      if (form.getAttribute('data-enq')) { return; }
      form.setAttribute('data-enq', '1');
      var box = form.closest('section') || document;
      var status = box.querySelector('[id$="contact-status"]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        sendEnquiry(form, function (t, bad) { if (status) { status.textContent = t; status.classList.toggle('err', !!bad); } }, form.getAttribute('data-email'));
      });
    });
  }

  // Email sign-up sections: they open the visitor's own email app with the
  // request ready to send. The site sends and keeps nothing. The address is kept on the form so it can be checked.
  function setupMailForms() {
    document.querySelectorAll('form[data-mailform]').forEach(function (form) {
      if (form.getAttribute('data-wired')) { return; }
      form.setAttribute('data-wired', '1');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
        var note = form.querySelector('.su-note'), to = form.getAttribute('data-email');
        var say = function (t, bad) { if (note) { note.textContent = t; note.classList.toggle('err', !!bad); } };
        var email = form.elements.email;
        if (email && (!email.value.trim() || !email.checkValidity())) { email.focus(); say(SW('form.need-email', 'We need a working email address, so we can reply.'), true); return; }
        var body = 'Please add me to the Global Art Monitor market note.\n\nName: ' + v('name') + '\nEmail: ' + v('email');
        var url = 'mailto:' + to + '?subject=' + encodeURIComponent(SW('form.subject', 'Please add me to the market note')) + '&body=' + encodeURIComponent(body);
        form.setAttribute('data-mailto', url);
        window.location.href = url;
        say(SW('form.sent', 'Your email app should now be open with the message ready. Send it and you are on the list. If nothing opened, write to {email}.', { email: to }));
      });
    });
  }

  // Announcement bars with more than one message show them in turn, pausing while the pointer is over them.
  var annTimers = [];
  function setupAnnounce() {
    annTimers.forEach(clearInterval); annTimers = [];
    document.querySelectorAll('[data-announce]').forEach(function (bar) {
      var msgs = bar.querySelectorAll('.ann-msg'), count = bar.querySelector('.ann-count');
      if (msgs.length < 2) { return; }
      var at = 0, paused = false, secs = Number(bar.getAttribute('data-secs')) || 6;
      function show(n) {
        msgs[at].classList.remove('on'); at = (n + msgs.length) % msgs.length; msgs[at].classList.add('on');
        if (count) { count.textContent = SW('btn.count', '{n} of {total}', { n: String(at + 1), total: String(msgs.length) }); }
      }
      bar.adhShow = function (el) { for (var i = 0; i < msgs.length; i++) { if (msgs[i] === el) { show(i); } } };
      bar.addEventListener('mouseenter', function () { paused = true; });
      bar.addEventListener('mouseleave', function () { paused = false; });
      bar.addEventListener('focusin', function () { paused = true; });
      bar.addEventListener('focusout', function () { paused = false; });
      annTimers.push(setInterval(function () { if (!paused && !document.hidden) { show(at + 1); } }, secs * 1000));
    });
  }

  // Slideshows: Previous and Next; moving on by itself stops once a visitor uses them, and never runs for reduced motion or in the editor.
  var ssTimers = [];
  function setupSlides() {
    ssTimers.forEach(clearInterval); ssTimers = [];
    var still = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('rm');
    document.querySelectorAll('[data-slides]').forEach(function (box) {
      var sl = box.querySelectorAll('.ss-slide'), at = box.querySelector('.ss-at');
      if (sl.length < 2) { return; }
      var i = 0, paused = false, stopped = false;
      function show(n) { sl[i].classList.remove('on'); i = (n + sl.length) % sl.length; sl[i].classList.add('on'); if (at) { at.textContent = SW('btn.count', '{n} of {total}', { n: String(i + 1), total: String(sl.length) }); } }
      box.adhShow = function (el) { for (var k = 0; k < sl.length; k++) { if (sl[k] === el) { show(k); } } };
      box.querySelector('[data-ss="prev"]').addEventListener('click', function () { stopped = true; show(i - 1); });
      box.querySelector('[data-ss="next"]').addEventListener('click', function () { stopped = true; show(i + 1); });
      box.addEventListener('mouseenter', function () { paused = true; }); box.addEventListener('mouseleave', function () { paused = false; });
      box.addEventListener('focusin', function () { paused = true; }); box.addEventListener('focusout', function () { paused = false; });
      if (box.getAttribute('data-auto') === '1' && !still) { ssTimers.push(setInterval(function () { if (!paused && !stopped && !document.hidden) { show(i + 1); } }, (Number(box.getAttribute('data-secs')) || 6) * 1000)); }
    });
  }

  // Galleries: one viewer for the whole site, opened over the page.
  var LB = null;
  function lightbox() {
    if (LB) { return LB; }
    var d = document.createElement('div'); d.className = 'lb'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', SW('sr.larger', 'Larger picture'));
    d.innerHTML = '<div class="lb-pic"></div><p class="lb-cap"></p><div class="lb-nav"><button type="button" data-lb="prev">' + SWh('btn.previous', 'Previous') + '</button><button type="button" data-lb="close">' + SWh('btn.close', 'Close') + '</button><button type="button" data-lb="next">' + SWh('btn.next', 'Next') + '</button></div>';
    document.body.appendChild(d);
    LB = { el: d, items: [], i: 0, back: null };
    LB.show = function (k) {
      var it = LB.items; LB.i = (k + it.length) % it.length;
      var b = it[LB.i], img = b.querySelector('img'), t = b.querySelector('.gl-t'), pic = d.querySelector('.lb-pic');
      pic.textContent = '';
      if (img) { var c = img.cloneNode(); c.removeAttribute('loading'); pic.appendChild(c); } else { var sp = document.createElement('span'); sp.className = 'lb-none'; sp.textContent = SW('missing.picture', 'Picture to supply'); pic.appendChild(sp); }
      d.querySelector('.lb-cap').textContent = t ? t.textContent : (img ? img.alt : '');
      d.querySelector('[data-lb="prev"]').hidden = d.querySelector('[data-lb="next"]').hidden = it.length < 2;
    };
    LB.close = function () { d.hidden = true; document.documentElement.style.overflow = ''; if (LB.back) { LB.back.focus(); } };
    d.addEventListener('click', function (e) { var a = e.target.closest('[data-lb]'); if (!a) { if (e.target === d) { LB.close(); } return; } if (a.getAttribute('data-lb') === 'close') { LB.close(); } else { LB.show(LB.i + (a.getAttribute('data-lb') === 'next' ? 1 : -1)); } });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { LB.close(); } else if (e.key === 'ArrowRight') { LB.show(LB.i + 1); } else if (e.key === 'ArrowLeft') { LB.show(LB.i - 1); } });
    return LB;
  }
  function setupGalleries() {
    document.querySelectorAll('[data-gallery]').forEach(function (gal) {
      var items = [].slice.call(gal.querySelectorAll('.gl-item'));
      items.forEach(function (b, k) { b.addEventListener('click', function () { var lb = lightbox(); lb.items = items; lb.back = b; lb.show(k); lb.el.hidden = false; document.documentElement.style.overflow = 'hidden'; lb.el.querySelector('[data-lb="close"]').focus(); }); });
    });
  }

  setupAnnounce();
  setupSlides();
  setupGalleries();
  // Each popup shows once a visit, after its delay; Close or Escape puts it away. Never while the page is being edited.
  function setupPopups() {
    document.querySelectorAll('[data-popup]').forEach(function (p) {
      if (p.getAttribute('data-wired')) { return; }
      p.setAttribute('data-wired', '1');
      var key = 'gam-popup-' + p.id, seen = function () { try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; } };
      var shut = function () { p.hidden = true; };
      p.querySelectorAll('[data-pop-close]').forEach(function (b) { b.addEventListener('click', shut); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Escape') { shut(); } });
      if (window.ADH_EDIT || seen()) { return; }
      setTimeout(function () { if (!window.ADH_EDIT && !seen() && document.body.contains(p)) { p.hidden = false; try { sessionStorage.setItem(key, '1'); } catch (e) { } } }, (Number(p.getAttribute('data-delay')) || 8) * 1000);
    });
  }
  setupContact();
  setupMailForms();
  setupPopups();
  setupMenu();
  setupFilters();
  setupClock();
  setupHeadBar();
  setupPriceFit();
  setupSearch();
  setupTableHints();
  showAll();
  settleHash();

  // add-ons: the Top button, the reading progress and the privacy notice's Close
  function aoWire() {
    if (typeof window === "undefined") return;
    var tick = function () {
      var t = document.querySelector(".ao-top"); if (t) { t.classList.toggle("on", window.scrollY > (Number(t.getAttribute("data-after")) || 600)); var d = document.getElementById("dock"); t.style.bottom = d && d.classList.contains("show") ? "96px" : ""; }
      var p = document.querySelector(".ao-progress"); if (p) { var h = document.documentElement.scrollHeight - window.innerHeight, f = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0, bar = p.querySelector("i"), n = p.querySelector("b"); if (bar) bar.style.width = (f * 100).toFixed(1) + "%"; if (n) n.textContent = Math.round(f * 100) + "%"; }
    };
    var pv = document.querySelector(".ao-privacy"); if (pv && !window.ADH_EDIT) { try { if (localStorage.getItem("ao-privacy-closed") === "1") pv.hidden = true; } catch (x) { } }
    if (!window.__aoWired) {
      window.__aoWired = true;
      window.addEventListener("scroll", function () { requestAnimationFrame(function () { requestAnimationFrame(tick); }); }, { passive: true }); window.addEventListener("resize", function () { requestAnimationFrame(tick); });
      document.addEventListener("click", function (e) {
        if (window.ADH_EDIT || !e.target.closest) return;
        var c = e.target.closest("[data-ao-close]"); if (c) { var n = c.closest(".ao-privacy"); if (n) n.hidden = true; try { localStorage.setItem("ao-privacy-closed", "1"); } catch (x) { } return; }
        if (e.target.closest(".ao-top")) { e.preventDefault(); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (x) { window.scrollTo(0, 0); } }
      });
    }
    tick();
  }
  aoWire();
  // The page editor redraws the page in place, then asks for the behaviours again.
  window.GAMSite = { refresh: function () {
    aoWire(); setupAnnounce(); setupSlides(); setupGalleries(); setupContact(); setupMailForms(); setupPopups(); setupMenu(); setupFilters(); setupClock(); setupHeadBar(); setupSearch(); setupTableHints();
    showAll();
  } };
})();

/* lets Artiscope Digital Home redraw any page as it is edited, and pick or follow what is clicked */
(function () {
  var ok = "https://artiscope.github.io", active = false, D = null, me = document.currentScript;
  if (window.parent === window) { return; }
  var ROOT = new URL(".", new URL("..", (me && me.src) || location.href)).href;
  var BLOCKS = { words: ".word", hero: ".hero-actions a", footer: ".foot-cols > div:last-child a" };
  var view = { kind: "page", key: "home" }, types = {}, grp = {}, tsec = {};
  function loadRender(done) {
    if (window.GAM) { done(); return; }
    var s = document.createElement("script"); s.src = ROOT + "assets/render.js"; s.onload = done; document.head.appendChild(s);
  }
  function style() {
    if (document.getElementById("adh-style")) { return; }
    var st = document.createElement("style"); st.id = "adh-style";
    st.textContent = ".adh-picked{outline:2px dashed #0D6767;outline-offset:-2px}.adh-picked-block{outline:2px solid #0D6767;outline-offset:3px;position:relative}" +
      ".adh-picked-block[data-adh-label]::before{content:attr(data-adh-label);position:absolute;left:0;top:-30px;z-index:2147482000;background:#0D6767;color:#FFFFFF;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap;pointer-events:none}" +
      "[data-reveal]{opacity:1!important;transform:none!important}td[data-adh-label]{position:relative}td[data-adh-label]::before{content:attr(data-adh-label);position:absolute;left:0;top:-30px;z-index:2147482000;background:#0D6767;color:#FFFFFF;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap;pointer-events:none}tr.adh-picked-block{position:static}";
    document.head.appendChild(st);
  }
  function draw(m) {
    // the words changed in Edit default text, for the words this script writes itself
    window.ADH_WORDS = m.pages && m.pages.words && typeof m.pages.words === "object" ? m.pages.words : {};
    var site = window.GAM.Site(m.data, m.pages, "", { mark: true, show: m.show || "", social: m.social || {}, tpl: m.tpl || null, imageSrc: function (name) { return (m.images || {})[name] || ROOT + "assets/images/" + name; } });
    var at = m.at || { kind: "page", key: "home" }, out = null;
    if (at.kind === "artist") { out = site.artistPage(at.key); }
    else if (at.kind === "article") { out = site.featurePage(at.key); }
    else if (m.pages.pages[at.key]) { out = site.sectionsPage(at.key); }
    if (!out) { out = site.notFound(); }
    view = at; types = {};
    (((m.pages.pages || {})[at.key] || {}).sections || []).forEach(function (x) { types[x.id] = x.type; });
    grp = {}; ["top", "popups", "bottom"].forEach(function (w) { (((m.pages.groups || {})[w]) || []).forEach(function (x) { types[x.id] = x.type; grp[x.id] = 1; }); });
    tsec = {}; if (at.kind === "article" || at.kind === "artist") { var tall = ((m.pages.templates || {})[at.kind]) || {}, tid = m.tpl && m.tpl.kind === at.kind && tall[m.tpl.id] ? m.tpl.id : ((((m.pages.assign || {})[at.kind]) || {})[at.key] || "default"); (((tall[tid] || tall["default"] || {}).sections) || []).forEach(function (x) { if (x.type !== "main") { types[x.id] = x.type; tsec[x.id] = 1; } }); }
    var moved = out.path !== draw.path; draw.path = out.path;
    var base = document.querySelector("base[data-adh]");
    if (!base) { base = document.createElement("base"); base.setAttribute("data-adh", ""); document.head.insertBefore(base, document.head.firstChild); }
    base.href = ROOT + out.path.replace(/[^\/]*$/, "");
    var doc = new DOMParser().parseFromString(out.html, "text/html");
    doc.querySelectorAll("script").forEach(function (x) { x.remove(); });
    var t = doc.querySelector("title"); if (t) { document.title = t.textContent; }
    var oldCss = document.head.querySelector("style[data-sec-css]"), newCss = doc.head.querySelector("style[data-sec-css]");
    if (oldCss) { oldCss.remove(); }
    if (newCss) { document.head.appendChild(newCss); }
    var y = window.scrollY;
    document.body.innerHTML = doc.body.innerHTML;
    document.body.removeAttribute("data-intro");
    if (window.GAMSite) { window.GAMSite.refresh(); }
    if (moved) { window.scrollTo(0, 0); } else { window.scrollTo(0, y); }
    return moved;
  }
  function sectionEl(id) {
    if (id === "header") { return document.querySelector("header.site-head"); }
    if (id === "footer") { return document.querySelector("footer.site-foot"); }
    return document.querySelector('[data-adh="' + id + '"]');
  }
  function blockEls(id) {
    if (id === "sales") {
      return [].slice.call(document.querySelectorAll('[data-adh="sales"] tr[data-adh-row]')).sort(function (a, b) { return a.getAttribute("data-adh-row") - b.getAttribute("data-adh-row"); });
    }
    var el = sectionEl(id), sel = BLOCKS[id === "header" || id === "footer" ? id : types[id]];
    return el && sel ? [].slice.call(el.querySelectorAll(sel)) : [];
  }
  // a block the page tags with its kind and place, so hidden ones never shift the count
  function tagged(el, bf, block) { if (!el || !bf) { return null; } return el.querySelector('[data-adh-b="' + bf + "." + block + '"]'); }
  function pick(id, block, label, scroll, bf, bi) {
    document.querySelectorAll(".adh-picked,.adh-picked-block,[data-adh-label]").forEach(function (x) { x.classList.remove("adh-picked", "adh-picked-block"); x.removeAttribute("data-adh-label"); });
    document.querySelectorAll("[data-popup]").forEach(function (p) { p.hidden = true; });
    if (!id) { return; }
    var el = sectionEl(id); if (!el) { return; }
    if (el.hasAttribute("data-popup")) { el.hidden = false; }
    var target = el;
    if ((block != null && block >= 0) || (bf && bi >= 0)) { var b = (bf && bi >= 0 ? tagged(el, bf, bi) : null) || (block >= 0 ? blockEls(id)[block] : null); if (b) { var bar = b.closest("[data-announce],[data-slides]"); if (bar && bar.adhShow) { bar.adhShow(b); } el.classList.add("adh-picked"); b.classList.add("adh-picked-block"); target = b; } else { el.classList.add("adh-picked-block"); } }
    else { el.classList.add("adh-picked-block"); }
    // a table row cannot carry the label itself, so its first cell does
    if (label) { (target.tagName === "TR" && target.cells[0] ? target.cells[0] : target).setAttribute("data-adh-label", label); }
    if (scroll) { var r0 = target.getBoundingClientRect(), y0 = window.pageYOffset + r0.top - (r0.height < window.innerHeight ? (window.innerHeight - r0.height) / 2 : 20); try { window.scrollTo({ top: Math.max(0, y0), behavior: "smooth" }); } catch (x) { window.scrollTo(0, Math.max(0, y0)); } }
  }
  // Edit default text: "Show me where" outlines the first place on this page that shows a word.
  // A word with slots ({n} of {total}) matches whatever the site filled in. The text of a whole
  // element is tried first, so "Close" does not match inside a longer line.
  function findClear() {
    var t = document.getElementById("adh-found-tag"); if (t) { t.remove(); }
    Array.prototype.forEach.call(document.querySelectorAll(".adh-found"), function (x) { x.classList.remove("adh-found"); });
  }
  function findWord(text, label) {
    findClear();
    var t = String(text || "").replace(/\s+/g, " ").trim(); if (!t) { return 0; }
    var body = t.split(/\{[a-z]+\}/).map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join(".+?");
    var exact = new RegExp("^" + body + "$"), part = new RegExp(body), hit = null, loose = null;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (var n = walker.nextNode(); n && !hit; n = walker.nextNode()) {
      var el = n.parentElement; if (!el || el.closest("#adh-hover, #adh-found-tag, script, style, noscript")) { continue; }
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) { continue; }
      var own = n.nodeValue.replace(/\s+/g, " ").trim(), all = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (exact.test(own) || exact.test(all)) { hit = el; } else if (!loose && part.test(own)) { loose = el; }
    }
    hit = hit || loose; if (!hit) { return 0; }
    if (!document.getElementById("adh-found-css")) { var st = document.createElement("style"); st.id = "adh-found-css"; st.textContent = ".adh-found{outline:2px solid #0D6767!important;outline-offset:3px;border-radius:4px}#adh-found-tag{position:absolute;z-index:2147483000;background:#0D6767;color:#FFFFFF;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap;pointer-events:none}"; document.head.appendChild(st); }
    hit.classList.add("adh-found");
    var b = hit.getBoundingClientRect(), y = window.pageYOffset + b.top - Math.max(80, (window.innerHeight - b.height) / 2);
    window.scrollTo(0, Math.max(0, y));
    var tag = document.createElement("div"); tag.id = "adh-found-tag"; tag.textContent = label || t;
    tag.style.left = Math.max(4, window.pageXOffset + b.left - 2) + "px"; tag.style.top = Math.max(4, window.pageYOffset + b.top - 32) + "px";
    document.body.appendChild(tag);
    return 1;
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== ok || !e.data) { return; }
    if (!active) { active = true; window.ADH_EDIT = true; document.querySelectorAll("[data-popup]").forEach(function (p) { p.hidden = true; }); document.documentElement.classList.add("rm"); style(); }
    if (e.data.type === "adh-pages" && e.data.data && e.data.pages) {
      findClear();
      var m = e.data; NAMES = m.names || {}; hoverOff();
      loadRender(function () { var moved = false; try { moved = draw(m); } catch (x) { } pick(m.pick, m.block, m.label, m.scroll || moved, m.bf, m.bi); });
      return;
    }
    if (e.data.type === "adh-pick") { pick(e.data.id, e.data.block, e.data.label, true, e.data.bf, e.data.bi); }
    if (e.data.type === "adh-find") { var found = findWord(e.data.text, e.data.label); window.parent.postMessage({ type: "adh-found", key: e.data.key, found: found }, ok); }
  });
  function whatAt(t) {
    var id = "", block = -1, bf = "";
    if (t.closest("header.site-head, #menu")) { id = "header"; }
    else if (t.closest("footer.site-foot")) { id = "footer"; }
    else { var sec = t.closest("[data-adh]"); if (sec) { id = sec.getAttribute("data-adh"); } }
    if (!id) { return null; }
    var host = sectionEl(id); if (!host) { return null; }
    var el = host, tag = t.closest("[data-adh-b]");
    if (tag && host.contains(tag)) { var bp = tag.getAttribute("data-adh-b").split("."); bf = bp[0]; block = Number(bp[1]); el = tag; }
    return { id: id, block: block, bf: bf, view: grp[id] ? "every" : tsec[id] ? "tpl" : view.kind, el: el, plus: !!bf || (id !== "header" && id !== "footer" && (!!grp[id] || !!tsec[id] || view.kind === "page")) };
  }
  /* the inspector: an outline and a name tag on whatever the pointer is over, with a plus above and below to add something just there */
  var NAMES = {}, hov = null, hovBox = null, hovRaf = 0;
  function hoverStyle() {
    if (document.getElementById("adh-hover-style")) { return; }
    var st = document.createElement("style"); st.id = "adh-hover-style";
    st.textContent = "#adh-hover{position:absolute;z-index:2147483000;pointer-events:none;outline:2px solid #0D6767;outline-offset:2px;display:none}#adh-hover.on{display:block}#adh-hover.blk{outline-style:dashed}" +
      "#adh-hover .adh-tag{position:absolute;left:-2px;top:-30px;background:#0D6767;color:#FFFFFF;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap}#adh-hover.inside .adh-tag{top:6px;left:6px}" +
      "#adh-hover .adh-plus{pointer-events:auto;position:absolute;left:50%;width:28px;height:28px;margin-left:-14px;padding:0;border:0;border-radius:50%;background:#0D6767;color:#FFFFFF;font:600 18px/28px Arial,sans-serif;text-align:center;box-shadow:none;cursor:pointer}" +
      "#adh-hover .adh-plus.top{top:-16px}#adh-hover .adh-plus.bottom{bottom:-16px}#adh-hover.noplus .adh-plus{display:none}#adh-hover .adh-plus:hover{background:#7CB9F7;color:#FFFFFF}";
    document.head.appendChild(st);
  }
  function hoverBox() {
    if (hovBox && hovBox.parentNode) { return hovBox; }
    hoverStyle();
    hovBox = document.createElement("div"); hovBox.id = "adh-hover";
    hovBox.innerHTML = '<span class="adh-tag"></span><button type="button" class="adh-plus top" tabindex="-1" title="Add here, above" aria-label="Add here, above">+</button><button type="button" class="adh-plus bottom" tabindex="-1" title="Add here, below" aria-label="Add here, below">+</button>';
    document.documentElement.appendChild(hovBox); return hovBox;
  }
  /* tell the console what the pointer is over, so the matching row in its list lights up */
  var overKey = "";
  function overSay(w) {
    var k = w ? w.id + "|" + w.bf + "|" + w.block + "|" + w.view : "";
    if (k === overKey) { return; }
    overKey = k;
    try { window.parent.postMessage({ type: "adh-over", id: w ? w.id : "", block: w ? w.block : -1, bf: w ? w.bf : "", view: w ? w.view : "" }, ok); } catch (x) { /* the console has gone */ }
  }
  function hoverOff() { if (hovBox) { hovBox.className = ""; } hov = null; overSay(null); }
  function hoverAt(target) {
    if (!active || !target || !target.closest) { return; }
    if (target.closest("#adh-hover")) { return; }
    var w = null; try { w = whatAt(target); } catch (x) { w = null; }
    if (!w || !w.el) { hoverOff(); return; }
    var r = w.el.getBoundingClientRect(); if (!r.width || !r.height) { hoverOff(); return; }
    var box = hoverBox(); hov = w;
    box.style.left = (r.left + window.scrollX) + "px"; box.style.top = (r.top + window.scrollY) + "px"; box.style.width = r.width + "px"; box.style.height = r.height + "px";
    box.querySelector(".adh-tag").textContent = w.bf ? (NAMES[w.id + ":" + w.bf] || "Block") : (NAMES[w.id] || "Section");
    box.className = "on" + (w.bf ? " blk" : "") + (w.plus ? "" : " noplus") + (r.top < 34 ? " inside" : "");
    overSay(w);
  }
  document.addEventListener("mousemove", function (e) { if (!active) { return; } var t = e.target; cancelAnimationFrame(hovRaf); hovRaf = requestAnimationFrame(function () { hoverAt(t); }); }, true);
  document.documentElement.addEventListener("mouseleave", hoverOff);
  window.addEventListener("scroll", function () { if (!hov || !hovBox) { return; } var r = hov.el.getBoundingClientRect(); if (!r.width) { hoverOff(); return; } hovBox.style.left = (r.left + window.scrollX) + "px"; hovBox.style.top = (r.top + window.scrollY) + "px"; }, true);
  function plusClick(e) {
    e.preventDefault(); e.stopPropagation();
    var b = e.target.closest(".adh-plus"); if (!b || !hov) { return; }
    window.parent.postMessage({ type: "adh-add", id: hov.id, block: hov.block, bf: hov.bf, view: hov.view, edge: b.classList.contains("top") ? "top" : "bottom" }, ok);
    hoverOff();
  }
  // A click on a link inside the site goes to that page; anything else, or a click with Alt held, picks what was clicked.
  document.addEventListener("click", function (e) {
    if (!active) { return; }
    if (e.target.closest && e.target.closest("#adh-hover")) { plusClick(e); return; }
    e.preventDefault(); e.stopPropagation();
    var link = e.target.closest("a[href]");
    if (link && !e.altKey) {
      var u; try { u = new URL(link.getAttribute("href"), document.baseURI); } catch (x) { u = null; }
      if (u && u.href.indexOf(ROOT) === 0) { window.parent.postMessage({ type: "adh-nav", path: u.href.slice(ROOT.length).split("#")[0].split("?")[0] }, ok); return; }
    }
    var id = "", block = -1;
    if (e.target.closest("header.site-head, #menu")) { id = "header"; }
    else if (e.target.closest("footer.site-foot")) { id = "footer"; }
    else { var sec = e.target.closest("[data-adh]"); if (sec) { id = sec.getAttribute("data-adh"); } }
    if (!id) { return; }
    var bf = "", tag = e.target.closest("[data-adh-b]");
    if (tag) { var bp = tag.getAttribute("data-adh-b").split("."); bf = bp[0]; block = Number(bp[1]); }
    else { var list = blockEls(id); for (var i = 0; i < list.length; i++) { if (list[i].contains(e.target)) { block = id === "sales" ? Number(list[i].getAttribute("data-adh-row")) : i; break; } } }
    window.parent.postMessage({ type: "adh-click", id: id, block: block, bf: bf, view: grp[id] ? "every" : tsec[id] ? "tpl" : view.kind }, ok);
  }, true);
})();

/* lets Artiscope Digital Home preview a theme before it is published */
(function(){var ok="https://artiscope.github.io";if(window.parent===window)return;window.addEventListener("message",function(e){if(e.origin!==ok||!e.data)return;if(e.data.type==="adh-hello"){e.source.postMessage({type:"adh-ready"},ok);return;}if(e.data.type!=="adh-theme")return;var s=document.getElementById("adh-theme-preview");if(!s){s=document.createElement("style");s.id="adh-theme-preview";document.head.appendChild(s);}s.textContent=String(e.data.css||"");(e.data.fonts||[]).forEach(function(u){if(typeof u!=="string"||u.indexOf("https://fonts.googleapis.com/css2?")!==0)return;var had=false;Array.prototype.forEach.call(document.querySelectorAll("link[data-adh]"),function(l){if(l.getAttribute("data-adh")===u)had=true;});if(had)return;var l=document.createElement("link");l.rel="stylesheet";l.href=u;l.setAttribute("data-adh",u);document.head.appendChild(l);});});})();

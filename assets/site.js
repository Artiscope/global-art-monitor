// Global Art Monitor. Small, dependency-light page behaviour.
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;
  var MARK = '<svg class="mark" viewBox="0 0 120 120" aria-hidden="true"><path d="M 88.3 31.7 A 40 40 0 1 0 100 60" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/><line x1="40" y1="60" x2="78" y2="60" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="60" r="6" fill="currentColor"/><circle cx="58" cy="60" r="6" fill="currentColor"/><circle cx="78" cy="60" r="10.5" fill="#22E3A2"/></svg>';

  function lockScroll(lock) {
    doc.style.overflow = lock ? 'hidden' : '';
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
  }

  // Reveal on scroll
  function startReveals() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Intro loader: home page only, once per browser session
  function runLoader(done) {
    var seen = false;
    try { seen = sessionStorage.getItem('gam-intro') === '1'; } catch (e) {}
    if (!document.body.hasAttribute('data-intro') || seen || reduce) { done(); return; }
    try { sessionStorage.setItem('gam-intro', '1'); } catch (e) {}

    var el = document.createElement('div');
    el.className = 'loader';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div><div class="loader-brand">' + MARK + 'Global Art Monitor</div>' +
      '<p class="loader-line">Art market intelligence, beyond the headlines.</p></div>' +
      '<div class="loader-bar"><div class="loader-track"><div class="loader-fill"></div></div>' +
      '<div class="loader-meta"><span>Loading</span><span class="loader-count">000</span></div></div>';
    document.body.appendChild(el);
    lockScroll(true);

    var fill = el.querySelector('.loader-fill');
    var count = el.querySelector('.loader-count');
    var start = null;
    var FILL_MS = 1300;
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function frame(now) {
      if (start === null) { start = now; }
      var t = Math.min((now - start) / FILL_MS, 1);
      var p = Math.round(ease(t) * 100);
      fill.style.width = p + '%';
      count.textContent = ('00' + p).slice(-3);
      if (t < 1) { requestAnimationFrame(frame); return; }
      el.classList.add('done');
      setTimeout(function () { el.remove(); lockScroll(false); }, 820);
      setTimeout(done, 250);
    }
    requestAnimationFrame(frame);
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
    menu.querySelectorAll('.menu-list a').forEach(function (a, i) {
      a.style.transitionDelay = (i * 45 + 80) + 'ms';
    });
  }

  // Auction table filters
  function setupFilters() {
    document.querySelectorAll('[data-filter-group]').forEach(function (group) {
      var table = document.getElementById(group.getAttribute('data-filter-group'));
      if (!table) { return; }
      var state = {};
      var empty = document.getElementById(table.id + '-empty');
      function apply() {
        var shown = 0;
        table.querySelectorAll('tbody tr').forEach(function (tr) {
          var ok = Object.keys(state).every(function (k) {
            return state[k] === 'all' || tr.getAttribute('data-' + k) === state[k];
          });
          tr.hidden = !ok;
          if (ok) { shown += 1; }
        });
        if (empty) { empty.hidden = shown !== 0; }
      }
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

  // Smooth scrolling, loaded only if the network allows it
  function setupSmoothScroll() {
    if (reduce) { return; }
    import('https://unpkg.com/lenis@1.3.23/dist/lenis.mjs').then(function (mod) {
      doc.style.scrollBehavior = 'auto';
      lenis = new mod.default({ smoothWheel: true, anchors: true });
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }).catch(function () {});
  }

  // Contact form: builds an email in the visitor's own mail app
  function setupContact() {
    document.querySelectorAll('form[id$="contact-form"]').forEach(function (form) {
      var box = form.closest('section') || document;
      var v = function (n) { var el = box.querySelector('[id$="cf-' + n + '"]'); return el ? el.value.trim() : ''; };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var subject = v('topic') + ' from ' + v('name');
        var body = v('message') + '\n\nFrom: ' + v('name') + '\nReply to: ' + v('email');
        var to = form.getAttribute('data-email');
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        var status = box.querySelector('[id$="contact-status"]');
        if (status) { status.textContent = 'Your email app should now be open with the message ready. If nothing happened, write to ' + to + '.'; }
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
        if (count) { count.textContent = (at + 1) + ' of ' + msgs.length; }
      }
      bar.annShow = function (el) { for (var i = 0; i < msgs.length; i++) { if (msgs[i] === el) { show(i); } } };
      bar.addEventListener('mouseenter', function () { paused = true; });
      bar.addEventListener('mouseleave', function () { paused = false; });
      bar.addEventListener('focusin', function () { paused = true; });
      bar.addEventListener('focusout', function () { paused = false; });
      annTimers.push(setInterval(function () { if (!paused && !document.hidden) { show(at + 1); } }, secs * 1000));
    });
  }

  setupAnnounce();
  setupContact();
  setupMenu();
  setupFilters();
  setupClock();
  setupSmoothScroll();
  runLoader(startReveals);
  // The page editor redraws the page in place, then asks for the behaviours again.
  window.GAMSite = { refresh: function () {
    setupAnnounce(); setupContact(); setupMenu(); setupFilters(); setupClock();
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  } };
})();

/* lets Artiscope Digital Home redraw any page as it is edited, and pick or follow what is clicked */
(function () {
  var ok = "https://artiscope.github.io", active = false, D = null, me = document.currentScript;
  if (window.parent === window) { return; }
  var ROOT = new URL(".", new URL("..", (me && me.src) || location.href)).href;
  var BLOCKS = { words: ".word", hero: ".hero-actions a", footer: ".foot-cols > div:last-child a" };
  var view = { kind: "page", key: "home" }, types = {};
  function loadRender(done) {
    if (window.GAM) { done(); return; }
    var s = document.createElement("script"); s.src = ROOT + "assets/render.js"; s.onload = done; document.head.appendChild(s);
  }
  function style() {
    if (document.getElementById("adh-style")) { return; }
    var st = document.createElement("style"); st.id = "adh-style";
    st.textContent = ".adh-picked{outline:2px dashed rgba(137,44,220,.6);outline-offset:-2px}.adh-picked-block{outline:3px solid #892CDC;outline-offset:3px;position:relative}" +
      ".adh-picked-block[data-adh-label]::before{content:attr(data-adh-label);position:absolute;left:0;top:-30px;z-index:50;background:#892CDC;color:#fff;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap;pointer-events:none}" +
      "[data-reveal]{opacity:1!important;transform:none!important}td[data-adh-label]{position:relative}td[data-adh-label]::before{content:attr(data-adh-label);position:absolute;left:0;top:-30px;z-index:50;background:#892CDC;color:#fff;font:600 12px/1 'Libre Franklin',Arial,sans-serif;padding:6px 10px;border-radius:7px;white-space:nowrap;pointer-events:none}tr.adh-picked-block{position:static}";
    document.head.appendChild(st);
  }
  function draw(m) {
    var site = window.GAM.Site(m.data, m.pages, "", { mark: true, show: m.show || "", imageSrc: function (name) { return (m.images || {})[name] || ROOT + "assets/images/" + name; } });
    var at = m.at || { kind: "page", key: "home" }, out = null;
    if (at.kind === "artist") { out = site.artistPage(at.key); }
    else if (at.kind === "article") { out = site.featurePage(at.key); }
    else if (m.pages.pages[at.key]) { out = site.sectionsPage(at.key); }
    if (!out) { out = site.notFound(); }
    view = at; types = {};
    (((m.pages.pages || {})[at.key] || {}).sections || []).forEach(function (x) { types[x.id] = x.type; });
    var moved = out.path !== draw.path; draw.path = out.path;
    var base = document.querySelector("base[data-adh]");
    if (!base) { base = document.createElement("base"); base.setAttribute("data-adh", ""); document.head.insertBefore(base, document.head.firstChild); }
    base.href = ROOT + out.path.replace(/[^\/]*$/, "");
    var doc = new DOMParser().parseFromString(out.html, "text/html");
    doc.querySelectorAll("script").forEach(function (x) { x.remove(); });
    var t = doc.querySelector("title"); if (t) { document.title = t.textContent; }
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
    if (!id) { return; }
    var el = sectionEl(id); if (!el) { return; }
    var target = el;
    if ((block != null && block >= 0) || (bf && bi >= 0)) { var b = (bf && bi >= 0 ? tagged(el, bf, bi) : null) || (block >= 0 ? blockEls(id)[block] : null); if (b) { var bar = b.closest("[data-announce]"); if (bar && bar.annShow) { bar.annShow(b); } el.classList.add("adh-picked"); b.classList.add("adh-picked-block"); target = b; } else { el.classList.add("adh-picked-block"); } }
    else { el.classList.add("adh-picked-block"); }
    // a table row cannot carry the label itself, so its first cell does
    if (label) { (target.tagName === "TR" && target.cells[0] ? target.cells[0] : target).setAttribute("data-adh-label", label); }
    if (scroll) { try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (x) { target.scrollIntoView(); } }
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== ok || !e.data) { return; }
    if (!active) { active = true; document.documentElement.classList.add("rm"); style(); }
    if (e.data.type === "adh-pages" && e.data.data && e.data.pages) {
      var m = e.data;
      loadRender(function () { var moved = false; try { moved = draw(m); } catch (x) { } pick(m.pick, m.block, m.label, m.scroll || moved, m.bf, m.bi); });
      return;
    }
    if (e.data.type === "adh-pick") { pick(e.data.id, e.data.block, e.data.label, true, e.data.bf, e.data.bi); }
  });
  // A click on a link inside the site goes to that page; anything else, or a click with Alt held, picks what was clicked.
  document.addEventListener("click", function (e) {
    if (!active) { return; }
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
    window.parent.postMessage({ type: "adh-click", id: id, block: block, bf: bf, view: view.kind }, ok);
  }, true);
})();

/* lets Artiscope Digital Home preview a theme before it is published */
(function(){var ok="https://artiscope.github.io";if(window.parent===window)return;window.addEventListener("message",function(e){if(e.origin!==ok||!e.data)return;if(e.data.type==="adh-hello"){e.source.postMessage({type:"adh-ready"},ok);return;}if(e.data.type!=="adh-theme")return;var s=document.getElementById("adh-theme-preview");if(!s){s=document.createElement("style");s.id="adh-theme-preview";document.head.appendChild(s);}s.textContent=String(e.data.css||"");(e.data.fonts||[]).forEach(function(u){if(typeof u!=="string"||u.indexOf("https://fonts.googleapis.com/css2?")!==0)return;var had=false;Array.prototype.forEach.call(document.querySelectorAll("link[data-adh]"),function(l){if(l.getAttribute("data-adh")===u)had=true;});if(had)return;var l=document.createElement("link");l.rel="stylesheet";l.href=u;l.setAttribute("data-adh",u);document.head.appendChild(l);});});})();

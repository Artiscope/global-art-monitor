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
    setInterval(tick, 30000);
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
    var form = document.getElementById('contact-form');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { return document.getElementById(id).value.trim(); };
      var subject = v('cf-topic') + ' from ' + v('cf-name');
      var body = v('cf-message') + '\n\nFrom: ' + v('cf-name') + '\nReply to: ' + v('cf-email');
      var to = form.getAttribute('data-email');
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      document.getElementById('contact-status').textContent = 'Your email app should now be open with the message ready. If nothing happened, write to ' + to + '.';
    });
  }

  setupContact();
  setupMenu();
  setupFilters();
  setupClock();
  setupSmoothScroll();
  runLoader(startReveals);
})();

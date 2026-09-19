/* Sportowa Perspektywa — wspólne narzędzia (API opisane w DESIGN.md) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var subs = [], ticking = false, threeP = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function run() { ticking = false; var y = window.scrollY, vh = window.innerHeight; for (var i = 0; i < subs.length; i++) subs[i](y, vh); }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);

  var nf = {};
  function fmt(n, dec) {
    dec = dec || 0;
    if (!nf[dec]) nf[dec] = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return nf[dec].format(n);
  }

  function onVisible(el, fn, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(el); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { rootMargin: margin || '0px 0px -12% 0px' });
    io.observe(el);
  }

  window.SP = {
    get reduced() { return mq.matches; },
    clamp: clamp,
    lerp: function (a, b, t) { return a + (b - a) * t; },
    ss: function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    fmt: fmt,
    onScroll: function (fn) { subs.push(fn); req(); },
    progress: function (el) {
      var r = el.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top <= 0 ? 1 : 0);
    },
    onVisible: onVisible,
    /* three.js r128 wczytywany raz, leniwie: SP.three().then(function (THREE) { … }) */
    three: function () {
      if (window.THREE) return Promise.resolve(window.THREE);
      if (threeP) return threeP;
      threeP = new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.async = true;
        s.onload = function () { ok(window.THREE); };
        s.onerror = no;
        document.head.appendChild(s);
      });
      return threeP;
    }
  };

  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0);
    if (isNaN(to)) return;
    var fin = fmt(to, dec);
    if (SP.reduced) { el.textContent = fin; return; }
    /* zarezerwuj szerokość wyniku końcowego — licznik nie przesuwa sąsiedniego tekstu */
    el.textContent = fin;
    var w = el.getBoundingClientRect().width;
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.style.minWidth = Math.ceil(w) + 'px';
    var t0 = performance.now(), dur = 1100;
    (function step(t) {
      var k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e, dec);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function init() {
    var vh = window.innerHeight;
    document.querySelectorAll('.rv').forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * .9) { el.classList.add('in'); return; }
      onVisible(el, function (e) { e.classList.add('in'); });
    });
    document.querySelectorAll('[data-count]').forEach(function (el) { onVisible(el, countUp, '0px'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

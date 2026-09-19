/* ==========================================================================
   Przebitki wideo (B-roll) — montaż krótkich ujęć z filmów Andrzeja.
   Użycie:  <div class="broll" data-broll="2hard" [data-start="h-gran2"] [data-caption="…"]
                 [data-pos="45% 35%"] [data-hover] [data-nosrc] [data-eager]></div>
   data-broll = montaż z SP_BROLL.reels (albo pojedyncze ujęcie z SP_BROLL.shots — wtedy pętla).

   Sekwencer po stronie przeglądarki: dwa nałożone <video>, osobny plik na ujęcie.
   - najpierw plakat (stałe proporcje, bez przeskoku); pierwsze ujęcie dopiero przy ekranie;
   - kolejne ujęcie pobierane dopiero, gdy bieżące dojdzie do ~70%, potem miękkie przenikanie ~300 ms;
   - ujęcia wspólne dla wielu montaży/stron trafiają do pamięci podręcznej — płaci się tylko za obejrzane sekundy;
   - pauza poza ekranem i przy ukrytej karcie; data-hover: odtwarzanie tylko po najechaniu/fokusie;
   - nic nie jest pobierane przy prefers-reduced-motion, Oszczędzaniu danych i wolnym łączu (zostaje plakat);
   - ukryty odnośnik do filmu na YouTube (SPFX.src), chyba że element jest w linku lub ma data-nosrc.
   Dla treści dokładanej później: window.SPBROLL.scan(root)
   ========================================================================== */
(function () {
  'use strict';
  var DATA = window.SP_BROLL || { shots: {}, reels: {} };
  var SHOTS = DATA.shots || {}, REELS = DATA.reels || {}, BASE = DATA.base || 'assets/video/shots/';
  var FADE = 320, PRELOAD_AT = .7;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  var mqRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var mqHover = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var probe = document.createElement('video');
  var isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  var WEBM = !isSafari && probe.canPlayType && probe.canPlayType('video/webm; codecs="vp9"') === 'probably';
  var items = [];

  function lite() {
    return mqRM.matches || conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
  }
  function tier(el) {
    var css = el.getBoundingClientRect().width, dpr = Math.min(window.devicePixelRatio || 1, 2), px = css * dpr;
    var net = conn.effectiveType || '', fast = !net || net === '4g';
    if (fast && css > 900 && px > 1500) return '1080';   // duże miejsca na szerokich/Retina ekranach
    if (css > 560 || px > 900) return '720';
    return '480';
  }

  /* plik ujęcia: mniejszy z MP4/WebM (WebM tylko tam, gdzie VP9 jest pewne) */
  function url(id, t) {
    var s = SHOTS[id], f = s && (s.f[t] || s.f['720'] || s.f['480']);
    if (!f) return '';
    return BASE + f[0] + (WEBM && f[2] < f[1] ? '.webm' : '.mp4');
  }

  function mkVideo() {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.setAttribute('disablepictureinpicture', ''); v.setAttribute('disableremoteplayback', '');
    v.tabIndex = -1;
    v.preload = 'auto';
    v.className = 'broll-v';
    return v;
  }

  function build(el) {
    if (el.__broll) return;
    var id = el.getAttribute('data-broll'), reel = REELS[id], list;
    if (reel) list = reel.shots.filter(function (s) { return SHOTS[s]; });
    else if (SHOTS[id]) { list = [id]; reel = { poster: SHOTS[id].p || '', youtube: '', event: '' }; }
    if (!list || !list.length) return;
    var st = el.getAttribute('data-start'), i0 = st ? Math.max(0, list.indexOf(st)) : 0;
    el.__broll = true;
    el.classList.add('broll');
    if (el.getAttribute('data-pos')) el.style.setProperty('--broll-pos', el.getAttribute('data-pos'));
    var poster = (st && SHOTS[st] && SHOTS[st].p) || reel.poster;
    if (poster && !el.querySelector(':scope > .broll-poster')) {
      var im = document.createElement('img');
      im.className = 'broll-poster';
      im.alt = '';
      im.setAttribute('aria-hidden', 'true');
      im.width = 1280; im.height = 560;
      im.decoding = 'async';
      im.loading = el.hasAttribute('data-eager') ? 'eager' : 'lazy';
      im.src = poster;
      el.insertBefore(im, el.firstChild);
    }
    var cap = el.getAttribute('data-caption'), capEl = null;
    if (cap) {
      capEl = document.createElement('p');
      capEl.className = 'broll-cap';
      capEl.textContent = cap;
      el.appendChild(capEl);
      el.classList.add('has-cap');
    }
    if (reel.youtube && !el.closest('a') && !el.hasAttribute('data-nosrc') && window.SPFX && SPFX.src) {
      SPFX.src(capEl || el, reel.youtube, 'def', 'YouTube, film ' + reel.event);
    }
    var it = { el: el, list: list, i: i0, cur: null, nxt: null, nxtIdx: -1, vis: false, hov: false, started: false, switching: false, raf: 0,
               hoverOnly: el.hasAttribute('data-hover') && mqHover.matches, t: '480' };
    items.push(it);
    el.__it = it;
    if (it.hoverOnly) {
      var host = el.closest('a') || el;
      host.addEventListener('pointerenter', function () { it.hov = true; start(it); sync(it); });
      host.addEventListener('pointerleave', function () { it.hov = false; sync(it); });
      host.addEventListener('focusin', function () { it.hov = true; start(it); sync(it); });
      host.addEventListener('focusout', function () { it.hov = false; sync(it); });
    }
    seen.observe(el);
  }

  /* ---------- sekwencer ---------- */
  function load(v, it, idx) {
    v.__idx = idx; v.__ready = false;
    v.oncanplay = function () { v.__ready = true; };
    v.src = url(it.list[idx], it.t);
    try { v.load(); } catch (e) {}
  }
  function start(it) {
    if (it.started || lite()) return;
    it.started = true;
    it.t = tier(it.el);
    it.cur = mkVideo(); it.nxt = mkVideo();
    var cap = it.el.querySelector(':scope > .broll-cap');
    it.el.insertBefore(it.cur, cap || null);
    it.el.insertBefore(it.nxt, cap || null);
    load(it.cur, it, it.i);
    it.cur.addEventListener('playing', function () { it.cur.classList.add('is-on'); it.el.classList.add('on'); }, { once: true });
    it.cur.addEventListener('ended', function () { advance(it); });
    it.nxt.addEventListener('ended', function () { advance(it); });
  }
  function want(it) { return it.started && !document.hidden && (it.hoverOnly ? it.hov : it.vis); }
  function sync(it) {
    if (!it.started) return;
    if (want(it)) {
      var p = it.cur.play(); if (p && p.catch) p.catch(function () {});
      if (!it.raf) it.raf = requestAnimationFrame(function f() { tick(it); it.raf = want(it) ? requestAnimationFrame(f) : 0; });
    } else {
      it.cur.pause(); if (!it.switching) it.nxt.pause();
      if (it.raf) { cancelAnimationFrame(it.raf); it.raf = 0; }
    }
  }
  function nextIdx(it) { return (it.i + 1) % it.list.length; }
  function tick(it) {
    var v = it.cur, d = v.duration;
    if (!d || isNaN(d) || it.list.length < 2) {
      if (it.list.length < 2 && d && v.currentTime >= d - .05) { v.currentTime = 0; v.play(); }
      return;
    }
    var n = nextIdx(it);
    if (v.currentTime >= d * PRELOAD_AT && it.nxtIdx !== n) { it.nxtIdx = n; load(it.nxt, it, n); }
    if (!it.switching && v.currentTime >= d - FADE / 1000 && it.nxt.__ready && it.nxt.__idx === n) swap(it);
  }
  function advance(it) {   // ujęcie się skończyło, a następne nie było gotowe — przełącz, gdy tylko będzie
    if (it.switching) return;
    var n = nextIdx(it);
    if (it.nxtIdx !== n) { it.nxtIdx = n; load(it.nxt, it, n); }
    if (it.nxt.__ready) swap(it);
    else it.nxt.oncanplay = function () { it.nxt.__ready = true; if (want(it)) swap(it); };
  }
  function swap(it) {
    it.switching = true;
    var a = it.cur, b = it.nxt;
    try { b.currentTime = 0; } catch (e) {}
    var p = b.play(); if (p && p.catch) p.catch(function () {});
    b.style.zIndex = 2; a.style.zIndex = 1;
    b.classList.add('is-on');
    setTimeout(function () {
      a.classList.add('no-tr'); a.classList.remove('is-on');
      a.pause();
      void a.offsetWidth; a.classList.remove('no-tr');
      it.cur = b; it.nxt = a; it.i = b.__idx; it.nxtIdx = -1; it.switching = false;
      if (!want(it)) b.pause();
    }, FADE + 40);
  }

  var io = 'IntersectionObserver' in window;
  var seen = io ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var it = e.target.__it;
      if (!it) return;
      it.vis = e.isIntersecting;
      if (it.vis && !it.hoverOnly) start(it);
      sync(it);
    });
  }, { rootMargin: '150px 0px', threshold: 0 }) : { observe: function () {} };

  document.addEventListener('visibilitychange', function () { items.forEach(sync); });
  if (mqRM.addEventListener) mqRM.addEventListener('change', function () {
    if (!mqRM.matches) return;
    items.forEach(function (it) { if (it.started) { it.cur.pause(); it.nxt.pause(); it.el.classList.remove('on'); } });
  });

  function scan(root) { (root || document).querySelectorAll('[data-broll]').forEach(build); }
  window.SPBROLL = { scan: scan, data: DATA };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();
})();

/* ==========================================================================
   Zdjęcia: bez ucinania + dynamiczne przesuwanie przy przewijaniu (cała strona)
   1) Duże zdjęcie, z którego kadr pokazuje < 78% (np. pion w poziomej ramce),
      dostaje własne proporcje (max 86% wysokości okna) — nic nie jest ucinane.
   2) Zdjęcie przycięte lekko: przy przewijaniu kadr przesuwa się po ukrytej części
      (Ken Burns sterowany scrollem), więc całe zdjęcie da się zobaczyć.
   3) Zdjęcie w ramce z overflow:hidden: subtelna paralaksa z lekkim powiększeniem.
   Wyłączenia: hero, canvas/3D, loga, miniatury, [data-nopan]. SP.reduced → bez ruchu.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.SP) return;
  var SKIP = '.hero, .pg-hero, .hdr, header.hdr, [data-nopan], .fx, .logo, .logos, [class*="logo"], .mw, #medale, #ewolucja, #trasy, #mapa, #backyard, .glos-intro';
  var items = [];

  function eligible(im) {
    if (im.__foto || im.closest(SKIP)) return false;
    var src = im.currentSrc || im.src || '';
    if (!/\/assets\/img\//.test(src) || /\/logos\/|logo|\.svg/.test(src)) return false;
    var cs = getComputedStyle(im);
    return cs.objectFit === 'cover' && im.clientWidth >= 160;
  }

  function prep(im) {
    /* wymiary naturalne z atrybutów (dopisuje je build) — decyzja zapada przed wczytaniem, bez przeskoku po load */
    var w = im.clientWidth, h = im.clientHeight, nw = +im.getAttribute('width') || im.naturalWidth, nh = +im.getAttribute('height') || im.naturalHeight;
    if (!w || !h || !nw || !nh) return;
    var box = w / h, nat = nw / nh, vis = nat < box ? nat / box : box / nat, big = w > Math.min(window.innerWidth * .4, 520);
    var it = { im: im, ax: null, par: false };
    var absolute = getComputedStyle(im).position === 'absolute';   // ramki-nakładki (crossfade) zostają w cover
    if (vis < .66 && big && !absolute) {
      /* bez ucinania: naturalne proporcje, rozsądna wysokość */
      var par = im.parentElement;
      im.style.aspectRatio = nw + ' / ' + nh;
      im.style.height = 'auto';
      im.style.maxHeight = '86svh';
      /* szerokość jawna: pion — ile pozwala wysokość (86svh), nigdy więcej niż kontener; poziom — pełna */
      im.style.width = nat < box ? 'min(100%, calc(86svh * ' + (nw / nh).toFixed(4) + '))' : '100%';
      im.style.maxWidth = '100%';
      im.style.marginInline = 'auto';
      im.style.objectFit = 'contain';
      if (par && par.children.length === 1) {
        var pcs = getComputedStyle(par);
        if (pcs.aspectRatio !== 'auto') par.style.aspectRatio = 'auto';
        if (parseFloat(pcs.height) && pcs.position !== 'absolute') par.style.height = 'auto';
        par.style.background = 'transparent';
      }
    } else if (vis < .985) {
      it.ax = nat < box ? 'y' : 'x';     // przesuwanie po ukrytej osi
    }
    var p = im.parentElement, pov = p && getComputedStyle(p).overflow;
    it.par = !!p && (pov === 'hidden' || pov === 'clip') && getComputedStyle(im).position !== 'absolute';
    items.push(it);
    im.__foto = true;
  }

  function collect() {
    document.querySelectorAll('main img').forEach(function (im) {
      if (!eligible(im)) return;
      if ((im.getAttribute('width') && im.getAttribute('height')) || (im.complete && im.naturalWidth)) prep(im);
      else im.addEventListener('load', function () { if (eligible(im)) { prep(im); update(); } }, { once: true });
    });
  }

  function update() {
    if (SP.reduced) return;
    var vh = window.innerHeight;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], r = it.im.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var t = SP.clamp((vh - r.top) / (vh + r.height), 0, 1), e = t * t * (3 - 2 * t);
      if (it.ax === 'y') it.im.style.objectPosition = '50% ' + (6 + e * 88).toFixed(1) + '%';
      else if (it.ax === 'x') it.im.style.objectPosition = (6 + e * 88).toFixed(1) + '% 50%';
      if (it.par) it.im.style.transform = 'translate3d(0,' + ((.5 - t) * 3).toFixed(2) + '%,0) scale(1.04)';
    }
  }

  function start() {
    collect();
    SP.onScroll(update);
    setTimeout(function () { collect(); update(); }, 1500);   // treści dokładane przez JS innych sekcji
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('load', function () { collect(); update(); });
})();

/* 00 nagłówek: tryb (nad hero / jasny / ciemny), chowanie paska, aktywna sekcja, menu, odliczanie */
(function () {
  'use strict';
  var hdr = document.getElementById('hdr');
  if (!hdr || !window.SP) return;
  var burger = document.getElementById('hdrBurger'), menu = document.getElementById('hdrMenu'), cd = document.getElementById('hdrCd');
  var hero = document.getElementById('start');
  var lastY = window.scrollY, menuOpen = false;

  /* --- odliczanie do Backyard na Dziko --- */
  var START = Date.parse('2026-10-01T10:00:00+02:00'), END = START + 72 * 3600e3;
  function countdown() {
    if (!cd) return;
    var now = Date.now();
    if (now < START) {
      var h = Math.floor((START - now) / 3600e3), d = Math.floor(h / 24);
      h -= d * 24;
      cd.textContent = d > 0 ? 'za ' + d + ' ' + (d === 1 ? 'dzień' : 'dni') + ' ' + h + ' godz.' : 'za ' + h + ' godz.';
    } else if (now < END) {
      cd.textContent = 'trwa, pętla ' + Math.min(72, Math.floor((now - START) / 3600e3) + 1) + ' z 72';
    } else {
      cd.textContent = '';
    }
  }
  countdown();
  setInterval(countdown, 30e3);

  /* --- tryb nagłówka zależnie od sekcji pod nim --- */
  function darkSections() { return document.querySelectorAll('main > section.dark, main > section[data-hdr="dark"], main > header.dark, footer.dark'); }
  var darks = darkSections();

  function mode(probe) {
    if (hero) { var r = hero.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) return 'over'; }
    for (var i = 0; i < darks.length; i++) {
      var b = darks[i].getBoundingClientRect();
      if (b.top <= probe && b.bottom > probe) return 'dark';
    }
    return 'light';
  }

  SP.onScroll(function (y) {
    if (!menuOpen) {
      if (y > 160 && y > lastY + 4) hdr.classList.add('tuck');
      else if (y < lastY - 4 || y <= 160) hdr.classList.remove('tuck');
    }
    lastY = y;
    darks = darkSections();   // sekcje mogą zmieniać ton w trakcie (np. #glos)
    var m = mode(hdr.getBoundingClientRect().bottom - 1);   // dolna krawędź po ew. schowaniu paska
    hdr.classList.toggle('m-over', m === 'over');
    hdr.classList.toggle('m-light', m === 'light');
    hdr.classList.toggle('m-dark', m === 'dark');
  });

  /* --- aktywna pozycja menu --- */
  var links = hdr.querySelectorAll('.hdr-links a');
  var map = {};
  links.forEach(function (a) { var h = a.getAttribute('href') || ''; if (h.charAt(0) === '#') map[h.slice(1)] = a; });
  var onPage = hdr.querySelector('.hdr-links a[aria-current="page"]');
  if (onPage) onPage.classList.add('on');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(map).forEach(function (k) { map[k].classList.remove('on'); map[k].removeAttribute('aria-current'); });
        var a = map[e.target.id];
        if (a) { a.classList.add('on'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    function watch() {
      Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
      ['start', 'kim', 'mapa', 'backyard', 'kontakt'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) io.observe(el);   // sekcje bez pozycji w menu gaszą podświetlenie
      });
    }
    if (document.readyState === 'complete') watch(); else window.addEventListener('load', watch);
  }

  /* --- menu mobilne --- */
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    hdr.classList.toggle('menu-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      hdr.classList.remove('tuck');
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('open'); });
    } else {
      menu.classList.remove('open');
      menu.hidden = true;
    }
  }
  if (burger && menu) {
    menu.querySelectorAll('a').forEach(function (a, i) { a.style.setProperty('--i', i); a.addEventListener('click', function () { setMenu(false); }); });
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (menuOpen && window.innerWidth > 1179) setMenu(false); });
  }
})();

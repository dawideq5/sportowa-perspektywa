/* @when data-film
   ==========================================================================
   09 Film — odtwarzanie filmów na stronie, w oknie nad treścią (komponent globalny, [data-film]).
   Użycie: <a href="assets/video/film/sponsoring-720.mp4" data-film="sponsoring">…</a>
   Filmy są opisane w FILMS; każdy parametr można nadpisać atrybutem (data-film-hd, -sd, -poster, -vtt,
   -title, -sub, -source), więc nowy film wymaga tylko atrybutów. Bez JS odnośnik otwiera plik MP4.
   Dźwięk dopiero po kliknięciu. 1080p tylko na dużym ekranie; telefon, oszczędzanie danych i wolne łącze: 720p.
   Napisy PL do włączenia w odtwarzaczu. Esc, tło lub ✕ zamyka i wstrzymuje film; ponowne otwarcie
   tego samego filmu wznawia od miejsca zatrzymania. build.py ładuje skrypt tylko na stronach z [data-film].
   ========================================================================== */
(function () {
  'use strict';
  var FILMS = {
    sponsoring: {
      hd: 'assets/video/film/sponsoring-1080.mp4',
      sd: 'assets/video/film/sponsoring-720.mp4',
      poster: 'assets/video/film/sponsoring-poster.webp',
      vtt: 'assets/video/film/sponsoring.pl.vtt',
      title: 'Sponsoring sportowy',
      sub: 'współpraca z wartościami',
      source: 'https://www.youtube.com/watch?v=Gn1bZqwkpHM'
    }
  };
  var KEYS = ['hd', 'sd', 'poster', 'vtt', 'title', 'sub', 'source'];
  var box, video, cap, src, bClose, cur = null, last = null, opened = false;

  function conf(t) {
    var f = {}, base = FILMS[t.getAttribute('data-film')] || {};
    KEYS.forEach(function (k) { f[k] = t.getAttribute('data-film-' + k) || base[k] || ''; });
    if (!f.sd && !f.hd) f.sd = t.getAttribute('href') || '';
    return f;
  }
  /* 1080p tylko przy kadrze ≥ 900 px CSS; inaczej (i przy oszczędzaniu danych lub wolnym łączu) 720p */
  function pick(f) {
    var c = navigator.connection || {}, css = Math.min(innerWidth, 1280, (innerHeight - 170) * 16 / 9);
    var hd = css >= 900 && css * (window.devicePixelRatio || 1) >= 1100 && !c.saveData && !/(^|-)[23]g$/.test(c.effectiveType || '');
    return (hd && f.hd) || f.sd || f.hd;
  }
  function host(u) { try { return new URL(u, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function label(u) { var h = host(u); return /youtu\.?be/.test(h) ? 'YouTube' : h; }

  function build() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'film';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.hidden = true;
    box.innerHTML =
      '<div class="film-stage"><video controls playsinline preload="none"></video></div>' +
      '<div class="film-bar"><p class="film-cap"></p>' +
      '<a class="film-src" target="_blank" rel="noopener"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4"/></svg><span></span></a></div>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Zamknij film"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    video = box.querySelector('video');
    cap = box.querySelector('.film-cap');
    src = box.querySelector('.film-src');
    bClose = box.querySelector('.lb-close');
    bClose.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('film-bar')) close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') {   // fokus zostaje w oknie: odtwarzacz → źródło → zamknij
        var f = [video, src, bClose].filter(function (x) { return !x.hidden; }), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    video.addEventListener('ended', function () { if (opened) bClose.focus(); });
    document.body.appendChild(box);
  }
  function load(f, id) {
    if (cur === id) return;
    cur = id;
    video.pause();
    [].forEach.call(video.querySelectorAll('track'), function (x) { x.remove(); });
    video.poster = f.poster;
    if (f.vtt) {
      var tr = document.createElement('track');
      tr.kind = 'subtitles'; tr.srclang = 'pl'; tr.label = 'Polski'; tr.src = f.vtt;
      video.appendChild(tr);
    }
    video.src = pick(f);
    box.setAttribute('aria-label', 'Film: ' + (f.title || 'wideo'));
    cap.textContent = f.title;
    if (f.sub) { var s = document.createElement('span'); s.textContent = ' · ' + f.sub; cap.appendChild(s); }
    src.hidden = !f.source;
    if (f.source) {
      src.href = f.source;
      src.lastChild.textContent = label(f.source);
      src.setAttribute('aria-label', 'Źródło: ' + label(f.source));
    }
  }
  function open(t) {
    var f = conf(t);
    if (!f.sd && !f.hd) return false;
    build();
    load(f, t.getAttribute('data-film') || f.sd);
    /* z elementu poza kolejnością Tab (np. kadr) fokus po zamknięciu wraca do widocznego przycisku tego filmu */
    last = t.tabIndex < 0 ? ((t.closest('article, li, figure') || document).querySelector('[data-film="' + t.getAttribute('data-film') + '"]:not([tabindex="-1"])') || t) : t;
    opened = true;
    document.documentElement.classList.add('lb-open');   // blokada przewijania jak w lightboksie
    box.hidden = false;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    requestAnimationFrame(function () { box.classList.add('on'); video.focus({ preventScroll: true }); });
    return true;
  }
  function close() {
    if (!opened) return;
    opened = false;
    video.pause();
    if (document.fullscreenElement === video && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    box.classList.remove('on');
    document.documentElement.classList.remove('lb-open');
    var done = function () { if (!opened) box.hidden = true; };
    if (window.SP && SP.reduced) done(); else setTimeout(done, 260);
    if (last && last.focus) last.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target.closest ? e.target.closest('[data-film]') : null;
    if (t && open(t)) e.preventDefault();
  });

  window.SPFILM = { open: open, close: close, films: FILMS };
})();

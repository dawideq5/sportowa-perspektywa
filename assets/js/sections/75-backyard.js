/* Backyard na Dziko: odliczanie, oś 72 godzin i konturowa mapa Jeziora Paprocany
   z jednym delikatnym ruchem — biegaczem (kropką) na prawdziwej pętli wokół jeziora. */
(function () {
  'use strict';
  var sec = document.getElementById('backyard');
  if (!sec || !window.SP) return;

  var START = Date.UTC(2026, 9, 1, 8, 0, 0);   // 1.10.2026, 10:00 czasu polskiego (CEST)
  var HOUR = 3600000, LOOPS = 72, KM = 6.7, END = START + LOOPS * HOUR;
  var RUN_MIN = KM * 6.17;                      // ok. 41 min biegu przy 6:10 min/km
  var DAYS = ['czwartek, 1 października', 'piątek, 2 października', 'sobota, 3 października', 'niedziela, 4 października'];
  var DSHORT = ['czw', 'pt', 'sob', 'nd', 'pon'];

  var $ = function (id) { return document.getElementById(id); };
  var elD = $('byD'), elH = $('byH'), elM = $('byM'), elS = $('byS'), elState = $('byState');
  var strip = $('byStrip'), daysEl = $('byDays'), range = $('byRange'), cal = $('byCal');
  var elNum = $('byNum'), elKm = $('byKm'), clockEl = $('byClock'), liveEl = $('byLive');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function km(v) { return v === 0 ? '0' : SP.fmt(v, 1); }
  function hourOf(n) { return (9 + n) % 24; }
  function dayOf(n) { return Math.floor((9 + n) / 24); }

  /* ---------- oś 72 godzin ---------- */
  var segs = [];
  if (strip) {
    for (var i = 1; i <= LOOPS; i++) {
      var s = document.createElement('i'), h = hourOf(i);
      if (h < 7 || h >= 18) s.className = 'night';
      strip.appendChild(s); segs.push(s);
    }
  }
  if (daysEl) [[1, 'czw 10:00'], [15, 'pt'], [39, 'sob'], [63, 'nd']].forEach(function (t) {
    var d = document.createElement('span');
    d.style.left = ((t[0] - 1) / LOOPS * 100).toFixed(3) + '%';
    d.textContent = t[1];
    daysEl.appendChild(d);
  });
  function sizeThumb() { if (range) range.style.setProperty('--tw', (range.clientWidth / LOOPS).toFixed(2) + 'px'); }
  sizeThumb();
  window.addEventListener('resize', sizeThumb);

  /* ---------- wybór pętli ---------- */
  var sel = 1, shown = 1, current = 0, live = 0, map = null;
  function iso(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }
  function show(n) {
    if (segs[shown - 1]) segs[shown - 1].classList.remove('sel');
    shown = n;
    if (segs[n - 1]) segs[n - 1].classList.add('sel');
  }
  var labeled = 0;
  function label(n) {
    if (n === labeled) return;
    labeled = n;
    if (elNum) elNum.textContent = n;
    if (elKm) elKm.textContent = km((n - 1) * KM) + ' → ' + km(n * KM) + ' km';
    if (clockEl) clockEl.textContent = DSHORT[dayOf(n)] + ' ' + pad(hourOf(n)) + ':00';
    if (liveEl) liveEl.hidden = !(live && n === live);
  }
  function setSel(n, byUser) {
    n = SP.clamp(Math.round(n), 1, LOOPS);
    sel = n;
    show(n);
    if (!(map && byUser && map.animated())) label(n);   // podczas biegu licznik tyka z każdym okrążeniem
    if (range && +range.value !== n) range.value = n;
    if (range) range.setAttribute('aria-valuetext', 'Pętla ' + n + ', ' + DAYS[dayOf(n)] + ', ' + pad(hourOf(n)) + ':00');
    var t0 = START + (n - 1) * HOUR;
    if (cal) cal.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Backyard na Dziko, pętla ' + n) +
      '&dates=' + iso(t0) + '/' + iso(t0 + HOUR) +
      '&location=' + encodeURIComponent('Jezioro Paprocany, Tychy') +
      '&details=' + encodeURIComponent('Pętla 6,7 km wokół Jeziora Paprocany. Zbiórka: https://www.siepomaga.pl/backyard-na-dziko');
    if (map && byUser) map.select(n);
  }
  if (range) range.addEventListener('input', function () { setSel(+range.value, true); });
  window.SPBackyard = { select: function (n) { setSel(n, true); } };

  /* ---------- odliczanie ---------- */
  function paint(n) {
    if (n === current) return;
    current = n;
    for (var i = 0; i < segs.length; i++) {
      segs[i].classList.toggle('done', i + 1 < n);
      segs[i].classList.toggle('now', i + 1 === n);
    }
  }
  function tick() {
    var now = Date.now(), diff, n = 0, state;
    if (now < START) { diff = START - now; state = 'do startu'; }
    else if (now < END) { n = Math.floor((now - START) / HOUR) + 1; diff = END - now; state = 'trwa pętla ' + n + ' z ' + LOOPS; }
    else { diff = 0; n = LOOPS + 1; state = 'zakończone'; }
    var s = Math.floor(diff / 1000);
    if (elD) {
      elD.textContent = pad(Math.floor(s / 86400));
      elH.textContent = pad(Math.floor(s % 86400 / 3600));
      elM.textContent = pad(Math.floor(s % 3600 / 60));
      elS.textContent = pad(s % 60);
    }
    if (elState && elState.textContent !== state) elState.textContent = state;
    paint(n);
    var was = live;
    live = n >= 1 && n <= LOOPS ? n : 0;
    if (liveEl) liveEl.hidden = !(live && labeled === live);
    if (map && was !== live) map.setLive(live);
    return n;
  }

  var n0 = tick();
  setSel(n0 >= 1 && n0 <= LOOPS ? n0 : 1);
  setInterval(tick, 1000);

  /* ======================================================================
     Mapa konturowa: pętla jest ścieżką SVG (dane © OpenStreetMap).
     Jeden ruch: kropka okrąża pętlę spokojnym tempem, za nią gasnący ślad,
     a przebyta część pętli jest delikatnie jaśniejsza. Zmiana pętli o X na osi
     = kropka szybko przebiega X okrążeń (wstecz przy cofaniu) i staje na starcie.
     ====================================================================== */
  var fig = $('byMap'), lp = $('byLp'), dot = $('byDot');
  if (!fig || !lp || !dot || !lp.getTotalLength) return;
  var svg = lp.ownerSVGElement, vb = svg.viewBox.baseVal;
  var L = lp.getTotalLength();
  function clone(cls) { var p = lp.cloneNode(false); p.removeAttribute('id'); p.setAttribute('class', cls); lp.parentNode.insertBefore(p, lp.nextSibling); return p; }
  var trails = [clone('by-tr by-tr3'), clone('by-tr by-tr2'), clone('by-tr by-tr1')];
  var done = clone('by-done');
  var TR = [.16, .09, .045];   // długości śladu (ułamek pętli), od najdłuższego i najsłabszego

  /* 1 px ekranu w jednostkach mapy — grubość kresek śladu niezależna od rozmiaru */
  function unit() { var w = svg.getBoundingClientRect().width; if (w) svg.style.setProperty('--u', (vb.width / w).toFixed(3)); }
  unit();
  window.addEventListener('resize', unit);

  /* pozycja kropki w okrążeniach (float): start pętli n = n − 1; część ułamkowa = miejsce na pętli */
  var pos = 0;
  function mod(x, m) { return ((x % m) + m) % m; }
  function place(frac, dOp, dir, spd, idle) {
    frac = SP.clamp(frac, 0, 1);
    var s = frac * L, p = lp.getPointAtLength(s >= L ? L - .01 : s);
    dot.style.left = ((p.x - vb.x) / vb.width * 100).toFixed(3) + '%';
    dot.style.top = ((p.y - vb.y) / vb.height * 100).toFixed(3) + '%';
    done.style.strokeDasharray = s.toFixed(1) + ' ' + (L + 2).toFixed(1);
    done.style.opacity = dOp.toFixed(3);
    var blur = 1 + SP.clamp(spd / 1.5, 0, 3);   // przy dużej prędkości dłuższy ślad, jak rozmycie ruchu
    var show = idle ? (frac > .002 && frac < 1) : spd > .02;
    for (var i = 0; i < trails.length; i++) {
      var len = Math.min(TR[i] * L * blur, L * .7);
      if (idle) len = Math.min(len, s);
      var st = dir >= 0 ? s - len : s;
      trails[i].style.strokeDasharray = len.toFixed(1) + ' ' + Math.max(.1, L - len).toFixed(1);
      trails[i].style.strokeDashoffset = mod(-st, L).toFixed(1);
      trails[i].style.opacity = show && len > .5 ? '' : 0;
    }
  }

  /* rytm pętli w podglądzie: 20 s biegu (≈ 41 min), 10 s odpoczynku na starcie (≈ 19 min) */
  var RUN = 20000, REST = 10000, LAP = RUN + REST;
  function easeIO(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lapPos(ms) {
    var t = ms % LAP;
    if (t < RUN) { var k = t / RUN; return { f: k * .96 + easeIO(k) * .04, op: 1 }; }   // prawie stałe tempo
    var r = (t - RUN) / REST;
    return { f: 1, op: 1 - SP.ss(.15, .85, r) };   // przebyta pętla powoli gaśnie przed kolejną
  }
  /* pozycja na żywo: minuty od pełnej godziny przy tempie 6:10 min/km */
  function livePos() {
    var m = ((Date.now() - START) % HOUR) / 60000;
    return m < RUN_MIN ? { f: m / RUN_MIN, op: 1 } : { f: 1, op: 1 - SP.ss(RUN_MIN, 60, m) };
  }
  function liveSel() { return live && sel === live; }

  /* pościg: odcinek Hermite'a od bieżącej pozycji i prędkości do celu (prędkość końcowa 0).
     Czas rośnie wolniej niż dystans: 1 okrążenie ≈ 0,5 s, wiele okrążeń maks. ≈ 2,8 s. */
  var seg = null;
  function dur(d) { return SP.clamp(.5 * Math.pow(d, .42), .22, 2.8); }
  function evalSeg(now) {
    var t = SP.clamp((now - seg.t0) / 1000 / seg.T, 0, 1), t2 = t * t, t3 = t2 * t, T = seg.T;
    var p = (2 * t3 - 3 * t2 + 1) * seg.p0 + (t3 - 2 * t2 + t) * T * seg.v0 + (-2 * t3 + 3 * t2) * seg.p1;
    var v = ((6 * t2 - 6 * t) * seg.p0 + (3 * t2 - 4 * t + 1) * T * seg.v0 + (-6 * t2 + 6 * t) * seg.p1) / T;
    return { p: p, v: v, end: t >= 1 };
  }
  function chase(target, now) {
    var p = pos, v = 0;
    if (seg) { var e = evalSeg(now); p = e.p; v = e.v; }
    var d = target - p, ad = Math.abs(d);
    if (ad < 1e-5 && Math.abs(v) < 1e-3) { seg = null; pos = target; return; }
    var T = dur(Math.max(ad, .05));
    if (v * d > 0 && Math.abs(v) * T > 2.9 * ad) T = 2.9 * ad / Math.abs(v);   // bez przestrzelenia celu
    seg = { p0: p, v0: v, p1: target, T: Math.max(T, .12), t0: now };
  }

  var inView = false, visible = false, raf = 0, clock0 = performance.now();
  function frame(now) {
    raf = 0;
    var frac, op, dir = 1, spd = 0, idle = false;
    if (seg) {
      var e = evalSeg(now);
      pos = e.p; spd = Math.abs(e.v); dir = e.v >= 0 ? 1 : -1;
      if (e.end) { pos = seg.p1; seg = null; clock0 = now; spd = 0; }
    }
    if (seg) {
      frac = mod(pos, 1); op = 1 - .55 * SP.clamp(spd / 4, 0, 1);
      label(SP.clamp(Math.floor(pos + 1e-6) + 1, 1, LOOPS));
    } else {
      var t = liveSel() ? livePos() : lapPos(now - clock0);
      frac = t.f; op = t.op; idle = true;
      pos = sel - 1 + Math.min(t.f, .99999);
      label(sel);
    }
    place(frac, op, dir, spd, idle);
    if (visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !SP.reduced) raf = requestAnimationFrame(frame); }
  function target() { return sel - 1 + (liveSel() ? Math.min(livePos().f, .99999) : 0); }

  map = {
    animated: function () { return visible && !SP.reduced; },
    select: function () {
      if (!map.animated()) {   // ograniczony ruch albo mapa poza ekranem: od razu na start wybranej pętli
        seg = null; pos = target(); clock0 = performance.now();
        var t0 = liveSel() ? livePos() : { f: 0, op: 1 };
        place(t0.f, t0.op, 1, 0, true); label(sel);
        return;
      }
      chase(target(), performance.now());
      kick();
    },
    setLive: function () { kick(); }
  };
  pos = sel - 1;
  place(0, 1, 1, 0, true);
  if (SP.reduced) { var p0 = liveSel() ? livePos() : { f: 0, op: 1 }; place(p0.f, p0.op, 1, 0, true); return; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; visible = inView && !document.hidden; kick(); }, { rootMargin: '120px 0px' }).observe(fig);
  } else { inView = true; visible = true; kick(); }
  document.addEventListener('visibilitychange', function () { visible = inView && !document.hidden; kick(); });
})();

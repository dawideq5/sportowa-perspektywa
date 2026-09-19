/* Podstrona Backyard na Dziko: odliczanie w otwarciu i plan 72 pętli z dniem i nocą.
   Wybór pętli w planie (klik, klawiatura) przesuwa biegacza na mapie z części 75-backyard. */
(function () {
  'use strict';
  if (!window.SP || !document.getElementById('bypCd')) return;

  var START = Date.parse('2026-10-01T10:00:00+02:00'), HOUR = 3600e3, END = START + 72 * HOUR;
  var LOOP_KM = 6.7, LAT = 50.1236, LON = 18.987;
  var DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var DAYS_S = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
  var MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function km(n) { return SP.fmt(Math.round(n * LOOP_KM * 10) / 10, 1); }
  /* czas lokalny w Tychach (CEST, UTC+2 do 25.10.2026) */
  function local(t) { var d = new Date(t + 2 * HOUR); return { h: d.getUTCHours(), m: d.getUTCMinutes(), dow: d.getUTCDay(), day: d.getUTCDate(), mon: d.getUTCMonth() }; }
  function hm(t) { var l = local(t); return l.h + ':' + pad(l.m); }

  /* ---------- odliczanie ---------- */
  var cd = { d: $('bypD'), h: $('bypH'), m: $('bypM'), s: $('bypS') }, state = $('bypState');
  var labels = document.querySelectorAll('#bypCd i');
  function tick() {
    var now = Date.now(), diff, loop;
    if (now < START) {
      diff = START - now;
      var s = Math.floor(diff / 1000);
      cd.d.textContent = Math.floor(s / 86400);
      cd.h.textContent = pad(Math.floor(s % 86400 / 3600));
      cd.m.textContent = pad(Math.floor(s % 3600 / 60));
      cd.s.textContent = pad(s % 60);
    } else if (now < END) {
      diff = now - START;
      loop = Math.floor(diff / HOUR) + 1;
      var e = Math.floor(diff / 1000);
      cd.d.textContent = loop; cd.h.textContent = pad(Math.floor(e / 3600)); cd.m.textContent = pad(Math.floor(e % 3600 / 60)); cd.s.textContent = pad(e % 60);
      if (labels.length === 4) { labels[0].textContent = 'pętla'; labels[1].textContent = 'godz.'; labels[2].textContent = 'min'; labels[3].textContent = 'sek.'; }
      if (state) state.textContent = 'trwa, pętla ' + loop + ' z 72, za mną ok. ' + km(loop - 1) + ' km';
    } else {
      cd.d.textContent = '72'; cd.h.textContent = '72'; cd.m.textContent = '00'; cd.s.textContent = '00';
      if (labels.length === 4) { labels[0].textContent = 'pętle'; labels[1].textContent = 'godziny'; labels[2].textContent = 'min'; labels[3].textContent = 'sek.'; }
      if (state) state.textContent = '72 godziny wokół Jeziora Paprocany za nami';
    }
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- plan 72 pętli: dzień / noc z pozycji słońca nad Tychami ---------- */
  function sunAlt(t) {   // przybliżenie USNO, dokładność ~1°
    var rad = Math.PI / 180, d = t / 86400000 + 2440587.5 - 2451545.0;
    var g = (357.529 + 0.98560028 * d) * rad, q = (280.459 + 0.98564736 * d) % 360;
    var Lm = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
    var ra = Math.atan2(Math.cos(e) * Math.sin(Lm), Math.cos(Lm)) / rad / 15;
    var dec = Math.asin(Math.sin(e) * Math.sin(Lm));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    var ha = ((gmst + LON / 15 - ra) * 15) * rad;
    return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  }
  var UP = -0.833;
  function crossing(from, to, rising) {   // minuta przejścia przez horyzont w [from, to)
    for (var t = from; t < to; t += 60000) {
      var a = sunAlt(t) >= UP, b = sunAlt(t + 60000) >= UP;
      if (a !== b && b === rising) return t + 60000;
    }
    return null;
  }

  var grid = $('bypDaysGrid'), cap = $('bypDaysCap');
  if (grid && cap) {
    var MARK = { 1: 'start', 24: '24 pętle, 100 mil', 29: '29 pętli na Sowim', 72: 'meta, 482,4 km' };
    var cells = [], sel = 0;
    for (var day = 0; day < 3; day++) {
      var from = START + day * 24 * HOUR, to = from + 24 * HOUR;
      var set = crossing(from, to, false), rise = crossing(from, to, true);
      var row = document.createElement('div'); row.className = 'byp-row';
      var lf = local(from), lt = local(to);
      row.innerHTML = '<p class="byp-row-l"><b>Doba ' + (day + 1) + '</b>' + DAYS_S[lf.dow] + ' ' + lf.day + '.' + (lf.mon + 1) + ' → ' + DAYS_S[lt.dow] + ' ' + lt.day + '.' + (lt.mon + 1) +
        (set && rise ? '<br><small>zachód ' + hm(set) + ', wschód ' + hm(rise) + '</small>' : '') + '</p>';
      var wrap = document.createElement('div');
      var cw = document.createElement('div'); cw.className = 'byp-cells';
      var tk = document.createElement('div'); tk.className = 'byp-ticks'; tk.setAttribute('aria-hidden', 'true');
      for (var h = 0; h < 24; h++) {
        var n = day * 24 + h + 1, t = START + (n - 1) * HOUR;
        var a0 = sunAlt(t), a1 = sunAlt(t + 40 * 60000);
        var c = document.createElement('span');
        c.className = 'byp-c';
        if (a0 < UP && a1 < UP) c.classList.add('n');
        else if (a0 >= UP && a1 < UP) c.classList.add('tw');
        else if (a0 < UP && a1 >= UP) c.classList.add('tw', 'rise');
        c.dataset.n = n;
        if (MARK[n]) {
          c.classList.add('m');
          var ml = document.createElement('span');
          ml.className = 'ml' + (h === 0 ? ' l0' : h === 23 ? ' l1' : '');
          ml.textContent = MARK[n];
          c.appendChild(ml);
        }
        cw.appendChild(c); cells.push(c);
        var s = document.createElement('span');
        s.textContent = h % 4 === 0 ? local(t).h + ':00' : '';
        tk.appendChild(s);
      }
      wrap.appendChild(cw); wrap.appendChild(tk);
      row.appendChild(wrap);
      grid.appendChild(row);
    }
    grid.tabIndex = 0;
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Plan 72 pętli, strzałki zmieniają pętlę');

    function describe(n) {
      var t = START + (n - 1) * HOUR, l = local(t), c = cells[n - 1];
      var pora = c.classList.contains('n') ? 'noc' : c.classList.contains('tw') ? (c.classList.contains('rise') ? 'świt' : 'zmierzch') : 'dzień';
      return '<b>Pętla ' + n + '</b>, ' + DAYS[l.dow] + ' ' + l.day + ' ' + MONTHS[l.mon] + ', ' + l.h + ':00. Po tej pętli ' + km(n) + ' km. ' + pora.charAt(0).toUpperCase() + pora.slice(1) + '.';
    }
    function select(n) {
      n = Math.max(1, Math.min(72, n));
      if (sel) cells[sel - 1].classList.remove('sel');
      sel = n; cells[n - 1].classList.add('sel');
      cap.innerHTML = describe(n);
    }
    function live() {
      var now = Date.now();
      cells.forEach(function (c, i) {
        var t = START + i * HOUR;
        c.classList.toggle('now', now >= t && now < t + HOUR);
        c.classList.toggle('done', now >= t + HOUR && now < END + 7 * 24 * HOUR);
      });
    }
    grid.addEventListener('pointerover', function (e) { var c = e.target.closest('.byp-c'); if (c) select(+c.dataset.n); });
    function toMap(n) { if (window.SPBackyard) window.SPBackyard.select(n); }
    grid.addEventListener('click', function (e) { var c = e.target.closest('.byp-c'); if (c) { select(+c.dataset.n); toMap(+c.dataset.n); } });
    grid.addEventListener('keydown', function (e) {
      var k = e.key, d = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : k === 'ArrowDown' ? 24 : k === 'ArrowUp' ? -24 : 0;
      if (k === 'Home') { select(1); toMap(1); e.preventDefault(); return; }
      if (k === 'End') { select(72); toMap(72); e.preventDefault(); return; }
      if (d) { select(sel + d); toMap(sel); e.preventDefault(); }
    });
    var now = Date.now();
    select(now >= START && now < END ? Math.floor((now - START) / HOUR) + 1 : 1);
    live();
    setInterval(live, 60000);
  }
})();

/* Podstrona blog.html: linia postępu czytania, spis treści podążający za lekturą, trasa i profil The Loop */
(function () {
  'use strict';
  if (!document.querySelector('[data-pg="blog"]') || !window.SP) return;

  /* ---------- postęp czytania (w obrębie bieżącego artykułu) ---------- */
  var bar = document.getElementById('pgbBar');
  var arts = Array.prototype.slice.call(document.querySelectorAll('.pgb-art'));
  if (bar && arts.length) {
    SP.onScroll(function (y, vh) {
      var p = 0, on = false;
      for (var i = 0; i < arts.length; i++) {
        var r = arts[i].getBoundingClientRect();
        if (r.top < vh * .5 && r.bottom > vh * .5) { on = true; p = SP.clamp((vh * .5 - r.top) / r.height, 0, 1); break; }
      }
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      bar.parentNode.classList.toggle('on', on);
    });
  }

  /* ---------- spis treści ---------- */
  arts.forEach(function (art) {
    var toc = art.querySelector('.pgb-toc'); if (!toc) return;
    var links = {}, heads = [];
    toc.querySelectorAll('a').forEach(function (a) { var id = a.getAttribute('href').slice(1); links[id] = a; var h = document.getElementById(id); if (h) heads.push(h); });
    function mark(id) {
      Object.keys(links).forEach(function (k) { var on = k === id; links[k].classList.toggle('on', on); if (on) links[k].setAttribute('aria-current', 'location'); else links[k].removeAttribute('aria-current'); });
    }
    SP.onScroll(function (y, vh) {
      var cur = null;
      for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < vh * .35) cur = heads[i].id; }
      if (!cur && heads.length && art.getBoundingClientRect().top < vh * .35) cur = heads[0].id;
      mark(cur);
    });
  });

  /* ---------- The Loop: trasa i profil (gdy są dane tras) ---------- */
  var fig = document.getElementById('pgbRoute');
  var T = window.SP_TRASY && window.SP_TRASY.loop, PR = window.SP_PROFILES && window.SP_PROFILES.loop;
  if (!fig || !T || !T.route || !PR || !PR.length) return;
  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a, p) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }

  /* mapa: współrzędne w km, y rośnie na południe */
  var R = T.route, xs = R.map(function (p) { return p[0]; }), ys = R.map(function (p) { return p[1]; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var pad = 4, W = (x1 - x0) + pad * 2, H = (y1 - y0) + pad * 2;
  var mapBox = document.getElementById('pgbRouteMap');
  var svg = el('svg', { viewBox: (x0 - pad) + ' ' + (y0 - pad) + ' ' + W + ' ' + H, role: 'img', 'aria-label': 'Przebieg Wielkiej Pętli Beskidzkiej z Bielska-Białej' }, mapBox);
  var d = R.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('');
  var path = el('path', { d: d, class: 'pgb-rt' }, svg);
  (T.labels || []).forEach(function (l) {
    if (l[0] === 'Bielsko-Biała') return;
    var inside = l[1] > x0 - pad && l[1] < x1 + pad && l[2] > y0 - pad && l[2] < y1 + pad;
    if (!inside) return;
    var g = el('g', { class: 'pgb-lb pgb-lb-' + l[4] }, svg);
    if (l[4] === 'p') el('path', { d: 'M' + (l[1] - .9) + ' ' + (l[2] + .6) + 'L' + l[1] + ' ' + (l[2] - .9) + 'L' + (l[1] + .9) + ' ' + (l[2] + .6) + 'Z' }, g);
    var right = l[1] > x1 - 12;
    var t = el('text', { x: right ? l[1] - 1.4 : l[1] + 1.4, y: l[2] + .5, 'text-anchor': right ? 'end' : 'start' }, g); t.textContent = l[0];
  });
  var s0 = R[0];
  el('circle', { cx: s0[0], cy: s0[1], r: .9, class: 'pgb-start' }, svg);
  var st = el('text', { x: s0[0] + 1.6, y: s0[1] + 2.6, class: 'pgb-start-t' }, svg); st.textContent = 'Start i meta';
  var marker = el('circle', { cx: s0[0], cy: s0[1], r: 1.2, class: 'pgb-mk' }, svg);

  /* długość po trasie → pozycja markera */
  var cum = [0];
  for (var i = 1; i < R.length; i++) cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
  var tot = cum[cum.length - 1];
  function at(f) {
    var target = f * tot, lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (cum[m] < target) lo = m; else hi = m; }
    var seg = (cum[hi] - cum[lo]) || 1, k = (target - cum[lo]) / seg;
    return [R[lo][0] + (R[hi][0] - R[lo][0]) * k, R[lo][1] + (R[hi][1] - R[lo][1]) * k];
  }

  /* profil wysokości: jedna skala dla osi, siatki i znaczników */
  var km = PR.km || T.km, n = PR.length;
  var eMin = Math.floor((PR.min || Math.min.apply(null, PR)) / 250) * 250, eMax = Math.ceil((PR.max || Math.max.apply(null, PR)) / 250) * 250;
  var PW = 640, PH = 190, L = 46, Rr = 12, Tt = 14, B = 26, iw = PW - L - Rr, ih = PH - Tt - B;
  function sx(k) { return L + k / km * iw; }
  function sy(e) { return Tt + (1 - (e - eMin) / (eMax - eMin)) * ih; }
  var prof = document.getElementById('pgbRouteProf');
  var ps = el('svg', { viewBox: '0 0 ' + PW + ' ' + PH, role: 'img', 'aria-label': 'Profil wysokości: od ' + SP.fmt(PR.min) + ' do ' + SP.fmt(PR.max) + ' m n.p.m.' }, prof);
  for (var e = Math.ceil(eMin / 500) * 500; e <= eMax; e += 500) {
    el('line', { x1: L, x2: PW - Rr, y1: sy(e), y2: sy(e), class: 'pgb-gl' }, ps);
    var ty = el('text', { x: L - 8, y: sy(e) + 4, class: 'pgb-ax pgb-ax-y' }, ps); ty.textContent = SP.fmt(e);
  }
  for (var k2 = 0; k2 <= km; k2 += 50) {
    var tx = el('text', { x: sx(k2), y: PH - 8, class: 'pgb-ax pgb-ax-x' }, ps); tx.textContent = String(k2);
  }
  var tu = el('text', { x: PW - Rr, y: PH - 8, class: 'pgb-ax pgb-ax-u' }, ps); tu.textContent = 'km';
  var tm = el('text', { x: L - 8, y: Tt - 3, class: 'pgb-ax pgb-ax-y' }, ps); tm.textContent = 'm';
  var line = '', area = 'M' + sx(0) + ' ' + sy(eMin);
  for (var j = 0; j < n; j++) { var xx = sx(j / (n - 1) * km).toFixed(1), yy = sy(PR[j]).toFixed(1); line += (j ? 'L' : 'M') + xx + ' ' + yy; area += 'L' + xx + ' ' + yy; }
  area += 'L' + sx(km) + ' ' + sy(eMin) + 'Z';
  el('path', { d: area, class: 'pgb-area' }, ps);
  el('path', { d: line, class: 'pgb-line' }, ps);
  var imax = 0; for (var q = 1; q < n; q++) if (PR[q] > PR[imax]) imax = q;
  var mx = sx(imax / (n - 1) * km), my = sy(PR[imax]);
  el('circle', { cx: mx, cy: my, r: 3, class: 'pgb-peak' }, ps);
  var mt = el('text', { x: mx + 7, y: my + 4, class: 'pgb-ax pgb-peak-t' }, ps); mt.textContent = 'Babia Góra';
  var cross = el('line', { y1: Tt, y2: PH - B, class: 'pgb-cross' }, ps), dot = el('circle', { r: 3.5, class: 'pgb-dot' }, ps);
  var tip = document.createElement('p'); tip.className = 'pgb-tip'; tip.setAttribute('aria-hidden', 'true'); prof.appendChild(tip);
  ps.addEventListener('pointermove', function (ev) {
    var r = ps.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * PW;
    var f = SP.clamp((vx - L) / iw, 0, 1), idx = Math.round(f * (n - 1)), kx = sx(f * km), ky = sy(PR[idx]);
    cross.setAttribute('x1', kx); cross.setAttribute('x2', kx); dot.setAttribute('cx', kx); dot.setAttribute('cy', ky);
    tip.textContent = SP.fmt(f * km, 1) + ' km, ' + SP.fmt(PR[idx]) + ' m';
    tip.style.left = (kx / PW * 100) + '%';
    var p = at(f); marker.setAttribute('cx', p[0]); marker.setAttribute('cy', p[1]);
    prof.classList.add('hov'); mapBox.classList.add('hov');
  });
  ps.addEventListener('pointerleave', function () { prof.classList.remove('hov'); mapBox.classList.remove('hov'); marker.setAttribute('cx', s0[0]); marker.setAttribute('cy', s0[1]); });

  var cap = document.getElementById('pgbRouteTxt');
  if (cap) cap.textContent = 'Wielka Pętla Beskidzka według OpenStreetMap: ' + SP.fmt(km) + ' km, ' + SP.fmt(PR.up) + ' m w górę.';
  fig.hidden = false;
  var len = path.getTotalLength ? path.getTotalLength() : 0;
  if (len && !SP.reduced) {
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    SP.onVisible(fig, function () { path.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.2,.7,.1,1)'; path.style.strokeDashoffset = 0; });
  }
})();

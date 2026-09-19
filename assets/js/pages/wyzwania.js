/* Podstrony wyzwań: profile wysokości, mapki tras, media i cytaty (dane: SP_PROFILES, SP_MAP, SP_MEDIA, SP_QUOTES) */
(function () {
  'use strict';
  var hub = document.getElementById('pg-wyzwania'), pg = document.getElementById('pg-wyzwanie');
  if (!hub && !pg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.SP ? SP.reduced : false;
  var fmt = window.SP ? SP.fmt : function (n) { return String(Math.round(n)); };
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function onVis(node, fn) { if (window.SP) SP.onVisible(node, fn); else fn(node); }

  /* „Wyzwania” w menu jako bieżąca sekcja */
  if (pg) document.querySelectorAll('.hdr-links a[href="wyzwania.html"], .hdr-menu a[href="wyzwania.html"]').forEach(function (a) {
    a.setAttribute('aria-current', 'page'); a.classList.add('on');
  });

  var PROF = window.SP_PROFILES || null, MAP = window.SP_MAP || null;

  /* ---------- miniprofile na kartach ---------- */
  document.querySelectorAll('[data-spark]').forEach(function (svg) {
    var arr = PROF && PROF[svg.getAttribute('data-spark')];
    if (!arr || !arr.length) { svg.style.display = 'none'; return; }
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), n = arr.length, d = '';
    for (var i = 0; i < n; i++) d += (i ? 'L' : 'M') + (i / (n - 1) * 200).toFixed(1) + ' ' + (34 - (arr[i] - mn) / (mx - mn || 1) * 32).toFixed(1);
    el('path', { d: d + 'L200 36L0 36Z', class: 'ar' }, svg);
    el('path', { d: d, class: 'ln' }, svg);
  });

  /* ---------- mapka trasy ---------- */
  var HI = [105, 585, 780, 333];   // wycinek rzeźby gór (jak w 55-mapa.js)
  var mapCtl = null;
  /* ostra mapka z tekstury terenu (ta sama co w 3D) + trasa jako wektor */
  var TR3 = window.SP_TRASY || null, TKEY = { gss: 'gss', gsb: 'gsb', loop: 'loop', msb: 'msb', '2hard': 'tatry' };
  function buildTexMap(fig, key) {
    var d = TR3[key], svg = fig.querySelector('svg'), TW = d.tw, TH = d.th;
    function px(p) { return [(p[0] / d.wkm + .5) * TW, (p[1] / d.hkm + .5) * TH]; }
    var src = d.route || d.path || [], pts = src.map(px);
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var bx0 = Math.min.apply(null, xs), bx1 = Math.max.apply(null, xs), by0 = Math.min.apply(null, ys), by1 = Math.max.apply(null, ys);
    var w = bx1 - bx0, h = by1 - by0, pad = Math.max(w, h) * (key === 'tatry' ? .3 : .1) + TW * .012;
    var x0 = bx0 - pad, y0 = by0 - pad, W = w + pad * 2, H = h + pad * 2, ar = 16 / 10;
    if (W / H < ar) { var nw = H * ar; x0 -= (nw - W) / 2; W = nw; } else { var nh = W / ar; y0 -= (nh - H) / 2; H = nh; }
    // kadr może lekko wyjść poza teksturę — jej krawędzie są wygaszone maską, więc końce trasy nie są ucinane
    svg.setAttribute('viewBox', [x0, y0, W, H].map(function (v) { return v.toFixed(1); }).join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    var mid = 'wzm' + Math.random().toString(36).slice(2, 7), defs = el('defs', {}, svg);
    function fadeGrad(id, x1, y1, x2, y2) {
      var g0 = el('linearGradient', { id: id, x1: x1, y1: y1, x2: x2, y2: y2 }, defs);
      el('stop', { offset: '0', 'stop-color': '#000' }, g0); el('stop', { offset: '.05', 'stop-color': '#fff' }, g0);
      el('stop', { offset: '.95', 'stop-color': '#fff' }, g0); el('stop', { offset: '1', 'stop-color': '#000' }, g0);
    }
    fadeGrad(mid + 'x', 0, 0, 1, 0); fadeGrad(mid + 'y', 0, 0, 0, 1);
    var mk = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: TW, height: TH }, defs);
    el('rect', { x: 0, y: 0, width: TW, height: TH, fill: 'url(#' + mid + 'x)' }, mk);
    var mk2 = el('mask', { id: mid + 'm', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: TW, height: TH }, defs);
    el('rect', { x: 0, y: 0, width: TW, height: TH, fill: 'url(#' + mid + 'y)' }, mk2);
    var tg = el('g', { mask: 'url(#' + mid + ')' }, svg);
    el('image', { href: 'assets/img/trasy/' + key + (d.tex === 'webp' ? (window.innerWidth < 900 ? '-t-m.webp' : '-t.webp') : '-t.jpg'), x: 0, y: 0, width: TW, height: TH, preserveAspectRatio: 'none', class: 'm-tex', mask: 'url(#' + mid + 'm)' }, tg);
    var g = el('g', {}, svg), dd = '';
    for (var i = 0; i < pts.length; i++) dd += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    el('path', { d: dd, class: 'm-cas' + (key === 'tatry' ? ' m-fly' : '') }, g);
    var route = el('path', { d: dd, class: 'm-tr' + (key === 'tatry' ? ' m-fly' : '') }, g);
    var sized = [], labs = [];
    // szczyty w kadrze (najwyższe)
    (d.labels || []).filter(function (l) { return l[4] === 'p'; }).map(function (l) { var q = px([l[1], l[2]]); return { n: l[0], e: l[5] || l[3], x: q[0], y: q[1] }; })
      .filter(function (p) { return p.x > x0 + W * .04 && p.x < x0 + W * .96 && p.y > y0 + H * .06 && p.y < y0 + H * .94; })
      .sort(function (a, b) { return b.e - a.e; }).slice(0, 5).forEach(function (p) {
        var gg = el('g', { class: 'm-pk' }, g), tri = el('path', { d: '' }, gg), t = el('text', { x: p.x, y: p.y }, gg);
        t.textContent = p.n; labs.push({ tri: tri, t: t, x: p.x, y: p.y });
      });
    var ends = [{ p: pts[0], t: fig.getAttribute('data-s') }];
    var last = pts[pts.length - 1];
    if (Math.hypot(last[0] - pts[0][0], last[1] - pts[0][1]) > TW * .004) ends.push({ p: last, t: fig.getAttribute('data-e') });
    ends.forEach(function (e, i) {
      var gg = el('g', { class: 'm-pt' + (i ? ' fin' : '') }, g), c = el('circle', { cx: e.p[0], cy: e.p[1], r: 3 }, gg), t = null;
      if (e.t) { t = el('text', { x: e.p[0], y: e.p[1] }, gg); t.textContent = e.t; }
      sized.push({ c: c, t: t, i: i, x: e.p[0], y: e.p[1] });
    });
    var mark = el('circle', { r: 4, class: 'm-mark', opacity: 0 }, g), len = route.getTotalLength(), scale = 1;
    function size() {
      var rw = svg.getBoundingClientRect().width || 600; scale = rw / W;
      g.querySelector('.m-cas').style.strokeWidth = (4.2 / scale) + 'px';
      route.style.strokeWidth = (2 / scale) + 'px';
      if (key === 'tatry') { route.style.strokeDasharray = (6 / scale) + ' ' + (5 / scale); }
      sized.forEach(function (s) {
        s.c.setAttribute('r', 4.6 / scale); s.c.style.strokeWidth = (1.6 / scale) + 'px';
        if (s.t) {
          s.t.setAttribute('font-size', 12.5 / scale); s.t.style.strokeWidth = (3.4 / scale) + 'px';
          var right = s.x > x0 + W * .7; s.t.setAttribute('text-anchor', right ? 'end' : 'start');
          s.t.setAttribute('x', s.x + (right ? -9 : 9) / scale); s.t.setAttribute('y', s.y + (s.i ? 15 : -9) / scale);
        }
      });
      labs.forEach(function (l) {
        var a = 4.2 / scale;
        // szczyt tuż przy starcie/mecie — ukryj, żeby podpisy na siebie nie wchodziły
        var near = sized.some(function (e) { return Math.abs(e.x - l.x) * scale < 120 && Math.abs(e.y - l.y) * scale < 26; });
        l.tri.style.display = l.t.style.display = near ? 'none' : '';
        l.tri.setAttribute('d', 'M' + (l.x - a) + ' ' + (l.y + a * .6) + 'L' + l.x + ' ' + (l.y - a * 1.1) + 'L' + (l.x + a) + ' ' + (l.y + a * .6) + 'Z');
        l.t.setAttribute('font-size', 11 / scale); l.t.style.strokeWidth = (3 / scale) + 'px';
        l.t.setAttribute('x', l.x + 7 / scale); l.t.setAttribute('y', l.y + 4 / scale);
      });
      mark.setAttribute('r', 5.5 / scale); mark.style.strokeWidth = (2 / scale) + 'px';
    }
    size(); window.addEventListener('resize', size);
    if (!reduced && key !== 'tatry') {
      route.style.strokeDasharray = len; route.style.strokeDashoffset = len;
      onVis(fig, function () { route.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.2,.7,.1,1)'; route.style.strokeDashoffset = 0; });
    }
    mapCtl = { set: function (f) { if (f == null) { mark.setAttribute('opacity', 0); return; } var p = route.getPointAtLength(len * f); mark.setAttribute('cx', p.x); mark.setAttribute('cy', p.y); mark.setAttribute('opacity', 1); } };
    fig.classList.add('tex');
  }
  function buildMap(fig) {
    var tk = TKEY[fig.getAttribute('data-map')];
    if (TR3 && tk && TR3[tk] && TR3[tk].tw) { buildTexMap(fig, tk); return; }
    if (!MAP) { fig.style.display = 'none'; return; }
    var id = fig.getAttribute('data-map'), svg = fig.querySelector('svg'), VB = MAP.vb;
    var tr = MAP.tr && MAP.tr[id], box, pts = [];
    if (tr) box = tr.bb.slice();
    else if (id === '2hard' && MAP.pl_pts && MAP.pl_pts.orawa) {
      var rysy = (MAP.pk || []).filter(function (p) { return p[0] === 'Rysy'; })[0];
      var o = MAP.pl_pts.orawa;
      pts.push({ x: o[0], y: o[1], t: fig.getAttribute('data-s') || 'Jezioro Orawskie' });
      if (rysy) pts.push({ x: rysy[2], y: rysy[3], t: 'Tatry' });
      box = [Math.min.apply(null, pts.map(function (p) { return p.x; })), Math.min.apply(null, pts.map(function (p) { return p.y; })),
             Math.max.apply(null, pts.map(function (p) { return p.x; })), Math.max.apply(null, pts.map(function (p) { return p.y; }))];
    } else if (id === 'kgp') box = [0, 0, VB[0], VB[1]];
    else { fig.style.display = 'none'; return; }
    // margines i proporcje 16:10
    var w = box[2] - box[0], h = box[3] - box[1], pad = Math.max(w, h) * (id === 'kgp' ? 0 : .14) + (id === '2hard' ? 60 : 8);
    var x0 = box[0] - pad, y0 = box[1] - pad, W = w + pad * 2, H = h + pad * 2, ar = 16 / 10;
    if (id !== 'kgp') { if (W / H < ar) { var nw = H * ar; x0 -= (nw - W) / 2; W = nw; } else { var nh = W / ar; y0 -= (nh - H) / 2; H = nh; } }
    svg.setAttribute('viewBox', [x0, y0, W, H].map(function (v) { return v.toFixed(1); }).join(' '));
    var uid = 'wzc' + Math.random().toString(36).slice(2, 7);
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: uid }, defs);
    el('path', { d: MAP.land }, cp);
    el('rect', { x: x0, y: y0, width: W, height: H, fill: '#E9EEF0' }, svg);          // morze/tło poza lądem
    el('path', { d: MAP.land, class: 'm-land' }, svg);
    if (id === 'kgp') el('image', { href: 'assets/img/map-relief.jpg', x: 0, y: 0, width: VB[0], height: VB[1], preserveAspectRatio: 'none', 'clip-path': 'url(#' + uid + ')', class: 'm-relief' }, svg);
    else el('image', { href: 'assets/img/map-relief-south.jpg', x: HI[0], y: HI[1], width: HI[2], height: HI[3], preserveAspectRatio: 'none', 'clip-path': 'url(#' + uid + ')', class: 'm-relief' }, svg);
    if (MAP.lakes) el('path', { d: MAP.lakes, class: 'm-lake' }, svg);
    if (MAP.riv) el('path', { d: MAP.riv, class: 'm-riv' }, svg);
    el('path', { d: MAP.pl, class: 'm-pl' }, svg);
    var route = null, g = el('g', {}, svg), sized = [];
    if (tr) {
      if (tr.x) el('path', { d: tr.x, class: 'm-tr m-tr-x' }, g);
      route = el('path', { d: tr.d, class: 'm-tr' }, g);
      pts.push({ x: tr.s[0], y: tr.s[1], t: fig.getAttribute('data-s') });
      if (Math.hypot(tr.e[0] - tr.s[0], tr.e[1] - tr.s[1]) > 3) pts.push({ x: tr.e[0], y: tr.e[1], t: fig.getAttribute('data-e') });
    }
    if (id === 'kgp') (MAP.pk || []).forEach(function (p) {
      var gg = el('g', { class: 'm-pt pk' }, g), c = el('circle', { cx: p[2], cy: p[3], r: 3 }, gg);
      el('title', {}, c).textContent = p[0] + ', ' + p[1] + ' m';
      sized.push({ c: c, r: 4.5 });
    });
    pts.forEach(function (p, i) {
      var gg = el('g', { class: 'm-pt' }, g), c = el('circle', { cx: p.x, cy: p.y, r: 3 }, gg), t = null;
      if (p.t) {
        t = el('text', { x: p.x, y: p.y }, gg); t.textContent = p.t;
      }
      sized.push({ c: c, r: 4.5, t: t, i: i, x: p.x, y: p.y });
    });
    var mark = route ? el('circle', { r: 4, class: 'm-mark', opacity: 0 }, g) : null;
    var len = route ? route.getTotalLength() : 0, scale = 1;
    function size() {
      var rw = svg.getBoundingClientRect().width || 600; scale = rw / W;
      g.querySelectorAll('.m-tr').forEach(function (p) { p.style.strokeWidth = (p.classList.contains('m-tr-x') ? 1.25 : 2.4) / scale; p.style.vectorEffect = 'none'; });
      sized.forEach(function (s) {
        s.c.setAttribute('r', s.r / scale);
        if (s.t) {
          var fs = 12 / scale; s.t.setAttribute('font-size', fs);
          s.t.style.strokeWidth = (3 / scale) + 'px';
          var right = s.x > x0 + W * .72;
          s.t.setAttribute('text-anchor', right ? 'end' : 'start');
          s.t.setAttribute('x', s.x + (right ? -8 : 8) / scale);
          s.t.setAttribute('y', s.y + (s.i ? 14 : -8) / scale);
        }
      });
      if (mark) { mark.setAttribute('r', 5 / scale); mark.style.strokeWidth = (1.5 / scale) + 'px'; mark.style.vectorEffect = 'none'; }
    }
    size(); window.addEventListener('resize', size);
    if (route && !reduced) {
      route.style.strokeDasharray = len; route.style.strokeDashoffset = len;
      onVis(fig, function () { route.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(.2,.7,.1,1)'; route.style.strokeDashoffset = 0; });
    }
    if (route) mapCtl = {
      set: function (f) { if (f == null) { mark.setAttribute('opacity', 0); return; } var p = route.getPointAtLength(len * f); mark.setAttribute('cx', p.x); mark.setAttribute('cy', p.y); mark.setAttribute('opacity', 1); }
    };
  }
  /* mapkę budujemy (i pobieramy teksturę) dopiero, gdy zbliża się do ekranu */
  document.querySelectorAll('.wz-map[data-map]').forEach(function (fig) {
    if (!('IntersectionObserver' in window)) { buildMap(fig); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); buildMap(fig); } }, { rootMargin: '700px 0px' });
    io.observe(fig);
  });

  /* ---------- profil wysokości ---------- */
  function nice(range) { var s = [100, 200, 250, 500, 1000]; for (var i = 0; i < s.length; i++) if (range / s[i] <= 4) return s[i]; return 1000; }
  function buildProf(fig) {
    var id = fig.getAttribute('data-prof'), arr = PROF && PROF[id];
    if (!arr || !arr.length) { fig.style.display = 'none'; return; }
    var svg = fig.querySelector('svg'), cap = fig.querySelector('.wz-prof-cap');
    var narrow = (fig.clientWidth || 800) < 560;   // na telefonie mniejszy układ współrzędnych = czytelne podpisy osi
    var VW = narrow ? 440 : 800, VH = narrow ? 240 : 280, L = narrow ? 52 : 58, Rr = 18, T = 22, B = 34, n = arr.length, km = arr.km || n;
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), st = nice(mx - mn);
    var lo = Math.floor(mn / st) * st, hi = Math.ceil(mx / st) * st;
    svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    function X(i) { return L + i / (n - 1) * (VW - L - Rr); }
    function Y(v) { return T + (1 - (v - lo) / (hi - lo || 1)) * (VH - T - B); }
    for (var v = lo; v <= hi + .1; v += st) {
      el('line', { x1: L, x2: VW - Rr, y1: Y(v), y2: Y(v), class: 'p-grid' }, svg);
      el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'p-lab' }, svg).textContent = fmt(v) + ' m';
    }
    [0, .5, 1].forEach(function (f) {
      el('text', { x: L + f * (VW - L - Rr), y: VH - 10, 'text-anchor': f === 0 ? 'start' : f === 1 ? 'end' : 'middle', class: 'p-lab' }, svg).textContent = fmt(km * f) + ' km';
    });
    var d = 'M' + X(0).toFixed(1) + ' ' + Y(arr[0]).toFixed(1);
    for (var i = 0; i < n - 1; i++) {   // Catmull-Rom → Bézier: gładko i dokładnie przez każdą próbkę
      var i0 = Math.max(0, i - 1), i3 = Math.min(n - 1, i + 2);
      d += 'C' + (X(i) + (X(i + 1) - X(i0)) / 6).toFixed(1) + ' ' + (Y(arr[i]) + (Y(arr[i + 1]) - Y(arr[i0])) / 6).toFixed(1) + ' ' +
        (X(i + 1) - (X(i3) - X(i)) / 6).toFixed(1) + ' ' + (Y(arr[i + 1]) - (Y(arr[i3]) - Y(arr[i])) / 6).toFixed(1) + ' ' + X(i + 1).toFixed(1) + ' ' + Y(arr[i + 1]).toFixed(1);
    }
    var cid = 'wzp' + Math.random().toString(36).slice(2, 7), cp = el('clipPath', { id: cid }, el('defs', {}, svg));
    var cr = el('rect', { x: 0, y: 0, width: reduced ? VW : 0, height: VH }, cp);
    var gg = el('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    el('path', { d: d + 'L' + X(n - 1) + ' ' + Y(lo) + 'L' + X(0) + ' ' + Y(lo) + 'Z', class: 'p-area' }, gg);
    el('path', { d: d, class: 'p-line' }, gg);
    var xl = el('line', { y1: T, y2: VH - B, class: 'p-x' }, svg), dot = el('circle', { r: 5, class: 'p-dot' }, svg);
    var tip = document.createElement('div'); tip.className = 'wz-prof-tip'; fig.appendChild(tip);
    function capDefault() { cap.innerHTML = '<span></span><span>' + fmt(mn) + '–' + fmt(mx) + ' m n.p.m.</span>'; }
    capDefault();
    if (!reduced) onVis(fig, function () {
      var t0 = performance.now();
      (function step(t) { var k = Math.max(0, Math.min(1, (t - t0) / 1800)), e = 1 - Math.pow(1 - k, 3); cr.setAttribute('width', VW * e); if (k < 1) requestAnimationFrame(step); })(t0);
    });
    var idx = -1;
    function show(i) {
      if (i < 0) { fig.classList.remove('hov'); capDefault(); if (mapCtl) mapCtl.set(null); return; }
      idx = i; var x = X(i), y = Y(arr[i]);
      xl.setAttribute('x1', x); xl.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      fig.classList.add('hov');
      var k = km * i / (n - 1);
      tip.textContent = fmt(k) + ' km, ' + fmt(arr[i]) + ' m n.p.m.';
      tip.style.left = (x / VW * 100) + '%';
      if (mapCtl) mapCtl.set(i / (n - 1));
    }
    function fromEvent(e) {
      var r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * VW;
      return Math.max(0, Math.min(n - 1, Math.round((vx - L) / (VW - L - Rr) * (n - 1))));
    }
    svg.addEventListener('pointermove', function (e) { show(fromEvent(e)); });
    svg.addEventListener('pointerdown', function (e) { show(fromEvent(e)); });
    svg.addEventListener('pointerleave', function () { show(-1); });
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); show(Math.max(0, Math.min(n - 1, (idx < 0 ? 0 : idx) + (e.key === 'ArrowRight' ? 4 : -4))));
    });
    svg.addEventListener('blur', function () { show(-1); });
  }
  document.querySelectorAll('.wz-prof[data-prof]').forEach(buildProf);

  /* ---------- media ---------- */
  document.querySelectorAll('[data-press]').forEach(function (sec) {
    var M = window.SP_MEDIA; if (!M) return;
    var kw = new RegExp(sec.getAttribute('data-kw'), 'i'), notv = sec.getAttribute('data-not'), no = notv ? new RegExp(notv, 'i') : null;
    var list = M.filter(function (m) { var s = m.t + ' ' + m.o; return kw.test(s) && !(no && no.test(s)); });
    list.sort(function (a, b) { return (parseInt(b.y, 10) || 0) - (parseInt(a.y, 10) || 0); });
    if (!list.length) return;
    var ul = sec.querySelector('ul');
    list.slice(0, 8).forEach(function (m) {
      var li = document.createElement('li'), a = document.createElement(m.u ? 'a' : 'span');
      if (m.u) { a.href = m.u; a.target = '_blank'; a.rel = 'noopener'; } else a.className = 'na';
      var y = document.createElement('span'); y.className = 'y'; y.textContent = /^\d{4}$/.test(m.y) ? m.y : '';
      var b = document.createElement('span'), t = document.createElement('span'), o = document.createElement('span');
      t.className = 't'; t.textContent = m.t.replace(/\.$/, ''); o.className = 'o'; o.textContent = m.o;
      b.appendChild(t); b.appendChild(o); a.appendChild(y); a.appendChild(b); li.appendChild(a); ul.appendChild(li);
    });
    sec.hidden = false;
  });

  /* ---------- cytaty (SP_QUOTES) ---------- */
  var FX = { gory: 'gory', noc: 'noc', woda: 'woda', lod: 'mroz', pomaganie: 'puls', meta: 'slonce', trzezwosc: 'slonce', przemiana: 'slonce' };
  function dateTxt(d) {
    if (!d) return ''; var p = String(d).split('-');
    return p.length === 3 ? +p[2] + '.' + p[1] + '.' + p[0] : p.length === 2 ? p[1] + '.' + p[0] : p[0];
  }
  document.querySelectorAll('[data-quotes]').forEach(function (sec) {
    var Q = window.SP_QUOTES; if (!Q || !Q.length) return;
    var ms = (sec.getAttribute('data-moments') || '').split(/\s+/).filter(Boolean), th = (sec.getAttribute('data-themes') || '').split(/\s+/).filter(Boolean);
    var byM = Q.filter(function (q) { return ms.indexOf(q.moment) > -1; }), byT = Q.filter(function (q) { return th.indexOf(q.theme) > -1 && ms.indexOf(q.moment) < 0; });
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var pick = shuffle(byM).concat(shuffle(byT)).slice(0, 2);
    if (!pick.length) return;
    var box = sec.querySelector('.wz-quotes'); box.innerHTML = '';
    pick.forEach(function (q) {
      var f = document.createElement('figure'), bq = document.createElement('blockquote'), fc = document.createElement('figcaption');
      f.className = 'wz-q'; bq.className = 'quote'; bq.textContent = '„' + q.text + '”';
      fc.className = 'small'; fc.textContent = dateTxt(q.date);
      f.appendChild(bq); if (fc.textContent) f.appendChild(fc); box.appendChild(f);
      if (window.SPFX && q.src && q.src.url) SPFX.src(bq, q.src.url, FX[q.theme], q.src.title);
    });
  });
})();

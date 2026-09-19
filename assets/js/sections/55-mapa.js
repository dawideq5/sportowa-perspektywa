/* Mapa wyzwań: Polska w rzucie Lamberta, rzeźba terenu, prawdziwe przebiegi szlaków (OSM).
   Kamera (środek + skala) sterowana sprężynami i lotami; wybór najbliższego obiektu zamiast celowania. */
(function () {
  'use strict';
  var D = window.SP_MAP, svg = document.getElementById('mpSvg'), info = document.getElementById('mpInfo'), chipsEl = document.getElementById('mpChips');
  if (!D || !svg || !info || !chipsEl) return;
  var wrap = svg.parentNode;
  var NS = 'http://www.w3.org/2000/svg', VW = D.vb[0], VH = D.vb[1];
  var reduced = !!(window.SP && SP.reduced);
  var KMIN = 1, KMAX = 190, LMIN = 0, LMAX = Math.log(KMAX);   // realny limit zależy od miejsca (lmaxAt)
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
  svg.setAttribute('focusable', 'false');

  /* ---------- świat (skalowany jedną transformacją) ----------
     Każdy kształt ma jawne atrybuty fill/stroke (CSS tylko uzupełnia), bez odwołań url(#…):
     morze jest wtopione w obraz rzeźby, więc nie potrzeba przycinania. */
  var C = { sea: '#E8EDEF', ink: '#1C1C1E', ink2: '#6B6B70', trail: '#C23B3B', city: '#9A9A9E', grat: '#A3A3A7', river: '#A8C2CE', lake: '#D3E1E7', nb: '#EEEEEB', nbLine: '#C9C9C5', halo: '#FFFFFF' };
  var FONT = 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif';
  var NSS = 'non-scaling-stroke';
  el('rect', { class: 'sea', x: -VW, y: -VH, width: VW * 3, height: VH * 3, fill: C.sea }, svg);
  var world = el('g', { id: 'mpWorld' }, svg);
  el('image', { href: 'assets/img/map-relief.jpg', x: 0, y: 0, width: VW, height: VH, preserveAspectRatio: 'none', class: 'relief' }, world);
  var HI = [105, 585, 780, 333], hiImg = null;          // ostrzejszy wycinek gór, doładowywany przy zbliżeniu
  var nbP = el('path', { class: 'nb', d: D.land, fill: C.nb, 'fill-opacity': '.74', stroke: C.nbLine, 'stroke-width': '.7', 'stroke-linejoin': 'round', 'vector-effect': NSS }, world);
  el('path', { class: 'lake', d: D.lakes, fill: C.lake, stroke: 'none' }, world);
  el('path', { class: 'riv', d: D.riv, fill: 'none', stroke: C.river, 'stroke-width': '.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': NSS }, world);
  el('path', { class: 'grat', d: D.grat, fill: 'none', stroke: C.ink, 'stroke-opacity': '.07', 'stroke-width': '.6', 'vector-effect': NSS }, world);
  var polP = el('path', { class: 'pol', d: D.pl, fill: '#FFFFFF', 'fill-opacity': '.1', 'fill-rule': 'evenodd', stroke: C.ink, 'stroke-width': '1', 'stroke-linejoin': 'round', 'vector-effect': NSS }, world);
  /* szczegóły lokalne (Tychy, Paprocany, Orawa): doładowywane przy dużym zbliżeniu, wektorowe i ostre */
  var loc = el('g', { class: 'loc', opacity: '0', 'aria-hidden': 'true' }, world), locState = 0;
  var LOC_BB = { tychy: [469.212, 738.472, 485.322, 753.398], papr: [473.08, 750.927, 475.777, 752.992], orawa: [521.884, 848.091, 538.862, 859.482] };
  var ZONES = [[462, 732, 492, 760], [516, 843, 544, 864]];     // tam wolno przybliżyć mocniej
  var KMAX_LOC = 190, LMAX_LOC = Math.log(KMAX_LOC);
  function lmaxAt(x, y) {
    for (var i = 0; i < ZONES.length; i++) { var z = ZONES[i]; if (x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]) return LMAX_LOC; }
    return Math.log(26);
  }
  function loadLocal() {
    if (locState) return; locState = 1;
    var sc = document.createElement('script');
    sc.src = 'assets/js/lazy/mapa-local.js'; sc.async = true;
    sc.onload = function () { buildLocal(window.SP_MAP_LOCAL); };
    sc.onerror = function () { locState = 0; };
    document.head.appendChild(sc);
  }
  function buildLocal(L) {
    if (!L || locState === 2) return; locState = 2;
    el('path', { d: L.tychy, fill: '#FFFFFF', 'fill-opacity': '.55', stroke: C.ink2, 'stroke-opacity': '.45', 'stroke-width': '.8', 'stroke-dasharray': '3 3', 'vector-effect': NSS }, loc);
    el('path', { d: L.rd_prim, fill: 'none', stroke: '#C9C9C5', 'stroke-width': '.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': NSS }, loc);
    el('path', { d: L.rd_big, fill: 'none', stroke: '#B8B8B3', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': NSS }, loc);
    el('path', { d: L.water, fill: C.lake, stroke: '#A9C3CF', 'stroke-width': '.6', 'vector-effect': NSS }, loc);
    el('path', { d: L.papr, fill: '#C9DCE4', 'fill-rule': 'evenodd', stroke: '#8FB0BF', 'stroke-width': '.9', 'vector-effect': NSS }, loc);
    el('path', { d: L.orawa, fill: '#C9DCE4', 'fill-rule': 'evenodd', stroke: '#8FB0BF', 'stroke-width': '.9', 'vector-effect': NSS }, loc);
    el('path', { class: 'loop', d: L.loop, fill: 'none', stroke: '#B5741C', 'stroke-width': '1.6', 'stroke-linejoin': 'round', 'vector-effect': NSS }, loc);
    render();
  }
  var ui = el('g', { id: 'mpUI' }, svg);
  var labG = el('g', { class: 'loc-l', 'aria-hidden': 'true' }, ui);

  /* znaczniki w warstwie ekranowej: stała wielkość, pozycja liczona z kamery */
  var marks = [];
  function mark(parent, x, y, cls, attrs) {
    var g = el('g', attrs || {}, parent); if (cls) g.setAttribute('class', cls);
    var m = { g: g, x: x, y: y, k: 0, on: true }; marks.push(m); g._m = m; return m;
  }
  function text(parent, dx, dy, txt, anchor, fill, extra) {
    var a = { x: dx, y: dy, 'text-anchor': anchor || 'start', 'font-family': FONT, 'font-size': '11', fill: fill || C.ink2 };
    for (var k in extra) a[k] = extra[k];
    var t = el('text', a, parent); t.textContent = txt; return t;
  }
  var HALO = { 'font-weight': '500', 'paint-order': 'stroke', stroke: 'rgba(255,255,255,.85)', 'stroke-width': '3', 'stroke-linejoin': 'round' };

  var glg = el('g', { class: 'grat-l', 'aria-hidden': 'true' }, ui), gratMarks = [];
  D.gl.forEach(function (g) { var m = mark(glg, g[1], g[2]); text(m.g, 4, -4, g[0], 'start', C.grat, { 'font-size': '10' }); gratMarks.push(m); });
  var cg = el('g', { class: 'city', 'aria-hidden': 'true' }, ui);
  D.ct.forEach(function (c) {
    if (c[0].charAt(0) === '_') return;
    var left = c[0] === 'Bielsko-Biała', m = mark(cg, c[1], c[2]);
    m.k = (c[0] === 'Bielsko-Biała' || c[0] === 'Zakopane') ? 2.2 : 0;
    el('circle', { r: 2, fill: C.city }, m.g);
    text(m.g, left ? -6 : 6, left ? -5 : 4, c[0], left ? 'end' : 'start', C.ink2);
  });

  /* ---------- treść paneli ---------- */
  var SRC = {
    gss: 'https://www.tychy.pl/2025/08/26/andrzej-kowalczyk-pokonal-glowny-szlak-sudecki-dla-nikusi/',
    gsb: 'https://www.tychy.pl/2023/10/11/andrzej-kowalczyk-biegiem-przez-beskidy/',
    msb: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-maly-szlak-beskidzki-poland-2024-08-07',
    loop: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-loop-2024-10-13',
    kgp: 'https://www.tychy.pl/2023/09/05/korona-andrzeja-kowalczyka/',
    paprocany: 'https://www.siepomaga.pl/backyard-na-dziko',
    glogow: 'https://www.tychy.pl/2022/02/08/w-swiatowej-elicie-andrzej-kowalczyk-zdobyl-cztery-medale-ms-w-plywaniu-zimowym/',
    orawa: 'https://www.tychy.pl/2025/06/16/andrzej-kowalczyk-jako-pierwszy-ukonczyl-podwojny-najtrudniejszy-triathlon-w-europie/'
  };
  var INFO = {
    all: { meta: 'Szlaki i szczyty', h: 'Cztery szlaki, 28 szczytów', num: '1317', unit: 'km', txt: 'Główny Szlak Sudecki, Główny Szlak Beskidzki, Mały Szlak Beskidzki i The Loop, a do tego cała Korona Gór Polski.' },
    gss: { meta: '2025, dla Nikusi', fx: 'gory', h: 'Główny Szlak Sudecki', place: 'Prudnik → Świeradów-Zdrój', num: '86:51', cls: 'trail', src: SRC.gss, ph: ['wyzwania/gory-bieg.jpg', 'wyzwania/plakat-gss.jpg', 'noc-drogowskaz.jpg'], txt: '445 km, 14 181 m przewyższenia i 100 minut snu.' },
    gsb: { meta: '2023, dla Natalki', fx: 'gory', h: 'Główny Szlak Beskidzki', place: 'Wołosate → Ustroń', num: '500', unit: 'km', cls: 'trail', src: SRC.gsb, ph: ['las.jpg', 'szlak-noc.jpg', 'blog/gsb-kamper.jpg'], txt: 'Najdłuższy szlak w polskich górach, ponad 88 godzin w drodze.' },
    msb: { meta: '2024, bez wsparcia', fx: 'gory', h: 'Mały Szlak Beskidzki', place: 'Bielsko-Biała → Luboń Wielki', num: '20:45:56', cls: 'trail', src: SRC.msb, ph: ['gory-selfie.jpg', 'wyzwania/gory-bieg.jpg'], txt: '137 km samotnie, około 40 żeli po drodze.' },
    loop: { meta: '2024, rekord FKT', fx: 'petla', h: 'The Loop', place: 'Wielka Pętla Beskidzka, Bielsko-Biała', num: '42:53:24', cls: 'trail', ring: 1, src: SRC.loop, ph: ['hero-noc.jpg', 'noc-drogowskaz.jpg', 'yt-loop.jpg'], txt: '235 km ze startem i metą w Bielsku-Białej.' },
    kgp: { meta: '2023', fx: 'gory', h: 'Korona Gór Polski', place: 'Od Tarnicy po Śnieżkę', num: '99:36', cls: 'trail', src: SRC.kgp, ph: ['gory-selfie.jpg', 'wulkan.jpg', 'wyzwania/gory-bieg.jpg'], txt: '28 najwyższych szczytów polskich pasm, 220 km biegu i 2400 km autem między nimi.' },
    places: { meta: 'Miejsca', h: 'Dom i woda', txt: 'Tychy, jezioro Backyardu, Głogów z medalami MŚ i Jezioro Orawskie, gdzie zaczynało się 2×Harda.' }
  };
  var PLACES = [
    { id: 'tychy', n: 'Tychy', dx: 7, dy: -5, box: 'tychy', pad: .1, info: { meta: 'Dom', h: 'Baza treningowa', place: 'Tychy', ph: ['kalistenika.jpg', 'swit.jpg', 'teraz.jpg'], txt: 'Tu mieszkam, trenuję i zbieram ludzi do kolejnych projektów.' } },
    { id: 'paprocany', n: 'Paprocany', xy: [474.43, 751.96], ring: 1, dx: 8, dy: 12, k: 5, box: 'papr', pad: .55, info: { meta: '1–4 października 2026', fx: 'woda', h: 'Backyard na Dziko', place: 'Jezioro Paprocany, Tychy', num: '72', unit: 'pętle po 6,7 km', cls: 'lake', src: SRC.paprocany, ph: ['backyard-noc.jpg', 'grupa-noc.jpg'], txt: 'Co pełną godzinę jedna pętla, przez trzy doby.' } },
    { id: 'glogow', n: 'Głogów', dx: 7, dy: 4, zk: 9, info: { meta: '2022', h: 'Mistrzostwa Świata IISA', place: 'Głogów', num: '4', unit: 'medale', cls: 'ice', fx: 'mroz', src: SRC.glogow, ph: ['lod.jpg', 'basen.jpg'], txt: 'Trzy srebra i brąz w pływaniu lodowym.' } },
    { id: 'orawa', n: 'Jezioro Orawskie', dx: -7, dy: 13, end: 1, box: 'orawa', pad: .16, info: { meta: '13–15 czerwca 2025', fx: 'woda', h: '2×Harda', place: 'Jezioro Orawskie', num: '10', unit: 'km pływania', cls: 'harda', src: SRC.orawa, ph: ['plakat-2hard.jpg', 'yt-2hard.jpg', 'grupa-tatry.jpg'], txt: 'Start podwójnego triathlonu, zanim ruszyłem na 480 km roweru i 110 km biegu przez Tatry.' } }
  ];
  var CHIPS = [['all', 'Wszystko'], ['gss', 'Główny Szlak Sudecki'], ['gsb', 'Główny Szlak Beskidzki'], ['msb', 'Mały Szlak Beskidzki'], ['loop', 'The Loop'], ['kgp', 'Korona Gór Polski'], ['places', 'Miejsca']];

  /* ---------- geometria do wyboru najbliższego obiektu ---------- */
  function parse(d) {
    var out = [], cur = null, re = /([MLml])|(-?\d*\.?\d+(?:e-?\d+)?)/g, m, cmd = 'M', nums = [];
    function flush() {
      for (var i = 0; i + 1 < nums.length; i += 2) {
        if (cmd === 'M' && i === 0) { cur = []; out.push(cur); }
        if (!cur) { cur = []; out.push(cur); }
        cur.push([nums[i], nums[i + 1]]);
      }
      nums = [];
    }
    while ((m = re.exec(d))) {
      if (m[1]) { flush(); cmd = m[1].toUpperCase(); } else nums.push(parseFloat(m[2]));
    }
    flush();
    return out;
  }
  var CELL = 8, grid = {}, feats = [];
  function cellKey(ix, iy) { return ix + ',' + iy; }
  function addToGrid(x0, y0, x1, y1, item) {
    for (var ix = Math.floor(Math.min(x0, x1) / CELL); ix <= Math.floor(Math.max(x0, x1) / CELL); ix++)
      for (var iy = Math.floor(Math.min(y0, y1) / CELL); iy <= Math.floor(Math.max(y0, y1) / CELL); iy++) {
        var k = cellKey(ix, iy); (grid[k] || (grid[k] = [])).push(item);
      }
  }

  /* ---------- warstwy ---------- */
  var layers = {}, uiLayers = {}, ext = {}, trailG = {};
  ['gss', 'gsb', 'msb', 'loop'].forEach(function (id) {
    var t = D.tr[id];
    var lg = el('g', { class: 'lyr trl', tabindex: '0', role: 'button', 'aria-label': INFO[id].h, 'data-id': id }, world);
    if (t.x) el('path', { class: 'trx', d: t.x, fill: 'none', stroke: C.trail, 'stroke-opacity': '.55', 'stroke-width': '1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': NSS }, lg);
    el('path', { class: 'tr', d: t.d, pathLength: 1, fill: 'none', stroke: C.trail, 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': NSS }, lg);
    layers[id] = lg; ext[id] = t.bb; trailG[id] = lg;
    var f = { type: 'trail', id: id, layer: id, node: lg };
    feats.push(f);
    parse(t.d + (t.x || '')).forEach(function (line) {
      for (var i = 1; i < line.length; i++) addToGrid(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1], { f: f, a: line[i - 1], b: line[i] });
    });
    var ug = el('g', { class: 'lyr', 'data-id': id, 'aria-hidden': 'true' }, ui);
    var m = mark(ug, t.s[0], t.s[1], 'end'); el('circle', { r: 2.4, fill: '#FFFFFF', stroke: C.trail, 'stroke-width': '1.4' }, m.g);
    uiLayers[id] = ug;
  });
  var kg = el('g', { class: 'lyr', 'data-id': 'kgp' }, ui), pkb = [1e9, 1e9, -1e9, -1e9], peakMarks = [];
  D.pk.forEach(function (pk, i) {
    var m = mark(kg, pk[2], pk[3], 'pk', { tabindex: '0', role: 'button', 'aria-label': pk[0] + ', ' + pk[1] + ' m n.p.m.' });
    el('circle', { r: 2.6, fill: C.ink, stroke: '#FFFFFF', 'stroke-width': '1' }, m.g);
    m.label = text(m.g, 6, -5, pk[0], 'start', C.ink, HALO); m.label.setAttribute('class', 'pk-n'); m.label.setAttribute('opacity', '0');
    var f = { type: 'peak', id: 'kgp', layer: 'kgp', pk: pk, m: m, node: m.g, i: i };
    m.g._f = f; feats.push(f); peakMarks.push(m);
    addToGrid(pk[2], pk[3], pk[2], pk[3], { f: f, p: [pk[2], pk[3]] });
    pkb = [Math.min(pkb[0], pk[2]), Math.min(pkb[1], pk[3]), Math.max(pkb[2], pk[2]), Math.max(pkb[3], pk[3])];
  });
  layers.kgp = kg; ext.kgp = pkb;
  var plg = el('g', { class: 'lyr', 'data-id': 'places' }, ui), plb = [1e9, 1e9, -1e9, -1e9], placeMarks = [];
  PLACES.forEach(function (p) {
    var xy = p.xy || D.pl_pts[p.id];
    var m = mark(plg, xy[0], xy[1], 'plc', { tabindex: '0', role: 'button', 'aria-label': p.info.h });
    if (p.ring) el('circle', { class: 'ring', r: 5.5, fill: 'none', stroke: C.ink, 'stroke-width': '1' }, m.g);
    el('circle', { class: 'dot', r: p.ring ? 1.9 : 3, fill: C.ink }, m.g);
    m.label = text(m.g, p.dx, p.dy, p.n, p.end ? 'end' : 'start', C.ink, HALO); m.lk = p.k || 0; placeMarks.push(m);
    var f = { type: 'place', id: 'places', layer: 'places', p: p, m: m, node: m.g };
    m.g._f = f; feats.push(f);
    addToGrid(xy[0], xy[1], xy[0], xy[1], { f: f, p: xy });
    plb = [Math.min(plb[0], xy[0]), Math.min(plb[1], xy[1]), Math.max(plb[2], xy[0]), Math.max(plb[3], xy[1])];
  });
  layers.places = plg; ext.places = plb;
  ext.all = [0, 0, VW, VH];
  var ringG = el('g', { class: 'magnet', 'aria-hidden': 'true', opacity: '0' }, ui);
  el('circle', { r: 9, fill: 'none', stroke: C.ink, 'stroke-width': '1' }, ringG);

  /* ---------- kamera ---------- */
  var cam = { x: VW / 2, y: VH / 2, l: 0 };                  // środek (świat) i log skali
  var spr = { x: { v: VW / 2, t: VW / 2, s: 0 }, y: { v: VH / 2, t: VH / 2, s: 0 }, l: { v: 0, t: 0, s: 0 } };
  var anchor = null, fly = null, raf = 0, pxu = 1;           // pxu: piksele ekranu na jednostkę viewBox

  function K() { return Math.exp(cam.l); }
  function bounds(k) {
    var f = Math.min(1, k - 1), hw = VW / (2 * k), hh = VH / (2 * k), mx = VW * .03 / k * f, my = VH * .03 / k * f;
    return [Math.min(hw - mx, VW / 2), Math.max(VW - hw + mx, VW / 2), Math.min(hh - my, VH / 2), Math.max(VH - hh + my, VH / 2)];
  }
  function clampC(x, y, k) { var b = bounds(k); return [clamp(x, b[0], b[1]), clamp(y, b[2], b[3])]; }
  function toScreen(x, y, k) { return [(x - cam.x) * k + VW / 2, (y - cam.y) * k + VH / 2]; }
  function toWorld(sx, sy) { var k = K(); return [(sx - VW / 2) / k + cam.x, (sy - VH / 2) / k + cam.y]; }
  function evtUnits(e) {                                     // punkt zdarzenia w jednostkach viewBox
    var r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH];
  }

  var lastPkn = null, uu = '1', drawing = false;
  function render() {
    var k = K();
    world.setAttribute('transform', 'translate(' + (VW / 2).toFixed(2) + ' ' + (VH / 2).toFixed(2) + ') scale(' + k.toFixed(5) + ') translate(' + (-cam.x).toFixed(3) + ' ' + (-cam.y).toFixed(3) + ')');
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i], s = toScreen(m.x, m.y, k), vis = k >= m.k;
      if (s[0] < -60 || s[0] > VW + 60 || s[1] < -60 || s[1] > VH + 60) vis = false;
      if (vis !== m.on) { m.on = vis; m.g.style.opacity = vis ? '' : '0'; m.g.style.pointerEvents = vis ? '' : 'none'; }
      if (vis) m.g.setAttribute('transform', 'translate(' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + ') scale(' + uu + ')');
    }
    // poziom szczegółów
    var z = k, pkn = clamp((z - 6) / 2.5, 0, 1).toFixed(3);
    if (drawing && Math.abs(z - 1) > .01) { drawing = false; setDraw(false); }
    glg.setAttribute('opacity', clamp(1.8 - z, 0, 1).toFixed(3));
    if (pkn !== lastPkn) { lastPkn = pkn; for (i = 0; i < peakMarks.length; i++) peakMarks[i].label.setAttribute('opacity', pkn); }
    for (i = 0; i < placeMarks.length; i++) { var pm = placeMarks[i]; pm.label.style.opacity = z >= pm.lk ? '' : '0'; }
    if (z > 1.5 && !hiImg) {
      hiImg = el('image', { href: 'assets/img/map-relief-south.jpg', x: HI[0], y: HI[1], width: HI[2], height: HI[3], preserveAspectRatio: 'none', class: 'relief relief-hi', opacity: '0' }, world);
      world.insertBefore(hiImg, world.children[1]);
      hiImg.addEventListener('load', function () { hiImg.classList.add('ok'); render(); });
    }
    if (hiImg) hiImg.setAttribute('opacity', hiImg.classList.contains('ok') ? clamp((z - 1.5) / 1.2, 0, 1).toFixed(3) : '0');
    if (z > 4 && !locState) { var lz = lmaxAt(cam.x, cam.y); if (lz > Math.log(27)) loadLocal(); }
    loc.setAttribute('opacity', clamp((z - 5) / 6, 0, 1).toFixed(3));
    var veil = clamp((z - 12) / 30, 0, 1);                       // rozmyta rzeźba ustępuje czystemu tłu
    polP.setAttribute('fill-opacity', (.1 + .78 * veil).toFixed(3));
    nbP.setAttribute('fill-opacity', (.74 + .2 * veil).toFixed(3));
    svg.classList.toggle('zoomed', z > 1.05);
    if (hoverPt) magnet();
  }

  /* sprężyna krytycznie tłumiona (zeta = 1) lub lekko sprężysta */
  function stepSpring(s, dt, w, z) { var a = w * w * (s.t - s.v) - 2 * z * w * s.s; s.s += a * dt; s.v += s.s * dt; }
  var W = 10, Z = 1, last = 0;
  function tick(now) {
    raf = 0;
    var dt = Math.min(.05, (now - (last || now)) / 1000 || .016); last = now;
    var moving = false;
    if (fly) {
      var t = clamp((now - fly.t0) / fly.dur, 0, 1), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var ec = 1 - Math.pow(1 - clamp(t * 1.12, 0, 1), 3);
      var s = .35, u = t - 1, back = 1 + (s + 1) * u * u * u + s * u * u;     // bardzo lekki przerzut skali na końcu
      cam.x = fly.x0 + (fly.x1 - fly.x0) * ec; cam.y = fly.y0 + (fly.y1 - fly.y0) * ec;
      cam.l = fly.l0 + (fly.l1 - fly.l0) * (fly.l1 > fly.l0 ? back : e) - fly.bump * Math.sin(Math.PI * t);
      spr.x.v = spr.x.t = cam.x; spr.y.v = spr.y.t = cam.y; spr.l.v = spr.l.t = cam.l; spr.x.s = spr.y.s = spr.l.s = 0;
      if (t >= 1) { fly = null; cam.x = spr.x.v = spr.x.t = fly0.x1; cam.y = spr.y.v = spr.y.t = fly0.y1; cam.l = spr.l.v = spr.l.t = fly0.l1; } else moving = true;
    } else if (!drag && !pinch) {
      var n = Math.max(1, Math.ceil(dt / .008)), h = dt / n;
      for (var i = 0; i < n; i++) { stepSpring(spr.l, h, W, Z); if (!anchor) { stepSpring(spr.x, h, W, Z); stepSpring(spr.y, h, W, Z); } }
      cam.l = spr.l.v;
      if (anchor) {
        var k = Math.exp(cam.l);
        cam.x = anchor.wx - (anchor.sx - VW / 2) / k; cam.y = anchor.wy - (anchor.sy - VH / 2) / k;
        spr.x.v = cam.x; spr.y.v = cam.y; spr.x.s = spr.y.s = 0;
        if (Math.abs(spr.l.t - spr.l.v) < 1e-4 && Math.abs(spr.l.s) < 1e-3) { anchor = null; spr.x.t = cam.x; spr.y.t = cam.y; }
      } else { cam.x = spr.x.v; cam.y = spr.y.v; }
      moving = anchor || Math.abs(spr.x.t - spr.x.v) > .01 || Math.abs(spr.y.t - spr.y.v) > .01 || Math.abs(spr.l.t - spr.l.v) > 1e-4 ||
        Math.abs(spr.x.s) > .01 || Math.abs(spr.y.s) > .01 || Math.abs(spr.l.s) > 1e-3;
    }
    render();
    if (moving) raf = requestAnimationFrame(tick); else last = 0;
  }
  var fly0 = null;
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
  function setTarget(x, y, l, w, z) {
    fly = null; anchor = null;
    l = clamp(l, LMIN, lmaxAt(x, y)); var c = clampC(x, y, Math.exp(l));
    spr.x.t = c[0]; spr.y.t = c[1]; spr.l.t = l; W = w || 10; Z = z || 1; kick();
  }
  function flyTo(x, y, k) {
    anchor = null;
    var l1 = clamp(Math.log(k), LMIN, lmaxAt(x, y)), c = clampC(x, y, Math.exp(l1));
    if (reduced) { fly = null; cam.x = spr.x.v = spr.x.t = c[0]; cam.y = spr.y.v = spr.y.t = c[1]; cam.l = spr.l.v = spr.l.t = l1; render(); return; }
    var k0 = K(), d = Math.hypot(c[0] - cam.x, c[1] - cam.y), vis = VW / k0;
    var bump = d > vis * .35 ? clamp(Math.log(d / vis + 1) * .5, 0, 1.1) : 0;
    bump = Math.min(bump, Math.max(0, Math.min(cam.l, l1) - LMIN + .15));
    var dur = clamp(760 + 520 * Math.min(1, d / (VW * .45)) + 220 * Math.abs(l1 - cam.l), 760, 1700);
    fly0 = fly = { t0: performance.now(), dur: dur, x0: cam.x, y0: cam.y, l0: cam.l, x1: c[0], y1: c[1], l1: l1, bump: bump };
    kick();
  }
  function fitK(bb, pad) {
    pad = pad == null ? .16 : pad;
    var w = Math.max(bb[2] - bb[0], .8) * (1 + pad * 2), h = Math.max(bb[3] - bb[1], .8) * (1 + pad * 2);
    return clamp(Math.min(VW / w, VH / h), KMIN, Math.exp(lmaxAt((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)));
  }
  function flyToBox(bb, pad) {
    if (bb[2] - bb[0] >= VW - 1) { flyTo(VW / 2, VH / 2, 1); return; }
    flyTo((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, fitK(bb, pad));
  }
  function zoomAt(sx, sy, dl, w) {
    fly = null;
    var wp = toWorld(sx, sy);
    var base = anchor ? spr.l.t : cam.l, l = clamp(base + dl, LMIN, lmaxAt(wp[0], wp[1])), k1 = Math.exp(l);
    var cx = wp[0] - (sx - VW / 2) / k1, cy = wp[1] - (sy - VH / 2) / k1, c = clampC(cx, cy, k1);
    spr.l.t = l; W = w || 12; Z = 1;
    if (Math.abs(c[0] - cx) + Math.abs(c[1] - cy) > .5) { anchor = null; spr.x.t = c[0]; spr.y.t = c[1]; }
    else { anchor = { sx: sx, sy: sy, wx: wp[0], wy: wp[1] }; }
    kick();
  }

  /* ---------- najbliższy obiekt (siatka przestrzenna) ---------- */
  function segDist(p, a, b) {
    var vx = b[0] - a[0], vy = b[1] - a[1], wx = p[0] - a[0], wy = p[1] - a[1], L = vx * vx + vy * vy, t = L ? clamp((wx * vx + wy * vy) / L, 0, 1) : 0;
    var qx = a[0] + vx * t, qy = a[1] + vy * t; return [Math.hypot(p[0] - qx, p[1] - qy), qx, qy];
  }
  function nearest(sx, sy, rPx) {
    var k = K(), p = toWorld(sx, sy), r = rPx / (pxu * k), best = null, bd = Infinity;
    var ix0 = Math.floor((p[0] - r) / CELL), ix1 = Math.floor((p[0] + r) / CELL), iy0 = Math.floor((p[1] - r) / CELL), iy1 = Math.floor((p[1] + r) / CELL);
    for (var ix = ix0; ix <= ix1; ix++) for (var iy = iy0; iy <= iy1; iy++) {
      var c = grid[cellKey(ix, iy)]; if (!c) continue;
      for (var i = 0; i < c.length; i++) {
        var it = c[i], d, q;
        if (it.p) { d = Math.hypot(p[0] - it.p[0], p[1] - it.p[1]) * .72; q = it.p; }
        else { var sd = segDist(p, it.a, it.b); d = sd[0]; q = [sd[1], sd[2]]; }
        if (sel !== 'all' && it.f.layer !== sel) d *= 1.6;
        if (it.f.type === 'peak' && k < 2.2 && sel !== 'kgp') d *= 1.35;
        if (d < bd && d <= r) { bd = d; best = { f: it.f, q: q, d: d / r }; }
      }
    }
    return best;
  }

  /* ---------- panel ---------- */
  function fx(node, type) { if (node && type && window.SPFX && typeof SPFX.apply === 'function') { try { SPFX.apply(node, type); return true; } catch (e) { /* bez efektu */ } } return false; }
  function srcLink(node, o) { if (node && o.src && window.SPFX && typeof SPFX.src === 'function') { try { SPFX.src(node, o.src, o.fx || 'gory', o.h); } catch (e) { /* bez odnośnika */ } } }
  /* zdjęcia panelu: [szer., wys., warianty WebP z assets/img/_v, podpis] */
  var PH = {"wyzwania/gory-bieg.jpg": [478, 422, [478], "Na szlaku w Sudetach"], "wyzwania/plakat-gss.jpg": [720, 1019, [480, 720], "Plakat „Przebiec góry dla Nikusi”"], "noc-drogowskaz.jpg": [900, 1600, [480, 800, 900], "Nocą przy drogowskazie na szlaku"], "las.jpg": [1277, 1600, [480, 800, 1200, 1277], "Z Krzysztofem Kościelnikiem w jesiennym lesie"], "szlak-noc.jpg": [1172, 1600, [480, 800, 1172], "Nocny przystanek przy mapie szlaku"], "blog/gsb-kamper.jpg": [1600, 1200, [480, 800, 1200, 1600], "Kamper supportu na trasie Głównego Szlaku Beskidzkiego"], "gory-selfie.jpg": [1440, 1085, [480, 800, 1200, 1440], "Na grani, zdjęcie z trasy"], "hero-noc.jpg": [1600, 1066, [480, 800, 1200, 1600], "Meta The Loop: czołówka na czole, zegarek w zębach"], "yt-loop.jpg": [960, 540, [480, 800, 960], "Kadr z filmu „The Loop”"], "wulkan.jpg": [719, 720, [480, 719], "Bieg po zaśnieżonym zboczu"], "kalistenika.jpg": [1600, 900, [480, 800, 1200, 1600], "Trening na drążkach"], "swit.jpg": [1600, 900, [480, 800, 1200, 1600], "Poranny trening o świcie"], "teraz.jpg": [1600, 800, [480, 800, 1200, 1600], "Trening, bieg i meta z dziećmi"], "backyard-noc.jpg": [1600, 1067, [], "Wspólne bieganie nocą"], "grupa-noc.jpg": [1600, 1066, [], "Z biegaczami na nocnej pętli"], "lod.jpg": [500, 367, [480, 500], "Pływanie w lodowatej wodzie"], "basen.jpg": [1066, 1600, [480, 800, 1066], "Z polską flagą na słupku startowym"], "plakat-2hard.jpg": [1131, 1600, [480, 800, 1131], "Plakat projektu 2Hard"], "yt-2hard.jpg": [960, 540, [480, 800, 960], "Kadr z filmu „2 Hard Road 2 Walk Alone”"], "grupa-tatry.jpg": [1600, 1067, [], "Z ekipą w Tatrach"]};
  function phName(f) { return f.replace(/\.[a-z]+$/i, '').replace(/\//g, '__'); }
  /* srcset z wariantów (panel) — przeglądarka bierze najmniejszy wystarczający */
  function phSet(f) {
    var m = PH[f]; if (!m) return '';
    var s = m[2].map(function (w) { return 'assets/img/_v/' + phName(f) + '-' + w + '.webp ' + w + 'w'; });
    if (m[2].indexOf(m[0]) < 0) s.push('assets/img/' + f + ' ' + m[0] + 'w');
    return s.join(', ');
  }
  function phAlt(f) { return (PH[f] && PH[f][3]) || ''; }
  function phImg(f, cls, sizes) {
    var m = PH[f] || [4, 3], set = phSet(f);
    return '<img class="' + cls + '" src="assets/img/' + f + '"' + (set ? ' srcset="' + set + '" sizes="' + sizes + '"' : '') +
      ' alt="' + phAlt(f).replace(/"/g, '&quot;') + '" width="' + m[0] + '" height="' + m[1] + '" loading="lazy" decoding="async">';
  }
  function photos(list) {
    if (!list || !list.length) return '';
    var f = list[0];
    /* scena o stałych proporcjach: zdjęcie w całości (contain), pod spodem jego rozmyta kopia — przełączanie nie przesuwa układu */
    var h = '<div class="mp-ph"><button type="button" class="mp-ph-main" data-i="0" aria-label="Powiększ zdjęcie: ' + phAlt(f).replace(/"/g, '&quot;') + '">' +
      phImg(f, 'mp-ph-bg', '(max-width: 960px) 60vw, 240px').replace(' alt="', ' aria-hidden="true" alt="').replace(/ alt="[^"]*"/, ' alt=""') +
      phImg(f, 'mp-ph-img', '(max-width: 960px) 92vw, 380px') + '</button>';
    if (list.length > 1) {
      h += '<div class="mp-ph-row">';
      list.forEach(function (g, i) {
        h += '<button type="button" class="mp-ph-t' + (i ? '' : ' on') + '" data-i="' + i + '" aria-label="Zdjęcie ' + (i + 1) + ' z ' + list.length + ': ' + phAlt(g).replace(/"/g, '&quot;') + '"' + (i ? '' : ' aria-current="true"') + '>' +
          phImg(g, 'mp-ph-ti', '64px').replace(/ alt="[^"]*"/, ' alt=""') + '</button>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }
  function renderInfo(o, withPh) {
    var h = '<p class="mp-meta">' + o.meta + '</p><h3>' + o.h + '</h3>';
    if (o.place) h += '<p class="mp-place">' + o.place + '</p>';
    if (o.num) h += '<p class="mp-num ' + (o.cls || '') + '"><span class="n">' + o.num + '</span>' + (o.unit ? '<small>' + o.unit + '</small>' : '') + '</p>';
    if (o.txt) h += '<p class="mp-txt">' + o.txt + '</p>';
    if (withPh) h += photos(o.ph);
    info.innerHTML = h;
    var n = info.querySelector('.mp-num .n') || info.querySelector('h3');
    var done = fx(n, o.fx);
    if (o.ring && !done && n) n.classList.add('ring');
    srcLink(n, o);
  }

  var sel = 'all', shown = null, shownPh = false, pinned = null, hovered = null;
  /* miniatury przełączają zdjęcie w panelu; duże zdjęcie otwiera podgląd */
  function setMain(i) {
    var list = shown && shown.ph; if (!list || !list[i]) return;
    var btn = info.querySelector('.mp-ph-main'); if (!btn) return;
    var f = list[i], tmp = document.createElement('div');
    tmp.innerHTML = phImg(f, 'mp-ph-bg', '(max-width: 960px) 60vw, 240px').replace(/ alt="[^"]*"/, ' alt="" aria-hidden="true"') + phImg(f, 'mp-ph-img', '(max-width: 960px) 92vw, 380px');
    btn.innerHTML = tmp.innerHTML;
    btn.setAttribute('data-i', i);
    btn.setAttribute('aria-label', 'Powiększ zdjęcie: ' + phAlt(f));
    info.querySelectorAll('.mp-ph-t').forEach(function (t) { var on = +t.getAttribute('data-i') === i; t.classList.toggle('on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  }
  info.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.mp-ph-t');
    if (t) { setMain(+t.getAttribute('data-i')); return; }
    var m = e.target.closest && e.target.closest('.mp-ph-main');
    if (m && shown && shown.ph) LB.open(shown.ph, +m.getAttribute('data-i') || 0, shown.h, m);
  });

  /* ---------- podgląd zdjęć (lightbox) ---------- */
  var LB = (function () {
    var root = null, img, cap, cnt, bPrev, bNext, bClose, list = [], idx = 0, title = '', back = null, lockPad = '';
    function build() {
      root = document.createElement('div');
      root.className = 'mp-lb'; root.hidden = true;
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Podgląd zdjęcia');
      root.innerHTML = '<div class="mp-lb-stage"><img class="mp-lb-img" alt=""></div>' +
        '<p class="mp-lb-cap"><b></b> <span></span> <i class="mp-lb-n"></i></p>' +
        '<button type="button" class="mp-lb-btn mp-lb-prev" aria-label="Poprzednie zdjęcie"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button type="button" class="mp-lb-btn mp-lb-next" aria-label="Następne zdjęcie"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<button type="button" class="mp-lb-btn mp-lb-close" aria-label="Zamknij podgląd"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      document.body.appendChild(root);
      img = root.querySelector('.mp-lb-img'); cap = root.querySelector('.mp-lb-cap');
      cnt = root.querySelector('.mp-lb-n'); bPrev = root.querySelector('.mp-lb-prev'); bNext = root.querySelector('.mp-lb-next'); bClose = root.querySelector('.mp-lb-close');
      bPrev.addEventListener('click', function () { go(-1); });
      bNext.addEventListener('click', function () { go(1); });
      bClose.addEventListener('click', close);
      root.addEventListener('click', function (e) { if (e.target === root || e.target.classList.contains('mp-lb-stage')) close(); });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'Tab') {   // pułapka fokusu
          var f = [].filter.call(root.querySelectorAll('button'), function (b) { return !b.hidden && b.offsetParent !== null; });
          if (!f.length) return;
          var a = f.indexOf(document.activeElement);
          if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      });
      var sx = null, sy = null;
      root.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
      root.addEventListener('touchend', function (e) {
        if (sx == null) return;
        var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = sy = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    function paint() {
      var f = list[idx], m = PH[f] || [0, 0];
      img.classList.add('swap');
      var n = new Image();
      n.onload = n.onerror = function () {
        img.src = n.src; img.alt = phAlt(f);
        if (m[0]) { img.width = m[0]; img.height = m[1]; }
        void img.offsetWidth; img.classList.remove('swap');
      };
      n.src = 'assets/img/' + f;   // oryginał = największe dostępne źródło
      cap.querySelector('b').textContent = title;
      cap.querySelector('span').textContent = phAlt(f);
      cnt.textContent = list.length > 1 ? (idx + 1) + ' / ' + list.length : '';
      bPrev.hidden = bNext.hidden = list.length < 2;
      [-1, 1].forEach(function (d) { var g = list[(idx + d + list.length) % list.length]; if (g) (new Image()).src = 'assets/img/' + g; });
    }
    function go(d) { if (list.length < 2) return; idx = (idx + d + list.length) % list.length; paint(); }
    function lock(on) {
      var h = document.documentElement, gutter = (getComputedStyle(h).scrollbarGutter || '').indexOf('stable') > -1;
      if (on) {
        var sb = window.innerWidth - h.clientWidth;
        lockPad = document.body.style.paddingRight;
        if (!gutter && sb > 0) document.body.style.paddingRight = sb + 'px';   // bez przeskoku po zniknięciu paska
        h.classList.add('mp-lb-lock');
      } else {
        h.classList.remove('mp-lb-lock');
        document.body.style.paddingRight = lockPad;
      }
    }
    function open(l, i, t, from) {
      if (!root) build();
      list = l.slice(); idx = i || 0; title = t || ''; back = from || document.activeElement;
      paint(); lock(true);
      root.hidden = false;
      void root.offsetWidth;   // wymuszony układ: przejście startuje bez czekania na klatkę
      root.classList.add('on');
      bClose.focus({ preventScroll: true });
    }
    function close() {
      if (!root || root.hidden) return;
      root.classList.remove('on');
      var done = function () { root.hidden = true; lock(false); if (back && back.focus) back.focus({ preventScroll: true }); };
      if (SP.reduced) done(); else setTimeout(done, 220);
    }
    return { open: open, close: close };
  })();
  function focusLayer(id) {
    Object.keys(layers).forEach(function (k) {
      var dim = id !== 'all' && k !== id;
      layers[k].classList.toggle('dim', dim); layers[k].classList.toggle('hl', k === id);
      if (uiLayers[k]) uiLayers[k].classList.toggle('dim', dim);
    });
  }
  function show(o) { var ph = o === pinned || (!hovered && o !== INFO.all && o !== INFO.places); if (shown === o && shownPh === ph) return; shown = o; shownPh = ph; renderInfo(o, ph); }
  function peakInfo(pk) { return pk._o || (pk._o = { meta: '2023', fx: 'gory', h: 'Korona Gór Polski', place: pk[0] + ', ' + (window.SP ? SP.fmt(pk[1]) : String(pk[1])) + ' m n.p.m.', num: '99:36', unit: 'h na całą koronę', cls: 'trail', src: SRC.kgp, ph: INFO.kgp.ph }); }
  function featInfo(f) { return f.type === 'trail' ? INFO[f.id] : f.type === 'peak' ? peakInfo(f.pk) : f.p.info; }
  function setChips(id) { chipsEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-id') === id ? 'true' : 'false'); }); }
  function select(id, noMove) {
    if (hovered && hovered.node) hovered.node.classList.remove('near');
    hovered = null; sel = id; pinned = null; setChips(id); focusLayer(id); show(INFO[id]);
    peakMarks.forEach(function (m) { m.g.classList.remove('on'); });
    if (!noMove) flyToBox(ext[id]);
  }
  function pick(f) {
    if (f.type === 'trail') { if (sel !== f.id) select(f.id); else flyToBox(ext[f.id]); return; }
    if (sel !== f.layer) { sel = f.layer; setChips(f.layer); focusLayer(f.layer); }
    if (hovered && hovered.node) hovered.node.classList.remove('near');
    hovered = null; pinned = featInfo(f); show(pinned);
    peakMarks.forEach(function (m) { m.g.classList.toggle('on', f.m === m); });
    if (f.type === 'place' && f.p.box) { loadLocal(); flyToBox(LOC_BB[f.p.box], f.p.pad); return; }
    var xy = f.type === 'peak' ? [f.pk[2], f.pk[3]] : (f.p.xy || D.pl_pts[f.p.id]);
    var inHi = xy[0] >= HI[0] && xy[0] <= HI[0] + HI[2] && xy[1] >= HI[1] && xy[1] <= HI[1] + HI[3];
    flyTo(xy[0], xy[1], Math.max(K(), f.type === 'peak' ? (inHi ? 9 : 5) : f.p.zk));
  }
  function reset() { select('all', true); flyTo(VW / 2, VH / 2, 1); }
  function preview(f) {
    if (hovered === f) return;
    if (hovered && hovered.node) hovered.node.classList.remove('near');
    hovered = f;
    if (f) { if (f.node) f.node.classList.add('near'); focusLayer(f.layer); show(featInfo(f)); }
    else { focusLayer(sel); show(pinned || INFO[sel]); }
  }

  CHIPS.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('data-id', c[0]); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = (c[0] === 'loop' ? '<span class="lp" aria-hidden="true"></span>' : '') + c[1];
    b.addEventListener('click', function () { if (c[0] === 'all') reset(); else select(c[0]); });
    chipsEl.appendChild(b);
  });

  /* ---------- magnes: pierścień dociąga do najbliższego obiektu ---------- */
  var hoverPt = null, near = null;
  function magnet() {
    near = nearest(hoverPt[0], hoverPt[1], 34);
    if (near) {
      var k = K(), s = toScreen(near.q[0], near.q[1], k), a = Math.pow(1 - clamp(near.d, 0, 1), .6);
      var x = hoverPt[0] + (s[0] - hoverPt[0]) * a, y = hoverPt[1] + (s[1] - hoverPt[1]) * a;
      ringG.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + uu + ')');
      ringG.setAttribute('opacity', (.25 + .6 * a).toFixed(2));
      svg.style.cursor = 'pointer';
    } else { ringG.setAttribute('opacity', '0'); svg.style.cursor = ''; }
    preview(near ? near.f : null);
  }

  /* ---------- gesty ---------- */
  var active = false, drag = null, pinch = null, moved = false, lastTap = 0, hovRaf = 0;
  function activate(on) { active = on; wrap.classList.toggle('on', on); }

  svg.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') { if (!e.isPrimary) return; drag = { id: e.pointerId, touch: true, p0: evtUnits(e) }; moved = false; return; }
    if (e.button !== 0) return;
    activate(true); fly = null; anchor = null;
    var p = evtUnits(e);
    drag = { id: e.pointerId, p0: p, c0: [cam.x, cam.y], hist: [[performance.now(), p[0], p[1]]] };
    moved = false;
    try { svg.setPointerCapture(e.pointerId); } catch (x) { /* brak */ }
  });
  svg.addEventListener('pointermove', function (e) {
    var p = evtUnits(e);
    if (drag && drag.id === e.pointerId && !drag.touch) {
      var dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1];
      if (!moved && Math.hypot(dx, dy) * pxu > 4) { moved = true; wrap.classList.add('grabbing'); ringG.setAttribute('opacity', '0'); }
      if (moved) {
        var k = K(), x = drag.c0[0] - dx / k, y = drag.c0[1] - dy / k, b = bounds(k);
        // miękkie krawędzie: opór poza granicą
        if (x < b[0]) x = b[0] - (b[0] - x) * .35; if (x > b[1]) x = b[1] + (x - b[1]) * .35;
        if (y < b[2]) y = b[2] - (b[2] - y) * .35; if (y > b[3]) y = b[3] + (y - b[3]) * .35;
        cam.x = spr.x.v = spr.x.t = x; cam.y = spr.y.v = spr.y.t = y;
        drag.hist.push([performance.now(), p[0], p[1]]); if (drag.hist.length > 6) drag.hist.shift();
        render();
      }
      return;
    }
    if (drag && drag.touch && drag.id === e.pointerId) { if (Math.hypot(p[0] - drag.p0[0], p[1] - drag.p0[1]) * pxu > 8) moved = true; return; }
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      hoverPt = p;
      if (!hovRaf) hovRaf = requestAnimationFrame(function () { hovRaf = 0; if (hoverPt && !drag) magnet(); });
    }
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag; drag = null; wrap.classList.remove('grabbing');
    if (d.touch) { if (!moved && e.type === 'pointerup') tap(evtUnits(e), 30); return; }
    if (!moved) { tap(evtUnits(e), 34); return; }
    // pęd: prędkość z ostatnich próbek
    var h = d.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b[0] - a[0]) / 1000, k = K();
    var vx = -(b[1] - a[1]) / k / dt, vy = -(b[2] - a[2]) / k / dt;
    if (performance.now() - b[0] > 90) { vx = vy = 0; }
    var vmax = 2.2 * VW / k, sp = Math.hypot(vx, vy);            // ogranicz rzut, by pęd był miękki
    if (sp > vmax) { vx *= vmax / sp; vy *= vmax / sp; }
    spr.x.s = vx; spr.y.s = vy;
    var c = clampC(cam.x + vx * .28, cam.y + vy * .28, k);
    spr.x.v = cam.x; spr.y.v = cam.y; spr.x.t = c[0]; spr.y.t = c[1]; spr.l.v = cam.l; spr.l.t = Math.min(cam.l, lmaxAt(c[0], c[1])); W = 6.5; Z = 1; kick();
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', function (e) { if (drag && drag.id === e.pointerId) { drag = null; wrap.classList.remove('grabbing'); } });
  svg.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { hoverPt = null; ringG.setAttribute('opacity', '0'); svg.style.cursor = ''; preview(null); }
  });
  wrap.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !drag) activate(false); });

  function tap(p, r) {
    var now = performance.now();
    if (now - lastTap < 320 && lastTap) { lastTap = 0; zoomAt(p[0], p[1], Math.log(2)); return; }
    lastTap = now;
    var n = nearest(p[0], p[1], r);
    if (n) { preview(null); pick(n.f); }
    else if (sel !== 'all' || K() > 1.02) reset();
  }
  svg.addEventListener('dblclick', function (e) { e.preventDefault(); });

  /* kółko / gładzik: zoom wokół kursora (po kliknięciu mapy albo z Ctrl/⌘; szczypanie gładzika zawsze) */
  wrap.addEventListener('wheel', function (e) {
    var pinchPad = e.ctrlKey && !e.deltaMode && Math.abs(e.deltaY) < 50;
    if (!(active || e.ctrlKey || e.metaKey)) return;
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    var dl = -dy * (pinchPad ? .011 : .0024);
    var base = anchor ? spr.l.t : cam.l;
    if (!e.ctrlKey && !e.metaKey && dl < 0 && base <= LMIN + 1e-3) return;   // w pełnym oddaleniu przewijamy stronę
    e.preventDefault();
    var p = evtUnits(e);
    zoomAt(p[0], p[1], clamp(dl, -.6, .6), pinchPad ? 18 : 11);
  }, { passive: false });

  /* dotyk: dwa palce przesuwają i przybliżają, jeden przewija stronę */
  function tmid(t) { var r = svg.getBoundingClientRect(); return [((t[0].clientX + t[1].clientX) / 2 - r.left) / r.width * VW, ((t[0].clientY + t[1].clientY) / 2 - r.top) / r.height * VH]; }
  function tdist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  svg.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      fly = null; anchor = null; drag = null; activate(true);
      var m = tmid(e.touches), w = toWorld(m[0], m[1]);
      pinch = { d0: tdist(e.touches), l0: cam.l, wx: w[0], wy: w[1] };
      e.preventDefault();
    }
  }, { passive: false });
  svg.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    var m = tmid(e.touches), l = pinch.l0 + Math.log(tdist(e.touches) / pinch.d0);
    var lm = lmaxAt(pinch.wx, pinch.wy);
    if (l < LMIN) l = LMIN - (LMIN - l) * .3; if (l > lm) l = lm + (l - lm) * .3;
    var k = Math.exp(l);
    cam.l = spr.l.v = spr.l.t = l;
    cam.x = spr.x.v = spr.x.t = pinch.wx - (m[0] - VW / 2) / k;
    cam.y = spr.y.v = spr.y.t = pinch.wy - (m[1] - VH / 2) / k;
    render();
  }, { passive: false });
  svg.addEventListener('touchend', function (e) {
    if (!pinch || e.touches.length >= 2) return;
    pinch = null;
    var l = clamp(cam.l, LMIN, lmaxAt(cam.x, cam.y)), c = clampC(cam.x, cam.y, Math.exp(l));
    spr.l.t = l; spr.x.t = c[0]; spr.y.t = c[1]; W = 9; Z = 1; kick();
  });

  /* ---------- klawiatura i przyciski ---------- */
  wrap.addEventListener('focusin', function () { activate(true); });
  wrap.addEventListener('focusout', function (e) { if (!wrap.contains(e.relatedTarget)) { activate(false); if (hovered) preview(null); } });
  wrap.addEventListener('keydown', function (e) {
    var k = K(), step = VW * .14 / k, t = e.target;
    if (e.key === 'Escape') { reset(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && t && t._f) { e.preventDefault(); preview(null); pick(t._f); return; }
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('data-id') && trailG[t.getAttribute('data-id')]) { e.preventDefault(); pick(feats.filter(function (f) { return f.node === t; })[0]); return; }
    var dx = 0, dy = 0, dl = 0;
    if (e.key === 'ArrowLeft') dx = -step; else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step; else if (e.key === 'ArrowDown') dy = step;
    else if (e.key === '+' || e.key === '=') dl = Math.log(1.6); else if (e.key === '-' || e.key === '_') dl = -Math.log(1.6);
    else if (e.key === '0') { reset(); return; }
    else return;
    e.preventDefault();
    if (dl) zoomAt(VW / 2, VH / 2, dl);
    else setTarget((anchor || fly ? cam.x : spr.x.t) + dx, (anchor || fly ? cam.y : spr.y.t) + dy, spr.l.t, 11, 1);
  });
  /* fokus na obiekcie: podgląd i łagodne pokazanie, jeśli jest poza kadrem */
  wrap.addEventListener('focusin', function (e) {
    var t = e.target, f = t && (t._f || feats.filter(function (x) { return x.node === t; })[0]);
    if (!f) return;
    preview(f);
    if (f.type !== 'trail') {
      var xy = f.type === 'peak' ? [f.pk[2], f.pk[3]] : (f.p.xy || D.pl_pts[f.p.id]), s = toScreen(xy[0], xy[1], K());
      if (s[0] < VW * .08 || s[0] > VW * .92 || s[1] < VH * .08 || s[1] > VH * .92) flyTo(xy[0], xy[1], K());
    }
  });

  var ctr = document.createElement('div');
  ctr.className = 'mp-ctl';
  ctr.innerHTML = '<button type="button" data-z="1" aria-label="Przybliż"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9"/></svg></button>' +
    '<button type="button" data-z="-1" aria-label="Oddal"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7h9"/></svg></button>' +
    '<button type="button" data-z="0" aria-label="Cała Polska"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 11.5 5.6 5l2.3 3.4L9.8 6l2.7 5.5z"/></svg></button>';
  wrap.appendChild(ctr);
  ctr.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var z = +b.getAttribute('data-z');
    if (!z) reset(); else zoomAt(VW / 2, VH / 2, z * Math.log(1.8), 9);
  });

  /* ---------- rozmiar, start i rysowanie szlaków ---------- */
  function measure() {
    var w = svg.getBoundingClientRect().width || svg.clientWidth || 800; pxu = w / VW;
    uu = (VW / w).toFixed(4);
    render();
  }
  measure();
  select('all', true);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(svg);
  else window.addEventListener('resize', measure);

  var trPaths = world.querySelectorAll('.tr'), trxPaths = world.querySelectorAll('.trx');
  function setDraw(on) {                                     // pierwsze rysowanie: skalowana kreska + pathLength
    for (var i = 0; i < trPaths.length; i++) {
      var p = trPaths[i];
      if (on) { p.setAttribute('vector-effect', 'none'); p.setAttribute('stroke-width', (1.9 / pxu / K()).toFixed(3)); p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; }
      else { p.setAttribute('vector-effect', NSS); p.setAttribute('stroke-width', '1.9'); p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; }
    }
    for (i = 0; i < trxPaths.length; i++) { trxPaths[i].style.opacity = on ? '0' : ''; trxPaths[i].style.transition = ''; }
  }
  function draw() {
    setDraw(true); drawing = true;
    svg.getBoundingClientRect();
    requestAnimationFrame(function () {
      for (var i = 0; i < trPaths.length; i++) { trPaths[i].style.transition = 'stroke-dashoffset 2.8s cubic-bezier(.2,.7,.1,1)'; trPaths[i].style.strokeDashoffset = '0'; }
      for (i = 0; i < trxPaths.length; i++) { trxPaths[i].style.transition = 'opacity 1s ease 2.2s'; trxPaths[i].style.opacity = '1'; }
      setTimeout(function () { if (drawing) { drawing = false; setDraw(false); } }, 3200);
    });
  }
  svg.classList.add('drawn');
  if (window.SP && !reduced) { setDraw(true); SP.onVisible(svg, draw, '0px 0px -25% 0px'); }
})();

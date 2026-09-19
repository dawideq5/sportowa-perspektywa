/* ==========================================================================
   Trasy — „Góry z bliska”: prawdziwy teren 3D (three.js r128, ładowany leniwie).
   Siatka wysokości z AWS Terrarium + tekstura (cieniowanie, lasy, woda z OSM),
   trasa jako rurka. Spokojnie: widok ogólny trasy, jednorazowe wrysowanie trasy,
   przewijanie profilu przesuwa znacznik i łagodnie przybliża kamerę.
   Bez przejmowania przewijania strony; renderuje tylko, gdy coś się zmienia.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('trasy');
  if (!root) return;
  var SP = window.SP, T = window.SP_TRASY || {}, PF = window.SP_PROFILES || {};
  function $(id) { return document.getElementById(id); }
  var stage = $('tsStage'), view = $('tsView'), fb = $('tsFallback'), labLayer = $('tsLabels');
  var info = $('tsInfo'), svg = $('tsSvg'), axis = $('tsAxis'), tip = $('tsTip'), split = $('tsSplit'), chips = $('tsChips');
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var EX = 1.7;   // przewyższenie pionowe terenu
  var SMALL = window.innerWidth < 760 || (navigator.deviceMemory && navigator.deviceMemory < 4);
  var reduced = !!(SP && SP.reduced);

  /* dystans prowadzi, czas wpleciony w tę samą linię (format zegarka) */
  var R = {
    gss: { meta: '2025, Sudety', title: 'Główny Szlak Sudecki', km: '445', time: '86:51', txt: 'Z Prudnika do Świeradowa-Zdroju w sierpniu 2025, dla Nikusi. Trzeci najszybszy czas w historii szlaku.', src: 'https://www.tychy.info/sport/25535-tyszanin-andrzej-kowalczyk-pokonal-glowny-szlak-sudecki-zrobil-to-dla-nikusi-tychy', srcL: 'tychy.info', fx: 'gory', trail: 1, cam: { back: 13, up: 8, ahead: 2.6, side: .42, win: .016 } },
    gsb: { meta: '2023, Beskidy', title: 'Główny Szlak Beskidzki', km: '500', time: '88 h+', txt: 'Z Wołosatego do Ustronia w październiku 2023, dla 13-miesięcznej Natalki. Najdłuższy szlak w polskich górach.', src: 'https://www.tychy.pl/2023/10/11/andrzej-kowalczyk-biegiem-przez-beskidy/', srcL: 'tychy.pl', fx: 'gory', trail: 1, cam: { back: 15, up: 9.2, ahead: 3, side: .42, win: .014 } },
    loop: { meta: '2024, Beskidy', title: 'The Loop', km: '235', time: '42:53:24', ring: 1, txt: 'Wielka Pętla Beskidzka ze startem i metą w Bielsku-Białej, 12–13 października 2024. Rekord FKT.', src: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-loop-2024-10-13', srcL: 'fastestknowntime.com', fx: 'petla', trail: 1, cam: { back: 8, up: 5, ahead: 1.6, side: .42, win: .02 } },
    msb: { meta: '2024, Beskid Mały i Makowski', title: 'Mały Szlak Beskidzki', km: '137', time: '20:45:56', txt: 'Z Bielska-Białej na Luboń Wielki, samotnie i bez wsparcia, 7 sierpnia 2024.', src: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-maly-szlak-beskidzki-poland-2024-08-07', srcL: 'fastestknowntime.com', fx: 'gory', trail: 1, cam: { back: 7.5, up: 4.7, ahead: 1.5, side: .42, win: .02 } },
    tatry: { meta: '2025, Orawa i Tatry', title: '2×Harda', km: '604', time: '65 h+', cls: 'harda', txt: '10 km pływania w Jeziorze Orawskim, 480 km roweru i 110 km biegu przez Tatry, 13–15 czerwca 2025. Pierwszy raz w historii.', src: 'https://www.tychy.pl/2025/06/16/andrzej-kowalczyk-jako-pierwszy-ukonczyl-podwojny-najtrudniejszy-triathlon-w-europie/', srcL: 'tychy.pl', fx: 'gory', trail: 0, cam: { back: 9, up: 5.6, ahead: 4, side: .3, win: .05 } }
  };

  var cur = 'gss';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var fmt = function (n, d) { return SP && SP.fmt ? SP.fmt(n, d) : String(Math.round(n)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function texSrc(k) { var w = T[k] && T[k].tex === 'webp'; return 'assets/img/trasy/' + k + '-t' + (w ? (SMALL ? '-m' : '') + '.webp' : '.jpg'); }
  function posterSrc(k) { return 'assets/img/trasy/' + k + '-poster.webp'; }

  /* ---------------- panel z opisem ---------------- */
  function renderInfo(k) {
    var r = R[k];
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
    info.innerHTML = '<p class="ts-meta">' + r.meta + '</p>' +
      '<h3 class="h3 ts-title"><span class="ts-t">' + r.title + '</span></h3>' +
      '<p class="ts-num ' + (r.cls || '') + '"><span class="ts-km"><span class="ts-n">' + r.km + '</span><small>km</small></span>' +
      '<span class="ts-time' + (r.ring ? ' ring' : '') + '">' + r.time + '</span></p>' +
      '<p class="ts-txt">' + r.txt + '</p>';
    var t = info.querySelector('.ts-t'), n = info.querySelector('.ts-num');
    if (window.SPFX && SPFX.src) {
      if (T[k] && T[k].rel) SPFX.src(t, 'https://www.openstreetmap.org/relation/' + T[k].rel, 'gory', 'OpenStreetMap');
      SPFX.src(n, r.src, r.fx, r.srcL);
    }
  }

  /* ---------------- profil wysokości (SVG) ---------------- */
  var ch = { pts: null };
  function smooth(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function niceStep(L) { var s = [5, 10, 20, 25, 50, 100]; for (var i = 0; i < s.length; i++) if (L / s[i] <= 6) return s[i]; return 100; }
  function drawChart(k) {
    var prof = PF[k];
    tip.classList.remove('on');
    if (!prof || !R[k].trail) {
      svg.style.display = 'none'; axis.innerHTML = ''; ch = { pts: null };
      split.hidden = k !== 'tatry';
      return;
    }
    svg.style.display = ''; split.hidden = true;
    var box = svg.getBoundingClientRect(), W = Math.max(200, box.width), H = Math.max(80, box.height);
    var padT = 8, padB = 20, L = prof.km, lo = Math.floor(prof.min / 100) * 100, hi = Math.ceil(prof.max / 100) * 100, n = prof.length;
    var base = H - padB, pts = [], i;
    for (i = 0; i < n; i++) pts.push([i / (n - 1) * W, padT + (1 - (prof[i] - lo) / (hi - lo)) * (base - padT)]);
    var d = smooth(pts);
    var lv = [lo, Math.round((lo + hi) / 200) * 100, hi], g = '', ax = '';
    lv.forEach(function (v) {
      var y = padT + (1 - (v - lo) / (hi - lo)) * (base - padT);
      g += '<line class="grid" x1="0" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      ax += '<span style="left:0;top:' + (y - 15).toFixed(1) + 'px">' + fmt(v) + ' m</span>';
    });
    var st = niceStep(L);
    for (var km = 0; km <= L + .01; km += st) {
      var x = km / L * W;
      if (W - x < 72 && km > 0) continue;
      ax += '<span style="left:' + x.toFixed(1) + 'px;top:' + (base + 4) + 'px;transform:translateX(' + (km === 0 ? '0' : '-50%') + ')">' + fmt(km) + '</span>';
    }
    ax += '<span style="right:0;top:' + (base + 4) + 'px">km</span>';
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1));
    svg.setAttribute('aria-label', 'Profil wysokości: ' + fmt(L, 1) + ' km, od ' + fmt(prof.min) + ' do ' + fmt(prof.max) + ' m n.p.m.');
    svg.innerHTML = '<defs><clipPath id="tsClip"><rect id="tsClipR" x="0" y="0" width="0" height="' + H + '"/></clipPath></defs>' + g +
      '<path class="ar" d="' + d + 'L' + W.toFixed(1) + ' ' + base + 'L0 ' + base + 'Z"/>' +
      '<path class="ln" d="' + d + '"/><path class="ln-done" clip-path="url(#tsClip)" d="' + d + '"/>' +
      '<line class="cur" id="tsCur" x1="0" x2="0" y1="' + padT + '" y2="' + base + '"/><circle class="dot" id="tsDot" r="4.5" cx="0" cy="' + base + '"/>';
    axis.innerHTML = ax;
    ch = { k: k, W: W, H: H, pts: pts, prof: prof, L: L, cur: $('tsCur'), dot: $('tsDot'), clip: $('tsClipR') };
    cursor(S.show, false);
  }
  function cursor(t, tipOn) {
    if (!ch.pts) return;
    var n = ch.pts.length, f = clamp(t, 0, 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), fr = f - i;
    var a = ch.pts[i], b = ch.pts[i + 1], x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr;
    var e = ch.prof[i] + (ch.prof[i + 1] - ch.prof[i]) * fr;
    ch.cur.setAttribute('x1', x.toFixed(1)); ch.cur.setAttribute('x2', x.toFixed(1));
    ch.dot.setAttribute('cx', x.toFixed(1)); ch.dot.setAttribute('cy', y.toFixed(1));
    ch.clip.setAttribute('width', x.toFixed(1));
    if (tipOn) {
      tip.textContent = fmt(t * ch.L) + ' km, ' + fmt(e) + ' m n.p.m.';
      tip.style.left = clamp(x, 60, ch.W - 60).toFixed(1) + 'px';
    }
    tip.classList.toggle('on', !!tipOn);
  }

  /* ---------------- stan (wspólny dla profilu i widoku 3D) ----------------
     show: pokazana część trasy (0..1); scrub: pozycja wskazana na profilu albo null */
  var S = { show: reduced ? 1 : 0, draw: null, scrub: null, w: 0, release: 0 };
  function scrubTo(f) { S.scrub = clamp(f, 0, 1); S.release = 0; kick(); paintChart(); }
  function scrubEnd(delay) { S.release = performance.now() + (delay || 0); kick(); }
  function paintChart() { cursor(S.scrub !== null ? S.scrub : S.show, S.scrub !== null); }
  function fromEvent(ev) { var r = svg.getBoundingClientRect(); return (ev.clientX - r.left) / r.width; }
  svg.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse' || ev.buttons) scrubTo(fromEvent(ev)); });
  svg.addEventListener('pointerdown', function (ev) { scrubTo(fromEvent(ev)); });
  svg.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') scrubEnd(0); });
  svg.addEventListener('pointerup', function (ev) { if (ev.pointerType !== 'mouse') scrubEnd(1600); });
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    scrubTo((S.scrub !== null ? S.scrub : 0) + (e.key === 'ArrowRight' ? .02 : -.02));
  });
  svg.addEventListener('blur', function () { scrubEnd(0); });

  /* ---------------- three.js: leniwie ---------------- */
  var G = null, cache = {}, raf = 0, visible = false, started = false;
  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function whenThree(cb) {
    if (window.THREE) return cb();
    if (SP && SP.three) { SP.three().then(function () { cb(); }, function () {}); return; }   // wspólny, jednorazowy loader
    var s = document.querySelector('script[src*="three.js/r128/three.min.js"]');
    if (!s) { s = document.createElement('script'); s.src = THREE_URL; s.async = true; document.head.appendChild(s); }
    s.addEventListener('load', function () { if (window.THREE) cb(); });
  }
  function loadImg(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.decoding = 'async'; im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  function load(k) {
    if (cache[k]) return cache[k].p;
    var d = T[k], c = {};
    c.p = Promise.all([loadImg('assets/img/trasy/' + k + '-h.png'), loadImg(texSrc(k))]).then(function (a) {
      var hi = a[0], cv = document.createElement('canvas'); cv.width = hi.naturalWidth; cv.height = hi.naturalHeight;
      var cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(hi, 0, 0);
      var px = cx.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, H = new Float32Array(n);
      for (var i = 0; i < n; i++) H[i] = d.emin + px[i * 4] * 256 + px[i * 4 + 1];
      c.h = H; c.hw = cv.width; c.hh = cv.height; c.img = a[1];
      return c;
    });
    c.p.catch(function () { delete cache[k]; });
    cache[k] = c;
    return c.p;
  }
  /* wysokość (m) w punkcie świata (km) — dwuliniowo z siatki */
  function hm(c, d, x, z) {
    var gx = clamp((x / d.wkm + .5) * (c.hw - 1), 0, c.hw - 1.001), gz = clamp((z / d.hkm + .5) * (c.hh - 1), 0, c.hh - 1.001);
    var x0 = gx | 0, z0 = gz | 0, fx = gx - x0, fz = gz - z0, w = c.hw, h = c.h;
    var a = h[z0 * w + x0], b = h[z0 * w + x0 + 1], e = h[(z0 + 1) * w + x0], f = h[(z0 + 1) * w + x0 + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (e * (1 - fx) + f * fx) * fz;
  }
  function Y(d, m) { return (m - d.emin) / 1000 * EX; }

  /* łagodne wygaszenie krawędzi terenu w tło strony */
  function edgeMap() {
    var S2 = 128, cv = document.createElement('canvas'); cv.width = cv.height = S2;
    var cx = cv.getContext('2d'), im = cx.createImageData(S2, S2);
    for (var y = 0; y < S2; y++) for (var x = 0; x < S2; x++) {
      var e = Math.min(x, y, S2 - 1 - x, S2 - 1 - y) / S2, t = clamp(e / .09, 0, 1), a = t * t * (3 - 2 * t);
      var o = (y * S2 + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.round(a * 255); im.data[o + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    return new THREE.CanvasTexture(cv);
  }

  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }   // kolor strony (sRGB) → przestrzeń liniowa renderera

  /* linia trasy i kropki o stałym rozmiarze na ekranie (niezależnie od odległości kamery):
     rurkę o znikomym promieniu „nadmuchujemy” w shaderze wzdłuż normalnych o k·odległość */
  function screenWide(mat, halfRad) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uW = { value: halfRad };
      sh.vertexShader = 'uniform float uW;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = vec3( position );\n' +
        'float dCam = length( ( modelMatrix * vec4( position, 1.0 ) ).xyz - cameraPosition );\n' +
        'transformed += normal * uW * dCam;');
    };
    mat.customProgramCacheKey = function () { return 'sw' + halfRad; };
    return mat;
  }
  function screenDot(mat, rad) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uR = { value: rad };
      sh.vertexShader = 'uniform float uR;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        'float dC = length( ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz - cameraPosition );\n' +
        'vec3 transformed = position * uR * dC;');
    };
    mat.customProgramCacheKey = function () { return 'sd' + rad; };
    return mat;
  }

  function init() {
    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SMALL ? 1.75 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0xffffff, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    view.insertBefore(renderer.domElement, labLayer);
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 10, 100);
    var camera = new THREE.PerspectiveCamera(34, 1, .05, 4000);
    G = {
      renderer: renderer, scene: scene, camera: camera, edge: edgeMap(),
      pos: new THREE.Vector3(), look: new THREE.Vector3(), tp: new THREE.Vector3(), tl: new THREE.Vector3(),
      op: new THREE.Vector3(), ol: new THREE.Vector3(), fp: new THREE.Vector3(), fl: new THREE.Vector3(),
      a: new THREE.Vector3(), b: new THREE.Vector3(), p: new THREE.Vector3(), v: new THREE.Vector3(),
      snap: true, obj: [], labels: [], lastT: 0, dirty: true
    };
    resize();
  }

  function clearRoute() {
    G.obj.forEach(function (o) {
      G.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    G.obj = []; G.tube = G.casing = G.marker = G.halo = G.curve = null;
    labLayer.innerHTML = ''; G.labels = [];
  }

  function build(k, c) {
    var THREE = window.THREE, d = T[k], r = R[k];
    clearRoute();
    // teren
    var step = SMALL ? 2 : 1;
    var gw = Math.floor((c.hw - 1) / step) + 1, gh = Math.floor((c.hh - 1) / step) + 1;
    var geo = new THREE.PlaneGeometry(d.wkm, d.hkm, gw - 1, gh - 1);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position, i;
    for (i = 0; i < pos.count; i++) pos.setY(i, Y(d, hm(c, d, pos.getX(i), pos.getZ(i))));
    var tex = new THREE.Texture(c.img); tex.needsUpdate = true; tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = G.renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    var terrain = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaMap: G.edge, transparent: true }));
    terrain.renderOrder = 0;
    G.scene.add(terrain); G.obj.push(terrain);

    // ścieżka (trasa albo przelot nad Tatrami)
    var src = d.route || d.path, pts = [], lift = r.cam.back * .004 + .015;
    for (i = 0; i < src.length; i++) {
      var x = src[i][0], z = src[i][1];
      pts.push(new THREE.Vector3(x, Y(d, hm(c, d, x, z)) + lift, z));
    }
    var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    curve.arcLengthDivisions = 3000;
    G.curve = curve;
    if (r.trail) {
      // szerokości w radianach kąta widzenia: ~1,6 px linii i ~3 px obrysu przy typowym widoku
      var px = (G.camera.fov * Math.PI / 180) / Math.max(420, view.clientHeight);
      var segs = Math.min(2800, src.length * 3), RS = 8, tiny = 1e-4;
      var tubeOf = function (w, mat, order) {
        var m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, tiny, RS, false), screenWide(mat, w));
        m.renderOrder = order; m.frustumCulled = false; G.scene.add(m); G.obj.push(m); return m;
      };
      G.casing = tubeOf(px * 4, new THREE.MeshBasicMaterial({ color: C(0xffffff), transparent: true, opacity: .9, depthWrite: false, depthTest: false, fog: false }), 2);
      G.tube = tubeOf(px * 2.2, new THREE.MeshBasicMaterial({ color: C(0xB8353A), transparent: true, opacity: 1, depthWrite: false, depthTest: false, fog: false }), 3);
      G.segs = segs; G.rs = RS;
      // start i meta: kropki o stałym rozmiarze (start ciemny, meta czerwona)
      var dotGeo = new THREE.SphereGeometry(1, 20, 14);
      var ends = [0, 1];
      if (pts[0].distanceTo(pts[pts.length - 1]) < d.wkm * .01) ends = [0];
      ends.forEach(function (u, j) {
        var p = curve.getPointAt(u);
        var ring = new THREE.Mesh(dotGeo, screenDot(new THREE.MeshBasicMaterial({ color: C(0xffffff), transparent: true, depthTest: false, fog: false }), px * 5.2));
        var dot = new THREE.Mesh(dotGeo, screenDot(new THREE.MeshBasicMaterial({ color: C(j ? 0xB8353A : 0x1C1C1E), transparent: true, depthTest: false, fog: false }), px * 3.6));
        ring.position.copy(p); dot.position.copy(p); ring.renderOrder = 4; dot.renderOrder = 5;
        [ring, dot].forEach(function (o) { o.frustumCulled = false; G.scene.add(o); G.obj.push(o); });
      });
      var halo = new THREE.Mesh(dotGeo, screenDot(new THREE.MeshBasicMaterial({ color: C(0xffffff), transparent: true, depthTest: false, fog: false }), px * 7));
      var marker = new THREE.Mesh(dotGeo, screenDot(new THREE.MeshBasicMaterial({ color: C(0xB5741C), transparent: true, depthTest: false, fog: false }), px * 5));
      halo.renderOrder = 6; marker.renderOrder = 7; halo.frustumCulled = marker.frustumCulled = false;
      G.marker = marker; G.halo = halo;
      [halo, marker].forEach(function (o) { G.scene.add(o); G.obj.push(o); });
    }
    // etykiety
    (d.labels || []).forEach(function (l) {
      var el = document.createElement('div');
      el.className = 'ts-lab ' + l[4];
      el.innerHTML = '<span>' + l[0] + '</span>' + (l[4] === 'p' && l[5] ? '<small>' + fmt(l[5]) + '</small>' : '');
      labLayer.appendChild(el);
      var pri = { s: 5, e: 5, p: 3, w: 2, r: 1, t: 2 }[l[4]] || 1;
      G.labels.push({ el: el, pri: pri, v: new THREE.Vector3(l[1], Y(d, l[3]) + r.cam.up * (l[4] === 'r' ? .02 : .08), l[2]), w: 0, h: 0 });
    });
    G.labels.sort(function (a, b) { return b.pri - a.pri; });
    G.k = k; G.snap = true; G.dirty = true;
    // jednorazowe wrysowanie trasy
    S.scrub = null; S.w = 0;
    if (reduced) { S.show = 1; S.draw = null; } else { S.show = 0; S.draw = { t0: 0, dur: 2600 }; }
    view.classList.remove('ts-busy');
    G.renderer.domElement.classList.add('on');
    kick();
  }

  /* widok ogólny: cała trasa, przesunięta w wolną część kadru (opis zajmuje lewą stronę) */
  function overview(pos, look) {
    var d = T[G.k], cam = G.camera, vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    var wide = cam.aspect > 1.2, dist = Math.max((d.wkm * (wide ? .64 : .43)) / Math.tan(hf / 2), (d.hkm * .78) / Math.tan(vf / 2)) * 1.02;
    var el = wide ? .78 : .98, lx = wide ? -d.wkm * .1 : 0, lz = d.hkm * (wide ? .03 : -.06);
    look.set(lx, 0, lz);
    pos.set(lx, dist * Math.sin(el), lz + dist * Math.cos(el));
  }
  /* widok z bliska przy znaczniku (wyżej i dalej niż „przelot”, spokojnie) */
  function follow(t, pos, look) {
    var r = R[G.k], cv = G.curve, d = T[G.k], c = cache[G.k];
    var mu = (G.camera.aspect < 1 ? 2 : 1.45), cm = { back: r.cam.back * mu, up: r.cam.up * mu, ahead: r.cam.ahead * mu, side: r.cam.side, win: r.cam.win * 1.5 };
    t = clamp(t, 0, 1);
    cv.getPointAt(t, G.p); cv.getPointAt(Math.max(0, t - cm.win), G.a); cv.getPointAt(Math.min(1, t + cm.win), G.b);
    var dx = G.b.x - G.a.x, dz = G.b.z - G.a.z, L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    var sx = -dz, sz = dx;
    pos.set(G.p.x - dx * cm.back + sx * cm.back * cm.side, G.p.y + cm.up, G.p.z - dz * cm.back + sz * cm.back * cm.side);
    var gnd = Y(d, hm(c, d, pos.x, pos.z));
    if (pos.y < gnd + cm.up * .55) pos.y = gnd + cm.up * .55;
    look.set(G.p.x + dx * cm.ahead, G.p.y - cm.up * .08, G.p.z + dz * cm.ahead);
  }

  function frame(now) {
    raf = 0;
    if (!G || !G.curve || !visible) return;
    var dt = G.lastT ? Math.min(.05, (now - G.lastT) / 1000) : .016; G.lastT = now;
    var busy = false;
    // wrysowanie trasy
    if (S.draw) {
      if (!S.draw.t0) S.draw.t0 = now;
      var k = clamp((now - S.draw.t0) / S.draw.dur, 0, 1);
      S.show = easeOut(k); busy = true;
      if (k >= 1) { S.draw = null; S.show = 1; }
    }
    if (S.scrub !== null && S.release && now > S.release) { S.scrub = null; S.release = 0; }
    var wT = S.scrub !== null ? 1 : 0, prevW = S.w;
    S.w += (wT - S.w) * (1 - Math.exp(-dt * (wT ? 3.2 : 1.8)));
    if (Math.abs(S.w - wT) < .002) S.w = wT;
    if (S.w !== prevW) busy = true;
    var at = S.scrub !== null ? S.scrub : S.show;
    // kamera: mieszanka widoku ogólnego i widoku przy znaczniku, tłumiona w czasie
    overview(G.op, G.ol);
    var ew = easeIO(S.w);
    if (ew > 0 && G.tube) { follow(at, G.fp, G.fl); G.tp.copy(G.op).lerp(G.fp, ew); G.tl.copy(G.ol).lerp(G.fl, ew); }
    else { G.tp.copy(G.op); G.tl.copy(G.ol); }
    if (G.snap) { G.pos.copy(G.tp); G.look.copy(G.tl); G.snap = false; }
    else {
      var f = 1 - Math.exp(-dt * 4.2);
      G.pos.lerp(G.tp, f); G.look.lerp(G.tl, f);
    }
    if (G.pos.distanceTo(G.tp) + G.look.distanceTo(G.tl) > 1e-3) busy = true;
    var cam = G.camera;
    cam.position.copy(G.pos); cam.lookAt(G.look);
    var dist = G.pos.distanceTo(G.look);
    G.scene.fog.near = dist * (1.8 + .2 * ew); G.scene.fog.far = dist * (8 - 1.5 * ew);

    // trasa, znacznik
    if (G.tube) {
      var shown = S.scrub !== null ? S.scrub : S.show;
      var n = Math.round(clamp(shown, 0, 1) * G.segs) * G.rs * 6;
      G.tube.geometry.setDrawRange(0, n); G.casing.geometry.setDrawRange(0, n);
      G.curve.getPointAt(clamp(at, 0, 1), G.v);
      G.marker.position.copy(G.v); G.halo.position.copy(G.v);
      G.marker.visible = G.halo.visible = at > .002 && at < .998 || S.scrub !== null;
    }
    paintChart();

    // etykiety (rzutowane z 3D, bez nachodzenia na siebie i na opis)
    var W = view.clientWidth, H = view.clientHeight, vr = view.getBoundingClientRect(), ir = info.getBoundingClientRect();
    var bx0 = ir.left - vr.left - 12, bx1 = ir.right - vr.left + 12, by0 = ir.top - vr.top - 12, by1 = ir.bottom - vr.top + 12;
    var placed = [];
    for (var i = 0; i < G.labels.length; i++) {
      var L = G.labels[i], q = G.a.copy(L.v).project(cam), el = L.el;
      if (q.z > 1 || q.x < -1.1 || q.x > 1.1 || q.y < -1.1 || q.y > 1.1) { el.style.opacity = 0; continue; }
      var ld = cam.position.distanceTo(L.v), fo = G.scene.fog, o = 1 - clamp((ld - fo.near * .9) / (fo.far * .7 - fo.near * .9), 0, 1);
      var sx = (q.x + 1) / 2 * W, sy = (1 - q.y) / 2 * H - 8;
      if (sx > bx0 - 120 && sx < bx1 && sy > by0 && sy < by1) o = 0;
      if (!L.w) { L.w = el.offsetWidth || 80; L.h = el.offsetHeight || 16; }
      var rx0 = sx - 6, rx1 = sx + L.w + 6, ry0 = sy - 4, ry1 = sy + L.h + 4;
      if (el.classList.contains('r')) { rx0 = sx - L.w / 2 - 6; rx1 = sx + L.w / 2 + 6; }
      for (var j = 0; j < placed.length && o > 0; j++) { var P = placed[j]; if (rx0 < P[2] && rx1 > P[0] && ry0 < P[3] && ry1 > P[1]) o = 0; }
      if (o > .05) placed.push([rx0, ry0, rx1, ry1]);
      var flip = !el.classList.contains('r') && sx + L.w > W - 10;
      el.classList.toggle('flip', flip);
      el.style.opacity = o.toFixed(2);
      el.style.transform = 'translate3d(' + (flip ? sx - L.w : sx).toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
    }
    G.renderer.render(G.scene, cam);
    if (fb && !fb.classList.contains('off')) fb.classList.add('off');
    G.dirty = false;
    // renderuj dalej tylko, gdy coś się rusza (w spoczynku zero pracy GPU)
    if (busy || S.scrub !== null) raf = requestAnimationFrame(frame);
    else G.lastT = 0;
  }
  function kick() { if (!raf && visible && G && G.curve) raf = requestAnimationFrame(frame); }

  function resize() {
    if (G) {
      var W = view.clientWidth, H = view.clientHeight;
      G.renderer.setSize(W, H, false); G.camera.aspect = W / Math.max(1, H); G.camera.updateProjectionMatrix();
      G.snap = true; kick();
    }
    drawChart(cur);
  }
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });

  /* ---------------- wybór trasy ---------------- */
  function setRoute(k, first) {
    if (!R[k] || (!first && k === cur)) return;
    cur = k;
    chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
    renderInfo(k);
    S.scrub = null; S.show = reduced ? 1 : 0; S.draw = null; S.w = 0;
    drawChart(k);
    if (fb) { fb.src = posterSrc(k); if (!G) fb.classList.remove('off'); }
    if (!G) return;
    view.classList.add('ts-busy');   // łagodne przejście: wygaszenie, budowa, rozjaśnienie
    var t0 = performance.now();
    load(k).then(function (c) {
      var wait = Math.max(0, 320 - (performance.now() - t0));
      setTimeout(function () { if (cur === k) build(k, c); }, wait);
    }).catch(function (e) { view.classList.remove('ts-busy'); if (window.console) console.error('[trasy]', e); });
  }
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    setRoute(b.getAttribute('data-k'));
  });
  // podładuj trasę, zanim ktoś kliknie (tylko po wskazaniu, nie wszystkie naraz)
  chips.addEventListener('pointerover', function (e) {
    var b = e.target.closest('.chip'); if (b && G) load(b.getAttribute('data-k'));
  });

  function start() {
    if (started) return; started = true;
    if (reduced || !hasWebGL()) return;   // zostaje statyczny kadr (poster)
    whenThree(function () {
      try { init(); } catch (e) { G = null; if (window.console) console.error('[trasy]', e); return; }
      var k0 = cur;
      load(k0).then(function (c) { if (G && cur === k0) build(k0, c); }).catch(function (e) { if (window.console) console.error('[trasy]', e); });
    });
  }

  if (/[?&]tsdebug/.test(location.search)) window.__ts = function () { return { G: G, S: S, cache: cache }; };
  renderInfo(cur); drawChart(cur);
  if (SP && SP.onVisible) SP.onVisible(root, start, '600px 0px 600px 0px'); else start();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && G && G.curve) { G.lastT = 0; kick(); } }, { rootMargin: '80px 0px' }).observe(stage);
  } else { visible = true; }
})();

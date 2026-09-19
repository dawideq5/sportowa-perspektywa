/* ==========================================================================
   Smaczki tekstowe — data-fx="mroz|gory|woda|noc|slonce|petla|czas|puls|medal"
   Odpalają się raz, przy wejściu w widok. API: window.SPFX.apply(el, typ).
   Opcjonalnie data-fx-gate="klasa" na przodku: efekt czeka, aż przodek dostanie tę klasę.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.SP) return;
  var NS = 'http://www.w3.org/2000/svg';
  var applied = [];

  /* ---------- narzędzia ---------- */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function span(cls, parent) { var e = document.createElement('span'); e.className = cls; e.setAttribute('aria-hidden', 'true'); if (parent) parent.appendChild(e); return e; }
  function lum(c) {
    var m = (c || '').match(/[\d.]+/g);
    if (!m || m.length < 3) return 0;
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
  }
  function vars(el, o) { for (var k in o) el.style.setProperty(k, o[k]); }

  /* metryki słowa: szerokość, wysokość, linia bazowa i górna krawędź wersalików (w px, lokalnie) */
  function metrics(el) {
    var probe = document.createElement('span');
    probe.className = 'fx-probe';
    el.appendChild(probe);
    var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16;
    var base = probe.offsetTop;
    el.removeChild(probe);
    return { w: el.offsetWidth, h: el.offsetHeight, fs: fs, base: base, cap: base - fs * .7 };
  }

  /* warstwa SVG w lokalnym układzie słowa (0,0 = lewy górny róg słowa) */
  function layer(el, m, px, pt, pb) {
    var W = m.w + px * 2, H = m.h + pt + pb;
    var s = svg('svg', { class: 'fx-svg fx-x', width: r1(W), height: r1(H), viewBox: [r1(-px), r1(-pt), r1(W), r1(H)].join(' '), 'aria-hidden': 'true', focusable: 'false' });
    s.style.left = r1(-px) + 'px';
    s.style.top = r1(-pt) + 'px';
    el.appendChild(s);
    return s;
  }
  function draw(parent, d, cls, dur, del, attrs) {
    var a = { d: d, pathLength: 1, class: 'fx-draw ' + (cls || '') };
    for (var k in attrs) a[k] = attrs[k];
    var p = svg('path', a, parent);
    vars(p, { '--dur': dur + 's', '--del': del + 's' });
    return p;
  }
  function pathOf(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1]); }).join(''); }

  /* rozbicie na litery (tekst dla czytników zostaje w .sr-only) */
  function split(el) {
    if (el.__letters) return el.__letters;
    if (el.children.length) return null;
    var txt = el.textContent, sr = document.createElement('span'), vis = span('fx-letters');
    sr.className = 'sr-only';
    sr.textContent = txt;
    var i = 0;
    Array.from(txt).forEach(function (ch) {
      if (/\s/.test(ch)) { vis.appendChild(document.createTextNode(ch)); return; }
      var s = document.createElement('span');
      s.className = 'fx-l';
      s.style.setProperty('--i', i++);
      s.textContent = ch;
      vis.appendChild(s);
    });
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(vis);
    el.__letters = vis.querySelectorAll('.fx-l');
    return el.__letters;
  }

  /* ---------- kryształ szronu: pień + odgałęzienia co 60° ---------- */
  function dendrite(x, y, deg, L, R) {
    var a = deg * Math.PI / 180, d = 'M' + r1(x) + ' ' + r1(y) + 'L' + r1(x + Math.cos(a) * L) + ' ' + r1(y + Math.sin(a) * L);
    for (var i = 1; i <= 3; i++) {
      var t = i / 4, px = x + Math.cos(a) * L * t, py = y + Math.sin(a) * L * t, bl = L * (.5 - t * .3) * (.8 + R() * .4);
      [-1, 1].forEach(function (sg) {
        var b = a + sg * Math.PI / 3, bx = px + Math.cos(b) * bl, by = py + Math.sin(b) * bl;
        d += 'M' + r1(px) + ' ' + r1(py) + 'L' + r1(bx) + ' ' + r1(by);
        if (bl > L * .26) {
          var qx = px + Math.cos(b) * bl * .55, qy = py + Math.sin(b) * bl * .55, cl = bl * .34;
          [-1, 1].forEach(function (s2) { var c = b + s2 * Math.PI / 3; d += 'M' + r1(qx) + ' ' + r1(qy) + 'L' + r1(qx + Math.cos(c) * cl) + ' ' + r1(qy + Math.sin(c) * cl); });
        }
      });
    }
    return d;
  }

  /* tekstura szronu: drobne kryształki i igiełki, generowana raz (jasna lub lodowo-błękitna) */
  var frostCache = {};
  function frostTex(onDark) {
    var key = onDark ? 'd' : 'l';
    if (frostCache[key]) return frostCache[key];
    var S = 220, cv = document.createElement('canvas'), R = rng(7331), g;
    cv.width = cv.height = S;
    g = cv.getContext('2d');
    var col = onDark ? '198,230,244' : '255,255,255';
    for (var i = 0; i < 1800; i++) {          // szadź: drobny pył
      g.fillStyle = 'rgba(' + col + ',' + (.45 + R() * .55).toFixed(2) + ')';
      var r = R() * 1.1 + .25;
      g.fillRect(R() * S, R() * S, r, r);
    }
    g.lineCap = 'round';
    for (var k = 0; k < 70; k++) {            // igiełki lodu z krótkimi odgałęzieniami
      var x = R() * S, y = R() * S, a = R() * Math.PI * 2, L = 4 + R() * 11;
      g.strokeStyle = 'rgba(' + col + ',' + (.35 + R() * .45).toFixed(2) + ')';
      g.lineWidth = .5 + R() * .6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
      for (var b = 1; b <= 2; b++) {
        var t = b / 3, bx = x + Math.cos(a) * L * t, by = y + Math.sin(a) * L * t, ba = a + (R() > .5 ? .9 : -.9);
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(ba) * L * .35, by + Math.sin(ba) * L * .35); g.stroke();
      }
    }
    return (frostCache[key] = cv.toDataURL('image/png'));
  }

  /* ---------- efekty ---------- */
  var FX = {
    /* mróz: delikatny szron osiada na samych literach (tekstura kryształków przycięta do tekstu) */
    mroz: function (el, m, R) {
      var c = span('fx-frost-copy fx-x', el);
      c.textContent = el.__txt;
      c.style.backgroundImage = 'url(' + frostTex(el.classList.contains('fx-on-dark')) + ')';
      c.style.backgroundPosition = r1(R() * 180) + 'px ' + r1(R() * 180) + 'px';
      c.style.backgroundSize = Math.round(Math.max(56, m.fs * 1.9)) + 'px';
    },

    gory: function (el, m, R) {
      var fs = m.fs, w = m.w, H = fs * (fs > 40 ? .5 : .42), y0 = m.cap, s = layer(el, m, fs * .12, H + fs * .45, fs * .1);
      var three = w > fs * 3, xs = three ? [.26, .57, .83] : [.36, .74], hs = three ? [.62, 1, .74] : [1, .68];
      if (R() > .5) hs.reverse();
      var key = [[0, y0]];
      xs.forEach(function (x, i) {
        key.push([(x + (R() - .5) * .05) * w, y0 - H * hs[i] * (.92 + R() * .12)]);
        if (i < xs.length - 1) key.push([(x + xs[i + 1]) / 2 * w, y0 - H * (.2 + R() * .14)]);
      });
      key.push([w, y0]);
      var pts = [key[0]];
      for (var i = 1; i < key.length; i++) {
        var a = key[i - 1], b = key[i];
        if (Math.abs(b[0] - a[0]) > fs * .3) pts.push([(a[0] + b[0]) / 2 + (R() - .5) * fs * .08, (a[1] + b[1]) / 2 + (R() - .5) * H * .22]);
        pts.push(b);
      }
      draw(s, pathOf(pts), 'fx-ridge', 1.35, .05, { 'stroke-width': r1(Math.max(1, fs * .03)) });
      var top = key.reduce(function (p, c) { return c[1] < p[1] ? c : p; });
      var mw = Math.max(8, fs * .2), mh = mw * .66, pole = Math.max(6, fs * .2);
    },

    woda: function (el, m, R, still) {
      if (still) return;
      var fs = m.fs, s = layer(el, m, fs * .1, fs * .1, fs * .5), y = m.base + fs * .26;
      var n = Math.max(5, Math.floor(m.w / Math.max(6, fs * .22))), r = Math.max(1.6, fs * .05);
      for (var i = 0; i < n; i++) {
        var c = svg('circle', { class: 'fx-rope ' + (i % 2 ? 'w' : 'r'), cx: r1((i + .5) / n * m.w), cy: r1(y), r: r1(r) }, s);
        c.style.setProperty('--i', i);
      }
    },

    noc: function (el, m, R, still) {
      if (still) return;
      var beam = span('fx-beam fx-x', el), bw = Math.max(m.fs * 2.4, m.w * .35);
      vars(beam, { width: r1(bw) + 'px', '--from': r1(-bw) + 'px', '--to': r1(m.w) + 'px' });
      (el.__letters || []).forEach(function (l) { l.style.setProperty('--ld', r1(.15 + (l.offsetLeft + l.offsetWidth / 2) / Math.max(1, m.w) * .95) + 's'); });
    },

    slonce: function (el, m) {
      var fs = m.fs, R = Math.min(fs * .95, m.w * .5), cx = m.w * .56;
      var clip = span('fx-sun-clip fx-x', el);
      vars(clip, { left: r1(cx - R) + 'px', top: r1(m.base - R) + 'px', width: r1(R * 2) + 'px', height: r1(R) + 'px' });
      span('fx-sun', clip);
      var hz = span('fx-horizon fx-x', el);
      vars(hz, { left: r1(-fs * .2) + 'px', top: r1(m.base) + 'px', width: r1(m.w + fs * .4) + 'px', height: Math.max(1, r1(fs * .018)) + 'px' });
    },

    petla: function (el, m) {
      var fs = m.fs, s = layer(el, m, fs * .55, fs * .55, fs * .55);
      var cx = m.w / 2, cy = (m.cap + m.base) / 2, rx = m.w / 2 + fs * .3, ry = (m.base - m.cap) / 2 + fs * .32;
      var t0 = Math.PI * .85, tot = Math.PI * 2 * 1.08, N = 80, tilt = -3 * Math.PI / 180, pts = [];
      for (var k = 0; k <= N; k++) {
        var q = k / N, t = t0 + tot * q, sc = 1 - .07 * q + .02 * Math.sin(t * 2);
        var x = Math.cos(t) * rx * sc, y = Math.sin(t) * ry * sc;
        pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
      }
      draw(s, pathOf(pts), 'fx-loop', 1.3, .05, { 'stroke-width': r1(Math.max(1, fs * .03)) });
    },

    czas: function (el, m, R, still) {
      if (still || el.__rollers) return;
      var txt = el.__txt, cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight);
      var sr = document.createElement('span'), vis = span('fx-clock');
      sr.className = 'sr-only';
      sr.textContent = txt;
      el.textContent = '';
      el.appendChild(sr);
      el.appendChild(vis);
      var chars = Array.from(txt), digits = chars.filter(function (c) { return /\d/.test(c); }).length, seen = 0;
      chars.forEach(function (ch) {
        if (!/\d/.test(ch)) { vis.appendChild(document.createTextNode(ch)); return; }
        var fromRight = digits - 1 - seen++, d = +ch, spins = fromRight === 0 ? 2 : fromRight < 3 ? 1 : 0;
        var dg = document.createElement('span'), fin = document.createElement('span'), col = document.createElement('span');
        dg.className = 'fx-dg'; fin.className = 'fx-dg-f'; col.className = 'fx-col';
        fin.textContent = ch;
        for (var s = 0; s < spins; s++) for (var n = 0; n < 10; n++) col.appendChild(document.createElement('span')).textContent = n;
        for (n = 0; n <= d; n++) col.appendChild(document.createElement('span')).textContent = n;
        vars(col, { '--n': spins * 10 + d, '--dur': (1.1 + spins * .2) + 's', '--del': (seen * .05) + 's' });
        dg.appendChild(fin);
        dg.appendChild(col);
        vis.appendChild(dg);
      });
      if (!lh || isNaN(lh)) lh = (vis.querySelector('.fx-dg') || el).offsetHeight;
      el.style.setProperty('--lh', r1(lh) + 'px');
      el.__rollers = true;
    },

    puls: function (el, m) {
      var fs = m.fs, w = m.w, s = layer(el, m, fs * .1, fs * .2, fs * .7), y = m.base + fs * .24, a = fs * .36;
      var P = function (fx, dy) { return [w * fx, y + dy]; };
      var pts = [[0, y], P(.38, 0), P(.41, -a * .12), P(.44, 0), P(.47, 0), P(.49, a * .18), P(.52, -a), P(.55, a * .38), P(.575, 0), P(.62, 0), P(.65, -a * .22), P(.69, 0), [w, y]];
      draw(s, pathOf(pts), 'fx-pulse', 1.2, .05, { 'stroke-width': r1(Math.max(1, fs * .03)) });
    },

    medal: function (el, m, R, still) {
      if (still) return;
      var sh = span('fx-sheen fx-x', el);
      sh.textContent = el.__txt;
    }
  };
  var PREP = {
    woda: split,
    noc: split
  };

  /* ---------- silnik ---------- */
  function build(el, still) {
    var type = el.__fx;
    el.querySelectorAll(':scope > .fx-x').forEach(function (x) { x.remove(); });
    var m = metrics(el);
    if (!m.w) return;
    FX[type](el, m, rng(hash(type + el.__txt)), still);
    el.__built = true;
  }
  function go(el) {
    if (el.__ran) return;
    el.__ran = true;
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      if (SP.reduced) { build(el, true); el.classList.add('fx-still', 'fx-go'); return; }
      build(el, false);
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('fx-go'); }); });
    });
  }
  function apply(el, type) {
    if (!el || el.__fx || !FX[type]) return;
    el.__fx = type;
    el.__txt = el.textContent.replace(/\s+/g, ' ').trim();
    el.classList.add('fx', 'fx-' + type);
    var cs = getComputedStyle(el), light = lum(cs.color) > .55;
    el.classList.toggle('fx-on-dark', light);
    el.style.setProperty('--fx-c', cs.color);
    if (PREP[type] && !SP.reduced) PREP[type](el);
    applied.push(el);
    var gate = el.closest('[data-fx-gate]');
    if (gate) {
      var cls = gate.getAttribute('data-fx-gate') || 'on';
      if (gate.classList.contains(cls)) { go(el); return; }
      var mo = new MutationObserver(function () { if (gate.classList.contains(cls)) { mo.disconnect(); go(el); } });
      mo.observe(gate, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    SP.onVisible(el, go, '0px 0px -10% 0px');
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      applied.forEach(function (el) {
        if (!el.__built || el.__fx === 'czas' || el.__fx === 'medal') return;
        build(el, true);
        el.classList.add('fx-still');
      });
    }, 220);
  });

  /* ---------- ukryte odnośniki do źródeł (data-src) ---------- */
  var GLYPH = {
    gory: '<path d="M1 10 4.5 4.5 6.5 7l2-3.5L11 10"/>',
    woda: '<path d="M1 5.5q1.25-1.8 2.5 0t2.5 0 2.5 0 2.5 0M1 8.5q1.25-1.8 2.5 0t2.5 0 2.5 0 2.5 0"/>',
    mroz: '<path d="M6 1.5v9M2.1 3.75l7.8 4.5M2.1 8.25l7.8-4.5"/>',
    noc: '<circle cx="6" cy="6" r="1.4" fill="currentColor"/><circle cx="6" cy="6" r="3.8" opacity=".45"/>',
    slonce: '<path d="M2.5 9a3.5 3.5 0 0 1 7 0M1 9h10"/>',
    petla: '<circle cx="6" cy="6" r="4.2"/>',
    czas: '<circle cx="6" cy="6.3" r="4.2"/><path d="M6 4.1v2.2l1.5 1M5 1h2"/>',
    puls: '<path d="M1 7h3l1-2.5 1.5 5 1-3.5.7 1H11"/>',
    medal: '<circle cx="6" cy="7.6" r="3"/><path d="M4.2 1.5 6 4.6l1.8-3.1"/>',
    def: '<path d="M3.5 8.5l5-5M4.5 3.5h4v4"/>'
  };
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function escT(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sameUrl(a, b) {
    try { var x = new URL(a, location.href), y = new URL(b, location.href); return x.host === y.host && x.pathname.replace(/\/$/, '') === y.pathname.replace(/\/$/, ''); } catch (e) { return false; }
  }
  /* Odnośnik do źródła zawsze widoczny:
     - krótki tekst → podkreślenie w stylu linku, cały tekst klikalny (ikona motywu przy najechaniu),
     - cytat lub długi akapit → widoczna linijka źródła pod spodem (albo podpis-link, jeśli już jest). */
  function src(el, url, fx, label) {
    if (!el || !url || el.__src) return;
    el.__src = true;
    var ext = false;
    try { ext = /^https?:/i.test(url) && new URL(url).host !== location.host; } catch (e) {}
    var lab = label || host(url);
    var svg = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false">' + (GLYPH[fx] || GLYPH.def) + '</svg>';
    var a = document.createElement('a');
    a.href = url;
    if (ext) { a.target = '_blank'; a.rel = 'noopener'; }
    var fxEl = el.classList.contains('fx') || el.hasAttribute('data-fx');
    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    var quote = el.matches('blockquote, q, .quote') || !!el.closest('blockquote');
    if (quote || txt.length > 150) {
      var fig = el.closest('figure');
      var by = fig && [].slice.call(fig.querySelectorAll('figcaption a[href]')).filter(function (x) { return sameUrl(x.href, url); })[0];
      if (by) { by.classList.add('src-link'); return by; }
      a.className = 'fx-cite';
      a.innerHTML = svg + '<span>' + escT(lab) + '</span>';
      var ta = getComputedStyle(el).textAlign;
      if (ta === 'center') a.style.marginInline = 'auto'; else if (ta === 'right' || ta === 'end') a.style.marginLeft = 'auto';
      if (fxEl) el.insertAdjacentElement('afterend', a); else el.appendChild(a);
      return a;
    }
    a.className = 'fx-src';
    a.setAttribute('aria-label', 'Źródło: ' + lab);
    a.innerHTML = svg;
    el.classList.add('fx-link');
    if ((parseFloat(getComputedStyle(el).fontSize) || 16) > 40) el.classList.add('fx-link-xl');
    if (fxEl) {
      el.insertAdjacentElement('afterend', a);
      (el.parentElement || el).classList.add('fx-src-host');
    } else {
      el.appendChild(a);
      el.classList.add('fx-src-host');
    }
    el.addEventListener('click', function (e) {
      if (e.target.closest('a, button, input, select, textarea, label, [data-lightbox]') || String(window.getSelection && getSelection() || '').length) return;
      a.click();
    });
    return a;
  }

  window.SPFX = { apply: apply, src: src };
  document.querySelectorAll('[data-fx]').forEach(function (el) { apply(el, el.getAttribute('data-fx')); });
  document.querySelectorAll('[data-src]').forEach(function (el) {
    src(el, el.getAttribute('data-src'), el.getAttribute('data-src-fx') || el.getAttribute('data-fx'), el.getAttribute('data-src-label'));
  });
})();

/* Podstrona Pomaganie: wykres narastająco, aktywny rok w spisie, cytat z SP_QUOTES */
(function () {
  'use strict';
  if (!window.SP) return;

  /* ---------- wykres: suma zbiórek narastająco (jedna seria) ---------- */
  var svg = document.getElementById('pomChartSvg'), tip = document.getElementById('pomChartTip');
  if (svg && tip) {
    var NS = 'http://www.w3.org/2000/svg';
    var MON1 = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
    var P = [
      { y: 2022, m: 10, t: 'Główny Szlak Beskidzki', v: 35301, id: 'p-2022' },
      { y: 2023, m: 10, t: 'Główny Szlak Beskidzki dla Natalki', v: 22149, id: 'p-2023' },
      { y: 2024, m: 2, t: '24 godziny pływania', v: 10000, id: 'p-2024', plus: 1 },
      { y: 2025, m: 6, t: '2×Harda', v: 93160, id: 'p-2025-harda' },
      { y: 2025, m: 8, t: 'Główny Szlak Sudecki dla Nikusi', v: 35231, id: 'p-2025-gss' },
      { y: 2026, m: 5, t: 'W kółko dla Kwadratu', v: 80985, id: 'p-2026-kwadrat' }
    ];
    var run = 0;
    P.forEach(function (p) { run += p.v; p.c = run; p.x = p.y + (p.m - .5) / 12; });
    var X0 = 2022.5, X1 = 2026.75, YMAX = 300000;
    var drawn = false, sel = -1, dots = [], crossEl = null;

    function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
    function fmtZl(v) { return SP.fmt(v) + ' zł'; }
    function say(i) {
      if (i < 0) { tip.innerHTML = ''; return; }
      var p = P[i];
      tip.innerHTML = '<b>' + p.t + '</b>, ' + MON1[p.m - 1] + ' ' + p.y + ': ' + (p.plus ? 'ponad ' : '+') + fmtZl(p.v) + ', razem ' + fmtZl(p.c);
    }
    function pick(i) {
      sel = i;
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      if (crossEl) {
        if (i < 0) crossEl.classList.remove('on');
        else { crossEl.setAttribute('x1', dots[i].getAttribute('cx')); crossEl.setAttribute('x2', dots[i].getAttribute('cx')); crossEl.classList.add('on'); }
      }
      say(i);
    }

    function render() {
      var r = svg.getBoundingClientRect(), W = Math.max(280, r.width), H = Math.max(160, r.height);
      var padL = 0, padR = W < 560 ? 70 : 96, padT = 22, padB = 28;
      var sx = function (x) { return padL + (x - X0) / (X1 - X0) * (W - padL - padR); };
      var sy = function (v) { return padT + (1 - v / YMAX) * (H - padT - padB); };
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      [100000, 200000, 300000].forEach(function (v) {
        svg.appendChild(el('line', { class: 'ax', x1: 0, x2: W, y1: sy(v), y2: sy(v) }));
        var t = el('text', { class: 'lbl', x: W, y: sy(v) - 6, 'text-anchor': 'end' }); t.textContent = (v / 1000) + ' tys. zł'; svg.appendChild(t);
      });
      svg.appendChild(el('line', { class: 'ax ax-base', x1: 0, x2: W, y1: sy(0), y2: sy(0) }));
      for (var y = 2023; y <= 2026; y++) {
        var tx = el('text', { class: 'lbl', x: sx(y), y: H - 8, 'text-anchor': 'middle' }); tx.textContent = y; svg.appendChild(tx);
        svg.appendChild(el('line', { class: 'ax', x1: sx(y), x2: sx(y), y1: sy(0), y2: sy(0) + 5 }));
      }

      // schodki: kwota rośnie w chwili zakończenia projektu
      var d = 'M' + sx(X0) + ' ' + sy(0), area;
      P.forEach(function (p, i) {
        var prev = i ? P[i - 1].c : 0;
        d += ' L' + sx(p.x) + ' ' + sy(prev) + ' L' + sx(p.x) + ' ' + sy(p.c);
      });
      d += ' L' + sx(X1) + ' ' + sy(run);
      area = d + ' L' + sx(X1) + ' ' + sy(0) + ' Z';
      svg.appendChild(el('path', { class: 'area', d: area }));
      var line = el('path', { class: 'ln', d: d });
      svg.appendChild(line);
      crossEl = el('line', { class: 'cross', x1: 0, x2: 0, y1: padT, y2: sy(0) });
      svg.appendChild(crossEl);

      dots = [];
      P.forEach(function (p, i) {
        var cx = sx(p.x), cy = sy(p.c);
        var dot = el('circle', { class: 'dot', cx: cx, cy: cy, r: 4 });
        svg.appendChild(dot); dots.push(dot);
        var hit = el('circle', { class: 'hit', cx: cx, cy: cy, r: 18 });
        hit.addEventListener('pointerenter', function () { pick(i); });
        hit.addEventListener('click', function () {
          var a = document.getElementById(p.id);
          if (a) a.scrollIntoView({ behavior: SP.reduced ? 'auto' : 'smooth', block: 'start' });
        });
        svg.appendChild(hit);
      });
      var endT = el('text', { class: 'end', x: sx(X1) + 8, y: sy(run) + 5 }); endT.textContent = fmtZl(run); svg.appendChild(endT);

      if (!drawn && !SP.reduced) {
        var len = line.getTotalLength();
        line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
        line.getBoundingClientRect();
        line.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.2,.7,.1,1)';
      }
      if (sel >= 0) pick(sel);
    }

    render();
    svg.addEventListener('pointerleave', function () { pick(-1); });
    SP.onVisible(svg, function () {
      if (drawn) return; drawn = true;
      var line = svg.querySelector('.ln');
      if (line) line.style.strokeDashoffset = '0';
    }, '0px 0px -15% 0px');
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var was = drawn; drawn = true; render(); drawn = was; }, 150);
    });
  }

  /* ---------- spis lat: aktywny projekt ---------- */
  var links = document.querySelectorAll('.pom-index a');
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('on'); a.removeAttribute('aria-current'); });
        var a = byId[e.target.id];
        if (a) { a.classList.add('on'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.pom-ch').forEach(function (c) { io.observe(c); });
  }

  /* ---------- cytat o pomaganiu z SP_QUOTES (jeśli dostępne) ---------- */
  var q = document.getElementById('pomQuote');
  var all = window.SP_QUOTES;
  if (q && Array.isArray(all)) {
    // najpierw wybrane, samodzielne zdania o tym, dlaczego pomagam; gdy ich brak, prosty filtr jakości
    var PREF = ['q056', 'q084', 'q145', 'q209', 'q234', 'q235', 'q238', 'q239', 'q336', 'q164', 'q187', 'q404', 'q136', 'q016'];
    var ok = function (x) { return x && x.text && x.src && x.src.url; };
    var pool = all.filter(function (x) { return ok(x) && PREF.indexOf(x.id) >= 0 && x.theme === 'pomaganie'; });
    if (!pool.length) pool = all.filter(function (x) {
      return ok(x) && x.theme === 'pomaganie' && x.moment !== 'backyard2026' && x.text.length >= 45 && x.text.length <= 200 && /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(x.text) && x.text.indexOf('[') < 0;
    });
    if (pool.length) {
      var pickQ = pool[Math.floor(Math.random() * pool.length)];
      q.textContent = '„' + pickQ.text.replace(/^[„"]|[”"]$/g, '') + '”';
      q.__src = false;
      if (window.SPFX) SPFX.src(q, pickQ.src.url, 'puls', pickQ.src.title || '');
    }
  }
})();

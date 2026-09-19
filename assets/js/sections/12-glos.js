/* ==========================================================================
   Głos — cytaty Andrzeja: intro przy wejściu + rotująca sekcja #glos
   Dane: window.SP_QUOTES (11-cytaty-data.js); awaryjnie krótka lista poniżej.
   Kolejność: deterministyczne tasowanie + pamięć obejrzanych (localStorage),
   pełny cykl bez powtórzeń.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var sec = document.getElementById('glos'), stage = document.getElementById('glosStage');
  var intro = document.getElementById('glosIntro'), introStage = document.getElementById('glosIntroStage');
  if (!sec || !stage) return;
  var SPx = window.SP || { reduced: false, onVisible: function (el, fn) { fn(el); } };
  var reduced = !!SPx.reduced;
  var ROT = 12000, INTRO = 3200;

  /* ---------- awaryjne cytaty (dosłownie z Sportowa Perspektywa, Facebooka i wywiadu) ---------- */
  var FB9 = 'https://www.facebook.com/2142357622660365/posts/1466877622103463';
  var FALLBACK = [
    { id: 'fb-2026-09-10-rocznica', text: 'Dziś 9 rocznica trzeźwości. Ogrom czasu, a nadal dużo krócej jestem w tym niż ówczesnym wymiarze.', date: '2026-09-10', src: { type: 'facebook', url: FB9, title: 'Facebook, 10.09.2026' }, theme: 'trzezwosc', moment: '9. rocznica trzeźwości' },
    { id: 'fb-2026-09-10-plony', text: 'Dlatego lubię wierzyć, że cuda już za mną, a teraz tylko praca i cierpliwe wypatrywanie plonów po pokornym okresie sadzenia ziarenek.', date: '2026-09-10', src: { type: 'facebook', url: FB9, title: 'Facebook, 10.09.2026' }, theme: 'pokora', moment: '9. rocznica trzeźwości' },
    { id: 'fb-2026-09-10-zwyciestwo', text: '…największe zwycięstwo mam już za sobą, a cokolwiek dalej spotkam, nie będzie warte więcej niż zdrowie, rodzina, przyjaźnie, relacje, świadomość, wiara, wdzięczność i pasja, które odnalazłem w ostatnich dziewięciu latach.', date: '2026-09-10', src: { type: 'facebook', url: FB9, title: 'Facebook, 10.09.2026' }, theme: 'wdziecznosc', moment: '9. rocznica trzeźwości' },
    { id: 'fb-2026-polmaraton', text: '…wynik Was nie definiuje. Definiuje nas postawa i zaangażowanie.', date: null, src: { type: 'facebook', url: 'https://www.facebook.com/2142357622660365/posts/1463615212429704', title: 'Facebook, Tyski Półmaraton 2026' }, theme: 'trening', moment: 'Tyski Półmaraton 2026, w roli pacemakera' },
    { id: 'fb-2026-backyard', text: 'Nie musicie robić ultra. Wystarczy, że dołożycie swoją cegiełkę do budowy „Tu Się Tuli”…', date: null, src: { type: 'facebook', url: 'https://www.facebook.com/2142357622660365_1462960192495206', title: 'Facebook, Backyard na Dziko' }, theme: 'pomaganie', moment: 'Backyard na Dziko, 2026' },
    { id: 'www-prelekcje-zmiana', text: 'Zmiana, której szukasz, jest w pracy, której unikasz.', date: null, src: { type: 'www', url: 'prelekcje.html#pp-talk-h', title: 'Sportowa Perspektywa, prelekcje' }, theme: 'przemiana', moment: 'po 2017' },
    { id: 'www-omnie-skad', text: 'Nie ważne skąd pochodzisz. Ważne dokąd zmierzasz.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'przemiana', moment: 'po 2017' },
    { id: 'www-omnie-ziarna', text: 'Nie oceniaj każdego dnia po żniwach, które zbierasz, ale po ziarnach, które sadzisz.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'pokora', moment: 'po 2017' },
    { id: 'www-omnie-punkt', text: 'Miej taki punkt widzenia, z którego dobrze widać drugiego człowieka.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'pomaganie', moment: 'po 2017' },
    { id: 'www-omnie-slabosc', text: 'Ówczesna słabość, stanowi dzisiejszą siłę.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'kryzys', moment: 'o przeszłości' },
    { id: 'www-omnie-porazki', text: 'Wszystkie porażki pomnożone przez upływ czasu, mogą pewnego dnia stać się naszą siłą.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'przemiana', moment: 'o przeszłości' },
    { id: 'www-omnie-cuda', text: 'Ktoś powie niemożliwe? Ja powiem „niemożliwe i cuda już za mną”.', date: null, src: { type: 'www', url: 'historia.html#hs-c2', title: 'Moja historia' }, theme: 'marzenia', moment: 'plany' },
    { id: 'www-glowna-wartosc', text: 'Najpiękniejsze uczucie, to bycie wartością dla innych.', date: null, src: { type: 'www', url: 'index.html', title: 'Sportowa Perspektywa' }, theme: 'pomaganie', moment: 'prelegent' },
    { id: 'blog-loop-glowa', text: 'W ultra piękne jest oszukiwanie głowy.', date: '2024-10', src: { type: 'blog', url: 'blog.html', title: 'Blog, The Loop' }, theme: 'gory', moment: 'The Loop, 2024' },
    { id: 'blog-loop-mgla', text: '…światło czołówki oświetlające mgłę sprawia, że przed oczyma latają mi miliony małych kropeczek.', date: '2024-10', src: { type: 'blog', url: 'blog.html', title: 'Blog, The Loop' }, theme: 'noc', moment: 'The Loop, 2024' },
    { id: 'umtychy-epicentrum', text: 'Ultra to epicentrum euforii i kryzysów.', date: null, src: { type: 'media', url: 'https://umtychy.pl/artykul/9427/ultraekstremalny-andrzej-kowalczyk-gosciem-podcastu-halotutychy', title: 'Halo Tu Tychy, podcast' }, theme: 'kryzys', moment: 'o ultra' }
  ];

  /* ---------- motywy ---------- */
  var T = {
    kryzys: { tone: 'dark', anim: 'dark', deco: 'grain', fx: null, src: 'noc', key: /noc|mrok|ciemn|kryzys|upad|słab|nałog|alkohol|fajk|imprez|zwątp/i },
    trzezwosc: { tone: 'dark', anim: 'rise', deco: 'dawn', fx: null, src: 'slonce', key: /trzeźw|świt|rocznic|dzień|życi|cud/i },
    przemiana: { tone: 'dark', anim: 'rise', deco: 'dawn', fx: null, src: 'slonce', key: /zmian|sił|drug|zmierz|now/i },
    gory: { tone: 'light', anim: 'rise', deco: 'ridge', fx: 'gory', src: 'gory', key: /gór|szczyt|szlak|Tatr|Beskid|Sudet|grań|ultra|kilometr/i },
    noc: { tone: 'dark', anim: 'rise', deco: 'lamp', fx: 'noc', src: 'noc', key: /noc|czołówk|mgł|ciemn|gwiazd|kropecz|światł/i },
    woda: { tone: 'light', anim: 'rise', deco: 'waves', fx: 'woda', src: 'woda', key: /wod|pływ|basen|jezior|dług|fal/i },
    lod: { tone: 'light', anim: 'rise', deco: 'frost', fx: 'mroz', src: 'mroz', key: /lód|lod|zimn|mróz|mroź|°C|stopni|morsow|kr[ay]/i },
    rower: { tone: 'light', anim: 'speed', deco: 'band', fx: null, src: null, key: /rower|km|Hard|Tatr/i },
    triathlon: { tone: 'light', anim: 'speed', deco: 'band', fx: null, src: null, key: /Hard|triathlon|podwójn|pierwsz/i },
    pomaganie: { tone: 'light', anim: 'rise', deco: 'pulse', fx: 'puls', src: 'puls', key: /pomoc|pomag|zbiór|cegieł|hospic|dzieci|drugi|innych|potrzeb|Tuli/i },
    rodzina: { tone: 'light', anim: 'rise', deco: null, fx: null, src: null, key: /rodzin|dzieci|żon|tat|syn|córk|dom/i },
    wdziecznosc: { tone: 'light', anim: 'rise', deco: null, fx: null, src: null, key: /dziękuj|wdzięcz|zwycięstw|Wam/i },
    wiara: { tone: 'light', anim: 'soft', deco: null, fx: null, src: null, key: /wiar|Bóg|modl|różańc|nadziej/i },
    pokora: { tone: 'light', anim: 'soft', deco: null, fx: null, src: null, key: /pokor|ziar|plon|żniw|cierpliw/i },
    meta: { tone: 'light', anim: 'rise', deco: 'sun', fx: 'slonce', src: 'slonce', key: /met|szczyt|cel|finisz|udało/i },
    trening: { tone: 'light', anim: 'speed', deco: null, fx: null, src: 'czas', key: /trening|postaw|zaangażow|wynik|tempo/i },
    humor: { tone: 'light', anim: 'pop', deco: null, fx: null, src: null, key: /pizz|pierog|rosół|majtk|zając/i },
    marzenia: { tone: 'dark', anim: 'rise', deco: 'stars', fx: null, src: 'noc', key: /marz|niemożliw|cud|wizj|przyszł/i }
  };
  var GUESS = [['lod', T.lod.key], ['woda', /basen|pływ|wod/i], ['noc', /\bnoc|czołówk/i], ['gory', T.gory.key], ['pomaganie', T.pomaganie.key], ['trzezwosc', /trzeźw/i], ['kryzys', /alkohol|narkot|fajk|nałog|uzależ/i], ['rodzina', /rodzin|dzieci|tat[aąy]/i], ['meta', /\bmet[aęy]\b/i]];

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function guess(q) {
    if (q.moment && /przed\s*2017|do\s*2017|2016|imprez/i.test(q.moment)) return 'kryzys';
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][1].test(q.text)) return GUESS[i][0];
    return 'przemiana';
  }
  function norm(list) {
    var seen = {}, out = [];
    list.forEach(function (q) {
      if (!q || typeof q.text !== 'string' || q.text.trim().length < 4) return;
      var o = {}; for (var k in q) o[k] = q[k];
      o.text = o.text.replace(/\s+/g, ' ').trim();
      o.id = String(o.id || 'q' + hash(o.text));
      if (seen[o.id]) return; seen[o.id] = 1;
      if (/przed\s*2017|do\s*2017/i.test(o.moment || '') && o.theme !== 'trzezwosc') o.theme = 'kryzys';
      if (!T[o.theme]) o.theme = guess(o);
      out.push(o);
    });
    return out;
  }
  var data = Array.isArray(window.SP_QUOTES) ? norm(window.SP_QUOTES) : [];
  var Q = data.length >= 8 ? data : norm(FALLBACK);
  var byId = {}; Q.forEach(function (q) { byId[q.id] = q; });
  var ids = Q.map(function (q) { return q.id; }).sort();

  /* ---------- sekwencja bez powtórzeń ---------- */
  var KEY = 'sp-glos-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function rnd32() { return (Math.random() * 4294967296) >>> 0; }
  var st = load();
  if (typeof st.seed !== 'number') st.seed = rnd32();
  if (!Array.isArray(st.seen)) st.seen = [];
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function order() { var r = mulberry(st.seed), a = ids.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var ord = order();
  function fresh() {
    var seen = {}; st.seen = st.seen.filter(function (id) { return byId[id]; });
    st.seen.forEach(function (id) { seen[id] = 1; });
    if (st.seen.length >= ids.length) {   // pełny cykl — nowe tasowanie, ostatni nie wraca od razu
      var last = st.seen[st.seen.length - 1];
      st.seen = []; seen = {}; st.seed = rnd32(); ord = order();
      if (ord[0] === last && ord.length > 1) { ord.push(ord.shift()); }
    }
    for (var i = 0; i < ord.length; i++) if (!seen[ord[i]]) { st.seen.push(ord[i]); save(); return byId[ord[i]]; }
    return Q[0];
  }
  function freshShort(max) {
    var seen = {}; st.seen.forEach(function (id) { seen[id] = 1; });
    for (var pass = 0; pass < 2; pass++) {   // na wejście najpierw najmocniejsze (score 3)
      for (var i = 0; i < ord.length; i++) {
        var q = byId[ord[i]];
        if (!seen[ord[i]] && q.text.length <= max && (pass || (q.score || 0) >= 3)) { st.seen.push(ord[i]); save(); return q; }
      }
    }
    return fresh();
  }
  var hist = [], cur = -1;
  function forward() { if (cur < hist.length - 1) { cur++; return hist[cur]; } hist.push(fresh()); cur = hist.length - 1; return hist[cur]; }
  function back() { if (cur > 0) { cur--; return hist[cur]; } return null; }

  /* ---------- dekoracje ---------- */
  function noise(x, s) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); function h(n) { var v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); } return h(i) + (h(i + 1) - h(i)) * u; }
  function ridge(seed, base, amp, freq) {
    var d = 'M0 320', pts = [];
    for (var x = 0; x <= 1440; x += 16) {
      var n = 1 - Math.abs(noise(x * freq, seed) * 2 - 1), n2 = 1 - Math.abs(noise(x * freq * 2.3 + 9, seed) * 2 - 1);
      var y = base - amp * (n * n * .7 + n2 * .3);
      pts.push([x, y.toFixed(1)]);
    }
    pts.forEach(function (p) { d += ' L' + p[0] + ' ' + p[1]; });
    return { fill: d + ' L1440 320 Z', line: 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') };
  }
  function wave(y, a, len) { var d = 'M0 ' + y; for (var x = 0; x <= 2880; x += 40) d += ' L' + x + ' ' + (y + Math.sin(x / len * Math.PI * 2) * a).toFixed(1); return d; }
  function deco(kind, seed, noSun) {
    if (kind === 'ridge' || kind === 'sun') {
      var a = ridge(seed, 250, 120, .004), b = ridge(seed + 7, 290, 90, .006);
      return (kind === 'sun' && !noSun ? '<i class="gl-sun"></i>' : '') +
        '<svg viewBox="0 0 1440 320" preserveAspectRatio="none"><path class="gl-ridge-2" d="' + a.fill + '"/><path class="gl-ridge" d="' + b.fill + '"/>' +
        (kind === 'ridge' ? '<path class="gl-ridge-line" d="' + a.line + '"/>' : '') + '</svg>';
    }
    if (kind === 'waves') return '<svg viewBox="0 0 1440 320" preserveAspectRatio="none" style="width:200%"><path class="gl-wave" d="' + wave(200, 7, 240) + '"/><path class="gl-wave" d="' + wave(240, 5, 180) + '"/><path class="gl-wave" d="' + wave(275, 4, 300) + '"/></svg>';
    if (kind === 'pulse') return '<svg viewBox="0 0 1440 320" preserveAspectRatio="none"><path class="gl-pulse" d="M0 262 H640 l16 -10 l12 30 l20 -96 l18 118 l14 -52 l10 10 H1440"/></svg>';
    return '';
  }

  /* ---------- budowanie planszy cytatu ---------- */
  function fmtDate(d) {
    if (!d) return '';
    var m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d))) return m[3] + '.' + m[2] + '.' + m[1];
    if ((m = /^(\d{4})-(\d{2})$/.exec(d))) return m[2] + '.' + m[1];
    return String(d);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DUP = { puls: 'pulse', noc: 'lamp', slonce: 'sun' };   // efekt słowa zastępuje dekorację tła
  function build(q, isIntro) {
    var th = T[q.theme] || T.przemiana;
    var art = document.createElement('div');
    art.className = 'gl-art';
    art.setAttribute('data-theme', q.theme);
    art.setAttribute('data-tone', th.tone);
    art.setAttribute('data-anim', th.anim);
    art.setAttribute('data-fx-gate', 'gl-show');
    var len = q.text.length;
    art.setAttribute('data-len', len > 190 ? 'l' : len > 95 ? 'm' : 's');
    var toks = q.text.split(/(\s+)/), n = toks.filter(function (t) { return t.trim(); }).length;
    var total = isIntro ? 600 : th.anim === 'speed' || th.anim === 'pop' ? 700 : th.anim === 'dark' || th.anim === 'soft' ? 2200 : 1500;
    if (isIntro) art.style.setProperty('--gl-dur', '.7s');
    var step = Math.max(12, Math.min(90, Math.round(total / Math.max(1, n))));
    var keyIdx = -1;
    if (th.key) toks.some(function (t, i) { if (t.trim() && th.key.test(t)) { keyIdx = i; return true; } return false; });
    var useFx = !!(window.SPFX && th.fx && !reduced && keyIdx >= 0);
    var w = 0, html = '';
    toks.forEach(function (t, i) {
      if (!t.trim()) { html += ' '; return; }
      var dl = (w++ * step) / 1000;
      var inner = esc(t);
      if (i === keyIdx) inner = '<span class="gl-kw">' + inner + '</span>';
      html += '<span class="gl-w' + (i === keyIdx ? ' gl-key' : '') + '" style="--dl:' + dl.toFixed(3) + 's">' + inner + '</span>';
    });
    var kind = th.deco, noSun = false;
    if (useFx && DUP[th.fx] === th.deco) { if (th.deco === 'sun') noSun = true; else kind = null; }
    if (useFx && th.fx === 'noc') art.setAttribute('data-nolamp', '');
    var mo = q.moment || '', when = fmtDate(q.date) || (/^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(mo) && /\d{4}/.test(mo) ? mo : '');
    art.innerHTML =
      '<div class="gl-deco" aria-hidden="true">' + deco(kind, q.text.length + q.id.length, noSun) + '</div>' +
      '<div class="wrap gl-in">' +
        '<p class="eyebrow">' + (isIntro ? 'Andrzej Kowalczyk' : 'Moimi słowami') + '</p>' +
        '<blockquote class="gl-q"><p>' + html + '</p></blockquote>' +
        meta(q, when, isIntro) +
      '</div>';
    art.__q = q; art.__fx = useFx ? th.fx : null; art.__intro = !!isIntro;
    return art;
  }
  /* linijka pod cytatem: data i widoczny odnośnik do źródła (bez powtarzania daty) */
  function meta(q, when, intro) {
    var s = q.src && q.src.url ? q.src : null, out = '';
    var t = s ? String(s.title || '').trim() : '';
    if (when && !(t && t.indexOf(when) > -1)) out += '<span class="tnum">' + esc(when) + '</span>';
    if (s) {
      var ext = /^https?:/i.test(s.url);
      out += '<a class="gl-src" href="' + esc(s.url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (intro ? ' tabindex="-1"' : '') + '>' + esc(t || 'Źródło') + '</a>';
    }
    return out ? '<p class="gl-meta">' + out + '</p>' : '';
  }
  /* smaczki dopiero po wpięciu w DOM (SPFX czyta style obliczone) */
  function decorate(art) {
    if (!window.SPFX) return;
    var q = art.__q, th = T[q.theme] || T.przemiana;
    try {
      var kw = art.querySelector('.gl-kw');
      if (kw && art.__fx) SPFX.apply(kw, art.__fx);
    } catch (e) { /* bez smaczków */ }
  }
  function show(art) {
    void art.offsetWidth;   // stan początkowy przed przejściem (bez rAF — działa też w tle)
    setTimeout(function () { art.classList.add('gl-show', 'gl-in-view'); }, 30);
  }

  window.__glosOK = true;

  /* ---------- sekcja ---------- */
  var liveEl = document.getElementById('glosLive'), bar = document.getElementById('glosBar');
  var btnPrev = document.getElementById('glosPrev'), btnNext = document.getElementById('glosNext'), btnPause = document.getElementById('glosPause');
  var visible = false, hovering = false, userPaused = reduced, timer = 0, startedAt = 0, remaining = ROT;
  if (reduced && btnPause) btnPause.setAttribute('aria-pressed', 'true');
  sec.style.setProperty('--gl-rot', ROT / 1000 + 's');

  function setTone(q) {
    var dark = (T[q.theme] || T.przemiana).tone === 'dark';
    sec.classList.toggle('tone-dark', dark);
    if (dark) sec.setAttribute('data-hdr', 'dark'); else sec.removeAttribute('data-hdr');
  }
  function render(q, user) {
    var old = stage.querySelectorAll('.gl-art');
    var art = build(q, false);
    stage.appendChild(art);
    decorate(art);
    setTone(q);
    for (var i = 0; i < old.length; i++) (function (o) {
      o.classList.add('gl-leave');
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, reduced ? 0 : 950);
    })(old[i]);
    if (reduced) art.classList.add('gl-show', 'gl-in-view'); else show(art);
    if (user && liveEl) liveEl.textContent = q.text;
    restart();
  }
  function running() { return false; }   // cytaty zmienia wyłącznie użytkownik
  function clear() { clearTimeout(timer); timer = 0; }
  function restart() {
    clear(); remaining = ROT;
    if (bar) { bar.classList.remove('run'); void bar.offsetWidth; }
    sync();
  }
  function sync() {
    var on = running();
    sec.classList.toggle('paused', !on);
    if (on) {
      if (bar && !bar.classList.contains('run')) bar.classList.add('run');
      if (!timer) { startedAt = performance.now(); timer = setTimeout(function () { timer = 0; render(forward(), false); }, remaining); }
    } else if (timer) {
      remaining = Math.max(400, remaining - (performance.now() - startedAt));
      clear();
    }
  }
  btnNext && btnNext.addEventListener('click', function () { render(forward(), true); });
  btnPrev && btnPrev.addEventListener('click', function () { var q = back(); if (q) render(q, true); });
  btnPause && btnPause.addEventListener('click', function () {
    userPaused = !userPaused;
    btnPause.setAttribute('aria-pressed', String(userPaused));
    btnPause.setAttribute('aria-label', userPaused ? 'Wznów zmianę cytatów' : 'Wstrzymaj zmianę cytatów');
    sync();
  });
  sec.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; sync(); } });
  sec.addEventListener('pointerleave', function () { hovering = false; sync(); });
  sec.addEventListener('focusin', function () { hovering = true; sync(); });
  sec.addEventListener('focusout', function (e) { if (!sec.contains(e.relatedTarget)) { hovering = false; sync(); } });
  document.addEventListener('visibilitychange', sync);
  /* strzałki ← → gdy sekcja jest na ekranie; przesunięcie palcem po cytacie */
  document.addEventListener('keydown', function (e) {
    if (!visible || e.altKey || e.metaKey || e.ctrlKey || /input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); render(forward(), true); }
    else if (e.key === 'ArrowLeft') { var q = back(); if (q) { e.preventDefault(); render(q, true); } }
  });
  var tx = null, ty = null;
  stage.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (tx == null) return;
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = ty = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) render(forward(), true); else { var q = back(); if (q) render(q, true); } }
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting && e.intersectionRatio >= .35; }); sync(); }, { threshold: [0, .35, .6] }).observe(sec);
  }

  /* ---------- intro ---------- */
  function startSection() { render(forward(), false); }
  var introOn = intro && root.classList.contains('gi-on');
  if (!introOn) { if (intro && intro.parentNode) intro.parentNode.removeChild(intro); startSection(); return; }

  var closed = false, tIntro = 0;
  function finish() { root.classList.remove('gi-on'); if (intro.parentNode) intro.parentNode.removeChild(intro); }
  function close(fast) {
    if (closed) return; closed = true;
    clearTimeout(tIntro);
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, skip, true); });
    intro.classList.add(fast ? 'gi-fade' : 'gi-out');
    setTimeout(finish, fast ? 420 : 760);
  }
  function skip() { close(false); }
  if (location.hash || window.scrollY > 40) { finish(); startSection(); return; }
  var first = freshShort(140);
  hist.push(first); cur = 0;
  var art = build(first, true);
  introStage.appendChild(art);
  decorate(art);
  show(art);
  intro.classList.add('gi-run');
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, skip, { capture: true, passive: true }); });
  startSection();
})();

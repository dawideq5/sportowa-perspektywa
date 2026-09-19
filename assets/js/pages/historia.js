/* Podstrona historia.html: licznik trzeźwości, oś czasu 1991–2026, siatka 95%, profil GSS, cytaty z SP_QUOTES */
(function () {
  'use strict';
  if (!window.SP || !document.querySelector('[data-pg="historia"]')) return;

  /* ---------- licznik trzeźwości od 10.09.2017 ---------- */
  var START = Date.parse('2017-09-10T00:00:00+02:00');
  var dEl = document.getElementById('hsDays'), tEl = document.getElementById('hsHms');
  function pad(v) { return (v < 10 ? '0' : '') + v; }
  function tick() {
    var s = Math.max(0, Math.floor((Date.now() - START) / 1000)), d = Math.floor(s / 86400);
    s -= d * 86400;
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    if (dEl) dEl.textContent = SP.fmt(d);
    if (tEl) tEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(x);
  }
  if (dEl) { tick(); setInterval(tick, 1000); }

  /* ---------- 95 na 100 dni ---------- */
  var grid = document.getElementById('hsGrid');
  if (grid) {
    var g = '';
    for (var i = 0; i < 100; i++) g += '<i style="--i:' + i + '"' + (i >= 95 ? ' class="lit"' : '') + '></i>';
    grid.innerHTML = g;
    SP.onVisible(grid, function () { grid.classList.add('in'); });
  }

  /* ---------- profil wysokości Głównego Szlaku Sudeckiego (dane DEM wzdłuż śladu OSM) ---------- */
  var prof = document.getElementById('hsProf');
  if (prof) {
    var P = window.SP_PROFILES && window.SP_PROFILES.gss;
    if (P && P.length > 10) {
      var mn = Infinity, mx = -Infinity;
      for (var k = 0; k < P.length; k++) { if (P[k] < mn) mn = P[k]; if (P[k] > mx) mx = P[k]; }
      var d = '';
      for (k = 0; k < P.length; k++) {
        var x = (k / (P.length - 1)) * 600, y = 58 - ((P[k] - mn) / (mx - mn || 1)) * 54;
        d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      prof.innerHTML = '<path pathLength="1" d="' + d + '"/>';
      SP.onVisible(prof, function () { prof.classList.add('in'); });
    } else {
      prof.style.display = 'none';
    }
  }

  /* ---------- oś czasu 1991–2026 ---------- */
  var S = {
    oMnie: null,                       // własna opowieść (ta strona) — bez odsyłacza
    cv: 'index.html#medale',           // starty i medale na stronie głównej
    plyw: null,
    wolont: 'pomaganie.html',
    kal: null,
    tgs: 'https://www.tgs.tychy.pl/index.php?mod=slawy&act=show&id=208'
  };
  var EV = [
    { y: 1991, lab: '1991', ch: '#hs-woda-dziecko', items: [['Przychodzę na świat.']] },
    { y: 2001.7, lab: 'IV kl.', title: 'Szkoła podstawowa', ch: '#hs-woda-dziecko', items: [['Pierwsze lekcje pływania, w czwartej klasie.', S.plyw, 'woda']] },
    { y: 2005, lab: '2005', ch: '#hs-woda-dziecko', items: [['Stopień młodszego ratownika wodnego.', S.plyw, 'woda']] },
    { y: 2016, lab: '2016', ch: '#hs-2017', items: [['Pierwszy półmaraton: V Tyski Półmaraton.', S.cv, 'czas']] },
    { y: 2017, lab: '2017', sun: 1, major: 1, ch: '#hs-2017', items: [
      ['10.09.2017: pierwszy dzień trzeźwego życia.', S.oMnie, 'slonce'],
      ['Maraton Warszawski na łyso i w stroju Supermana, dla wcześniaków.', S.wolont, 'puls'],
      ['Cracovia Maraton, pierwszy z pięciu maratonów Korony.', S.cv, 'medal']] },
    { y: 2018, lab: '2018', ch: '#hs-2017', items: [
      ['Korona Maratonów Polskich: Dębno, Wrocław i Poznań domykają piątkę.', S.cv, 'medal'],
      ['Początek przygody z kalisteniką.', S.kal]] },
    { y: 2019, lab: '2019', ch: '#hs-woda', items: [
      ['Zwycięstwo w 12-godzinnej Otyliadzie, 30,5 km.', S.tgs, 'woda'],
      ['Licencja instruktora pływania.', S.plyw, 'woda'],
      ['Pierwsze 100 km w górach, Festiwal Biegów Górskich w Krynicy-Zdroju.', S.cv, 'gory']] },
    { y: 2020, lab: '2020', ch: '#hs-woda', items: [
      ['24-godzinny maraton pływacki: zwycięstwo i rekord imprezy, 43,1 km.', S.tgs, 'woda'],
      ['Mistrzostwo Polski w lodowym pływaniu na 100 m, w debiucie.', S.oMnie, 'mroz'],
      ['72 km biegu po Tatrach, charytatywnie.', S.wolont, 'gory']] },
    { y: 2021, lab: '2021', ch: '#hs-gory', items: [
      ['Pierwsza wygrana w górach: Ultra Trail Małopolska, 64 km.', S.cv, 'gory'],
      ['Podium Iron Run: 9 biegów w 3 dni.', S.cv, 'medal']] },
    { y: 2022, lab: '2022', major: 1, ch: '#hs-decyzja', items: [
      ['Mistrzostwa Świata IISA w Głogowie: trzy srebra i brąz.', 'https://www.tychy.pl/2022/02/08/w-swiatowej-elicie-andrzej-kowalczyk-zdobyl-cztery-medale-ms-w-plywaniu-zimowym/', 'mroz'],
      ['Wypowiedzenie z etatu, żeby żyć ze sportu.', S.oMnie],
      ['Główny Szlak Beskidzki z Krzysztofem Kościelnikiem dla Słoni na Balkonie: 35 301 zł.', 'https://www.siepomaga.pl/bieg-500km', 'puls']] },
    { y: 2023, lab: '2023', ch: '#hs-gory', items: [
      ['Samoëns, woda 3,7 °C: srebro i brąz Mistrzostw Świata IISA.', 'https://www.openwaterpedia.com/wiki/IISA_5th_World_Championship', 'mroz'],
      ['Korona Gór Polski biegiem w 99:36.', 'https://www.tychy.pl/2023/09/05/korona-andrzeja-kowalczyka/', 'gory'],
      ['500 km Głównym Szlakiem Beskidzkim dla Natalki.', 'https://www.tychy.pl/2023/10/11/andrzej-kowalczyk-biegiem-przez-beskidy/', 'gory']] },
    { y: 2024, lab: '2024', ch: '#hs-gory', items: [
      ['24 godziny w basenie dla Świetlikowa: 2046 długości.', 'https://www.tychy.pl/wp-content/uploads/2024/02/tt849egazeta-1.pdf', 'woda'],
      ['HardaSuka Ultimate Triathlon: 23:15, piąte miejsce w debiucie.', 'https://www.tychy.pl/2024/12/31/dwanascie-pelnych-wrazen-miesiecy/', 'czas'],
      ['Mały Szlak Beskidzki bez wsparcia: 20:45:56.', 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-maly-szlak-beskidzki-poland-2024-08-07', 'czas'],
      ['The Loop: rekord FKT 42:53:24.', 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-loop-2024-10-13', 'petla']] },
    { y: 2025, lab: '2025', major: 1, ch: '#hs-harda', items: [
      ['2×Harda: jako pierwszy w historii, 604 km.', 'https://www.tychy.pl/2025/06/16/andrzej-kowalczyk-jako-pierwszy-ukonczyl-podwojny-najtrudniejszy-triathlon-w-europie/'],
      ['Główny Szlak Sudecki dla Nikusi: 86:51, trzeci czas w historii.', 'https://www.tychy.pl/2025/08/26/andrzej-kowalczyk-pokonal-glowny-szlak-sudecki-dla-nikusi/', 'gory'],
      ['Premiera filmu „2 Hard Road 2 Walk Alone”.', 'https://www.tychy.pl/2025/12/15/premiera-w-tgs-droga-ktora-sie-nie-konczy/']] },
    { y: 2026, lab: '2026', ch: '#hs-dzis', items: [
      ['Nagroda Główna 16. Przeglądu Filmów Górskich w Wadowicach.', 'https://www.tychy.pl/2026/02/26/dwa-filmy-dwie-nagrody-sukces-tyszan-podczas-16-pfg/', 'medal'],
      ['Backyard dla Kwadratu: 29 pętli i 80 985 zł dla dzieci.', 'https://www.siepomaga.pl/kwadrat', 'petla'],
      ['Tatra Fest: drugie miejsce.', 'https://ratemytrail.com/event/tatra-fest-bieg-2026', 'gory'],
      ['1 października: Backyard na Dziko.', 'https://www.siepomaga.pl/backyard-na-dziko', 'petla']] }
  ];
  var rail = document.getElementById('hsRail'), panel = document.getElementById('hsPanel');
  if (rail && panel) {
    var Y0 = 1990.4, Y1 = 2026.6;
    function pos(y) { return ((y - Y0) / (Y1 - Y0) * 100).toFixed(2) + '%'; }
    var band = document.createElement('div');
    band.className = 'hs-band';
    band.style.left = pos(2001.7);
    band.style.width = 'calc(' + pos(2017.69) + ' - ' + pos(2001.7) + ')';
    band.innerHTML = '<span>do 10.09.2017</span>';
    rail.appendChild(band);
    var ticks = EV.map(function (ev, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hs-tick' + (ev.sun ? ' sun' : '') + (i % 2 ? ' up' : '');
      b.id = 'hsT' + i;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('aria-controls', 'hsPanel');
      b.setAttribute('tabindex', '-1');
      b.style.left = pos(ev.y);
      b.innerHTML = '<span>' + ev.lab + '</span>';
      b.addEventListener('click', function () { select(i, true); });
      rail.appendChild(b);
      return b;
    });
    rail.addEventListener('keydown', function (e) {
      var cur = ticks.indexOf(document.activeElement);
      if (cur < 0) return;
      var nx = e.key === 'ArrowRight' ? cur + 1 : e.key === 'ArrowLeft' ? cur - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ticks.length - 1 : null;
      if (nx === null) return;
      e.preventDefault();
      nx = Math.max(0, Math.min(ticks.length - 1, nx));
      select(nx, true);
      ticks[nx].focus();
    });
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function select(i, user) {
      var ev = EV[i];
      ticks.forEach(function (t, j) { t.setAttribute('aria-selected', String(j === i)); t.setAttribute('tabindex', j === i ? '0' : '-1'); });
      panel.setAttribute('aria-labelledby', ticks[i].id);
      var h = '<p class="hs-py">' + esc(ev.title || ev.lab) + '</p><div><ul>';
      ev.items.forEach(function (it, j) { h += '<li style="--i:' + j + '">' + esc(it[0]) + '</li>'; });
      h += '</ul>' + (ev.ch ? '<a class="more" href="' + ev.ch + '">Rozdział</a>' : '') + '</div>';
      panel.innerHTML = h;
      if (window.SPFX && SPFX.src) {
        var lis = panel.querySelectorAll('li');
        ev.items.forEach(function (it, j) { if (it[1] && lis[j]) SPFX.src(lis[j], it[1], it[2] || '', it[0]); });
      }
      var sc = rail.parentElement, t = ticks[i];
      if (sc.scrollWidth > sc.clientWidth) {
        var left = t.offsetLeft - sc.clientWidth / 2;
        if (user && !SP.reduced) sc.scrollTo({ left: left, behavior: 'smooth' }); else sc.scrollLeft = left;
      }
    }
    select(4, false);
  }

  /* ---------- cytaty-przerywniki: losowo z SP_QUOTES (bez powtórzeń na stronie) ---------- */
  var FX = { trzezwosc: 'slonce', przemiana: 'slonce', wiara: 'slonce', rodzina: '', wdziecznosc: 'puls' };
  function norm(t) { return String(t || '').toLowerCase().replace(/[„”"'…\s.,:;!?–-]+/g, ''); }
  function fmtDate(d) {
    var m = String(d || '').match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
    if (!m) return '';
    return m[3] ? +m[3] + '.' + m[2] + '.' + m[1] : m[2] ? m[2] + '.' + m[1] : m[1];
  }
  function fillPulls() {
    var Q = window.SP_QUOTES;
    if (!Q || !Q.length) return;
    var used = {};
    document.querySelectorAll('.quote').forEach(function (el) { used[norm(el.textContent)] = 1; });
    document.querySelectorAll('.hs-pull[data-q-theme]').forEach(function (fig) {
      var th = fig.getAttribute('data-q-theme').split(',');
      var pool = Q.filter(function (q) { return q && q.text && q.text.length <= 240 && th.indexOf(q.theme) > -1 && !used[norm(q.text)]; });
      if (!pool.length) return;
      var q = pool[Math.floor(Math.random() * pool.length)];
      used[norm(q.text)] = 1;
      var old = fig.querySelector('blockquote'), cap = fig.querySelector('figcaption');
      var bq = document.createElement('blockquote');
      bq.className = 'quote';
      bq.textContent = '„' + q.text.replace(/^[„"]+|[”"]+$/g, '') + '”';
      old.parentNode.replaceChild(bq, old);
      if (cap) cap.textContent = fmtDate(q.date);
      if (q.src && q.src.url && window.SPFX && SPFX.src) SPFX.src(bq, q.src.url, FX[q.theme] || '', q.src.title || '');
      fig.classList.add('swap');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillPulls); else fillPulls();
})();

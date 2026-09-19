/* Starty i medale: pas zdjęć z podiów (delikatny dryf z przewijaniem + przeciąganie) i minimalne CV z SP_CV */
(function () {
  'use strict';
  var sec = document.getElementById('medale');
  if (!sec) return;
  var SPx = window.SP || {};
  var reel = document.getElementById('mdReel'), track = document.getElementById('mdTrack');

  /* ---------- pas zdjęć ---------- */
  if (reel && track) {
    var cur = 0, target = 0, maxD = 0, raf = 0;
    function measure() {
      var over = track.scrollWidth - reel.clientWidth, pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      /* dryf nie większy niż lewy margines: pierwsze zdjęcie nigdy nie chowa się za krawędzią (na telefonie brak dryfu) */
      maxD = Math.max(0, Math.min(over * .35, 320, pad - 16));
      track.style.paddingRight = '';
      if (maxD) track.style.paddingRight = 'calc(' + getComputedStyle(track).paddingLeft + ' + ' + Math.round(maxD) + 'px)';
    }
    function tick() {
      raf = 0;
      cur += (target - cur) * .1;
      if (Math.abs(target - cur) < .2) cur = target;
      track.style.setProperty('--md-x', cur.toFixed(1) + 'px');
      if (cur !== target) raf = requestAnimationFrame(tick);
    }
    function onScroll(y, vh) {
      if (SPx.reduced || !maxD) return;
      var r = reel.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var t = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      target = -maxD * t;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (SPx.onScroll) SPx.onScroll(onScroll);

    /* przeciąganie myszą (dotyk i trackpad przewijają natywnie) */
    var sx = 0, ss = 0, moved = false, down = false;
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; ss = reel.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 4) { moved = true; reel.classList.add('drag'); }
      if (moved) reel.scrollLeft = ss - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      setTimeout(function () { reel.classList.remove('drag'); }, 0);
    });
    reel.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  /* ---------- dane CV ---------- */
  var CV = window.SP_CV;
  if (!CV) return;
  var U = {
    tgs: 'https://www.tgs.tychy.pl/index.php?mod=slawy&act=show&id=208',
    loop: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-loop-2024-10-13',
    msb: 'https://fastestknowntime.com/fkt/andrzej-kowalczyk-maly-szlak-beskidzki-poland-2024-08-07',
    gss: 'https://www.tychy.info/sport/25535-tyszanin-andrzej-kowalczyk-pokonal-glowny-szlak-sudecki-zrobil-to-dla-nikusi-tychy',
    harda2: 'https://www.tychy.pl/2025/06/16/andrzej-kowalczyk-jako-pierwszy-ukonczyl-podwojny-najtrudniejszy-triathlon-w-europie/',
    harda1: 'https://www.tychy.pl/2024/12/31/dwanascie-pelnych-wrazen-miesiecy/',
    kgp: 'https://www.tychy.pl/2023/09/05/korona-andrzeja-kowalczyka/',
    gsb: 'https://www.tychy.pl/2023/10/11/andrzej-kowalczyk-biegiem-przez-beskidy/',
    swim24: 'https://www.tychy.pl/2024/02/26/pomoc-ma-moc/',
    pres24: 'https://www.tychy.pl/2024/04/05/nagrody-prezydenta-miasta-tychy-w-dziedzinie-sportu-przyznane/',
    pres22: 'https://umtychy.pl/artykul/7492/nagrody-prezydenta-miasta-tychy-w-dziedzinie-sportu-przyznane',
    kwadrat: 'https://www.siepomaga.pl/kwadrat',
    duv: 'https://statistik.d-u-v.org/getresultperson.php?runner=1286280'
  };
  var MS = {
    2026: ['Backyard dla Kwadratu: 80 985 zł na wakacje dla dzieci.', U.kwadrat, 'petla'],
    2025: ['2×Harda jako pierwszy w historii i Główny Szlak Sudecki w 86:51.', U.harda2, 'gory'],
    2024: ['Rekord FKT na The Loop, Mały Szlak Beskidzki bez wsparcia, doba w basenie.', U.loop, 'petla'],
    2023: ['Korona Gór Polski, Główny Szlak Beskidzki, dwa medale MŚ.', U.kgp, 'gory'],
    2022: ['Cztery medale Mistrzostw Świata w pływaniu lodowym.', U.tgs, 'mroz'],
    2021: ['Pierwsza wygrana w górach i podium Iron Run.'],
    2020: ['Zwycięstwo i rekord 24-godzinnego maratonu pływackiego.', U.tgs, 'woda'],
    2019: ['Wygrana w 12-godzinnym maratonie pływackim, pierwsze 100 km w górach.', U.tgs, 'woda'],
    2018: ['Korona Maratonów Polskich.'],
    2017: ['Pierwszy trzeźwy rok. Maraton Warszawski dla wcześniaków.'],
    2016: ['Pierwszy półmaraton w Tychach.']
  };
  /* szczegóły, których nie ma w SP_CV: nazwa, opis, wynik, źródło, smaczek */
  var OV = {
    '2026|Chudy Wawrzyniec': { x: '5. miejsce, 4:27:57', u: U.duv, f: 'gory' },
    '2026|Dolnośląski Festiwal Biegów Górskich': { x: 'Złoty Maraton, 4. miejsce na 801, 3:48:28', u: 'https://wyniki.b4sport.pl/zloty-maraton-45-km/e7563.html', f: 'gory' },
    '2026|Tatra Fest': { d: 'Zakopane, 21,5 km', x: '2. miejsce, 1:41:59', u: 'https://ratemytrail.com/event/tatra-fest-bieg-2026', f: 'gory' },
    '2026|Backyard Ultra': { d: 'Sowi Backyard Ultra, Pieszyce', x: '29 pętli, 194,5 km, 80 985 zł dla dzieci z Kwadratu', u: U.kwadrat, f: 'petla' },
    '2026|Baran Trail Race': { x: '4. miejsce, 5:33:33', u: 'https://wyniki.b4sport.pl/btr-60km/e7111.html', f: 'gory' },
    '2025|Grand Prix': { n: 'Grand Prix Tychy', x: '1. miejsce' },
    '2025|Główny Szlak Sudecki': { d: '445 km po górach, dla Nikusi', x: '86:51, trzeci czas w historii', u: U.gss, f: 'gory' },
    '2025|Projekt 2 x Harda': { n: '2×Harda', d: 'Podwójny HardaSuka Ultimate Triathlon, 604 km', x: 'Pierwszy w historii, dla Fundacji Szerpowie Nadziei', u: U.harda2, f: 'gory' },
    '2024|Hardasuka Ultimate Triathlon': { x: '5. miejsce, 23:15', u: U.harda1, f: 'gory' },
    '2024|Gala Sportowca Roku': { d: 'Tyska Gala Sportu', x: '5. miejsce w plebiscycie' },
    '2024|Bieg Na Hrobaczą Łąkę': { n: 'Bieg na Hrobaczą Łąkę' },
    '2024|Piłkarski Mecz Charytatywny': { d: 'Mecz dla Hospicjum Świetlikowo' },
    '2024|The Loop': { d: 'Wielka Pętla Beskidzka, 235 km', x: '42:53:24, rekord FKT', u: U.loop, f: 'petla' },
    '2024|24-godzinne pływanie': { d: 'Wodny Park Tychy, dla Hospicjum Świetlikowo', x: '2046 długości, 51,15 km', u: U.swim24, f: 'woda' },
    '2024|Mistrzostwa Europy IISA': { d: 'Oradea, pływanie lodowe', x: 'Reprezentant Polski' },
    '2024|Mały Szlak Beskidzki': { d: '137 km bez wsparcia', x: '20:45:56', u: U.msb, f: 'gory' },
    '2023|Athens Marathon': { n: 'Maraton Ateński', d: 'Ateny, 42,2 km' },
    '2023|Beskidy Ultra Trail': { x: '4. miejsce' },
    '2023|Główny Szlak Beskidzki': { d: '500 km z Wołosatego do Ustronia, dla Natalki', x: 'Ponad 88 h na szlaku', u: U.gsb, f: 'gory' },
    '2023|Korona Gór Polski': { d: '28 szczytów, 220 km biegu', x: '99:36', u: U.kgp, f: 'gory' },
    '2023|Wyróżnienie Prezydenta': { n: 'Wyróżnienie Prezydenta Miasta Tychy', u: U.pres24, f: 'medal' },
    '2023|Mistrzostwa Świata IISA': { d: 'Pływanie lodowe, Samoëns, woda 3,7 °C', x: 'Srebro i brąz', u: U.tgs, f: 'mroz' },
    '2022|Gdynia Winter Swimming Cup': { x: 'Złoto, srebro i brąz' },
    '2022|Wyróżnienie prezydenta': { n: 'Wyróżnienie Prezydenta Miasta Tychy', u: U.pres22, f: 'medal' },
    '2022|Mistrzostwa Świata IISA': { d: 'Pływanie lodowe, Głogów', x: '3 × srebro i brąz', u: U.tgs, f: 'mroz' },
    '2022|Vistula Winter Swimming': { x: '2 × złoto' },
    '2022|Główny Szlak Beskidzki': { d: '500 km z Krzysztofem Kościelnikiem, dla Fundacji Słonie na Balkonie', x: '35 301 zł zebrane', u: 'https://www.siepomaga.pl/bieg-500km', f: 'puls' },
    '2022|Maraton 3 Jezior': { x: '3. miejsce, 3 dni' },
    '2021|Ultra Trail Małopolska': { x: '1. miejsce, pierwsza wygrana w górach' },
    '2021|Tatra Race Run': { x: 'Puchar Świata w biegach górskich' },
    '2020|Silesia Winter Swimming': { x: 'Mistrz Polski na 100 m' },
    '2020|24-godzinny maraton pływacki': { x: 'Zwycięstwo i rekord imprezy, 43,1 km', u: U.tgs, f: 'woda' },
    '2020|Wyścig dwóch mostów': { x: 'Złoto i srebro' },
    '2020|72 km biegu po Tatrach': { d: 'Zakopane, projekt charytatywny' },
    '2020|Bieg na szczyt Rysianki': { x: 'TOP 10' },
    '2020|Iron Run': { d: 'Krynica-Zdrój, najcięższa etapówka w Polsce' },
    '2019|Otyliada': { x: 'Zwycięstwo, 12 h pływania, 30,5 km', u: U.tgs, f: 'woda' },
    '2018|Pływackie Mistrzostwa Miasta': { x: '2 × złoto' },
    '2017|39 Warszawski Maraton': { d: 'Warszawa, dla wcześniaków, w stroju Supermana' }
  };
  function clean(d) { return String(d || '').replace(/\s*\/\s*/g, ', ').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(); }
  function medalsTxt(e) {
    var p = [];
    if (e.g) p.push(e.g > 1 ? e.g + ' × złoto' : '1. miejsce');
    if (e.s) p.push(e.s > 1 ? e.s + ' × srebro' : '2. miejsce');
    if (e.b) p.push(e.b > 1 ? e.b + ' × brąz' : '3. miejsce');
    return p.join(', ');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var events = CV.map(function (e) {
    var ov = OV[e.y + '|' + e.n] || {};
    var x = ov.x || medalsTxt(e);
    var d = clean(ov.d || e.d);
    if (e.c && !/zł|charyt|dla /i.test(x + ' ' + d)) x = x ? x + ', charytatywnie' : 'charytatywnie';
    return { e: e, y: e.y, n: ov.n || e.n, d: d, x: x, u: ov.u || '', f: ov.f || '', pod: e.g + e.s + e.b > 0 };
  });
  var years = [];
  events.forEach(function (v) { if (years.indexOf(v.y) < 0) years.push(v.y); });
  years.sort(function (a, b) { return b - a; });

  /* statystyki */
  var stats = document.getElementById('mdStats');
  if (stats) {
    var medals = CV.reduce(function (s, e) { return s + e.g + e.s + e.b; }, 0);
    var charity = CV.filter(function (e) { return e.c; }).length;
    stats.innerHTML = '<div><dt>Starty i projekty</dt><dd>' + CV.length + '</dd></div>' +
      '<div><dt>Medale</dt><dd>' + medals + '</dd></div>' +
      '<div><dt>Starty charytatywne</dt><dd>' + charity + '</dd></div>';
  }

  /* lista CV */
  var box = document.getElementById('mdCv');
  function marker(v) {
    var e = v.e, h = '';
    [['g', 1], ['s', 2], ['b', 3]].forEach(function (m) { for (var i = 0; i < e[m[0]]; i++) h += '<span class="md-dot md-' + m[0] + '" aria-hidden="true">' + m[1] + '</span>'; });
    if (!h && e.c) h = '<svg class="md-heart" viewBox="0 0 12 11" aria-hidden="true"><path d="M6 10.2 1.6 5.9A2.6 2.6 0 0 1 6 2.4a2.6 2.6 0 0 1 4.4 3.5Z"/></svg>';
    return h || '<span class="md-empty" aria-hidden="true"></span>';
  }
  if (box) {
    box.innerHTML = years.map(function (y) {
      var ms = MS[y];
      var items = events.filter(function (v) { return v.y === y; }).map(function (v, i) {
        var meta = [v.d, v.x].filter(Boolean).join(', ');
        return '<li class="md-it" data-y="' + y + '" data-i="' + i + '" data-k="' + v.e.k + '" data-pod="' + (v.pod ? 1 : 0) + '" data-c="' + (v.e.c ? 1 : 0) + '">' +
          '<span class="md-mk">' + marker(v) + '</span><span class="md-n">' + esc(v.n) + '</span>' +
          (meta ? '<span class="md-meta">' + esc(meta) + '</span>' : '') + '</li>';
      }).join('');
      return '<div class="md-year"><div><h3 class="md-y">' + y + '</h3>' + (ms ? '<p class="md-ms" data-ms="' + y + '">' + esc(ms[0]) + '</p>' : '') + '</div><ul class="md-list">' + items + '</ul></div>';
    }).join('');

    /* ukryte źródła: zdanie roku i wiersze z wynikiem */
    var spfx = window.SPFX;
    if (spfx && spfx.src) {
      box.querySelectorAll('.md-ms').forEach(function (p) { var m = MS[p.getAttribute('data-ms')]; if (m && m[1]) spfx.src(p, m[1], m[2], 'Źródło'); });
      box.querySelectorAll('.md-it').forEach(function (li) {
        var y = +li.getAttribute('data-y'), i = +li.getAttribute('data-i');
        var v = events.filter(function (q) { return q.y === y; })[i];
        var meta = li.querySelector('.md-meta');
        if (v && v.u && meta) spfx.src(meta, v.u, v.f || 'medal', 'Źródło');
      });
    }
  }

  /* filtry: niepasujące starty łagodnie przygasają */
  var fEl = document.getElementById('mdFilters');
  var F = [['all', 'Wszystkie'], ['pod', 'Podia'], ['gory', 'Góry'], ['woda', 'Woda'], ['char', 'Charytatywne']];
  if (fEl && box) {
    fEl.innerHTML = F.map(function (f, i) { return '<button type="button" class="chip" data-f="' + f[0] + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + f[1] + '</button>'; }).join('');
    fEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip');
      if (!b) return;
      var f = b.getAttribute('data-f');
      fEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      box.querySelectorAll('.md-it').forEach(function (li) {
        var ok = f === 'all' || (f === 'pod' && li.getAttribute('data-pod') === '1') || (f === 'char' && li.getAttribute('data-c') === '1') || li.getAttribute('data-k') === f;
        li.classList.toggle('off', !ok);
      });
    });
  }

  /* tabela */
  var tb = document.getElementById('mdBody');
  if (tb) {
    tb.innerHTML = years.map(function (y) {
      return events.filter(function (v) { return v.y === y; }).map(function (v) {
        return '<tr><td class="tnum">' + y + '</td><td>' + esc(v.n) + '</td><td>' + esc(v.d) + '</td><td>' + esc(v.x) + '</td></tr>';
      }).join('');
    }).join('');
  }
})();

/* 90 Media: wykres publikacji i archiwum z wyszukiwarką */
(function () {
  'use strict';
  var data = window.SP_MEDIA || [];
  var sec = document.getElementById('media');
  if (!sec || !data.length) return;

  function plural(n, one, few, many) {
    if (n === 1) return one;
    var d = n % 10, h = n % 100;
    return (d >= 2 && d <= 4 && (h < 12 || h > 14)) ? few : many;
  }
  var KIND = { web: 'portal', tv: 'telewizja', press: 'prasa', radio: 'radio', pod: 'podcast' };
  var KIND_PL = { web: 'Portale', tv: 'Telewizja', press: 'Prasa', radio: 'Radio', pod: 'Podcasty' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- wykres ---------- */
  var years = ['2022', '2023', '2024', '2025', '2026'];
  var byYear = {}, pods = 0;
  years.forEach(function (y) { byYear[y] = { n: 0, web: 0, tv: 0, press: 0, radio: 0 }; });
  data.forEach(function (m) {
    if (m.y === 'podcast') { pods++; return; }
    var b = byYear[m.y]; if (!b) return;
    b.n++; if (b[m.k] !== undefined) b[m.k]++;
  });
  var chartYears = years.filter(function (y) { return y !== '2026'; });   // niepełny rok psuje porównanie
  var max = Math.max.apply(null, chartYears.map(function (y) { return byYear[y].n; })) || 1;
  var bars = document.getElementById('mdBars');
  if (bars) {
    bars.innerHTML = chartYears.map(function (y) {
      var b = byYear[y], parts = [];
      ['web', 'tv', 'press', 'radio'].forEach(function (k) { if (b[k]) parts.push(KIND_PL[k].toLowerCase() + ' ' + b[k]); });
      var lab = y + ': ' + b.n + ' ' + plural(b.n, 'publikacja', 'publikacje', 'publikacji');
      return '<div class="md-bar" role="listitem" tabindex="0" aria-label="' + esc(lab + ' (' + parts.join(', ') + ')') + '">' +
        '<span class="md-tip" aria-hidden="true"><b>' + esc(lab) + '</b><br>' + esc(parts.join(' · ')) + '</span>' +
        '<span class="md-v" aria-hidden="true">' + b.n + '</span>' +
        '<span class="md-col" style="height:calc(' + (b.n / max * 100).toFixed(2) + '% - 30px)"></span>' +
        '<span class="md-x" aria-hidden="true">' + y + '</span></div>';
    }).join('');
    SP.onVisible(bars, function (el) { el.classList.add('in'); });
  }
  var pod = document.getElementById('mdPod');
  if (pod && pods) pod.textContent = 'Do tego ' + pods + ' ' + plural(pods, 'podcast', 'podcasty', 'podcastów') + ' i audycji.';

  /* ---------- archiwum ---------- */
  var list = document.getElementById('mdList'), q = document.getElementById('mdQ'), count = document.getElementById('mdCount'),
      more = document.getElementById('mdMore'), yWrap = document.getElementById('mdYears'), kWrap = document.getElementById('mdKinds');
  if (!list) return;
  var state = { y: 'all', k: 'all', q: '', shown: 12 }, STEP = 12;

  function chips(wrap, items, key) {
    wrap.innerHTML = items.map(function (it) {
      return '<button type="button" class="chip" data-v="' + it[0] + '" aria-pressed="' + (state[key] === it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('');
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state[key] = b.getAttribute('data-v'); state.shown = STEP;
      wrap.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      render();
    });
  }
  chips(yWrap, [['all', 'Wszystkie lata']].concat(years.slice().reverse().map(function (y) { return [y, y]; })), 'y');
  chips(kWrap, [['all', 'Wszystko'], ['web', 'Portale'], ['tv', 'Telewizja'], ['press', 'Prasa'], ['radio', 'Radio'], ['pod', 'Podcasty']], 'k');

  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l'); }
  var idx = data.map(function (m) { return norm(m.t + ' ' + m.o + ' ' + m.y); });

  function render() {
    var nq = norm(state.q.trim());
    var res = data.filter(function (m, i) {
      if (state.y !== 'all' && m.y !== state.y) return false;
      if (state.k !== 'all' && m.k !== state.k) return false;
      return !nq || idx[i].indexOf(nq) !== -1;
    });
    count.textContent = res.length + ' ' + plural(res.length, 'pozycja', 'pozycje', 'pozycji');
    var vis = res.slice(0, state.shown);
    list.innerHTML = vis.length ? vis.map(function (m) {
      var meta = esc(m.o) + ', ' + (m.y === 'podcast' ? 'podcast' : esc(m.y) + ', ' + KIND[m.k]);
      var inner = '<span class="md-t">' + esc(m.t.replace(/\.$/, '')) + '</span><span class="md-o">' + meta + '</span>';
      return m.u ? '<li><a href="' + esc(m.u) + '" target="_blank" rel="noopener">' + inner + '</a></li>' : '<li><span class="md-na">' + inner + '</span></li>';
    }).join('') : '<li class="md-empty">Brak wyników.</li>';
    more.hidden = res.length <= state.shown;
  }
  var t;
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = q.value; state.shown = STEP; render(); }, 120); });
  more.addEventListener('click', function () { state.shown += STEP; render(); });
  render();
})();

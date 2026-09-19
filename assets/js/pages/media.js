/* Podstrona media.html: podcasty, archiwum (filtry, wyszukiwarka), biogramy */
(function () {
  'use strict';
  if (!document.querySelector('[data-pg="media"]') || !window.SP) return;
  var data = window.SP_MEDIA || [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l'); }
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var d = n % 10, h = n % 100;
    return (d >= 2 && d <= 4 && (h < 12 || h > 14)) ? few : many;
  }
  function title(t) { return String(t).replace(/\s+:\s/g, ': ').replace(/\s+\.$/, '.').trim(); }

  /* loga redakcji: plik i proporcje z assets/img/logos/logos.json */
  var LOGO = {
    'TVP3 Katowice': ['tvp3-katowice.svg', 1.684], 'TVP Katowice': ['tvp3-katowice.svg', 1.684],
    'Telewizja Polsat': ['polsat.svg', .984], 'Teleexpress': ['teleexpress.png', 6.095],
    'Canal + Sport': ['canal-plus-sport.svg', 2.157], 'RMF Maxx': ['rmf-maxx.png', 2.184],
    'Radio 357': ['radio-357.svg', 3.089], 'Radio Eska': ['radio-eska.svg', 3.014],
    'Radio Vox FM': ['vox-fm.png', 1.876], 'Wysokie Obcasy': ['wysokie-obcasy.svg', 7.971]
  };
  function outlet(o) {
    var l = LOGO[o];
    if (!l) return '<span class="pgm-o">' + esc(o) + '</span>';
    var h = Math.round(Math.max(12, Math.min(28, Math.sqrt(820 / l[1]))));
    return '<img class="lg" src="assets/img/logos/' + l[0] + '" alt="' + esc(o) + '" style="--h:' + h + 'px" loading="lazy">';
  }

  /* ---------- podcasty ---------- */
  var pods = data.filter(function (m) { return m.y === 'podcast'; });
  var podList = document.getElementById('pgmPods');
  if (podList) {
    podList.innerHTML = pods.map(function (m) {
      var inner = '<span class="pgm-pod-o">' + esc(m.o) + '</span><b>' + esc(title(m.t)) + '</b>';
      return '<li class="rv">' + (m.u ? '<a href="' + esc(m.u) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div>' + inner + '</div>') + '</li>';
    }).join('');
    podList.querySelectorAll('.rv').forEach(function (el, i) { el.style.setProperty('--d', (i * .03) + 's'); SP.onVisible(el, function (e) { e.classList.add('in'); }); });
  }

  /* ---------- archiwum ---------- */
  var KIND = { web: 'Portale', tv: 'Telewizja', press: 'Prasa', radio: 'Radio', pod: 'Podcasty' };
  var KIND1 = { web: 'portal', tv: 'telewizja', press: 'prasa', radio: 'radio', pod: 'podcast' };
  var years = [];
  data.forEach(function (m) { if (m.y !== 'podcast' && years.indexOf(m.y) < 0) years.push(m.y); });
  years.sort(function (a, b) { return b - a; });
  var groups = years.concat(['podcast']);
  var state = { q: '', kind: 'all' };
  var kinds = document.getElementById('pgmKinds'),
      list = document.getElementById('pgmYears'), count = document.getElementById('pgmCount'), q = document.getElementById('pgmQ');
  if (!list) return finishPage();

  if (kinds) {
    kinds.innerHTML = [['all', 'Wszystko']].concat(Object.keys(KIND).map(function (k) { return [k, KIND[k]]; })).map(function (k) {
      return '<button class="chip" type="button" data-k="' + k[0] + '" aria-pressed="' + (k[0] === 'all') + '">' + k[1] + '</button>';
    }).join('');
    kinds.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.kind = b.getAttribute('data-k');
      kinds.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      render();
    });
  }
  if (q) {
    var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = norm(q.value.trim()); render(); }, 120); });
  }

  function match(m) {
    if (state.kind !== 'all' && m.k !== state.kind) return false;
    if (state.q && norm(m.t + ' ' + m.o).indexOf(state.q) < 0) return false;
    return true;
  }
  function item(m) {
    var body = '<span class="pgm-it-o">' + outlet(m.o) + '</span><span class="pgm-it-t">' + esc(title(m.t)) + '</span><span class="pgm-it-k">' + KIND1[m.k] + '</span>';
    return '<li>' + (m.u ? '<a href="' + esc(m.u) + '" target="_blank" rel="noopener">' + body + '</a>' : '<div>' + body + '</div>') + '</li>';
  }
  function render() {
    var n = 0, per = {};
    groups.forEach(function (y) { per[y] = []; });
    data.forEach(function (m) { if (match(m)) { per[m.y].push(m); n++; } });
    list.innerHTML = groups.filter(function (y) { return per[y].length; }).map(function (y) {
      var lab = y === 'podcast' ? 'Podcasty' : y;
      return '<section class="pgm-yg" id="pgm-y-' + y + '" aria-label="' + lab + '"><h3 class="pgm-yh"><span>' + lab + '</span><span class="pgm-yn">' + per[y].length + '</span></h3><ul class="pgm-items">' +
        per[y].map(item).join('') + '</ul></section>';
    }).join('') || '<p class="pgm-empty">Brak wyników.</p>';
    if (count) count.textContent = n + ' ' + plural(n, 'pozycja', 'pozycje', 'pozycji');
  }
  render();
  finishPage();

  function finishPage() {
    /* ---------- biogramy ---------- */
    var tabs = document.getElementById('pgmBioTabs'), copy = document.getElementById('pgmCopy'), copied = document.getElementById('pgmCopied');
    var cur = '50';
    if (tabs) tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bio]'); if (!b) return;
      cur = b.getAttribute('data-bio');
      tabs.querySelectorAll('[data-bio]').forEach(function (c) { var on = c === b; c.setAttribute('aria-pressed', String(on)); c.setAttribute('aria-selected', String(on)); });
      document.querySelectorAll('.pgm-bio-text').forEach(function (p) { p.hidden = p.getAttribute('data-bio') !== cur; });
      if (copied) copied.textContent = '';
    });
    if (copy) copy.addEventListener('click', function () {
      var p = document.getElementById('pgmBio' + cur); if (!p) return;
      var text = Array.prototype.map.call(p.querySelectorAll('p'), function (x) { return x.textContent.trim(); }).join('\n\n');
      function ok() { if (copied) { copied.textContent = 'Skopiowano'; setTimeout(function () { copied.textContent = ''; }, 2400); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
      function fallback() {
        var r = document.createRange(); r.selectNodeContents(p);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { if (document.execCommand('copy')) ok(); } catch (e) { /* zaznaczony tekst zostaje do ręcznego skopiowania */ }
      }
    });
  }
})();

/* Podstrona Współpraca: pakiety — przyklejony nagłówek macierzy i zakładki poziomów na telefonie
   (zakładki budowane z tej samej tabeli, więc treść jest w jednym miejscu) */
(function () {
  'use strict';
  var root = document.getElementById('pg-wspolpraca'), mx = document.getElementById('pwMx');
  if (!root || !mx) return;

  /* nagłówek tabeli przykleja się tuż pod nagłówkiem serwisu (60 px lub więcej, gdy widać pasek Backyard) */
  var hdr = document.getElementById('hdr'), strip = hdr && hdr.querySelector('.hdr-strip');
  function stickTop() {
    if (!hdr) return;
    var h = hdr.offsetHeight - (hdr.classList.contains('tuck') && strip ? strip.offsetHeight : 0);
    mx.style.setProperty('--pw-top', Math.max(0, h) + 'px');
  }
  if (window.SP) SP.onScroll(stickTop); else stickTop();

  /* dane z tabeli: poziomy (nagłówki kolumn) i świadczenia pogrupowane w kategorie */
  var tiers = [].slice.call(mx.querySelectorAll('thead th[scope="col"]')).slice(1).map(function (th) {
    return { name: th.querySelector('.pw-tn').textContent, purpose: th.querySelector('.pw-tp').textContent, slots: th.querySelector('.pw-slots').outerHTML };
  });
  var cats = [].slice.call(mx.tBodies).map(function (tb) {
    var rows = [].slice.call(tb.rows);
    return {
      name: rows[0].textContent.trim(),
      items: rows.slice(1).map(function (tr) {
        var label = tr.cells[0].textContent.trim();
        return [].slice.call(tr.cells, 1).map(function (td) {
          if (td.classList.contains('y')) return { text: label, isNew: td.classList.contains('e') };
          if (td.classList.contains('t')) return { text: label, note: td.textContent.trim(), isNew: true };
          return null;
        });
      })
    };
  });
  var SHORT = ['Partner', 'Oficjalny', 'Główny', 'Strategiczny'];

  /* zakładki (wzorzec ARIA tabs: strzałki, Home/End) */
  var wrap = document.createElement('div');
  wrap.className = 'pw-tabs';
  var list = document.createElement('div');
  list.className = 'pw-tablist';
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'Poziomy partnerstwa');
  var panel = document.createElement('div');
  panel.className = 'pw-panel';
  panel.id = 'pwPanel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  var tabs = tiers.map(function (t, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'pwTab' + i;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'pwPanel');
    b.textContent = SHORT[i] || t.name;
    b.addEventListener('click', function () { select(i, false); });
    list.appendChild(b);
    return b;
  });

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render(i) {
    var t = tiers[i], h = '<div class="pw-panel-in"><span class="pw-tn">' + esc(t.name) + '</span><span class="pw-tp">' + esc(t.purpose) + '</span>' + t.slots;
    cats.forEach(function (c) {
      var li = c.items.map(function (it) { return it[i]; }).filter(Boolean).map(function (v) {
        var tag = v.note ? '<small>' + esc(v.note) + '</small>' : (i > 0 && v.isNew ? '<span class="pw-new">nowe</span>' : '');
        return '<li><span>' + esc(v.text) + '</span>' + tag + '</li>';
      });
      if (li.length) h += '<h3>' + esc(c.name) + '</h3><ul>' + li.join('') + '</ul>';
    });
    panel.innerHTML = h + '</div>';
  }
  function select(i, focus) {
    tabs.forEach(function (b, k) {
      var on = k === i;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[i].id);
    render(i);
    if (focus) tabs[i].focus();
  }
  list.addEventListener('keydown', function (e) {
    var cur = tabs.indexOf(document.activeElement);
    if (cur < 0) return;
    var n = tabs.length, next = null;
    if (e.key === 'ArrowRight') next = (cur + 1) % n;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next !== null) { e.preventDefault(); select(next, true); }
  });

  wrap.appendChild(list);
  wrap.appendChild(panel);
  mx.parentNode.insertBefore(wrap, mx.nextSibling);
  select(0, false);
})();

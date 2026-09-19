/* ==========================================================================
   08 Lightbox — powiększanie zdjęć na całej stronie.
   Użycie: <a href="pełne.jpg" data-lightbox="grupa" data-caption="Opis" data-download="plik.jpg">…</a>
   (data-download opcjonalne: pokazuje „Pobierz”). Elementy z tą samą wartością data-lightbox
   tworzą galerię (←/→, przesunięcie palcem). Esc, tło lub ✕ zamyka; przesunięcie w dół też.
   Pełny ekran na telefonie, natywne powiększanie gestem nie jest blokowane.
   ========================================================================== */
(function () {
  'use strict';
  var box, stage, img, cap, cnt, dl, bPrev, bNext, bClose, items = [], idx = 0, last = null, opened = false, loadTok = 0;

  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function build() {
    if (box) return;
    box = el('div', 'lb', document.body);
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Powiększone zdjęcie');
    box.hidden = true;
    stage = el('div', 'lb-stage', box);
    img = el('img', 'lb-img', stage);
    img.alt = '';
    img.decoding = 'async';
    bPrev = el('button', 'lb-btn lb-prev', box); bPrev.type = 'button'; bPrev.setAttribute('aria-label', 'Poprzednie zdjęcie');
    bPrev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    bNext = el('button', 'lb-btn lb-next', box); bNext.type = 'button'; bNext.setAttribute('aria-label', 'Następne zdjęcie');
    bNext.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    bClose = el('button', 'lb-btn lb-close', box); bClose.type = 'button'; bClose.setAttribute('aria-label', 'Zamknij');
    bClose.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var bar = el('div', 'lb-bar', box);
    cap = el('p', 'lb-cap', bar);
    var side = el('div', 'lb-side', bar);
    cnt = el('span', 'lb-cnt', side);
    dl = el('a', 'lb-dl', side); dl.textContent = 'Pobierz'; dl.setAttribute('download', '');

    bPrev.addEventListener('click', function () { go(idx - 1); });
    bNext.addEventListener('click', function () { go(idx + 1); });
    bClose.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });
    box.addEventListener('keydown', onKey);

    /* gesty: poziomo — poprzednie/następne, w dół — zamknij; nie przy powiększeniu i nie przy dwóch palcach */
    var sx = 0, sy = 0, st = 0, multi = false;
    stage.addEventListener('touchstart', function (e) {
      multi = e.touches.length > 1;
      if (multi) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) { if (e.touches.length > 1) multi = true; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (multi || (window.visualViewport && window.visualViewport.scale > 1.05)) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy, fast = Date.now() - st < 700;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && items.length > 1) go(idx + (dx < 0 ? 1 : -1));
      else if (dy > 90 && dy > Math.abs(dx) * 1.3 && fast) close();
    }, { passive: true });
  }

  function groupOf(t) {
    var g = t.getAttribute('data-lightbox');
    if (!g) return [t];
    var all = document.querySelectorAll('[data-lightbox]'), out = [];
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-lightbox') === g) out.push(all[i]);
    return out;
  }
  function srcOf(t) { return t.getAttribute('href') || t.getAttribute('data-src') || ''; }
  function altOf(t) { var i = t.querySelector('img'); return (i && i.alt) || t.getAttribute('data-caption') || ''; }

  function go(i) {
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    var t = items[idx], src = srcOf(t), tok = ++loadTok;
    box.classList.add('lb-loading');
    img.classList.remove('lb-in');
    var pre = new Image();
    pre.decoding = 'async';
    pre.onload = pre.onerror = function () {
      if (tok !== loadTok) return;
      img.src = src;
      img.alt = altOf(t);
      box.classList.remove('lb-loading');
      requestAnimationFrame(function () { img.classList.add('lb-in'); });
    };
    pre.src = src;
    cap.textContent = t.getAttribute('data-caption') || altOf(t);
    var multi = items.length > 1;
    cnt.textContent = multi ? (idx + 1) + ' / ' + items.length : '';
    bPrev.hidden = bNext.hidden = !multi;
    var d = t.getAttribute('data-download');
    dl.hidden = !d;
    if (d) dl.href = d;
    /* dociągnij sąsiednie zdjęcia, żeby przełączanie było natychmiastowe */
    if (multi) [idx + 1, idx - 1].forEach(function (k) { var n = items[(k + items.length) % items.length]; if (n) (new Image()).src = srcOf(n); });
  }

  function focusables() {
    return Array.prototype.filter.call(box.querySelectorAll('button, a[href]'), function (b) { return !b.hidden && b.offsetParent !== null; });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' && items.length > 1) { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft' && items.length > 1) { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Tab') {
      var f = focusables(); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }

  function open(t) {
    build();
    items = groupOf(t);
    last = t;
    opened = true;
    document.documentElement.classList.add('lb-open');   // blokada przewijania (html ma scrollbar-gutter: stable — bez przeskoku)
    box.hidden = false;
    go(Math.max(0, items.indexOf(t)));
    requestAnimationFrame(function () { box.classList.add('on'); bClose.focus({ preventScroll: true }); });
  }
  function close() {
    if (!opened) return;
    opened = false;
    box.classList.remove('on');
    document.documentElement.classList.remove('lb-open');
    var done = function () { if (!opened) { box.hidden = true; img.removeAttribute('src'); } };
    if (window.SP && SP.reduced) done(); else setTimeout(done, 260);
    if (last && last.focus) last.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target.closest ? e.target.closest('[data-lightbox]') : null;
    if (!t || !srcOf(t)) return;
    e.preventDefault();
    open(t);
  });

  window.SPLB = { open: open, close: close };
})();

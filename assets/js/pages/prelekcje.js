/* Podstrona Prelekcje: galeria zdjęć, pięć narzędzi, lightbox listów referencyjnych */
(function () {
  'use strict';
  var root = document.getElementById('pg-prelekcje');
  if (!root) return;

  /* --- galeria zdjęć z prelekcji --- */
  var reel = document.getElementById('ppReel'), rp = document.getElementById('ppReelPrev'), rn = document.getElementById('ppReelNext');
  if (reel && rp && rn) {
    var step = function (d) { reel.scrollBy({ left: d * reel.clientWidth * .8, behavior: window.SP && SP.reduced ? 'auto' : 'smooth' }); };
    var ends = function () {
      rp.disabled = reel.scrollLeft < 4;
      rn.disabled = reel.scrollLeft + reel.clientWidth > reel.scrollWidth - 4;
    };
    rp.addEventListener('click', function () { step(-1); });
    rn.addEventListener('click', function () { step(1); });
    reel.addEventListener('scroll', ends, { passive: true });
    window.addEventListener('resize', ends);
    ends();
  }

  /* --- pięć narzędzi (zakładki) --- */
  var tl = document.getElementById('ppPl'), panel = document.getElementById('ppPlP');
  if (tl && panel) {
    var tabs = Array.prototype.slice.call(tl.querySelectorAll('[role="tab"]'));
    var cards = Array.prototype.slice.call(panel.querySelectorAll('.pp-pl-c'));
    var select = function (i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        cards[k].hidden = !on;
        cards[k].classList.toggle('is-on', on);
      });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
        else if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
      });
    });
  }

  /* --- lightbox listów referencyjnych --- */
  var lb = document.getElementById('ppLb'), grid = document.getElementById('ppGrid');
  if (!lb || !grid || typeof lb.showModal !== 'function') return;
  var items = Array.prototype.slice.call(grid.querySelectorAll('.pp-card'));
  var img = document.getElementById('ppLbImg'), pages = document.getElementById('ppLbPages'),
      meta = document.getElementById('ppLbMeta'), name = document.getElementById('ppLbName'),
      ex = document.getElementById('ppLbEx'), count = document.getElementById('ppLbCount'),
      prev = document.getElementById('ppLbPrev'), next = document.getElementById('ppLbNext'),
      close = document.getElementById('ppLbClose');
  var cur = 0, opener = null;

  function files(b) { return (b.getAttribute('data-full') || '').split(',').filter(Boolean); }
  function preload(i) { var b = items[(i + items.length) % items.length]; if (b) { var p = new Image(); p.src = files(b)[0]; } }
  function page(src, n) {
    img.src = src;
    Array.prototype.forEach.call(pages.children, function (p, k) { p.setAttribute('aria-pressed', String(k === n)); });
  }
  function show(i) {
    cur = (i + items.length) % items.length;
    var b = items[cur], fs = files(b);
    var place = b.getAttribute('data-place'), date = b.getAttribute('data-date');
    img.alt = 'List: ' + b.getAttribute('data-name');
    meta.textContent = [place, date].filter(Boolean).join(', ');
    name.textContent = '';
    var t = document.createElement('span');
    t.textContent = b.getAttribute('data-name');
    name.appendChild(t);
    if (window.SPFX) SPFX.src(t, (b.getAttribute('data-full') || '').split(',')[0], 'medal', 'List referencyjny (skan)');
    var q = b.getAttribute('data-ex');
    ex.textContent = q ? '„' + q + '”' : '';
    count.textContent = (cur + 1) + ' / ' + items.length;
    pages.textContent = '';
    pages.hidden = fs.length < 2;
    if (fs.length > 1) {
      fs.forEach(function (f, k) {
        var p = document.createElement('button');
        p.type = 'button';
        p.textContent = String(k + 1);
        p.setAttribute('aria-label', 'Strona ' + (k + 1));
        p.addEventListener('click', function () { page(f, k); });
        pages.appendChild(p);
      });
    }
    page(fs[0], 0);
    preload(cur + 1);
    preload(cur - 1);
  }
  function open(i, from) {
    opener = from || null;
    show(i);
    lb.showModal();
    document.documentElement.style.overflow = 'hidden';
  }
  lb.addEventListener('close', function () {
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  });

  items.forEach(function (b, i) { b.addEventListener('click', function () { open(i, b); }); });
  prev.addEventListener('click', function () { show(cur - 1); });
  next.addEventListener('click', function () { show(cur + 1); });
  close.addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  });

  /* przesunięcie palcem po liście */
  var x0 = null;
  img.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  img.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 48) show(cur + (dx < 0 ? 1 : -1));
  });
  img.addEventListener('pointercancel', function () { x0 = null; });
})();

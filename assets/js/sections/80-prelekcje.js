/* 80 Prelekcje: galeria zdjęć i pięć filarów programu */
(function () {
  'use strict';
  var sec = document.getElementById('prelekcje');
  if (!sec) return;

  /* galeria */
  var row = document.getElementById('prRow'), prev = document.getElementById('prPrev'), next = document.getElementById('prNext');
  if (row && prev && next) {
    var sync = function () {
      var max = row.scrollWidth - row.clientWidth - 2;
      prev.disabled = row.scrollLeft <= 2;
      next.disabled = row.scrollLeft >= max;
    };
    var step = function (dir) {
      row.scrollBy({ left: dir * Math.max(240, row.clientWidth * .7), behavior: SP.reduced ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    row.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    row.addEventListener('load', sync, true);
    sync();
  }

  /* pięć filarów */
  var list = document.getElementById('prPl'), txt = document.getElementById('prPlTxt');
  if (!list || !txt) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  function select(i, focus) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tabs[i].focus();
    var t = tabs[i].getAttribute('data-t');
    if (SP.reduced) { txt.textContent = t; return; }
    txt.classList.add('swap');
    setTimeout(function () { txt.textContent = t; txt.classList.remove('swap'); }, 160);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select((i + 1) % n, true); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select((i - 1 + n) % n, true); }
      else if (k === 'Home') { e.preventDefault(); select(0, true); }
      else if (k === 'End') { e.preventDefault(); select(n - 1, true); }
    });
  });
})();

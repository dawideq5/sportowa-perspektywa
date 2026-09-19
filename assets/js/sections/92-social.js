/* 92 Na bieżąco: rząd wpisów przewijany gestem lub strzałkami; przy wejściu sekcji delikatnie dosuwa się z prawej */
(function () {
  'use strict';
  var sec = document.getElementById('na-biezaco');
  if (!sec || !window.SP) return;
  var rail = sec.querySelector('.so-rail'), track = sec.querySelector('.so-track'), arrows = sec.querySelector('.so-arrows');
  if (!rail || !track) return;

  /* strzałki tylko przy myszy i gdy jest co przewijać */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var btns = arrows ? arrows.querySelectorAll('.so-btn') : [];
  function state() {
    var max = rail.scrollWidth - rail.clientWidth;
    if (arrows) arrows.hidden = !fine || max < 8;
    if (btns.length) { btns[0].disabled = rail.scrollLeft < 4; btns[1].disabled = rail.scrollLeft > max - 4; }
  }
  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function () {
      rail.scrollBy({ left: +b.getAttribute('data-dir') * rail.clientWidth * .75, behavior: SP.reduced ? 'auto' : 'smooth' });
    });
  });
  rail.addEventListener('scroll', state, { passive: true });
  window.addEventListener('resize', state);
  state();

  /* dosunięcie: przesunięcie maleje do zera, gdy sekcja wchodzi w kadr (tylko przewijanie strony, bez samoczynnego ruchu) */
  if (SP.reduced) return;
  var last = -1;
  SP.onScroll(function (y, vh) {
    var r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    var t = SP.ss(vh, vh * .3, r.top), x = Math.round((1 - t) * Math.min(80, window.innerWidth * .07));
    if (x !== last) { track.style.transform = x ? 'translate3d(' + x + 'px,0,0)' : ''; last = x; }
  });
})();

/* 85 Współpraca: karuzela opinii partnerów */
(function () {
  'use strict';
  var track = document.getElementById('wsQ'), prev = document.getElementById('wsPrev'), next = document.getElementById('wsNext');
  if (!track || !prev || !next) return;
  function sync() {
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }
  function step(dir) {
    var card = track.firstElementChild, gap = 16;
    var w = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    track.scrollBy({ left: dir * w, behavior: SP.reduced ? 'auto' : 'smooth' });
  }
  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();

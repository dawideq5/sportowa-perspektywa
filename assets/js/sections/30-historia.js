/* 30 historia: kroki sterowane przewijaniem, świt w tle, licznik trzeźwości */
(function () {
  'use strict';
  var sec = document.getElementById('historia'), stage = document.getElementById('storyStage');
  if (!sec || !stage || !window.SP) return;
  var steps = [].slice.call(sec.querySelectorAll('.story-st')), ages = sec.querySelectorAll('.story-ages li');
  var n = steps.length, last = -1;
  var past = sec.querySelector('[data-smoke]'), PAST = steps.indexOf(past ? past.closest('.story-st') : null);
  /* wagi kroków: krok ze zdjęciami przeszłości trwa dłużej (dym ma czas się rozwinąć) */
  var W = steps.map(function (s, i) { return i === PAST ? 1.6 : 1; }), WT = W.reduce(function (a, b) { return a + b; }, 0);

  var grid = document.getElementById('storyGrid');
  if (grid) {
    var html = '';
    for (var i = 0; i < 100; i++) html += '<i style="--i:' + i + '"' + (i >= 95 ? ' class="lit"' : '') + '></i>';
    grid.innerHTML = html;
  }

  SP.onScroll(function () {
    var p = SP.progress(sec), x = p * WT, idx = 0, acc = 0;
    while (idx < n - 1 && x >= acc + W[idx]) { acc += W[idx]; idx++; }
    var local = Math.min(1, (x - acc) / W[idx]);
    if (idx !== last) {
      steps.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
      last = idx;
    }
    /* dym z papierosa: tylko na kroku ze zdjęciami przeszłości, postęp = postęp tego kroku */
    if (past && past.__smoke) { past.__smoke.active(idx === PAST); if (idx === PAST) past.__smoke.set(local); }
    ages.forEach(function (li, i) { li.classList.toggle('on', idx > 1 || (idx === 1 && local > i * .26)); });
    stage.style.setProperty('--dawn', SP.ss(.56, .8, p).toFixed(3));
    stage.style.setProperty('--photo', SP.ss(.86, .97, p).toFixed(3));
  });

  /* licznik trzeźwości od 10.09.2017 */
  var START = Date.parse('2017-09-10T00:00:00+02:00');
  var dEl = document.getElementById('soberDays'), tEl = document.getElementById('soberHms');
  function pad(v) { return (v < 10 ? '0' : '') + v; }
  function tick() {
    var s = Math.floor((Date.now() - START) / 1000), d = Math.floor(s / 86400);
    s -= d * 86400;
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec2 = s % 60;
    if (dEl) dEl.textContent = SP.fmt(d);
    if (tEl) tEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(sec2);
  }
  tick();
  setInterval(tick, 1000);
})();

/* 20 kim jestem: zakładki ról, płynna zmiana zdjęcia (tylko na żądanie użytkownika) */
(function () {
  'use strict';
  var sec = document.getElementById('kim');
  if (!sec || !window.SP) return;
  var tabs = [].slice.call(sec.querySelectorAll('.kim-tab')), imgs = sec.querySelectorAll('.kim-fig img');
  var text = document.getElementById('kimText'), panel = document.getElementById('kimPanel'), ultra = document.getElementById('kimUltra');
  var cur = 0, swapT;

  function show(i, focus) {
    if (i === cur) return;
    tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
    imgs[cur].classList.remove('on');
    cur = i;
    tabs[i].setAttribute('aria-selected', 'true'); tabs[i].tabIndex = 0;
    imgs[i].classList.add('on');
    panel.setAttribute('aria-labelledby', tabs[i].id);
    if (focus) tabs[i].focus();
    clearTimeout(swapT);
    text.classList.add('swap');
    swapT = setTimeout(function () { text.textContent = tabs[i].getAttribute('data-text'); text.classList.remove('swap'); }, 260);
  }
  function manual() { sec.classList.remove('auto'); }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { manual(); show(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length;
      if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
        e.preventDefault(); manual();
        show(k === 'Home' ? 0 : k === 'End' ? n - 1 : (cur + (k === 'ArrowRight' ? 1 : n - 1)) % n, true);
      }
    });
    // koniec paska postępu = następna rola
    t.querySelector('.kim-bar i').addEventListener('animationend', function () {
      if (sec.classList.contains('auto') && i === cur) show((cur + 1) % tabs.length);
    });
  });

  /* bez automatycznej zmiany ról — użytkownik przełącza sam */
  SP.onVisible(ultra, function (el) { el.classList.add('go'); }, '0px 0px -25% 0px');
})();

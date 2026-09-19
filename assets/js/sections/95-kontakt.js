/* 95 Kontakt: walidacja formularza */
(function () {
  'use strict';
  var form = document.getElementById('ktForm');
  if (!form) return;
  var name = document.getElementById('ktName'), mail = document.getElementById('ktMail'),
      ok = document.getElementById('ktOk');
  var RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function field(el, valid) {
    var err = document.getElementById(el.getAttribute('aria-describedby'));
    el.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (err) err.hidden = valid;
    return valid;
  }
  function checkName() { return field(name, name.value.trim().length > 1); }
  function checkMail() { return field(mail, RE.test(mail.value.trim())); }

  name.addEventListener('blur', function () { if (name.value) checkName(); });
  mail.addEventListener('blur', function () { if (mail.value) checkMail(); });
  name.addEventListener('input', function () { if (name.getAttribute('aria-invalid') === 'true') checkName(); });
  mail.addEventListener('input', function () { if (mail.getAttribute('aria-invalid') === 'true') checkMail(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = checkName(), b = checkMail();
    if (!a) { name.focus(); return; }
    if (!b) { mail.focus(); return; }
    var first = name.value.trim().split(/\s+/)[0];
    ok.textContent = 'Dziękuję, ' + first + '. Odezwę się najszybciej, jak to możliwe.';
    form.reset();
    [name, mail].forEach(function (el) { el.removeAttribute('aria-invalid'); });
  });

})();

// Home: let the visitor try accent colours and backgrounds on the example panel/launcher. Without this script the example stays at its defaults.
(function () {
  var demo = document.getElementById('demo');
  if (!demo) return;
  demo.classList.add('is-live');
  function bind(group, apply) {
    var btns = [].slice.call(demo.querySelectorAll(group + ' button'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        apply(b);
      });
    });
  }
  bind('.sw', function (b) { demo.style.setProperty('--demo-accent', b.getAttribute('data-color')); });
  bind('.seg', function (b) { demo.setAttribute('data-bg', b.getAttribute('data-bg')); });
})();

/* Swatch picker: sets --brand / --brand-ink on [data-brand-scope] in the branding chapter. */
(function () {
  'use strict';
  var picker = document.querySelector('[data-brand-picker]');
  if (!picker) return;
  var chapter = picker.closest('.chapter');
  var override = null;

  function norm(hex) {
    return (hex || '').trim().toLowerCase();
  }

  function inkFor(hex) {
    var h = norm(hex).replace('#', '');
    if (h.length !== 6) return '#241703';
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? '#241703' : '#ecebe7';
  }

  function scopes() {
    return chapter ? Array.prototype.slice.call(chapter.querySelectorAll('[data-brand-scope]')) : [];
  }

  function scrollBrand(scope) {
    var scene = scope.closest('.scene');
    if (!scene) return '#f5b14c';
    if (scene.classList.contains('at-2') || scene.classList.contains('at-3')) return '#6cb6f0';
    return '#f5b14c';
  }

  function applyToScope(el, hex) {
    var color = norm(hex);
    el.style.setProperty('--brand', color);
    el.style.setProperty('--brand-ink', inkFor(color));
  }

  function apply(hex, fromUser) {
    var color = norm(hex);
    if (!fromUser) override = null;
    else override = color;
    scopes().forEach(function (el) { applyToScope(el, color); });
    var buttons = picker.querySelectorAll('button[data-swatch]');
    for (var i = 0; i < buttons.length; i++) {
      var on = norm(buttons[i].getAttribute('data-swatch')) === color;
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function syncFromScroll() {
    var list = scopes();
    if (!list.length) return;
    if (override) {
      apply(override, true);
      return;
    }
    list.forEach(function (el) { applyToScope(el, scrollBrand(el)); });
    var lead = scrollBrand(list[0]);
    var buttons = picker.querySelectorAll('button[data-swatch]');
    for (var i = 0; i < buttons.length; i++) {
      var on = norm(buttons[i].getAttribute('data-swatch')) === norm(lead);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function onPick(btn) {
    var hex = btn.getAttribute('data-swatch');
    if (!hex) return;
    apply(hex, true);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-brand-picker] button[data-swatch]');
    if (!btn) return;
    onPick(btn);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var btn = e.target.closest('[data-brand-picker] button[data-swatch]');
    if (!btn) return;
    if (e.key === ' ') e.preventDefault();
    onPick(btn);
  });

  if (chapter) {
    chapter.addEventListener('lantern:step', function () {
      override = null;
      syncFromScroll();
    });
    chapter.querySelectorAll('.scene').forEach(function (scene) {
      if ('MutationObserver' in window) {
        new MutationObserver(function () {
          if (override) return;
          syncFromScroll();
        }).observe(scene, { attributes: true, attributeFilter: ['class', 'data-step'] });
      }
    });
  }

  syncFromScroll();
})();

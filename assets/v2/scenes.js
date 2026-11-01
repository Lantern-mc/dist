/* Scroll -> step engine for the sticky chapters, mobile scene cloning, and the moving glow. Vanilla, no dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  var narrow = window.matchMedia('(max-width: 51.999rem)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var defaultTint = '#f5b14c';

  var chapters = Array.prototype.map.call(document.querySelectorAll('.chapter'), function (el) {
    var steps = Array.prototype.slice.call(el.querySelectorAll('.steps > .step'));
    return { el: el, scene: el.querySelector('.scene[data-scene]'), steps: steps, n: steps.length, tint: el.getAttribute('data-tint') || defaultTint, step: 0, cloned: false };
  });

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // data-step plus at-1..at-n on the scene; the list item n becomes the current one (original scene only)
  function setStep(scene, n) {
    var ch = scene.closest('.chapter');
    var total = ch ? ch.querySelectorAll('.steps > .step').length : n;
    scene.setAttribute('data-step', String(n));
    for (var i = 1; i <= total; i++) scene.classList.toggle('at-' + i, i <= n);
    if (ch && !scene.classList.contains('scene-clone')) {
      var items = ch.querySelectorAll('.steps > .step');
      for (var k = 0; k < items.length; k++) {
        var on = k === n - 1;
        items[k].classList.toggle('is-active', on);
        if (on) items[k].setAttribute('aria-current', 'step'); else items[k].removeAttribute('aria-current');
      }
      ch.dispatchEvent(new CustomEvent('lantern:step', { bubbles: true, detail: { chapterId: ch.id, step: n, scene: scene } }));
    }
  }

  var observer = null;
  function makeClones(c) {
    if (c.cloned || !c.scene) return;
    c.cloned = true;
    c.steps.forEach(function (li, idx) {
      var i = idx + 1;
      var clone = c.scene.cloneNode(true);
      clone.removeAttribute('data-scene');
      clone.classList.add('scene-clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.remove('play');
      for (var j = i + 1; j <= c.n; j++) clone.classList.remove('at-' + j);
      // the end state of step i is there at once; the `play` class (motion) is added when it scrolls into view so it plays once
      li.appendChild(clone);
      setStep(clone, i);
      clone.setAttribute('inert', '');
      if (observer && !reduce.matches) observer.observe(clone);
    });
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('play');
        observer.unobserve(e.target);
      });
    }, { threshold: 0.4 });
  }

  // from here on the pinned layout (and, when narrow, the clones) replace the plain list; without this class the page stays a readable list
  root.classList.add('scenes-ready');
  chapters.forEach(function (c) { if (c.scene) c.scene.classList.add('play'); });
  if (location.hash) {
    var hashId = location.hash.slice(1);
    try { hashId = decodeURIComponent(hashId); } catch (e) { /* keep raw hash */ }
    var target = document.getElementById(hashId);
    if (target) target.scrollIntoView();
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var isNarrow = narrow.matches;
    if (isNarrow) chapters.forEach(makeClones);
    chapters.forEach(function (c) {
      c.el.querySelectorAll('.scene-clone').forEach(function (cl) { cl.setAttribute('inert', ''); });
    });
    var activeTint = defaultTint;
    var inChapter = false;
    chapters.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) { activeTint = c.tint; inChapter = true; }
      if (isNarrow || !c.scene) return;
      var span = c.el.offsetHeight - vh;
      var p = span > 0 ? clamp(-r.top / span, 0, 0.9999) : 0;
      var step = Math.floor(p * c.n) + 1;
      if (step !== c.step || c.scene.getAttribute('data-step') !== String(step)) {
        c.step = step;
        setStep(c.scene, step);
      }
    });
    var y = vh * 0.42 + Math.sin(window.scrollY / 520) * vh * 0.1;
    var x = (inChapter && !isNarrow) ? 68 : 50 + Math.cos(window.scrollY / 900) * 14;
    body.style.setProperty('--glow-y', Math.round(y) + 'px');
    body.style.setProperty('--glow-x', x.toFixed(1) + '%');
    body.style.setProperty('--tint', activeTint);
  }
  function schedule() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', update);
  window.addEventListener('pageshow', update);
  window.addEventListener('hashchange', schedule);
  if (narrow.addEventListener) narrow.addEventListener('change', update);
  update();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { window.requestAnimationFrame(function () { window.requestAnimationFrame(update); }); });
  }

  window.LanternScenes = { setStep: setStep };
})();

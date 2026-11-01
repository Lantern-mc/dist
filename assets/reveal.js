// Home: sections rise into view as they are scrolled to. Without this script, or with reduced motion, everything is simply visible.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var items = [].slice.call(document.querySelectorAll('.reveal, .reveal-group > *'));
  if (!items.length) return;
  document.documentElement.classList.add('js-reveal');
  items.forEach(function (el, i) {
    var sibs = el.parentNode.classList.contains('reveal-group') ? [].indexOf.call(el.parentNode.children, el) : 0;
    el.style.transitionDelay = (sibs * 70) + 'ms';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

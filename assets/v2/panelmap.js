/** Ops page panel map: the mock's sidebar buttons switch the main view and the explanation. */
(function () {
  const map = document.querySelector('[data-panelmap]');
  if (!map) return;
  const buttons = Array.from(map.querySelectorAll('button[data-spot]'));
  const ids = buttons.map((b) => b.getAttribute('data-spot'));

  function open(id) {
    if (!ids.includes(id)) return;
    buttons.forEach((b) => {
      const on = b.getAttribute('data-spot') === id;
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
      b.classList.toggle('on', on);
    });
    map.querySelectorAll('.pm-view').forEach((v) => v.classList.toggle('is-on', v.getAttribute('data-view') === id));
    ids.forEach((sid) => { const el = map.querySelector('#spot-' + sid); if (el) el.classList.toggle('is-open', sid === id); });
  }

  document.documentElement.classList.add('panelmap-ready');
  map.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-spot]');
    if (b && map.contains(b)) open(b.getAttribute('data-spot'));
  });
  open('console');
})();

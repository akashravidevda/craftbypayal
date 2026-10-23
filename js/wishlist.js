(async () => {
  await window.CBP_READY;
  'use strict';

  const CBP = window.CBP;
  const grid = document.querySelector('[data-wish-grid]');
  const empty = document.querySelector('[data-wish-empty]');
  if (!CBP || !grid) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = (src, w) => window.CBP_IMAGE(src,w);

  const card=(p,i)=>window.CBP_GIFT_CARD(p,i);

  function render() {
    const items = CBP.wishlist().map(id => CBP.byId[id]).filter(Boolean);
    grid.innerHTML = items.map(card).join('');
    grid.hidden = !items.length;
    empty.hidden = !!items.length;
  }

  // main.js toggles the heart first; re-render afterwards so removed items disappear.
  grid.addEventListener('click', e => { if (e.target.closest('[data-wish]')) setTimeout(render, 0); });
  render();
})();

(async () => {
  await window.CBP_READY;
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const P = window.CBP_PRODUCT;
  const CBP = window.CBP;
  if (!P || !CBP) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Gallery ---------- */
  const track = $('[data-track]');
  const thumbs = $$('[data-thumb]');
  const slides = $$('.gal__slide');
  let current = 0;
  function go(i) {
    current = (i + slides.length) % slides.length;
    track.scrollTo({ left: slides[current].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }
  function markThumb(i) {
    current = i;
    thumbs.forEach((t, n) => t.toggleAttribute('aria-current', n === i));
    const c = $('[data-gal-count]'); if (c) c.textContent = i + 1;
  }
  thumbs.forEach(t => t.addEventListener('click', () => go(+t.dataset.thumb)));
  $('[data-gal-prev]')?.addEventListener('click', () => go(current - 1));
  $('[data-gal-next]')?.addEventListener('click', () => go(current + 1));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => markThumb(Math.round(track.scrollLeft / track.clientWidth)));
  }, { passive: true });

  /* ---------- Options ---------- */
  if(P.listingState==='preview'){
    $('[data-price]').textContent='Price to be confirmed';
    const form=$('[data-pdp-form]');form.hidden=true;form.replaceChildren();
    const status=document.createElement('p');status.className='catalog-notice';status.textContent='Preview only — this design is not available to order.';form.before(status);
    return;
  }
  const V = P.variants;
  const uniq = key => [...new Set(V.map(v => v[key]).filter(Boolean))];
  const sizes = uniq('size').sort((a, b) => parseInt(a) - parseInt(b) || parseInt(a.split('×')[1]) - parseInt(b.split('×')[1]));
  const lights = uniq('light').sort((a, b) => (a === 'With light' ? -1 : 1));
  const pick = { size: null, light: null };
  const first = V.findIndex(v => v.available);
  const start = V[first >= 0 ? first : 0];
  pick.size = start.size; pick.light = start.light;

  function buildOpts(key, values) {
    const box = $(`[data-opt="${key}"]`);
    if (values.length < 2 && !(key === 'size' && values.length === 1 && values[0]!=='Standard')) return;
    box.hidden = false;
    $('.opt__list', box).innerHTML = values.map((v, i) => `
      <label class="opt__pill"><input type="radio" name="${key}" value="${String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}" ${v === pick[key] ? 'checked' : ''}>
        <span>${key === 'light' ? '<svg aria-hidden="true"><use href="#i-bulb"/></svg>' : ''}${String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</span></label>`).join('');
  }
  buildOpts('size', sizes);
  buildOpts('light', lights);

  function variantIndex() {
    let i = V.findIndex(v => (!sizes.length || v.size === pick.size) && (!lights.length || v.light === pick.light));
    if (i < 0) i = V.findIndex(v => v.size === pick.size);
    return Math.max(0, i);
  }
  const priceEl = $('[data-price]');
  const addBtn = $('[data-pdp-add]');
  function refresh() {
    const v = V[variantIndex()];
    priceEl.textContent = CBP.inr(v.price);
    // grey out lighting choices that don't exist for this size
    $$('input[name="light"]').forEach(r => {
      const ok = V.some(x => x.light === r.value && (!pick.size || x.size === pick.size));
      r.disabled = !ok;
    });
    addBtn.disabled = !v.available;
    const buyButton=$('[data-buy-now]');if(buyButton)buyButton.disabled=!v.available;
    addBtn.firstChild.textContent = v.available ? 'Add to cart ' : 'Out of stock ';
  }
  $('[data-pdp-form]').addEventListener('change', e => {
    if (e.target.name === 'size' || e.target.name === 'light') { pick[e.target.name] = e.target.value; refresh(); }
  });
  refresh();

  /* ---------- Quantity ---------- */
  let qty = 1;
  const qtyOut = $('[data-qty-out]');
  $$('[data-q]').forEach(b => b.addEventListener('click', () => {
    qty = Math.min(20, Math.max(1, qty + +b.dataset.q));
    qtyOut.textContent = qty;
  }));

  /* ---------- Add to cart ---------- */
  const form = $('[data-pdp-form]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const vi = variantIndex();
    if(!V[vi].available)return;
    const f = new FormData(form);
    const bits = [];
    if (f.get('names')) bits.push(`Names: ${f.get('names').trim()}`);
    if (f.get('date')) bits.push(`Date: ${new Date(f.get('date')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    if (f.get('message')) bits.push(`Note: ${f.get('message').trim()}`);
    CBP.addToCart(`${P.id}::${V[vi].id||vi}`, qty, bits.join(' · '));
    $('[data-pdp-status]').textContent = `Added ${qty} × ${P.name} to your cart.`;
    if (buyNow) { location.href = '../checkout.html'; return; }
    CBP.openCart();
  });
  let buyNow = false;
  $('[data-buy-now]')?.addEventListener('click', () => { buyNow = true; form.requestSubmit(); buyNow = false; });
})();

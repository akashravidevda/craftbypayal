// Cart page, checkout and order confirmation.
(async () => {
  await window.CBP_READY;
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CBP = window.CBP;
  if (!CBP) return;
  const inr = CBP.inr;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WA = 'https://wa.me/918390617338'; // TODO: Craft by Payal's real WhatsApp number (also in tools/shell.py)
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  // Production release accepts owner-verified UPI/WhatsApp payments only.
  /* ================= Order summary ================= */
  function renderSummary(lines, totals) {
    const list = $('[data-sum-items]');
    if (!list) return;
    list.innerHTML = lines.map(l => `<li class="osum__item">
        <span class="osum__img"><img src="${window.CBP_IMAGE(l.image,120)}" alt="" width="56" height="56"><b>${l.qty}</b></span>
        <span class="osum__name">${esc(l.name)}${l.variant ? `<small>${esc(l.variant)}</small>` : ''}${l.note ? `<small class="osum__note">${esc(l.note)}</small>` : ''}</span>
        <span class="osum__price">${l.notOrderable?"Unavailable to order":inr(l.qty * l.price)}</span>
      </li>`).join('');
    $('[data-sum-subtotal]').textContent = inr(totals.subtotal);
    $('[data-sum-shipping]').textContent = totals.shipping ? inr(totals.shipping) : 'Free';
    $('[data-sum-total]').textContent = inr(totals.total);
    const hint = $('[data-sum-hint]');
    if (hint) hint.textContent = totals.subtotal && totals.subtotal < CBP.FREE_SHIP
      ? `Add ${inr(CBP.FREE_SHIP - totals.subtotal)} more for free shipping.` : '';
  }
  const liveLines = () => CBP.cartLines().map(l => ({ key: l.key, id: l.id, name: l.p.name, image: l.p.image, managed:l.p.managed, variantId:l.variantId, unresolved:l.unresolved, notOrderable:l.notOrderable, variant: l.variant, note: l.note, qty: l.qty, price: l.price }));

  /* ================= Cart page ================= */
  const cartPage = $('[data-cart-page]');
  if (cartPage) {
    const renderCartPage = () => {
      const lines = liveLines();
      $('[data-cart-lines]').innerHTML = lines.map(l => `<li class="v2line">
          <a class="v2line__img" href="${window.CBP_PRODUCT_URL(l)}"><img src="${window.CBP_IMAGE(l.image,400)}" alt="${esc(l.name)}" width="260" height="260"></a>
          <div class="v2line__body">
            <div class="v2line__top">
              <div>
                <h2 class="v2line__name"><a href="${window.CBP_PRODUCT_URL(l)}">${esc(l.name)}</a></h2>
                <p class="v2line__price">${l.notOrderable?"Unavailable to order":inr(l.price)}</p>
                ${l.variant ? l.variant.split(' · ').map(v => `<p class="v2line__meta">${/in$/.test(v) ? 'Size' : 'Style'}: ${esc(v)}</p>`).join('') : '<p class="v2line__meta">Size &amp; style: confirmed on WhatsApp</p>'}
                ${l.unresolved?'<p class="v2line__meta" role="status">Product details need to be rechecked. Your item has been kept.</p>':''}
                ${l.note ? `<p class="v2line__meta v2line__note">${esc(l.note)}</p>` : ''}
              </div>
            </div>
            <div class="v2line__bottom">
              <div class="v2line__qty"><span class="v2line__label">Quantity</span>
                <div class="qty" role="group" aria-label="Quantity for ${esc(l.name)}">
                  <button type="button" data-line-qty="${l.key}" data-d="-1" aria-label="Decrease quantity">−</button>
                  <span aria-live="polite">${l.qty}</span>
                  <button type="button" data-line-qty="${l.key}" data-d="1" aria-label="Increase quantity">+</button>
                </div>
              </div>
              <button class="cline__remove" type="button" data-line-remove="${l.key}" aria-label="Remove ${esc(l.name)}"><svg aria-hidden="true"><use href="#i-trash"/></svg><span>Remove</span></button>
              <p class="v2line__total">${l.notOrderable?"Unavailable to order":inr(l.qty * l.price)}</p>
            </div>
          </div>
        </li>`).join('');
      const countEl = $('[data-cart-count-text]');
      if (countEl) { const n = lines.reduce((t, l) => t + l.qty, 0); countEl.textContent = `${n} ${n === 1 ? 'item' : 'items'}`; }
      const empty = !lines.length;
      $('[data-cart-page-empty]').hidden = !empty;
      $('[data-cart-lines]').hidden = empty;
      $('.osum').hidden = empty;
      renderSummary(lines, CBP.totals());
    };
    cartPage.addEventListener('click', e => {
      const q = e.target.closest('[data-line-qty]');
      if (q) {
        const l = CBP.cartLines().find(x => x.key === q.dataset.lineQty);
        CBP.setQty(l.key, l.qty + +q.dataset.d);
        $(`[data-line-qty="${l.key}"][data-d="${q.dataset.d}"]`)?.focus();
      }
      const r = e.target.closest('[data-line-remove]');
      if (r) { CBP.setQty(r.dataset.lineRemove, 0); CBP.toast('Removed from cart'); $('[data-to-checkout], .co__back')?.focus(); }
    });
    CBP.onCartChange(() => setTimeout(renderCartPage, 0));
    renderCartPage();
  }

  /* ================= Checkout ================= */
  const form = $('[data-checkout]');
  if (form) {
    const refresh = () => {
      const lines = liveLines();
      const empty = !lines.length;
      form.hidden = empty;
      $('[data-co-empty]').hidden = !empty;
      renderSummary(lines, CBP.totals());
    };
    CBP.onCartChange(() => setTimeout(refresh, 0));
    refresh();

    // restore an in-progress draft (this tab only)
    const draft = session.get('cbp-checkout-draft') || {};
    for (const [k, v] of Object.entries(draft)) {
      const f = form.elements[k];
      if (!f) continue;
      if (f.type === 'checkbox') f.checked = !!v;
      else if (f instanceof RadioNodeList) f.value = v;
      else f.value = v;
    }
    form.addEventListener('input', () => {
      const d = Object.fromEntries(new FormData(form));
      d.hidePrice = form.elements.hidePrice.checked;
      session.set('cbp-checkout-draft', d);
    });

    const digits = v => v.replace(/\D/g, '');
    const rules = {
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: v => /^[6-9]\d{9}$/.test(digits(v).replace(/^(91|0)(?=\d{10}$)/, '')),
      pin: v => /^[1-9]\d{5}$/.test(v.trim())
    };
    function setError(field, msg) {
      const wrap = field.closest('.field');
      let m = wrap.querySelector('.field__err');
      if (msg) {
        field.setAttribute('aria-invalid', 'true');
        if (!m) { m = document.createElement('span'); m.className = 'field__err'; m.id = `err-${field.name}`; wrap.appendChild(m); }
        m.textContent = msg;
        field.setAttribute('aria-describedby', m.id);
      } else {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        m && m.remove();
      }
    }
    function validate() {
      const errs = [];
      $$('[required]', form).forEach(f => {
        const v = f.value || '';
        const ok = v.trim() && (!rules[f.name] || rules[f.name](v));
        setError(f, ok ? '' : f.dataset.msg);
        if (!ok) errs.push(f);
      });
      return errs;
    }
    // re-check a field once the user leaves it (after a first submit attempt)
    let tried = false;
    let submitting=false;
    let reviewedQuote=null;
    const onlineOption=form.querySelector('input[name="payment"][value="online"]');
    if(onlineOption){onlineOption.disabled=true;onlineOption.closest('label').hidden=true;}
    const manualOption=form.querySelector('input[name="payment"][value="whatsapp"]');if(manualOption)manualOption.checked=true;
    form.addEventListener('focusout', e => { if (tried && e.target.matches('[required]')) validate(); });
    form.elements.pin.addEventListener('input', e => { e.target.value = digits(e.target.value).slice(0, 6); });

    function makeOrder() {
      const f = Object.fromEntries(new FormData(form));
      const lines = liveLines();
      const t = CBP.totals();
      const d = new Date();
      const id = `CBP${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        id, placedAt: d.toISOString(), payment: f.payment, status: 'placed',
        customer: { name: f.name.trim(), email: f.email.trim(), phone: digits(f.phone).slice(-10) },
        address: { line1: f.address1.trim(), line2: (f.address2 || '').trim(), city: f.city.trim(), state: f.state, pin: f.pin.trim() },
        gift: { needBy: f.needBy || '', occasion: f.occasion || '', message: (f.giftMsg || '').trim(), hidePrice: !!form.elements.hidePrice.checked },
        lines, ...t
      };
    }
    function finish(order) {
      session.set('cbp-last-order', order);
      sessionStorage.removeItem('cbp-checkout-draft');
      sessionStorage.removeItem('cbp-pending-order');
      CBP.clearCart();
      location.href = 'order-confirmation.html';
    }

    // ---- Google Sheet order book (see js/config.js) ----
    const API = (window.CBP_CONFIG || {}).ORDER_API || '';
    async function callApi(payload) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      try {
        // text/plain keeps this a "simple" request, so Google's web app accepts it without a CORS preflight
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
        return await r.json();
      } catch { return { ok: false, error: 'network' }; }
      finally { clearTimeout(t); }
    }
    const busy = (on, label) => { placeBtn.disabled = on; placeBtn.firstChild.textContent = on ? label : 'Submit order request '; };

    const placeBtn = $('[data-place-order]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if(submitting)return;
      if(CBP.cartLines().some(l=>l.notOrderable)){const box=$('[data-co-errors]');box.hidden=false;box.textContent='Remove preview or unavailable products from your cart before submitting an order.';return;}
      tried = true;
      const errs = validate();
      const box = $('[data-co-errors]');
      if (errs.length) {
        box.hidden = false;
        box.innerHTML = `<strong>Please check ${errs.length === 1 ? 'one field' : errs.length + ' fields'}:</strong><ul>${errs.map(f => `<li><a href="#" data-goto="${f.name}">${esc(f.dataset.msg)}</a></li>`).join('')}</ul>`;
        box.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        errs[0].focus({ preventScroll: true });
        return;
      }
      box.hidden = true;
      if(!API||!window.CBP_CATALOG_STATE?.complete){
        box.hidden=false;box.textContent='Checkout is waiting for the published shop backend. Your cart is safe. Please retry or contact the studio.';return;
      }
      let order=makeOrder();
      const inputKey=JSON.stringify({customer:order.customer,address:order.address,gift:order.gift,payment:order.payment,lines:order.lines.map(l=>({id:l.id,variantId:l.variantId,qty:l.qty,note:l.note}))});
      const pending=session.get('cbp-pending-order');
      if(pending&&pending.inputKey!==inputKey){box.hidden=false;box.textContent='A previous order attempt is still unconfirmed. Restore its details and retry, or contact the studio before starting another order. Your cart has been kept.';return;}
      submitting=true;busy(true,pending?'Checking your order… ':'Checking prices… ');
      try{
        let payload=pending?.payload;
        if(!payload){
          const result=await callApi({action:'quote',order});
          if(!result.ok||!result.quote)throw Error(result.error||'Could not verify prices. Your cart has been kept.');
          const quote=result.quote;
          if((quote.total!==order.total||quote.lines.some((l,i)=>l.price!==order.lines[i]?.price))&&reviewedQuote!==inputKey+quote.fingerprint){
            reviewedQuote=inputKey+quote.fingerprint;renderSummary(quote.lines,quote);box.hidden=false;box.textContent='Prices or shipping have changed. Review the updated summary, then press Submit order request again to accept it.';return;
          }
          payload={action:'create',requestId:crypto.randomUUID(),quoteFingerprint:quote.fingerprint,quoteExpires:quote.expiresAt,quoteToken:quote.token,order};
          session.set('cbp-pending-order',{inputKey,payload});
          // Do not submit unless the retry identity was durably saved in this tab.
          if(session.get('cbp-pending-order')?.payload?.requestId!==payload.requestId)throw Error('Allow browser session storage before placing this order.');
        }
        busy(true,'Placing your order… ');
        const saved=await callApi(payload);
        if(!saved.ok){
          if(saved.code&&saved.code!=='SERVER_ERROR'&&saved.code!=='BUSY')sessionStorage.removeItem('cbp-pending-order');
          throw Error(saved.error||'We could not confirm the result. Your cart and request have been kept. Retry to check the same order.');
        }
        if(saved.schema!==2||!saved.quote)throw Error('The shop did not confirm the order. Retry this same attempt.');
        order={...payload.order,...saved.quote,id:saved.id,orderId:saved.orderId,accessToken:saved.accessToken,uploadToken:saved.uploadToken,uploadUrl:saved.uploadUrl,saved:true};
        finish(order);
      }catch(error){box.hidden=false;box.textContent=error.message;}
      finally{submitting=false;busy(false);}
    });
    $('[data-co-errors]').addEventListener('click', e => {
      const a = e.target.closest('[data-goto]');
      if (a) { e.preventDefault(); form.elements[a.dataset.goto].focus(); }
    });
  }

  /* ================= Confirmation ================= */
  const done = $('[data-done]');
  if (done) {
    const o = session.get('cbp-last-order');
    if (!o) { $('[data-done-missing]').hidden = false; return; }
    done.hidden = false;
    const first = o.customer.name.split(' ')[0];
    $('[data-done-name]').textContent = first;
    $('[data-done-id]').textContent = o.id;
    // WhatsApp uses single asterisks for bold. Keep sections readable on a phone.
    const itemsText = o.lines.map((l, i) => [
      `*${i + 1}. ${l.name}*`,
      l.variant || '',
      `${l.qty} × ${l.notOrderable?"Unavailable to order":inr(l.price)} · ${l.notOrderable?"Unavailable to order":inr(l.qty * l.price)}`,
      l.note ? `Personalisation: ${l.note}` : ''
    ].filter(Boolean).join('\n')).join('\n\n');
    const gift = o.gift || {};
    const a0 = o.address;
    const neededBy = gift.needBy ? new Date(gift.needBy + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const payment = 'Pending · please confirm payment details';
    const giftDetails = [
      gift.occasion ? `Occasion: ${gift.occasion}` : '',
      neededBy ? `Requested by: ${neededBy}` : '',
      gift.message ? `Gift note: “${gift.message}”` : '',
      gift.hidePrice ? 'Please leave prices out of the parcel.' : ''
    ].filter(Boolean);
    const details = [
      '🎁 *CRAFT BY PAYAL*\n_Little things. Lasting memories._',
      `*Order request ${o.id}*`,
      `🛍️ *Your little treasures*\n${itemsText}`,
      ['*Order summary*',
        `Subtotal: ${inr(o.subtotal ?? o.lines.reduce((sum, l) => sum + l.price * l.qty, 0))}`,
        `Shipping: ${Number(o.shipping || 0) === 0 ? 'Free' : inr(o.shipping)}`,
        `*Total: ${inr(o.total)}*`,
        `Payment: ${payment}`,
        'Payment will be arranged with the studio.'
      ].filter(Boolean).join('\n'),
      ['📦 *Deliver with care*', o.customer.name, a0.line1, a0.line2,
        `${a0.city}, ${a0.state} — ${a0.pin}`,
        `Phone: ${o.customer.phone}`, `Email: ${o.customer.email}`
      ].filter(Boolean).join('\n'),
      giftDetails.length ? `💌 *A personal touch*\n${giftDetails.join('\n')}` : ''
    ].filter(Boolean).join('\n\n');
    const waOrder = `${details}\n\nI'd like to confirm this order request. Please confirm availability, delivery and payment details. 🤍`;
    $('[data-done-eyebrow]').textContent = 'Order request received';
    $('[data-done-lede]').textContent = 'Open WhatsApp, then press Send to share your order request. The studio will confirm availability, delivery and payment details. If photos or personalisation details are needed, the studio will guide you.';
    $('[data-done-actions]').innerHTML = `<a class="btn btn--coral" href="${WA}?text=${encodeURIComponent(waOrder)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Open WhatsApp to confirm</a>
      <a class="btn-outline" href="collections/all.html">Continue shopping</a>`;
    if(o.orderId&&o.accessToken){const track=document.createElement('a');track.className='btn-outline';track.textContent='Track this order';track.href='track-order.html#'+new URLSearchParams({orderId:o.orderId,token:o.accessToken});$('[data-done-actions]').append(track);}
    const a = o.address;
    $('[data-done-addr]').innerHTML = `<strong>${esc(o.customer.name)}</strong><br>${esc(a.line1)}${a.line2 ? '<br>' + esc(a.line2) : ''}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pin)}<br>${esc(o.customer.phone)} · ${esc(o.customer.email)}`
      + (o.gift.message ? `<p class="done__gift"><svg aria-hidden="true"><use href="#i-gift"/></svg> Gift message: “${esc(o.gift.message)}”</p>` : '');
    renderSummary(o.lines, o);
    document.title = `Order ${o.id} submitted | Craft by Payal`;
  }
})();

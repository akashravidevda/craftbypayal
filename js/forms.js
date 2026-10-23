// Contact and track-order forms.
// Contact: validate, then hand the message to WhatsApp (no server yet).
// Track order: if the Google Sheet order book is connected (js/config.js), show the live status;
// otherwise fall back to sending a WhatsApp message.
(() => {
  'use strict';

  const WA = 'https://wa.me/918390617338'; // TODO: Craft by Payal's real WhatsApp number (also in tools/shell.py)
  const API = (window.CBP_CONFIG || {}).ORDER_API || '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function check(form) {
    const status = form.querySelector('[data-form-status]');
    const bad = [...form.querySelectorAll('[required]')].filter(f => !f.value.trim());
    form.querySelectorAll('[aria-invalid]').forEach(f => f.removeAttribute('aria-invalid'));
    if (bad.length) {
      bad.forEach(f => f.setAttribute('aria-invalid', 'true'));
      status.textContent = 'Please fill in the highlighted fields.';
      status.classList.add('is-error');
      bad[0].focus();
      return false;
    }
    status.classList.remove('is-error');
    status.textContent = '';
    return true;
  }

  function wire(form, compose) {
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!check(form)) return;
      const text = compose(new FormData(form));
      window.open(`${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      form.querySelector('[data-form-status]').textContent = 'WhatsApp opened with your message — just tap send.';
    });
  }

  wire(document.querySelector('[data-contact]'), f =>
    `Hi Craft by Payal! I'm ${f.get('name')} (${f.get('reach')}${f.get('phone') ? ', ' + f.get('phone') : ''}).\nTopic: ${f.get('topic')}\n\n${f.get('message')}`);

  const trackMsg = f => `Hi Craft by Payal! Could I get an update on order ${f.get('order')}? My mobile number is ${f.get('phone')}.`;
  const track = document.querySelector('[data-track]');
  if (!track) return;
  if (!API) { wire(track, trackMsg); return; }

  // Production tracking uses a secret from the URL fragment, never a public order number.
  const link=new URLSearchParams(location.hash.slice(1));
  if(link.get('orderId')&&link.get('token')){
    const out=track.querySelector('[data-track-result]'),status=track.querySelector('[data-form-status]');
    const button=track.querySelector('button[type="submit"]');button.disabled=true;
    const payload={action:'trackSecure',orderId:link.get('orderId'),token:link.get('token')};
    const check=async()=>{status.textContent='Checking your order…';try{
      const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      const result=await response.json();if(!result.ok)throw Error(result.error||'Could not check the order.');
      out.hidden=false;out.replaceChildren();
      const heading=document.createElement('h2');heading.textContent='Order '+result.id;out.append(heading);
      ['status','payment','delivery'].forEach(key=>{const p=document.createElement('p');p.textContent=result[key]||'';out.append(p);});
      if(/^https:\/\/[^\s<>"']+$/.test(result.tracking||'')){const a=document.createElement('a');a.href=result.tracking;a.textContent='Track your parcel';a.rel='noopener noreferrer';a.target='_blank';out.append(a);}
      status.textContent='';
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;button.textContent='Refresh order status';}};
    track.addEventListener('submit',event=>{event.preventDefault();check();});check();return;
  }
  // ---- live status from the order book
  const STEPS = ['Placed', 'Photos received', 'Preview sent', 'Approved', 'Handcrafting', 'Dispatched', 'Delivered'];
  const out = track.querySelector('[data-track-result]');
  const btn = track.querySelector('button[type="submit"]');
  track.addEventListener('submit', async e => {
    e.preventDefault();
    if (!check(track)) return;
    const f = new FormData(track);
    const status = track.querySelector('[data-form-status]');
    btn.disabled = true;
    status.textContent = 'Looking up your order…';
    out.hidden = true;
    let res;
    try {
      const url = `${API}?action=track&id=${encodeURIComponent(f.get('order').trim())}&phone=${encodeURIComponent(f.get('phone'))}`;
      res = await (await fetch(url)).json();
    } catch { res = { ok: false, error: 'network' }; }
    btn.disabled = false;
    if (!res.ok) {
      status.classList.add('is-error');
      status.innerHTML = res.error === 'not_found'
        ? `We couldn't find that order. Check the order number and mobile number, or <a href="${WA}?text=${encodeURIComponent(trackMsg(f))}" target="_blank" rel="noopener">ask us on WhatsApp</a>.`
        : `Couldn't check right now. Please try again, or <a href="${WA}?text=${encodeURIComponent(trackMsg(f))}" target="_blank" rel="noopener">ask us on WhatsApp</a>.`;
      return;
    }
    status.classList.remove('is-error');
    status.textContent = '';
    const cancelled = res.status === 'Cancelled';
    const pending = res.status === 'Pending payment';
    const at = Math.max(0, STEPS.indexOf(res.status));
    out.innerHTML = `
      <p class="trk__hello">Hi ${esc(res.firstName)}! Order <strong>${esc(res.id)}</strong></p>
      <p class="trk__status trk__status--${cancelled ? 'off' : 'on'}">${esc(res.status)}</p>
      <p class="trk__date">Updated ${esc(res.updated)}</p>
      ${cancelled || pending ? (pending ? '<p class="trk__note">We\'re waiting for your payment to confirm. If you\'ve paid, we\'ll update this shortly.</p>' : '<p class="trk__note">This order was cancelled. Message us if you have any questions.</p>') : `
      <ol class="trk__steps" role="list">${STEPS.map((s, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"${i === at ? ' aria-current="step"' : ''}><span aria-hidden="true">${i < at ? '✓' : i + 1}</span>${esc(s)}</li>`).join('')}</ol>`}
      <div class="trk__links">
        ${res.preview ? `<a class="btn-outline" href="${esc(res.preview)}" target="_blank" rel="noopener">See design preview</a>` : ''}
        ${res.tracking ? `<a class="btn btn--coral btn--sm" href="${esc(res.tracking)}" target="_blank" rel="noopener">Track parcel</a>` : ''}
      </div>`;
    out.hidden = false;
    out.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();

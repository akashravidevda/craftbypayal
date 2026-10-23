(async () => {
  await window.CBP_READY;
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ALL = window.CBP_CATALOG || [];
  const CBP = window.CBP || { inr: n => '₹' + n.toLocaleString('en-IN'), isWished: () => false };
  const PER_PAGE = 16;

  const FACETS = {
    giftType: {label:'Gift type',get:p=>[p.collection]},
    subtype: {label:'Product type',get:p=>p.productType?[p.productType]:[]},
    avail: { label: 'Availability', get: p => [p.listingState==='preview'?'Preview only':p.inStock ? 'In Stock' : 'Out of Stock'], order: ['In Stock', 'Out of Stock'] },
    occasion: { label: 'Occasion', get: p => p.occasion },
    theme: { label: 'Theme', get: p => p.theme },
    size: { label: 'Size', get: p => p.size, sort: (a, b) => parseInt(a) - parseInt(b) || parseInt(a.split('×')[1]) - parseInt(b.split('×')[1]) },
    light: { label: 'Lighting', get: p => p.light, order: ['With light', 'Without light'] }
  };
  let PRICE_MIN=0,PRICE_MAX=50;
  const selectedPool=()=>ALL.filter(p=>!state.giftType.length||state.giftType.includes(p.collection));
  const facetEnabled=k=>k!=='light'||selectedPool().length>0&&selectedPool().every(p=>p.collection==='miniature-frame');
  function reconcile(){
    const pool=selectedPool();
    for(const k of ['subtype','size','light'])state[k]=facetEnabled(k)?state[k].filter(v=>pool.some(p=>FACETS[k].get(p).includes(v))):[];
    const prices=pool.map(p=>p.price).filter(n=>Number.isFinite(n)&&n>0);
    PRICE_MIN=prices.length?Math.floor(Math.min(...prices)/50)*50:0;PRICE_MAX=prices.length?Math.ceil(Math.max(...prices)/50)*50:50;
    if(PRICE_MIN===PRICE_MAX)PRICE_MAX+=50;
    if(!state.priceActive){state.min=PRICE_MIN;state.max=PRICE_MAX;}else{state.min=clamp(state.min);state.max=clamp(state.max);if(state.min>state.max)[state.min,state.max]=[state.max,state.min];}
    $('[data-price]').closest('.fgroup').hidden=!prices.length;
  }

  /* ---------- State <-> URL ---------- */
  function readState() {
    const q = new URLSearchParams(location.search);
    const st = { sort: q.get('sort') || 'featured', page: Math.max(1, parseInt(q.get('page')) || 1), q: (q.get('q') || '').trim() };
    for (const k in FACETS) st[k] = q.getAll(k);
    if(!q.has('giftType')&&!location.pathname.endsWith('/all.html')){const initial=document.body.dataset.collection;if(initial&&initial!=='all')st.giftType=[initial];}
    st.giftType=st.giftType.filter(id=>window.CBP_GIFT_TYPES.some(t=>t.id===id&&t.enabled)||(id==='unclassified'&&ALL.some(p=>p.collection===id)));
    if(!st.subtype.length)st.subtype=q.getAll('type');
    st.priceActive=q.has('min')||q.has('max');
    st.min = Number.isFinite(parseInt(q.get('min')))?parseInt(q.get('min')):0;
    st.max = Number.isFinite(parseInt(q.get('max')))?parseInt(q.get('max')):Number.MAX_SAFE_INTEGER;
    if(st.min>st.max)[st.min,st.max]=[st.max,st.min];
    if(!SORTS[st.sort])st.sort='featured';
    return st;
  }
  function writeState(push) {
    const q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    for (const k in FACETS) state[k].forEach(v => q.append(k, v));
    if(state.priceActive){q.set('min',state.min);q.set('max',state.max);}
    if (state.sort !== 'featured') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', state.page);
    const url = new URL('all.html',location.href).pathname + (q.toString() ? '?' + q : '') + location.hash;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }
  const clamp = n => Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
  let state;

  /* ---------- Filtering ---------- */
  function matches(p, skip) {
    if (state.q && ![p.name,p.productType,window.CBP_TYPE_NAME(p.collection)].join(' ').toLowerCase().includes(state.q.toLowerCase())) return false;
    if (skip !== 'price' && state.priceActive && (p.price===null||p.price < state.min || p.price > state.max)) return false;
    for (const k in FACETS) {
      if (k === skip || !facetEnabled(k) || !state[k].length) continue;
      const vals = FACETS[k].get(p);
      if (!state[k].some(v => vals.includes(v))) return false; // OR within a group, AND across groups
    }
    return true;
  }
  const SORTS = {
    featured: (a, b) => a.order - b.order,
    newest: (a, b) => String(b.created||'').localeCompare(String(a.created||'')),
    'price-asc': (a, b) => (a.price===null?Infinity:a.price) - (b.price===null?Infinity:b.price) || a.order - b.order,
    'price-desc': (a, b) => (b.price===null?-Infinity:b.price) - (a.price===null?-Infinity:a.price) || a.order - b.order,
    az: (a, b) => a.name.localeCompare(b.name)
  };

  /* ---------- Facets ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function facetValues(k) {
    const f = FACETS[k];
    const vals = new Set((k==='giftType'?ALL:selectedPool()).flatMap(f.get));
    if(k==='giftType')state.giftType.forEach(v=>vals.add(v));
    if(k==='size')vals.delete('Standard');
    let list = [...vals];
    if (f.order) list.sort((a, b) => f.order.indexOf(a) - f.order.indexOf(b));
    else if (f.sort) list.sort(f.sort);
    else list.sort((a, b) => ALL.filter(p => f.get(p).includes(b)).length - ALL.filter(p => f.get(p).includes(a)).length);
    return list;
  }
  function renderFacets() {
    for (const k in FACETS) {
      const box = $(`[data-facet="${k}"]`);
      if (!box) continue;
      const pool = ALL.filter(p => matches(p, k));
      box.innerHTML = facetValues(k).map((v, i) => {
        const n = pool.filter(p => FACETS[k].get(p).includes(v)).length;
        const on = state[k].includes(v);
        if (!n && !on && k!=='giftType') return '';            // nothing matches with the current filters: hide the option
        const id = `f-${k}-${i}`;
        if (k === 'light') {
          return `<label class="fchip" for="${id}"><input id="${id}" type="checkbox" name="${k}" value="${esc(v)}" ${on ? 'checked' : ''} ${!n && !on ? 'disabled' : ''}>
            <span><svg aria-hidden="true"><use href="#i-bulb"/></svg>${esc(k==='giftType'?window.CBP_TYPE_NAME(v):v)} <em>(${n})</em></span></label>`;
        }
        return `<label class="fopt" for="${id}"><input id="${id}" type="checkbox" name="${k}" value="${esc(v)}" ${on ? 'checked' : ''} ${!n && !on ? 'disabled' : ''}>
          <span>${esc(k==='giftType'?window.CBP_TYPE_NAME(v):v)} <em>(${n})</em></span></label>`;
      }).join('');
      // hide the whole group when none of its options apply
      const group = box.closest('.fgroup');
      if (group) group.hidden = !facetEnabled(k)||!box.children.length;
    }
    // price
    const lo = $('[data-price-min]'), hi = $('[data-price-max]');
    [lo, hi].forEach(r => { r.min = PRICE_MIN; r.max = PRICE_MAX; });
    lo.value = state.min; hi.value = state.max;
    paintPrice();
  }
  function paintPrice() {
    const lo = +$('[data-price-min]').value, hi = +$('[data-price-max]').value;
    const pct = v => ((v - PRICE_MIN) / Math.max(50, PRICE_MAX - PRICE_MIN)) * 100;
    const fill = $('[data-price-fill]');
    fill.style.left = pct(lo) + '%';
    fill.style.right = (100 - pct(hi)) + '%';
    $('[data-price-min-out]').textContent = CBP.inr(lo);
    $('[data-price-max-out]').textContent = CBP.inr(hi);
    $('[data-price-min]').setAttribute('aria-valuetext', CBP.inr(lo));
    $('[data-price-max]').setAttribute('aria-valuetext', CBP.inr(hi));
  }

  /* ---------- Cards ---------- */
  const img = (src, w) => window.CBP_IMAGE(src,w);
  const card=(p,i)=>window.CBP_GIFT_CARD(p,i,'../');

  /* ---------- Render ---------- */
  const grid = $('[data-grid]');
  function render({ scroll, push=false } = {}) {
    reconcile();
    const list = ALL.filter(p => matches(p)).sort(SORTS[state.sort] || SORTS.featured);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    writeState(push);
    grid.innerHTML = slice.map(card).join('');
    $('[data-empty]').hidden = list.length > 0;
    const empty=$('[data-empty]');
    document.querySelector('.shop').classList.toggle('shop--empty',!ALL.length);
    if(!ALL.length){empty.querySelector('.script').textContent=window.CBP_CATALOG_STATE?.online?'No published products yet.':'Product updates are temporarily unavailable.';empty.querySelector('p:not(.script)').textContent=window.CBP_CATALOG_STATE?.online?'Please check back for available pieces.':'Please try again later. Your cart has been kept.';empty.querySelector('[data-clear]').hidden=true;}
    grid.hidden = list.length === 0;
    $('[data-count]').textContent = `${list.length} ${list.length === 1 ? 'Product' : 'Products'}${state.q ? ` for “${state.q}”` : ''}`;
    $$('[data-show-count]').forEach(b => { b.textContent = `Show ${list.length} ${list.length === 1 ? 'result' : 'results'}`; });
    $('[data-sort]').value = state.sort;
    renderFacets();
    renderChips();
    renderPager(pages);
    if (scroll) {
      const top = $('.results').getBoundingClientRect().top + scrollY - 100;
      if (scrollY > top) window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function activeFilters() {
    const out = [];
    if (state.q) out.push({ k: 'q', v: state.q, label: `“${state.q}”` });
    for (const k in FACETS) state[k].forEach(v => out.push({ k, v, label: k==='giftType'?window.CBP_TYPE_NAME(v):v }));
    if (state.priceActive) out.push({ k: 'price', v: '', label: `${CBP.inr(state.min)} – ${CBP.inr(state.max)}` });
    return out;
  }
  function renderChips() {
    const act = activeFilters();
    const badge = $('[data-filter-badge]');
    badge.textContent = act.length; badge.hidden = !act.length;
    $('[data-chips]').innerHTML = act.map(f => `<li class="chip">${esc(f.label)}
      <button type="button" data-chip-k="${f.k}" data-chip-v="${esc(f.v)}" aria-label="Remove filter ${esc(f.label)}"><svg aria-hidden="true"><use href="#i-close"/></svg></button></li>`).join('')
      + (act.length > 1 ? '<li><button class="chip--clear" type="button" data-clear>Clear all</button></li>' : '');
  }
  function renderPager(pages) {
    const pager = $('[data-pager]');
    if (pages < 2) { pager.innerHTML = ''; return; }
    let html = `<button type="button" data-page="${state.page - 1}" aria-label="Previous page" ${state.page === 1 ? 'disabled' : ''}><svg aria-hidden="true"><use href="#i-arrow-left"/></svg></button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button type="button" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''} aria-label="Page ${i}">${i}</button>`;
    }
    html += `<button type="button" data-page="${state.page + 1}" aria-label="Next page" ${state.page === pages ? 'disabled' : ''}><svg aria-hidden="true"><use href="#i-chev-right"/></svg></button>`;
    pager.innerHTML = html;
  }

  /* ---------- Events ---------- */
  const form = $('[data-filter-form]');
  form.addEventListener('change', e => {
    const t = e.target;
    if (t.type !== 'checkbox') return;
    const k = t.name;
    state[k] = t.checked ? [...new Set([...state[k], t.value])] : state[k].filter(v => v !== t.value);
    state.page = 1;
    const id = t.id;
    render({push:true});
    const again = document.getElementById(id);
    again && again.focus();
  });

  const lo = $('[data-price-min]'), hi = $('[data-price-max]');
  [lo, hi].forEach(r => {
    r.addEventListener('input', () => {
      if (+lo.value > +hi.value - 50) (r === lo ? lo.value = +hi.value - 50 : hi.value = +lo.value + 50);
      paintPrice();
    });
    r.addEventListener('change', () => {
      state.priceActive=true;state.min = clamp(+lo.value); state.max = clamp(+hi.value); state.page = 1;
      render({push:true});
      r.focus();
    });
  });

  $('[data-sort]').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; render({push:true}); });

  document.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { state.page = +pg.dataset.page; render({ scroll: true,push:true }); $('[data-pager] [aria-current]')?.focus(); return; }
    const chip = e.target.closest('[data-chip-k]');
    if (chip) {
      const { chipK: k, chipV: v } = chip.dataset;
      if (k === 'q') state.q = '';
      else if (k === 'price') { state.priceActive=false;state.min = PRICE_MIN; state.max = PRICE_MAX; }
      else state[k] = state[k].filter(x => x !== v);
      state.page = 1; render({push:true});
      ($('[data-chips] button') || $('[data-sort]')).focus();
      return;
    }
    if (e.target.closest('[data-clear]')) {
      for (const k in FACETS) state[k] = [];
      state.priceActive=false;state.q = ''; state.min = PRICE_MIN; state.max = PRICE_MAX; state.page = 1;
      render({push:true});
    }
  });

  window.addEventListener('popstate', () => { state = readState(); render(); });

  /* ---------- Mobile / tablet filter sheet ---------- */
  const filters = $('[data-filters]');
  const sheet = $('[data-filter-sheet]');
  const openBtn = $('[data-filter-open]');
  const sheetMode = matchMedia('(max-width: 1023px)');
  let backdrop = null;
  function syncSheetRole() {
    if (sheetMode.matches) { sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); }
    else { sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal'); closeSheet(true); }
  }
  function openSheet() {
    filters.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('lock');
    backdrop = document.createElement('div');
    backdrop.className = 'filters__backdrop';
    backdrop.addEventListener('click', () => closeSheet());
    document.body.appendChild(backdrop);
    setTimeout(() => $('[data-filter-close]', sheet).focus(), 50);
  }
  function closeSheet(silent) {
    if (!filters.classList.contains('is-open')) return;
    filters.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('lock');
    backdrop && backdrop.remove(); backdrop = null;
    if (!silent) openBtn.focus();
  }
  openBtn.addEventListener('click', openSheet);
  $$('[data-filter-close]').forEach(b => b.addEventListener('click', () => closeSheet()));
  document.addEventListener('keydown', e => {
    if (!filters.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input:not([disabled]), summary', sheet).filter(n => n.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  sheetMode.addEventListener('change', syncSheetRole);
  syncSheetRole();

  state=readState();
  render();
})();

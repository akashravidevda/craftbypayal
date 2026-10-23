/* Shared catalogue overrides. Bundled products remain available if the service is offline. */
window.CBP_CATALOG_READY = (async () => {
  const normalize=(p,strict=false,types=window.CBP_GIFT_TYPES,modern=false)=>{
    let collection=p.collection;
    if(!modern&&window.CBP_LEGACY_GIFT_TYPES[p.id])collection=window.CBP_LEGACY_GIFT_TYPES[p.id];
    if(!collection)collection=strict?null:'unclassified';
    if(collection!=='unclassified'&&!types.some(t=>t.id===collection&&t.enabled)||!collection)throw Error('Invalid product gift type');
    return {...p,collection,productType:p.productType||'',careInstructions:p.careInstructions||'',listingState:p.listingState||'published',size:p.size||[],light:p.light||[],occasion:p.occasion||[],theme:p.theme||[]};
  };
  const normalizeResponse=d=>{
    const modern=d.taxonomyVersion===2,types=modern?d.giftTypes:window.CBP_DEFAULT_GIFT_TYPES;
    if(!Array.isArray(types)||!types.length)throw Error('Gift types unavailable');
    const seen=new Set();types.forEach(t=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id)||seen.has(t.id)||typeof t.name!=='string'||typeof t.enabled!=='boolean')throw Error('Invalid gift types');seen.add(t.id);});
    d.products=d.products.map(p=>normalize(p,d.collectionSchema===1,types,modern));
    window.CBP_GIFT_TYPES=types;return d;
  };
  window.CBP_NORMALIZE_PRODUCT=normalize;
  const api=(window.CBP_CONFIG||{}).ORDER_API;
  const base=window.CBP_CATALOG||[];
  window.CBP_PRODUCT_URL=(p,prefix='')=>{let href=p.managed?`${prefix}products/item.html?id=${encodeURIComponent(p.id)}`:`${prefix}products/${p.id}.html`;if(location.pathname.includes('/collections/'))href+=(href.includes('?')?'&':'?')+'return='+encodeURIComponent(location.pathname+location.search);return href;};
  window.CBP_IMAGE=(url,width)=>{
    if(!url)return '';
    if(/^https?:\/\//i.test(url)){
      try{
        const u=new URL(url);
        if(u.hostname==='cdn.shopify.com'&&width)u.searchParams.set('width',width);
        return u.href;
      }catch{return url;}
    }
    try{
      let clean=url.replace(/^\/+/,'');
      if(clean.startsWith('assets/')){
        const siteMatch=location.href.match(/^(.*\/site\/)/);
        if(siteMatch)return new URL(clean,siteMatch[1]).href;
        const rootMatch=location.href.match(/^(https?:\/\/[^/]+\/)(?:collections\/|products\/)?/);
        if(rootMatch)return new URL(clean,rootMatch[1]).href;
      }
      return new URL(clean,location.href).href;
    }catch{return url;}
  };
  const cacheKey='cbp-published-catalog-v2';
  let response=null;
  window.CBP_CATALOG_STATE={online:false,complete:false};
  if(api){try{
    const r=await fetch(api+'?action=catalog',{signal:AbortSignal.timeout(12000)});
    const d=await r.json();
    if(!d.ok||!Array.isArray(d.products))throw Error('Catalogue unavailable');
    normalizeResponse(d);
    response=d;window.CBP_CATALOG_STATE={online:true,complete:d.schema===2};
    try{localStorage.setItem(cacheKey,JSON.stringify(d));}catch{}
  }catch{try{response=JSON.parse(localStorage.getItem(cacheKey));if(response?.products)normalizeResponse(response);}catch{response=null;}}}
  const overrides=response?.products||[];
  const complete=response?.schema===2;
  const map=new Map((complete?[]:base).map(p=>[p.id,normalize(p)]));
  overrides.forEach(p=>{if(!/^[a-z0-9-]+$/.test(p.id))return;if(p.visible===false)map.delete(p.id);else map.set(p.id,{...p,managed:true});});
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:';
  if(local&&window.CBP_CONFIG?.RESIN_ART_SAMPLES===true)(window.CBP_RESIN_SAMPLES||[]).forEach(p=>{if(!map.has(p.id))map.set(p.id,normalize(p));});
  window.CBP_CATALOG=[...map.values()];
  window.CBP_COLLECTIONS=Object.fromEntries(window.CBP_GIFT_TYPES.map(t=>[t.id,{name:t.name,url:'collections/all.html?giftType='+t.id}]));
  const featured=new Map((complete?[]:window.CBP_PRODUCTS||[]).map(p=>[p.id,normalize(p)]));
  overrides.forEach(p=>{featured.delete(p.id);if(p.visible!==false&&p.featured)featured.set(p.id,{...p,managed:true});});
  window.CBP_PRODUCTS=[...featured.values()];
  window.CBP_SHIPPING=response?.shipping;
  if(api&&!window.CBP_CATALOG_STATE.online){
    const notice=document.createElement('p');notice.className='catalog-notice';notice.setAttribute('role','status');
    notice.textContent='Product updates are temporarily unavailable. Your cart is safe; prices and availability will be checked before ordering.';
    document.querySelector('main')?.prepend(notice);
  }
  const requested=location.pathname.endsWith('/products/item.html')?new URLSearchParams(location.search).get('id'):null;
  if(location.pathname.endsWith('/products/item.html')&&!requested){window.CBP_PRODUCT=null;document.querySelector('main').textContent='Choose a gift from our collection to view its details.';return;}
  const id=requested||window.CBP_PRODUCT?.id;
  if(!id)return;
  const hidden=overrides.some(p=>p.id===id&&p.visible===false);
  const p=window.CBP_CATALOG.find(p=>p.id===id);
  if(hidden||(requested&&!p)){
    const main=document.querySelector('main');main.replaceChildren();const h=document.createElement('h1');h.textContent='This gift is unavailable';const a=document.createElement('a');a.href='../collections/all.html';a.textContent='Explore our other gifts';main.append(h,a);main.style.padding='60px 24px';window.CBP_PRODUCT=null;return;
  }
  if(p&&!p.managed){
    window.CBP_PRODUCT={...window.CBP_PRODUCT,...p};
    const collection=window.CBP_COLLECTIONS[p.collection]||{name:'Other gifts',url:'collections/all.html'};
    const crumb=document.querySelector('.crumbs li:nth-child(2) a');if(crumb){crumb.textContent=collection.name;crumb.href='../'+collection.url;}
    const back=document.createElement('a');back.className='link-arrow';back.textContent='Back to gifts';back.href=window.CBP_SAFE_RETURN(new URLSearchParams(location.search).get('return'))||'../'+collection.url;document.querySelector('.v2pdp__info')?.prepend(back);
    if(p.collection!=='miniature-frame'){
      document.querySelector('.v2story')?.remove();document.querySelector('.perso__photos')?.remove();
      document.querySelectorAll('.v2pdp__fields label').forEach(l=>{if(!l.querySelector('[name="message"]'))l.remove();});
      const tag=document.querySelector('.v2pdp__tag');if(tag)tag.textContent=collection.name;
      const bodies=document.querySelectorAll('.v2acc__body');
      if(bodies[0])bodies[0].textContent=p.name+'. Review the available options, then confirm your order details with the studio on WhatsApp.';
      const sections=document.querySelectorAll('.v2acc details');
      if(sections[2]){sections[2].querySelector('summary').textContent='Order confirmation';bodies[2].textContent='Submit your order request, then open WhatsApp and press Send. The studio will confirm availability, delivery and payment details.';}
      if(sections[4])sections[4].hidden=true;
    }
    return;
  }
  if(!p)return;
  window.CBP_PRODUCT=p;
  document.title=p.name+' | Craft by Payal';
  document.querySelector('#pdp-title').textContent=p.name;
  document.querySelectorAll('[data-wish]').forEach(el=>{if(el.closest('.v2pdp__info')){el.dataset.wish=p.id;el.setAttribute('aria-label','Save '+p.name+' to wishlist');}});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pImages=p.images?.length?p.images:[p.image,p.image2].filter(Boolean);
  document.querySelector('[data-track]').innerHTML=pImages.map((src,i)=>`<li class="gal__slide"><img src="${esc(window.CBP_IMAGE(src,900))}" alt="${esc(p.name)} — photo ${i+1}" width="900" height="840"></li>`).join('');
  document.querySelector('.gal__thumbs').innerHTML=pImages.map((src,i)=>`<li><button type="button" class="gal__thumb" data-thumb="${i}" aria-label="Show photo ${i+1}" ${i===0?'aria-current="true"':''}><img src="${esc(window.CBP_IMAGE(src,100))}" alt="" width="100" height="84"></button></li>`).join('');
  document.querySelector('.gal__count').innerHTML='<span data-gal-count>1</span> / '+pImages.length;
  const details=document.querySelectorAll('.v2acc__body');
  if(details[0])details[0].textContent=p.description;
  if(details[1])details[1].textContent='Available sizes: '+[...new Set(p.size)].join(', ')+'. Choose your size above.';
  const collection=(window.CBP_COLLECTIONS[p.collection]||{name:'Other gifts',url:'collections/all.html'});
  const back=document.createElement('a');back.className='link-arrow';back.textContent='Back to gifts';back.href=window.CBP_SAFE_RETURN(new URLSearchParams(location.search).get('return'))||'../'+collection.url;document.querySelector('.v2pdp__info').prepend(back);
  const crumb=document.querySelector('.crumbs li:nth-child(2) a');
  if(crumb){crumb.href='../'+collection.url;crumb.textContent=collection.name;}
  document.querySelector('.v2pdp__tag').textContent=p.productType||collection.name;
  if(p.collection!=='miniature-frame'){
    document.querySelector('.v2story')?.remove();
    document.querySelectorAll('.v2pdp__fields label').forEach(label=>{if(!label.querySelector('[name="message"]'))label.remove();});
    document.querySelector('.perso__photos')?.remove();
    const note=document.querySelector('[name="message"]');if(note)note.placeholder='Optional order notes';
    const trust=document.querySelector('.v2trust li:nth-child(2) span');if(trust)trust.textContent='Order details confirmed on WhatsApp';
    const sub=document.querySelector('.v2pdp__note');if(sub)sub.textContent='Availability and delivery details confirmed by the studio.';
    const sections=document.querySelectorAll('.v2acc details');
    if(sections[1]){sections[1].querySelector('summary').textContent='Dimensions & options';details[1].textContent=p.size.filter(s=>s!=='Standard').length?'Available options: '+[...new Set(p.size)].join(', '):'See product details for dimensions and pack contents.';}
    if(sections[2]){sections[2].querySelector('summary').textContent='Order confirmation';details[2].textContent='Submit your order request, then open WhatsApp and press Send. The studio will confirm availability, delivery and payment details.';}
    if(sections[3])details[3].textContent='Please review our Shipping Policy and Returns & Refunds pages. The studio confirms delivery details on WhatsApp.';
  }
  if(p.listingState==='preview'){const credit=document.createElement('a');credit.href=p.photoSource;credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Preview only · Photo by '+p.photoAuthor+' / Unsplash';document.querySelector('.v2pdp__info').append(credit);}
  const care=document.querySelectorAll('.v2acc details')[4];
  if(care){care.hidden=!p.careInstructions;if(p.careInstructions)care.querySelector('.v2acc__body').textContent=p.careInstructions;}
  const related=document.querySelector('.v2rel');
  if(related){
    const others=window.CBP_CATALOG.filter(q=>q.id!==p.id&&q.collection===p.collection).slice(0,4);
    related.hidden=!others.length;
    related.querySelector('.v2rel__all').href='../'+collection.url;
    related.querySelector('.v2rel__grid').innerHTML=others.map(q=>`<li class="v2rel__card"><a class="v2rel__img" href="${esc(window.CBP_PRODUCT_URL(q,'../'))}"><img src="${esc(window.CBP_IMAGE(q.image,400))}" alt="${esc(q.alt||q.name)}" loading="lazy" width="400" height="360"></a><h3 class="v2rel__name"><a href="${esc(window.CBP_PRODUCT_URL(q,'../'))}">${esc(q.name)}</a></h3><p class="v2rel__price">${(q.price===null?'Price to be confirmed':'₹'+Number(q.price).toLocaleString('en-IN'))}</p></li>`).join('');
  }
  const info=document.querySelector('.v2pdp__info');
  const desc=document.createElement('p');desc.textContent=p.description;desc.style.whiteSpace='pre-line';desc.style.margin='18px 0';info.querySelector('form').before(desc);
  document.querySelectorAll('.crumbs li:last-child,.breadcrumb li:last-child').forEach(el=>el.textContent=p.name);
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
})();

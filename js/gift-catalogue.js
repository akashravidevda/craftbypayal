/* Shared browsing model. Sheets remains authoritative for all orderable products. */
window.CBP_DEFAULT_GIFT_TYPES=[
  {id:'miniature-frame',name:'Miniature Frames',enabled:true,order:10},
  {id:'resin-art',name:'Resin Art',enabled:true,order:20},
  {id:'engagement-platter',name:'Engagement Platters',enabled:true,order:30},
  {id:'photo-hanging-frame',name:'Photo Hanging Frames',enabled:false,order:40},
  {id:'gift-hamper',name:'Gift Hampers',enabled:false,order:50}
];
window.CBP_GIFT_TYPES=window.CBP_DEFAULT_GIFT_TYPES.slice();
window.CBP_LEGACY_GIFT_TYPES={"miniature-frame":"miniature-frame","the-wedding-miniature-wall-design-1":"miniature-frame","mini-home":"miniature-frame","the-wedding-miniature-wall-design-5":"miniature-frame","his-happy-corner-miniature-wall":"miniature-frame","her-happy-corner-miniature-frame":"miniature-frame","celebration-miniature-wall-small":"miniature-frame","miniature-wall-small":"miniature-frame","classical-theme-miniature-frame":"miniature-frame","our-happy-family-miniature-wall":"miniature-frame","engagement-platter-copy":"engagement-platter","mothers-day-special-miniature-frame":"miniature-frame","mini-home-copy":"miniature-frame","3-partition-miniature-wall":"miniature-frame","heart-collage-miniature-wall":"miniature-frame","the-wedding-miniature-wall-design-4":"miniature-frame","teachers-miniature-wall":"miniature-frame","the-wedding-miniature-wall-small":"miniature-frame","2-partition-miniature-wall":"miniature-frame","the-celebration-miniature-wall":"miniature-frame","the-love-sofa-miniature-wall":"miniature-frame","corporate-theme-miniature-frame-1":"miniature-frame","baby-1-year-frame":"miniature-frame","the-wedding-miniature-wall-design-7":"miniature-frame","mothers-day-special-miniature-frame-copy":"miniature-frame","miniature-home-3-partition":"miniature-frame","the-wedding-miniature-wall-design-2":"miniature-frame","museum-of-us-miniature-wall":"miniature-frame","the-traveller-miniature-wall":"miniature-frame","baby-birth-detail-miniature-frame-newborn-gift":"miniature-frame","the-wedding-miniature-wall-design-6":"miniature-frame","baby-shower-miniature-wall":"miniature-frame","baby-nursery-miniature-wall":"miniature-frame","shadow-box-cum-key-holder":"miniature-frame","engagement-platter-design-3":"engagement-platter","graduation-day-miniature-wall":"miniature-frame","doctors-theme-miniature-frame":"miniature-frame","mini-library":"miniature-frame","miniature-home-2-partition":"miniature-frame","mini-home-christmas-theme":"miniature-frame","the-baker-special-miniature-wall":"miniature-frame","parents-to-be-miniature-wall":"miniature-frame","engagement-platter":"engagement-platter"};
window.CBP_TYPE_NAME=id=>window.CBP_GIFT_TYPES.find(t=>t.id===id)?.name||'Other gifts';
window.CBP_CAN_ORDER=p=>!!p&&p.listingState!=='preview'&&p.inStock===true&&Number.isFinite(p.price)&&p.price>0&&p.variants?.some(v=>v.available&&Number.isFinite(v.price)&&v.price>0);
window.CBP_SAFE_RETURN=value=>{
  try{const u=new URL(value,location.href);return u.origin===location.origin&&u.pathname.endsWith('/collections/all.html')?u.pathname+u.search:'';}catch{return '';}
};
window.CBP_GIFT_URL=(p,prefix='')=>prefix+'collections/all.html?giftType='+encodeURIComponent(p.collection);
window.CBP_GIFT_CARD=(p,i=0,prefix='')=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const preview=p.listingState==='preview',orderable=window.CBP_CAN_ORDER(p),multiple=p.variants?.filter(v=>v.available).length>1;
  const href=esc(window.CBP_PRODUCT_URL(p,prefix)),image=window.CBP_IMAGE(p.image,600),wish=window.CBP?.isWished(p.id)||false;
  const sizes=(p.size||[]).filter(v=>v!=='Standard');
  const sizeText=sizes.length?(sizes.length>1?sizes.length+' sizes':sizes[0]):p.productType||window.CBP_TYPE_NAME(p.collection);
  const lighting=p.collection==='miniature-frame'&&p.light?.includes('With light')?'<span class="m-light"><svg aria-hidden="true"><use href="#i-bulb"/></svg>Light option</span>':'';
  const label=multiple?'Choose options for '+p.name:'View details for '+p.name;
  const action=orderable&&!multiple
    ? `<button class="add-btn" type="button" data-add="${esc(p.id)}" aria-label="Add ${esc(p.name)} to cart"><svg aria-hidden="true"><use href="#i-cart"/></svg></button>`
    : preview||multiple?`<a class="add-btn" href="${href}" aria-label="${esc(label)}" title="${multiple?'Choose options':'View details'}"><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>`
    : '<span class="ccard__oos">Out of stock</span>';
  return `<li class="ccard">
    <a class="ccard__media" href="${href}" tabindex="-1" aria-hidden="true">
      ${preview?'<span class="ccard__badge">Preview only</span>':p.isNew?'<span class="ccard__badge">New</span>':''}
      <img src="${esc(image)}" alt="${esc(p.alt||p.name)}" width="400" height="448" ${i<4?'':'loading="lazy"'}>
      ${p.image2?`<img class="alt" src="${esc(window.CBP_IMAGE(p.image2,600))}" width="400" height="448" loading="lazy" alt="" aria-hidden="true">`:''}
    </a>
    <button class="ccard__wish" type="button" data-wish="${esc(p.id)}" aria-pressed="${wish}" aria-label="${wish?'Remove':'Add'} ${esc(p.name)} ${wish?'from':'to'} wishlist"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
    <div class="ccard__body">
      <h3 class="ccard__name"><a href="${href}">${esc(p.name)}</a></h3>
      <p class="ccard__meta"><span>${esc(sizeText)}</span>${lighting}</p>
      <div class="ccard__foot"><p class="ccard__price">${preview?'Price pending':(p.priceFrom?'<small>From</small>':'')+window.CBP.inr(p.price)}</p>${action}</div>
    </div>
  </li>`;
};

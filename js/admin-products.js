(() => {
  // Allow web admin dashboard to work seamlessly
  const $=s=>document.querySelector(s), form=$('#product-form'), dialog=$('#product-editor');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let products=[], loaded=false, editing=null, dirty=false, saving=false;
  const field=n=>form.elements.namedItem(n);
  const feedback=msg=>$('#product-feedback').textContent=msg;
  async function request(action,body){
    if(!API)throw Error('Connect your Google Sheets service before managing products.');
    const r=await fetch(body?API:API+'?action='+action+'&pw='+encodeURIComponent(OWNER_PW),body?{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({...body,action,pw:OWNER_PW}),signal:AbortSignal.timeout(25000)}:{signal:AbortSignal.timeout(15000)});
    const d=await r.json();if(!d.ok)throw Error(d.error||'The product service is unavailable. Update the Apps Script deployment to enable products.');return d;
  }
  async function load(){
    feedback('Loading your products…');$('#new-product').disabled=true;$('#reload-products').disabled=true;
    try{
      const d=await request('listProducts');if(!Array.isArray(d.products))throw Error('Update your Apps Script deployment to enable product management.');
      const map=new Map((window.CBP_CATALOG||[]).map(p=>[p.id,{...p,visible:true,featured:(window.CBP_PRODUCTS||[]).some(f=>f.id===p.id)}]));
      d.products.forEach(p=>map.set(p.id,p));products=[...map.values()];loaded=true;render();feedback('');
    }catch(e){feedback(e.message);}
    finally{$('#new-product').disabled=!loaded;$('#reload-products').disabled=false;}
  }
  document.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>{
    const isProducts=btn.dataset.section==='products';$('#products-section').hidden=!isProducts;$('#orders-section').hidden=isProducts;
    document.querySelectorAll('[data-section]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
    if(isProducts&&!loaded)load();
  }));
  function render(){
    const q=$('#product-search').value.trim().toLowerCase(),list=products.filter(p=>(p.name+' '+p.id).toLowerCase().includes(q));
    $('#product-count').textContent=list.length+' of '+products.length+' products';
    $('#product-list').innerHTML=list.length?list.map(p=>`<article class="owner-product"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><div class="owner-product__details"><h2>${esc(p.name)}</h2><p>${esc(p.id)}</p><strong>₹${Number(p.price).toLocaleString('en-IN')}</strong></div><div class="product-state"><span class="badge ${p.visible===false?'b-cancelled':p.inStock?'b-approved':'b-pending'}">${p.visible===false?'Hidden':p.inStock?'In stock':'Out of stock'}</span>${p.featured?'<small>Home page favourite</small>':''}</div><button type="button" class="btn-outline" data-edit="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">Edit product</button></article>`).join(''):'<div class="product-no-results">No products found. Try another name or add your first creation.</div>';
  }
  function addVariant(v={size:'Standard',light:'',price:'',available:true}){
    const row=document.createElement('div');row.className='variant-row';row.innerHTML=`<label>Size<input data-v="size" required maxlength="100" value="${esc(v.size||'Standard')}"></label><label>Lighting<input data-v="light" maxlength="100" value="${esc(v.light||'')}" placeholder="Optional"></label><label>Price (₹)<input data-v="price" type="number" min="0.01" max="1000000" step="0.01" required value="${esc(v.price)}"></label><label class="editor-check"><input data-v="available" type="checkbox" ${v.available?'checked':''}> In stock</label><button type="button" class="btn-ghost" data-remove-variant aria-label="Remove variant">Remove</button>`;$('#variant-rows').append(row);
  }
  function open(p=null){
    editing=p;form.reset();$('#editor-error').textContent='';$('#editor-title').textContent=p?'Edit product':'Add a product';
    ['id','name','description'].forEach(k=>field(k).value=p?.[k]||'');field('id').readOnly=!!p;
    field('images').value=(p?.images||[p?.image,p?.image2].filter(Boolean)).join('\n');
    ['occasion','theme'].forEach(k=>field(k).value=(p?.[k]||[]).join(', '));
    field('visible').checked=p?.visible!==false;field('featured').checked=p?.featured===true;
    $('#variant-rows').replaceChildren();(p?.variants?.length?p.variants:[{size:'Standard',light:'',price:p?.price||'',available:p?.inStock!==false}]).forEach(addVariant);
    dirty=false;preview();dialog.showModal();field('name').focus();
  }
  function preview(){
    $('#preview-name').textContent=field('name').value||'Your next little creation';
    const src=field('images').value.trim().split('\n')[0],img=$('#product-preview');const valid=/^https:\/\//.test(src);
    img.hidden=!valid;$('#preview-placeholder').hidden=valid;if(valid&&img.getAttribute('src')!==src)img.src=src;
    const prices=[...$('#variant-rows').querySelectorAll('[data-v="price"]')].map(el=>Number(el.value)).filter(p=>p>0);$('#preview-price').textContent=prices.length?'From ₹'+Math.min(...prices).toLocaleString('en-IN'):'';
  }
  $('#product-preview').addEventListener('error',()=>{$('#product-preview').hidden=true;$('#preview-placeholder').hidden=false;$('#preview-placeholder').textContent='Photo could not load. Check that the link opens a public image.';});
  function close(){if(saving)return;if(dirty&&!confirm('Discard unsaved product changes?'))return;dialog.close();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  $('#close-editor').onclick=close;$('#cancel-product').onclick=close;$('#new-product').onclick=()=>open();$('#reload-products').onclick=load;$('#product-search').oninput=render;
  $('#product-list').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)open(products.find(p=>p.id===b.dataset.edit));});
  $('#add-variant').onclick=()=>{if($('#variant-rows').children.length>=40)return;addVariant();dirty=true;};
  $('#variant-rows').addEventListener('click',e=>{if(e.target.closest('[data-remove-variant]')&&$('#variant-rows').children.length>1){e.target.closest('.variant-row').remove();dirty=true;preview();}});
  form.addEventListener('input',e=>{dirty=true;if(e.target===field('name')&&!editing){field('id').value=field('name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}preview();});
  window.addEventListener('beforeunload',e=>{if(dirty&&dialog.open){e.preventDefault();e.returnValue='';}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(saving)return;
    const product={id:field('id').value,name:field('name').value.trim(),description:field('description').value.trim(),images:field('images').value.split('\n').map(s=>s.trim()).filter(Boolean),visible:field('visible').checked,featured:field('featured').checked,created:editing?.created};
    ['occasion','theme'].forEach(k=>product[k]=field(k).value.split(',').map(s=>s.trim()).filter(Boolean));
    product.variants=[...$('#variant-rows').children].map(row=>({size:row.querySelector('[data-v="size"]').value.trim(),light:row.querySelector('[data-v="light"]').value.trim(),price:Number(row.querySelector('[data-v="price"]').value),available:row.querySelector('[data-v="available"]').checked}));
    if(product.images.length<1||product.images.length>8||product.images.some(u=>!/^https:\/\/[^\s<>"']+$/.test(u))){$('#editor-error').textContent='Add one to eight public HTTPS image URLs.';return;}
    if(!editing&&products.some(p=>p.id===product.id)){$('#editor-error').textContent='That product ID already exists. Choose another.';return;}
    saving=true;$('#editor-error').textContent='';const btn=$('#save-product');btn.disabled=true;btn.textContent='Saving…';
    // Freeze all fields so the saved version matches what the owner submitted.
    const enabled=[...form.elements].filter(el=>!el.disabled);enabled.forEach(el=>el.disabled=true);
    try{const d=await request('saveProduct',{product,create:!editing,updated:editing?.updated});if(!d.product)throw Error('The product service did not confirm the save. Update the Apps Script deployment.');const i=products.findIndex(p=>p.id===d.product.id);if(i<0)products.unshift(d.product);else products[i]=d.product;dirty=false;dialog.close();render();feedback(product.name+' saved. '+(product.visible?'Changes will appear when the shop is refreshed.':'This product is hidden from the shop.'));}
    catch(e){$('#editor-error').textContent=e.message;}
    finally{saving=false;enabled.forEach(el=>el.disabled=false);btn.disabled=false;btn.textContent='Save product';}
  });
})();

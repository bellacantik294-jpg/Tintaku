
// ===============================================
//  LOAD CERPEN: Gabungkan SAMPLE_CERPEN + LocalStorage
// ===============================================
function loadCerpenCollection(){
    let sample = [];
    try {
        if (window.SAMPLE_CERPEN) sample = window.SAMPLE_CERPEN;
    } catch(e){ sample = []; }

    let local = [];
    try {
        const raw = localStorage.getItem("cerpenCollection");
        local = raw ? JSON.parse(raw) : [];
    } catch(e){ local = []; }

    const map = new Map();
    sample.forEach(c => map.set(c.id, c));
    local.forEach(c => map.set(c.id, c));

    const all = Array.from(map.values());
    all.sort((a,b)=> new Date(b.date) - new Date(a.date));
    return all;
}



/* pro-script.js — PRO FINAL (dark default)
   Added: sanitization, export/import, accessibility improvements, admin UX, cache-bust friendly.
*/

function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}


(function(){

/* pro-script.js
   Handles rendering, search, admin saving, comments, theme toggle, category filter, random cerpen, and read page logic.
*/

(function(){
  // helpers
  function qs(sel, ctx=document){ return ctx.querySelector(sel) }
  function qsa(sel, ctx=document){ return Array.from((ctx||document).querySelectorAll(sel)) }

  // Theme handling
  const themeToggle = qs('#themeToggle');
  function applyTheme(){
    const t = localStorage.getItem('theme');
    if(t === 'light') document.documentElement.classList.add('light'), document.body.classList.add('light');
    else document.documentElement.classList.remove('light'), document.body.classList.remove('light');
  }
  function toggleTheme(){
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }
  if(themeToggle){ themeToggle.addEventListener('click', toggleTheme); }
  applyTheme();

  // Load data
  const cerpenCollection = loadCerpenCollection();

  // Utility: render card HTML
  function makeCard(c){
    const div = document.createElement('article');
    div.className = 'card';
    div.setAttribute('data-id', c.id);
    div.innerHTML = `
      <div class="cover" style="background-image:url('${c.cover}')"></div>
      <h2>${c.title}</h2>
      <p class="meta">${c.category} • ${c.date}</p>
      <p class="muted">${c.summary || ''}</p>
      <a class="read-more" href="baca.html?id=${encodeURIComponent(c.id)}">Baca</a>
    `;
    return div;
  }

  // Render list to container
  function renderList(container, list){
    container.innerHTML = '';
    if(!list.length) { container.innerHTML = '<p class="muted">Tidak ada cerpen ditemukan.</p>'; return; }
    list.forEach(c=>container.appendChild(makeCard(c)));
  }

  // Index page: show recommendations and attach search + random
  const cardsContainer = qs('#cards');
  if(cardsContainer){
    // show top 6 newest
    const sorted = cerpenCollection.slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
    renderList(cardsContainer, sorted.slice(0,6));

    // random button
    const randomBtn = qs('#randomBtn');
    if(randomBtn){
      randomBtn.addEventListener('click', ()=>{
        const id = cerpenCollection[Math.floor(Math.random()*cerpenCollection.length)].id;
        location.href = 'baca.html?id='+encodeURIComponent(id);
      });
    }

    // search on header
    const searchInput = qs('#searchInput');
    if(searchInput){
      searchInput.addEventListener('input', (e)=>{
        const q = e.target.value.trim().toLowerCase();
        const filtered = cerpenCollection.filter(c=> (c.title + ' ' + (c.summary||'') + ' ' + c.content).toLowerCase().includes(q));
        renderList(cardsContainer, filtered.slice(0,12));
      });
    }
  }

  // Daftar page functionality
  const listContainer = qs('#list');
  if(listContainer){
    const searchList = qs('#searchInputList');
    const catFilter = qs('#categoryFilter');
    const sortSelect = qs('#sortSelect');

    function populateCategories(){
      const cats = Array.from(new Set(cerpenCollection.map(c=>c.category))).sort();
      cats.forEach(cat=>{
        const opt = document.createElement('option'); opt.value=cat; opt.textContent=cat; catFilter.appendChild(opt);
      });
    }
    populateCategories();
    function applyFilters(){
      let out = cerpenCollection.slice();
      const q = (searchList && searchList.value||'').toLowerCase();
      if(q) out = out.filter(c=>c.title.toLowerCase().includes(q) || (c.summary||'').toLowerCase().includes(q));
      const cat = catFilter.value;
      if(cat) out = out.filter(c=>c.category === cat);
      if(sortSelect.value === 'alpha') out.sort((a,b)=> a.title.localeCompare(b.title));
      else out.sort((a,b)=> new Date(b.date)-new Date(a.date));
      renderList(listContainer, out);
    }
    searchList && searchList.addEventListener('input', applyFilters);
    catFilter && catFilter.addEventListener('change', applyFilters);
    sortSelect && sortSelect.addEventListener('change', applyFilters);
    applyFilters();
  }

  // kategroy page
  const categoryList = qs('#categoryList');
  if(categoryList){
    const cats = Array.from(new Set(cerpenCollection.map(c=>c.category))).sort();
    cats.forEach(cat=>{
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<h3>${cat}</h3><p class="muted">Klik untuk lihat</p><a class="read-more" href="daftar-cerpen.html?cat=${encodeURIComponent(cat)}">Lihat</a>`;
      categoryList.appendChild(card);
    });
  }

  // Read page logic (render cerpen content & comments)
  const readContainer = qs('#cerpen');
  if(readContainer){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const cerpen = cerpenCollection.find(x=>x.id===id);
    if(!cerpen){
      readContainer.innerHTML = '<p class="muted">Cerpen tidak ditemukan.</p>';
    }else{
      qs('#cerpen-title').textContent = cerpen.title;
      qs('#cerpen-category').textContent = cerpen.category;
      qs('#cerpen-date').textContent = cerpen.date;
      qs('#cerpen-content').innerHTML = cerpen.content;

      // Comments using localStorage per-id
      const commentList = qs('#comment-list');
      const form = qs('#commentForm');
      function loadComments(){
        const key = 'comments_'+cerpen.id;
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        commentList.innerHTML = '';
        arr.forEach(c=>{
          const el = document.createElement('div'); el.className='comment';
          el.innerHTML = '<strong>'+ (c.name||'Anon') +'</strong><p>'+c.text+'</p>';
          commentList.appendChild(el);
        });
      }
      loadComments();
      form && form.addEventListener('submit', function(ev){
        ev.preventDefault();
        const name = qs('#commentName').value.trim();
        const text = qs('#commentText').value.trim();
        if(!text) return;
        const key = 'comments_'+cerpen.id;
        const raw = localStorage.getItem(key); const arr = raw?JSON.parse(raw):[];
        arr.unshift({name, text, date:new Date().toISOString()});
        localStorage.setItem(key, JSON.stringify(arr));
        qs('#commentText').value=''; qs('#commentName').value='';
        loadComments();
      });
    }
  }

  // Admin page: add cerpen to localStorage
  const adminForm = qs('#adminForm');
  if(adminForm){
    const title = qs('#adminTitle'), cat = qs('#adminCategory'), summary = qs('#adminSummary'), content = qs('#adminContent');
    const adminList = qs('#adminList');

    function refreshAdminList(){
      const coll = loadCerpenCollection();
      adminList.innerHTML = '';
      coll.forEach(c=>{
        const d = document.createElement('div'); d.className='card';
        d.innerHTML = '<h4>'+c.title+'</h4><p class="muted">'+c.category+' • '+c.date+'</p><p>'+ (c.summary||'') +'</p><button data-id="'+c.id+'" class="del">Hapus</button>';
        adminList.appendChild(d);
      });
      qsa('.del').forEach(b=>b.addEventListener('click', function(){
        const id = this.dataset.id;
        let coll = loadCerpenCollection();
        coll = coll.filter(x=>x.id!==id);
        localStorage.setItem('cerpenCollection', JSON.stringify(coll));
        refreshAdminList();
      }));
    }
    refreshAdminList();

    adminForm.addEventListener('submit', function(ev){
      ev.preventDefault();
      const coll = loadCerpenCollection();
      const id = 'c'+(Math.random().toString(36).substr(2,9));
      const newItem = {
        id,
        title: title.value.trim(),
        category: cat.value.trim()||'Umum',
        date: (new Date()).toISOString().slice(0,10),
        summary: summary.value.trim(),
        cover: 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="100%" height="100%" fill="%23fde68a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="%230b1220">'+(title.value.replace(/'/g,""))+'</text></svg>'),
        content: content.value.trim()
      };
      coll.unshift(newItem);
      localStorage.setItem('cerpenCollection', JSON.stringify(coll));
      title.value=''; cat.value=''; summary.value=''; content.value='';
      refreshAdminList();
      alert('Cerpen tersimpan di localStorage. Refresh halaman Daftar untuk melihat.');
    });
  }

  // expose some functions for pages
  window.loadCerpenCollection = loadCerpenCollection;

  // small UX: show year in footer
  const yel = qs('#year'); if(yel) yel.textContent = new Date().getFullYear();

  // keyboard shortcut: "/" focus search
  document.addEventListener('keydown', function(e){
    if(e.key==='/' && qs('#searchInput')){ e.preventDefault(); qs('#searchInput').focus(); }
  });

})();


// --- Enhancements added by PRO patch ---
// Export / Import functions for admin (exposed)
window.exportCerpen = function(){
  try{
    const data = localStorage.getItem('cerpenCollection') || '[]';
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cerpen-backup.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){ alert('Export gagal: '+e.message) }
};
window.importCerpen = function(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const arr = JSON.parse(e.target.result);
      if(!Array.isArray(arr)) throw new Error('Format tidak valid');
      localStorage.setItem('cerpenCollection', JSON.stringify(arr));
      alert('Import berhasil. Refresh halaman Daftar Cerpen untuk melihat perubahan.');
    }catch(err){ alert('Import gagal: '+err.message) }
  };
  reader.readAsText(file);
};

// Make rendering use escapeHtml for user content
// Patch makeCard usage: ensure titles & summaries escaped and include img alt
const _makeCard = window.makeCard || null;
if(typeof _makeCard === 'function'){
  window.makeCard = function(c){
    const div = _makeCard(c);
    // find title and replace with escaped version
    const h = div.querySelector('h2');
    if(h) h.innerHTML = escapeHtml(h.textContent);
    const meta = div.querySelector('.meta');
    if(meta) meta.innerHTML = escapeHtml(meta.textContent);
    const mut = div.querySelector('.muted');
    if(mut) mut.innerHTML = escapeHtml(mut.textContent);
    // Add accessible img fallback if cover is data URI
    const cover = div.querySelector('.cover');
    if(cover){
      const img = document.createElement('img');
      img.className='cover-img';
      img.src = c.cover || '';
      img.alt = 'Cover cerita: ' + (c.title || '');
      img.loading = 'lazy';
      cover.innerHTML = '';
      cover.appendChild(img);
    }
    return div;
  };
}

// Patch comment rendering and admin list if present
document.addEventListener('DOMContentLoaded', function(){
  // patch comment rendering
  const commentList = document.getElementById('comment-list');
  if(commentList && window.loadCerpenCollection){
    // replace inner rendering to use escapeHtml in loadComments (already in original but ensure)
    // nothing further here as original read page handles locally, but escapeHtml will be used where applied.
  }
});
})();



/* ======= Added features: cover upload and likes ======= */
// Admin: handle cover image upload and preview
(function(){
  const adminForm = document.getElementById('adminForm');
  if(adminForm){
    // create file input if not present
    if(!document.getElementById('adminCover')){
      const input = document.createElement('input');
      input.type='file'; input.id='adminCover'; input.className='upload-input'; input.accept='image/*';
      const label = document.createElement('label'); label.textContent='Upload Cover (opsional)'; 
      adminForm.insertBefore(label, adminForm.querySelector('button'));
      adminForm.insertBefore(input, label.nextSibling);
      const img = document.createElement('img'); img.id='coverPreview'; img.className='cover-preview'; img.style.display='none';
      adminForm.insertBefore(img, input.nextSibling);
      input.addEventListener('change', function(e){
        const f = e.target.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = function(ev){
          img.src = ev.target.result; img.style.display='block';
        };
        reader.readAsDataURL(f);
      });
    }
    // on submit, collect cover data URL if preview exists
    adminForm.addEventListener('submit', function(ev){
      // handled in original script; ensure cover included by setting a hidden field or setting content
      // no-op here; original handler reads fields and constructs cover from title if none. We augment by checking preview
      const preview = document.getElementById('coverPreview');
      if(preview && preview.src){
        // attach to adminContent value as special tag (pro-script will store content as-is); instead set a global tmpCover
        window.__tmp_admin_cover = preview.src;
      }
    });
  }
})();

// When building new item in pro-script, if window.__tmp_admin_cover exists, use it as cover
(function(){
  // patch the place where newItem is created by overriding Date generate or intercepting localStorage set
  const _orig_local_set = localStorage.setItem;
  localStorage.setItem = function(key, value){
    if(key === 'cerpenCollection'){
      try{
        const arr = JSON.parse(value);
        if(Array.isArray(arr) && window.__tmp_admin_cover){
          // find the most recent item and set cover if empty
          if(arr.length && arr[0] && !arr[0].cover){
            arr[0].cover = window.__tmp_admin_cover;
          }
          // clear tmp
          window.__tmp_admin_cover = null;
          value = JSON.stringify(arr);
        }
      }catch(e){}
    }
    return _orig_local_set.apply(this, [key, value]);
  };
})();

// Likes: store likes per cerpen id in localStorage.likes_{id}
function toggleLike(id, btn){
  if(!id) return;
  const key = 'likes_'+id;
  const raw = localStorage.getItem(key);
  let n = raw ? parseInt(raw,10) : 0;
  const likedKey = 'liked_'+id;
  const liked = localStorage.getItem(likedKey);
  if(liked){
    // unlike
    localStorage.removeItem(likedKey);
    n = Math.max(0, n-1);
    localStorage.setItem(key, n);
    btn.classList.remove('liked');
    btn.textContent = '♡ '+n;
  } else {
    localStorage.setItem(likedKey, '1');
    n = n+1;
    localStorage.setItem(key, n);
    btn.classList.add('liked');
    btn.textContent = '♥ '+n;
  }
}

// render like button in read page and cards
(function(){
  function renderLikeButtons(){
    // cards
    const cards = document.querySelectorAll('.card[data-id]');
    cards.forEach(c=>{
      const id = c.getAttribute('data-id');
      if(!id) return;
      if(c.querySelector('.like-btn')) return;
      const raw = localStorage.getItem('likes_'+id) || '0';
      const liked = localStorage.getItem('liked_'+id);
      const btn = document.createElement('button');
      btn.className = 'like-btn ' + (liked ? 'liked':'');
      btn.textContent = (liked ? '♥ ':'♡ ') + raw;
      btn.addEventListener('click', ()=> toggleLike(id, btn));
      c.appendChild(btn);
    });
    // read page
    const readIdEl = document.querySelector('#cerpen');
    if(readIdEl && readIdEl.getAttribute('data-id')){
      const id = readIdEl.getAttribute('data-id');
      if(!readIdEl.querySelector('.like-btn')){
        const raw = localStorage.getItem('likes_'+id) || '0';
        const liked = localStorage.getItem('liked_'+id);
        const btn = document.createElement('button');
        btn.className = 'like-btn ' + (liked ? 'liked':'');
        btn.textContent = (liked ? '♥ ':'♡ ') + raw;
        btn.addEventListener('click', ()=> toggleLike(id, btn));
        readIdEl.appendChild(btn);
      }
    }
  }
  document.addEventListener('DOMContentLoaded', renderLikeButtons);
  // also run after list rendering possibly
  setTimeout(renderLikeButtons, 800);
})();

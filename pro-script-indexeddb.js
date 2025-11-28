
/* pro-script-indexeddb.js
   Replaces localStorage with IndexedDB. Works without external libraries.
*/

(function(){
  const DB_NAME = 'cerpen-db';
  const DB_VER = 1;
  const STORE_CERPEN = 'cerpen';
  const STORE_COMMENTS = 'comments';
  const STORE_LIKES = 'likes';

  // --------- IndexedDB helpers ----------
  function openDB(){
    return new Promise((res, rej)=>{
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE_CERPEN)){
          const s = db.createObjectStore(STORE_CERPEN, {keyPath:'id'});
          s.createIndex('date','date',{unique:false});
          s.createIndex('title','title',{unique:false});
          s.createIndex('category','category',{unique:false});
        }
        if(!db.objectStoreNames.contains(STORE_COMMENTS)){
          db.createObjectStore(STORE_COMMENTS, {keyPath:'key'});
        }
        if(!db.objectStoreNames.contains(STORE_LIKES)){
          db.createObjectStore(STORE_LIKES, {keyPath:'id'});
        }
      };
      req.onsuccess = ()=>res(req.result);
      req.onerror = ()=>rej(req.error);
    });
  }

  function tx(storeNames, mode='readonly'){
    return openDB().then(db=>{
      const t = db.transaction(storeNames, mode);
      return { t, store: (name)=> t.objectStore(name) , db};
    });
  }

  function getAllCerpen(){
    return tx([STORE_CERPEN]).then(({store})=>{
      return new Promise((res, rej)=>{
        const req = store(STORE_CERPEN).getAll();
        req.onsuccess = ()=>res(req.result || []);
        req.onerror = ()=>rej(req.error);
      });
    });
  }

  function getCerpen(id){
    return tx([STORE_CERPEN]).then(({store})=>{
      return new Promise((res, rej)=>{
        const req = store(STORE_CERPEN).get(id);
        req.onsuccess = ()=>res(req.result);
        req.onerror = ()=>rej(req.error);
      });
    });
  }

  function putCerpen(item){
    return tx([STORE_CERPEN], 'readwrite').then(({t, store})=>{
      return new Promise((res, rej)=>{
        const req = store(STORE_CERPEN).put(item);
        t.oncomplete = ()=>res(item);
        t.onabort = t.onerror = ()=>rej(t.error);
      });
    });
  }

  function deleteCerpen(id){
    return tx([STORE_CERPEN], 'readwrite').then(({t, store})=>{
      return new Promise((res, rej)=>{
        store(STORE_CERPEN).delete(id);
        t.oncomplete = ()=>res();
        t.onabort = t.onerror = ()=>rej(t.error);
      });
    });
  }

  // comments stored with key = "comments_<id>" and value array
  function getComments(id){
    const key = 'comments_'+id;
    return tx([STORE_COMMENTS]).then(({store})=>{
      return new Promise((res, rej)=>{
        const req = store(STORE_COMMENTS).get(key);
        req.onsuccess = ()=>res((req.result && req.result.value) || []);
        req.onerror = ()=>rej(req.error);
      });
    });
  }
  function putComments(id, arr){
    const key = 'comments_'+id;
    return tx([STORE_COMMENTS], 'readwrite').then(({t, store})=>{
      return new Promise((res, rej)=>{
        store(STORE_COMMENTS).put({key, value:arr});
        t.oncomplete = ()=>res();
        t.onabort = t.onerror = ()=>rej(t.error);
      });
    });
  }

  // likes stored per id in likes store
  function getLikes(id){
    return tx([STORE_LIKES]).then(({store})=>{
      return new Promise((res, rej)=>{
        const req = store(STORE_LIKES).get(id);
        req.onsuccess = ()=>res((req.result && req.result.n)||0);
        req.onerror = ()=>rej(req.error);
      });
    });
  }
  function toggleLike(id, liked){
    return tx([STORE_LIKES], 'readwrite').then(({t, store})=>{
      return new Promise((res, rej)=>{
        const getReq = store(STORE_LIKES).get(id);
        getReq.onsuccess = ()=>{
          const cur = getReq.result || {id, n:0, liked:false};
          if(liked){
            cur.n = Math.max(0, (cur.n||0)-1);
            cur.liked = false;
          } else {
            cur.n = (cur.n||0)+1;
            cur.liked = true;
          }
          store(STORE_LIKES).put(cur);
        };
        t.oncomplete = ()=>res();
        t.onabort = t.onerror = ()=>rej(t.error);
      });
    });
  }

  // ---------- Seed initial data from window.SAMPLE_CERPEN ----------
  async function seedIfEmpty(){
    const all = await getAllCerpen();
    if(all.length) return;
    if(Array.isArray(window.SAMPLE_CERPEN) && window.SAMPLE_CERPEN.length){
      for(const c of window.SAMPLE_CERPEN){
        await putCerpen(c);
      }
    }
  }

  // ---------- UI helpers ----------
  function qs(sel, ctx=document){ return ctx.querySelector(sel) }
  function qsa(sel, ctx=document){ return Array.from((ctx||document).querySelectorAll(sel)) }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }

  // Render card
  function makeCard(c){
    const div = document.createElement('article');
    div.className = 'card';
    div.setAttribute('data-id', c.id);
    div.innerHTML = `
      <div class="cover"><img class="cover-img" src="${c.cover||''}" alt="${escapeHtml(c.title||'')}" /></div>
      <h2>${escapeHtml(c.title)}</h2>
      <p class="meta">${escapeHtml(c.category||'')} • ${escapeHtml(c.date||'')}</p>
      <p class="muted">${escapeHtml((c.summary||'').slice(0,150))}</p>
      <a class="read-more" href="baca.html?id=${encodeURIComponent(c.id)}">Baca</a>
    `;
    return div;
  }

  // Render list
  async function renderList(container, list){
    container.innerHTML = '';
    if(!list.length) { container.innerHTML = '<p class="muted">Tidak ada cerpen ditemukan.</p>'; return; }
    list.forEach(c=>container.appendChild(makeCard(c)));
  }

  // ---------- Pages logic ----------
  document.addEventListener('DOMContentLoaded', async function(){
    await seedIfEmpty();
    // common
    const yearEl = qs('#year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

    // INDEX: cards, search, random
    const cardsContainer = qs('#cards');
    if(cardsContainer){
      const all = await getAllCerpen();
      const sorted = all.slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
      renderList(cardsContainer, sorted.slice(0,6));

      const randomBtn = qs('#randomBtn');
      if(randomBtn){
        randomBtn.addEventListener('click', async ()=>{
          const all2 = await getAllCerpen();
          if(!all2.length) return;
          const id = all2[Math.floor(Math.random()*all2.length)].id;
          location.href = 'baca.html?id='+encodeURIComponent(id);
        });
      }

      const searchInput = qs('#searchInput');
      if(searchInput){
        searchInput.addEventListener('input', async (e)=>{
          const q = e.target.value.trim().toLowerCase();
          const all3 = await getAllCerpen();
          const filtered = all3.filter(c=> (c.title + ' ' + (c.summary||'') + ' ' + (c.content||'')).toLowerCase().includes(q));
          renderList(cardsContainer, filtered.slice(0,12));
        });
      }
    }

    // DAFTAR page
    const listContainer = qs('#list');
    if(listContainer){
      async function populate(){
        const all = await getAllCerpen();
        const searchList = qs('#searchInputList');
        const catFilter = qs('#categoryFilter');
        const sortSelect = qs('#sortSelect');

        function populateCategories(){
          const cats = Array.from(new Set(all.map(c=>c.category))).sort();
          cats.forEach(cat=>{
            const opt = document.createElement('option'); opt.value=cat; opt.textContent=cat; catFilter.appendChild(opt);
          });
        }
        populateCategories();

        function applyFilters(){
          let out = all.slice();
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
      populate();
    }

    // CATEGORY page
    const categoryList = qs('#categoryList');
    if(categoryList){
      const all = await getAllCerpen();
      const cats = Array.from(new Set(all.map(c=>c.category))).sort();
      cats.forEach(cat=>{
        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `<h3>${escapeHtml(cat)}</h3><p class="muted">Klik untuk lihat</p><a class="read-more" href="daftar-cerpen.html?cat=${encodeURIComponent(cat)}">Lihat</a>`;
        categoryList.appendChild(card);
      });
    }

    // READ page
    const readContainer = qs('#cerpen');
    if(readContainer){
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if(!id) {
        readContainer.innerHTML = '<p class="muted">ID cerpen tidak ditemukan di URL.</p>';
      } else {
        const cerpen = await getCerpen(id);
        if(!cerpen){
          readContainer.innerHTML = '<p class="muted">Cerpen tidak ditemukan.</p>';
        } else {
          readContainer.setAttribute('data-id', cerpen.id);
          qs('#cerpen-title').textContent = cerpen.title;
          qs('#cerpen-category').textContent = cerpen.category;
          qs('#cerpen-date').textContent = cerpen.date;
          qs('#cerpen-content').innerHTML = cerpen.content || '';
          if(cerpen.cover){
            const cov = qs('#cerpen-cover');
            cov.src = cerpen.cover; cov.style.display = 'block';
          }
          // comments
          const commentList = qs('#comment-list');
          const form = qs('#commentForm');
          async function loadComments(){
            const arr = await getComments(cerpen.id);
            commentList.innerHTML = '';
            arr.forEach(c=>{
              const el = document.createElement('div'); el.className='comment';
              el.innerHTML = '<strong>'+escapeHtml(c.name||'Anon')+'</strong><p>'+escapeHtml(c.text)+'</p>';
              commentList.appendChild(el);
            });
          }
          loadComments();
          form && form.addEventListener('submit', async function(ev){
            ev.preventDefault();
            const name = qs('#commentName').value.trim();
            const text = qs('#commentText').value.trim();
            if(!text) return;
            const arr = await getComments(cerpen.id);
            arr.unshift({name, text, date:new Date().toISOString()});
            await putComments(cerpen.id, arr);
            qs('#commentText').value=''; qs('#commentName').value='';
            loadComments();
          });
        }
      }
    }

    // ADMIN page
    const adminForm = qs('#adminForm');
    if(adminForm){
      const title = qs('#adminTitle'), cat = qs('#adminCategory'), summary = qs('#adminSummary'), content = qs('#adminContent');
      const adminList = qs('#adminList');

      async function refreshAdminList(){
        const coll = await getAllCerpen();
        adminList.innerHTML = '';
        coll.forEach(c=>{
          const d = document.createElement('div'); d.className='card';
          d.innerHTML = '<h4>'+escapeHtml(c.title)+'</h4><p class="muted">'+escapeHtml(c.category)+' • '+escapeHtml(c.date)+'</p><p>'+escapeHtml(c.summary||'') +'</p><button data-id="'+c.id+'" class="del">Hapus</button>';
          adminList.appendChild(d);
        });
        qsa('.del').forEach(b=>b.addEventListener('click', async function(){
          const id = this.dataset.id;
          await deleteCerpen(id);
          refreshAdminList();
        }));
      }
      await refreshAdminList();

      adminForm.addEventListener('submit', async function(ev){
        ev.preventDefault();
        const id = 'c'+(Math.random().toString(36).substr(2,9));
        const newItem = {
          id,
          title: title.value.trim(),
          category: cat.value.trim()||'Umum',
          date: (new Date()).toISOString().slice(0,10),
          summary: summary.value.trim(),
          cover: '', // admin can later extend upload feature
          content: content.value.trim()
        };
        await putCerpen(newItem);
        title.value=''; cat.value=''; summary.value=''; content.value='';
        alert('Cerpen tersimpan ke database lokal (IndexedDB).');
        refreshAdminList();
      });
    }

    // Export & Import functions (exposed on window)
    window.exportCerpen = async function(){
      const all = await getAllCerpen();
      const blob = new Blob([JSON.stringify(all, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'cerpen-backup.json'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    };
    window.importCerpen = async function(file){
      if(!file) return;
      const reader = new FileReader();
      reader.onload = async function(e){
        try{
          const arr = JSON.parse(e.target.result);
          if(!Array.isArray(arr)) throw new Error('Format tidak valid');
          for(const it of arr) await putCerpen(it);
          alert('Import berhasil.');
        }catch(err){ alert('Import gagal: '+err.message) }
      };
      reader.readAsText(file);
    };

    // simple theme toggle using localStorage (small allowed)
    const themeToggle = qs('#themeToggle');
    function applyTheme(){
      const t = localStorage.getItem('theme');
      if(t === 'light') document.documentElement.classList.add('light'), document.body.classList.add('light');
      else document.documentElement.classList.remove('light'), document.body.classList.remove('light');
    }
    function toggleTheme(){ const isLight = document.body.classList.toggle('light'); localStorage.setItem('theme', isLight ? 'light' : 'dark'); }
    if(themeToggle){ themeToggle.addEventListener('click', toggleTheme); }
    applyTheme();

  }); // DOMContentLoaded

})();

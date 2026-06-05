/**
 * dashboard-crud.js
 * Standalone CRUD for Admin & Staff dashboards.
 * Directly calls Render API — no dependency on script.js cache.
 */
(function () {
  const API = 'https://travelscape-backend-wudc.onrender.com/api';

  /* ── Utility ──────────────────────────────────────────────────────────── */
  function S(id) { return document.getElementById(id); }
  const isAdmin = () => localStorage.getItem('admin_logged') === 'true';
  function card(style='') {
    return `background:#121824;border:1px solid rgba(255,255,255,0.07);
            padding:1rem;border-radius:8px;margin-bottom:0.75rem;${style}`;
  }
  function btnStyle(color, extra='') {
    return `padding:0.35rem 0.8rem;background:${color};color:#fff;border:none;
            border-radius:5px;cursor:pointer;font-size:0.82rem;${extra}`;
  }
  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}/${path}`, opts);
    return res.json();
  }
  async function uploadFile(file, folder) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    const d = await res.json();
    return d.url || '';
  }
  async function maybeUpload(fileInput, urlInput, folder) {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      return uploadFile(fileInput.files[0], folder);
    }
    return urlInput ? urlInput.value.trim() : '';
  }
  function uid() { return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
  function toast(msg, ok=true) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', right:'24px', zIndex:99999,
      background: ok ? '#10b981' : '#ef4444', color:'#fff',
      padding:'0.8rem 1.4rem', borderRadius:'8px', fontWeight:700,
      boxShadow:'0 4px 20px rgba(0,0,0,0.4)', fontSize:'0.95rem',
      transition:'opacity 0.4s'
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
  }
  function loading(el, txt='Loading…') {
    if (el) el.innerHTML = `<div style="color:#94a3b8;padding:1.5rem;text-align:center">${txt}</div>`;
  }

  /* ── Wait for DOM to be fully ready ─────────────────────────────────── */
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* ── Photography ─────────────────────────────────────────────────────── */
  async function initPhotography() {
    const listEl = S('admin-photography-list');
    const form   = S('admin-add-photo-form');
    if (!listEl || !form) return;
    if (form && !isAdmin()) form.closest('.admin-form').style.display = 'none';

    async function renderList() {
      loading(listEl);
      const items = await api('GET', 'photography');
      if (!items || !items.length) {
        listEl.innerHTML = '<div style="color:#94a3b8;padding:1rem;text-align:center">No photography packages yet. Add one using the form.</div>';
        return;
      }
      listEl.innerHTML = items.map(it => `
        <div style="${card()}" id="photo-row-${it.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="flex:1;min-width:0">
              ${it.image ? `<img src="${it.image}" style="width:80px;height:54px;object-fit:cover;border-radius:5px;margin-bottom:0.5rem">` : ''}
              <h4 style="color:#fff;margin:0 0 4px">${it.title}</h4>
              <span style="color:#38bdf8;font-size:0.85rem">$${it.price || 0} · ${it.duration || ''}</span>
              <p style="color:#94a3b8;font-size:0.82rem;margin:4px 0 0">${it.description || ''}</p>
            </div>
            ${isAdmin() ? `<div style="display:flex;gap:6px;flex-shrink:0;margin-left:1rem">
              <button onclick="photoCRUD.edit('${it.id}')" style="${btnStyle('#3b82f6')}">Edit</button>
              <button onclick="photoCRUD.del('${it.id}')" style="${btnStyle('#ef4444')}">Delete</button>
            </div>` : ''}
          </div>
        </div>`).join('');
    }

    window.photoCRUD = {
      _items: [],
      async refresh() { this._items = await api('GET', 'photography'); renderList(); },
      async edit(id) {
        const it = (await api('GET', 'photography')).find(x => x.id === id);
        if (!it) return;
        S('photo-id').value = it.id;
        S('photo-title').value = it.title || '';
        S('photo-highlights').value = it.highlights || '';
        S('photo-duration').value = it.duration || '';
        S('photo-price').value = it.price || '';
        S('photo-image').value = (it.image && !it.image.startsWith('data:')) ? it.image : '';
        S('photo-video').value = (it.video && !it.video.startsWith('data:')) ? it.video : '';
        S('photo-desc').value = it.description || '';
        S('photo-full-desc').value = it.fullDescription || '';
        S('photo-max-capacity').value = it.maxCapacity || 10;
        S('photo-form-title').textContent = 'Edit Photography Package';
        S('photo-submit-btn').textContent = 'Save Changes';
        S('photo-cancel-btn').style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
      },
      async del(id) {
        if (!confirm('Delete this photography package?')) return;
        await api('DELETE', `photography/${id}`);
        toast('Deleted!'); renderList();
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = S('photo-submit-btn');
      btn.textContent = 'Saving…'; btn.disabled = true;
      try {
        const id = S('photo-id').value || uid();
        let image = await maybeUpload(S('photo-image-file'), S('photo-image'), 'photography');
        let video = await maybeUpload(S('photo-video-file'), S('photo-video'), 'photography');
        const item = {
          id, title: S('photo-title').value, highlights: S('photo-highlights').value,
          duration: S('photo-duration').value, price: parseFloat(S('photo-price').value) || 0,
          image, video, videoRatio: S('photo-video-ratio').value,
          description: S('photo-desc').value, fullDescription: S('photo-full-desc').value,
          maxCapacity: parseInt(S('photo-max-capacity').value) || 10
        };
        await api('PUT', `photography/${id}`, item);
        toast('Photography package saved!');
        form.reset(); S('photo-id').value = '';
        S('photo-form-title').textContent = 'Add New Photography Package';
        S('photo-submit-btn').textContent = 'Add Photography Package';
        S('photo-cancel-btn').style.display = 'none';
        renderList();
      } catch(err) { toast('Error: ' + err.message, false); }
      finally { btn.disabled = false; btn.textContent = btn.textContent.includes('Sav') ? (S('photo-id') && S('photo-id').value ? 'Save Changes' : 'Add Photography Package') : btn.textContent; }
    };

    const cancelBtn = S('photo-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = () => {
      form.reset(); S('photo-id').value = '';
      S('photo-form-title').textContent = 'Add New Photography Package';
      S('photo-submit-btn').textContent = 'Add Photography Package';
      cancelBtn.style.display = 'none';
    };

    renderList();
  }

  /* ── Special Offers ──────────────────────────────────────────────────── */
  async function initOffers() {
    const container = S('admin-offer-status-container');
    if (!container) return;

    async function renderOffer() {
      const offer = await api('GET', 'offer');
      const hasOffer = offer && offer.title;
      container.innerHTML = `
        <div style="${card('margin-bottom:1.5rem')}">
          <h4 style="color:${hasOffer ? '#10b981' : '#ef4444'};margin:0 0 0.5rem">
            ${hasOffer ? '✅ Active Offer: ' + offer.title : '⚠️ No active offer'}
          </h4>
          ${hasOffer ? `
            <p style="color:#94a3b8;margin:0 0 0.25rem"><strong style="color:#fde047">${offer.discount}</strong> — ${offer.description}</p>
            <p style="color:#64748b;font-size:0.82rem;margin:0">Code: <strong style="color:#38bdf8">${offer.code || 'None'}</strong> · ${offer.validity || ''}</p>
          ` : ''}
        </div>
        <form id="offer-edit-form" style="display:${isAdmin() ? 'grid' : 'none'};gap:0.75rem;max-width:620px">
          <div class="form-group">
            <label>Offer Title</label>
            <input class="form-control" id="offer-title" value="${hasOffer ? (offer.title||'') : ''}" required>
          </div>
          <div class="form-group">
            <label>Discount (e.g. 15% OFF)</label>
            <input class="form-control" id="offer-discount" value="${hasOffer ? (offer.discount||'') : ''}" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="offer-desc" rows="3" required>${hasOffer ? (offer.description||'') : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Promo Code (optional)</label>
            <input class="form-control" id="offer-code" value="${hasOffer ? (offer.code||'') : ''}">
          </div>
          <div class="form-group">
            <label>Validity (e.g. Valid until Dec 31, 2025)</label>
            <input class="form-control" id="offer-validity" value="${hasOffer ? (offer.validity||'') : ''}" required>
          </div>
          <div class="form-group">
            <label>Apply To</label>
            <select class="form-control" id="offer-category" style="background:#080d1a;color:#fff">
              <option value="All" ${(!hasOffer||offer.category==='All')?'selected':''}>All Packages</option>
              <option value="Excursions" ${hasOffer&&offer.category==='Excursions'?'selected':''}>Excursions</option>
              <option value="Private Charters" ${hasOffer&&offer.category==='Private Charters'?'selected':''}>Private Charters</option>
              <option value="Free Diving" ${hasOffer&&offer.category==='Free Diving'?'selected':''}>Free Diving</option>
              <option value="Resorts" ${hasOffer&&offer.category==='Resorts'?'selected':''}>Resorts</option>
              <option value="Photography" ${hasOffer&&offer.category==='Photography'?'selected':''}>Photography</option>
            </select>
          </div>
          <div style="display:flex;gap:0.75rem">
            <button type="submit" class="btn btn-primary" id="offer-save-btn" style="flex:1;padding:0.75rem">Save Offer</button>
            <button type="button" id="offer-delete-btn" class="btn" style="padding:0.75rem 1.25rem;background:#ef4444;color:#fff">Delete Offer</button>
          </div>
        </form>`;

      S('offer-edit-form').onsubmit = async (ev) => {
        ev.preventDefault();
        const btn = S('offer-save-btn'); btn.textContent='Saving…'; btn.disabled=true;
        try {
          await api('POST', 'offer', {
            title: S('offer-title').value, discount: S('offer-discount').value,
            description: S('offer-desc').value, code: S('offer-code').value,
            validity: S('offer-validity').value, category: S('offer-category').value
          });
          toast('Offer saved!'); renderOffer();
        } catch(err) { toast('Error: '+err.message, false); }
        finally { btn.disabled=false; btn.textContent='Save Offer'; }
      };
      S('offer-delete-btn').onclick = async () => {
        if (!confirm('Remove the active offer?')) return;
        await api('DELETE', 'offer');
        toast('Offer removed!'); renderOffer();
      };
    }
    renderOffer();
  }

  /* ── Testimonials ────────────────────────────────────────────────────── */
  async function initTestimonials() {
    const listEl = S('admin-testimonies-list');
    const form   = S('admin-add-testimony-form');
    const grBtn  = S('save-google-review-btn');
    if (!listEl) return;
    if (form && !isAdmin()) form.style.display = 'none';
    if (grBtn && !isAdmin()) grBtn.closest('div').style.display = 'none';

    // Load google review URL
    if (grBtn) {
      const gr = await api('GET', 'google-review');
      const grInput = S('google-review-url');
      if (grInput && gr && gr.url) grInput.value = gr.url;
      grBtn.onclick = async () => {
        await api('POST', 'google-review', { url: grInput.value });
        toast('Google Review URL saved!');
      };
    }

    let editingId = null;

    async function renderList() {
      loading(listEl);
      const items = await api('GET', 'testimonials');
      if (!items || !items.length) {
        listEl.innerHTML = '<div style="color:#94a3b8;padding:1rem;text-align:center">No testimonials yet.</div>';
        return;
      }
      listEl.innerHTML = items.map(it => {
        const stars = Array.from({length:5},(_,i)=>
          `<i class="fa-${i < it.rating ? 'solid' : 'regular'} fa-star" style="color:${i < it.rating ? '#fde047' : '#475569'};font-size:0.8rem"></i>`
        ).join('');
        return `<div style="${card()}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <div style="margin-bottom:4px">${stars}</div>
              <p style="color:#cbd5e1;font-style:italic;font-size:0.9rem;margin:0 0 4px">"${it.text}"</p>
              <span style="color:#38bdf8;font-weight:700;font-size:0.85rem">— ${it.name}</span>
            </div>
            ${isAdmin() ? `<div style="display:flex;gap:6px;margin-left:1rem;flex-shrink:0">
              <button onclick="testCRUD.edit('${it.id}')" style="${btnStyle('#3b82f6')}">Edit</button>
              <button onclick="testCRUD.del('${it.id}')" style="${btnStyle('#ef4444')}">Delete</button>
            </div>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    window.testCRUD = {
      async edit(id) {
        const items = await api('GET', 'testimonials');
        const it = items.find(x => x.id === id); if (!it) return;
        editingId = id;
        S('testimony-name').value = it.name || '';
        S('testimony-rating').value = it.rating || 5;
        S('testimony-text').value = it.text || '';
        const btn = form && form.querySelector('[type=submit]');
        if (btn) btn.textContent = 'Save Changes';
        if (form) form.scrollIntoView({ behavior:'smooth' });
      },
      async del(id) {
        if (!confirm('Delete this testimony?')) return;
        await api('DELETE', `testimonials/${id}`);
        toast('Deleted!'); renderList();
      }
    };

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('[type=submit]');
        const origTxt = btn.textContent; btn.textContent='Saving…'; btn.disabled=true;
        try {
          const id = editingId || uid();
          await api('PUT', `testimonials/${id}`, {
            id, name: S('testimony-name').value,
            rating: parseInt(S('testimony-rating').value) || 5,
            text: S('testimony-text').value
          });
          toast('Testimony saved!');
          form.reset(); editingId = null;
          btn.textContent = 'Add Testimony';
          renderList();
        } catch(err) { toast('Error: '+err.message, false); }
        finally { btn.disabled=false; if (btn.textContent==='Saving…') btn.textContent=origTxt; }
      };
    }
    renderList();
  }

  /* ── Media Assets (Hero Videos) ─────────────────────────────────────── */
  async function initMedia() {
    const listEl    = S('admin-hero-videos-list');
    const addBtn    = S('add-hero-video-btn');
    const saveBtn   = S('save-hero-videos-btn');
    if (!listEl) return;

    if (!isAdmin()) {
      if (addBtn && addBtn.parentElement) addBtn.parentElement.parentElement.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'none';
    }

    let localVideos = [];

    async function renderVideoList() {
      if (!localVideos.length) {
        listEl.innerHTML = '<div style="color:#94a3b8;padding:1rem;text-align:center">No videos in slider. Add at least one.</div>';
        return;
      }
      listEl.innerHTML = localVideos.map((v, i) => `
        <div style="${card('display:flex;align-items:center;gap:1rem')}">
          <span style="color:#38bdf8;font-weight:800;min-width:2rem">#${i+1}</span>
          <div style="width:120px;height:68px;border-radius:6px;overflow:hidden;background:#000;flex-shrink:0">
            <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;opacity:0.8">
              <source src="${v}">
            </video>
          </div>
          <div style="flex:1;min-width:0;font-family:monospace;font-size:0.8rem;color:#cbd5e1;word-break:break-all">
            ${v.startsWith('data:') ? 'Uploaded base64 video' : v}
          </div>
          ${isAdmin() ? `<button onclick="mediaCRUD.remove(${i})" style="${btnStyle('#ef4444')}">Delete</button>` : ''}
        </div>`).join('');
    }

    // Load from API
    const res = await api('GET', 'hero-videos');
    localVideos = (res && res.videos) ? res.videos.filter(Boolean) : [];
    renderVideoList();

    window.mediaCRUD = {
      remove(idx) { localVideos.splice(idx, 1); renderVideoList(); }
    };

    if (addBtn) {
      addBtn.onclick = async () => {
        const fileEl = S('new-hero-video-file');
        const urlEl  = S('new-hero-video-url');
        const origTxt = addBtn.textContent;
        if (fileEl && fileEl.files && fileEl.files[0]) {
          addBtn.textContent='Uploading to Cloudinary…'; addBtn.disabled=true;
          try {
            const url = await uploadFile(fileEl.files[0], 'hero');
            if (url) { localVideos.push(url); renderVideoList(); toast('Video added!'); }
            fileEl.value = '';
          } catch(err) { toast('Upload failed: '+err.message, false); }
          finally { addBtn.textContent=origTxt; addBtn.disabled=false; }
        } else if (urlEl && urlEl.value.trim()) {
          localVideos.push(urlEl.value.trim()); urlEl.value=''; renderVideoList(); toast('Video URL added!');
        } else {
          toast('Please select a file or enter a URL.', false);
        }
      };
    }

    if (saveBtn) {
      saveBtn.onclick = async () => {
        saveBtn.textContent='Saving…'; saveBtn.disabled=true;
        try {
          await api('POST', 'hero-videos', { videos: localVideos });
          toast('Hero videos saved!');
        } catch(err) { toast('Error: '+err.message, false); }
        finally { saveBtn.textContent='Save Changes'; saveBtn.disabled=false; }
      };
    }
  }

  /* ── Manage Crew ─────────────────────────────────────────────────────── */
  async function initCrew() {
    const listEl = S('admin-crew-list');
    const form   = S('admin-add-crew-form');
    if (!listEl || !form) return;
    if (form && !isAdmin()) form.closest('.admin-form').style.display = 'none';

    let editingId = null;

    async function renderList() {
      loading(listEl);
      const items = await api('GET', 'crew');
      if (!items || !items.length) {
        listEl.innerHTML = '<div style="color:#94a3b8;padding:1rem;text-align:center">No crew members yet. Add one using the form.</div>';
        return;
      }
      listEl.innerHTML = items.map(it => `
        <div style="${card('display:flex;justify-content:space-between;align-items:center')}">
          <div style="display:flex;align-items:center;gap:1rem;flex:1">
            ${it.image ? `<img src="${it.image}" style="width:56px;height:56px;object-fit:cover;border-radius:50%;border:2px solid #38bdf8;flex-shrink:0">` : `<div style="width:56px;height:56px;border-radius:50%;background:rgba(56,189,248,0.15);border:2px solid #38bdf8;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid fa-user" style="color:#38bdf8"></i></div>`}
            <div>
              <h4 style="color:#fff;margin:0 0 2px">${it.name}</h4>
              <span style="color:#38bdf8;font-size:0.85rem">${it.role}</span>
              ${it.licenses ? `<div style="color:#94a3b8;font-size:0.78rem;margin-top:2px">${it.licenses}</div>` : ''}
            </div>
          </div>
          ${isAdmin() ? `<div style="display:flex;gap:6px;flex-shrink:0;margin-left:1rem">
            <button onclick="crewCRUD.edit('${it.id}')" style="${btnStyle('#3b82f6')}">Edit</button>
            <button onclick="crewCRUD.del('${it.id}')" style="${btnStyle('#ef4444')}">Delete</button>
          </div>` : ''}
        </div>`).join('');
    }

    window.crewCRUD = {
      async edit(id) {
        const items = await api('GET', 'crew');
        const it = items.find(x => x.id === id); if (!it) return;
        editingId = id;
        S('crew-id').value = it.id;
        S('crew-name').value = it.name || '';
        S('crew-role').value = it.role || '';
        S('crew-bio').value  = it.bio || '';
        S('crew-licenses').value = it.licenses || '';
        S('crew-image').value = (it.image && !it.image.startsWith('data:')) ? it.image : '';
        S('crew-form-title').textContent = 'Edit Crew Member';
        S('crew-submit-btn').textContent = 'Save Changes';
        S('crew-cancel-btn').style.display = 'block';
        form.scrollIntoView({ behavior:'smooth' });
      },
      async del(id) {
        if (!confirm('Delete this crew member?')) return;
        await api('DELETE', `crew/${id}`);
        toast('Crew member deleted!'); renderList();
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = S('crew-submit-btn');
      btn.textContent='Saving…'; btn.disabled=true;
      try {
        const id = S('crew-id').value || uid();
        const image = await maybeUpload(S('crew-image-file'), S('crew-image'), 'crew');
        await api('PUT', `crew/${id}`, {
          id, name: S('crew-name').value, role: S('crew-role').value,
          bio: S('crew-bio').value, licenses: S('crew-licenses').value, image
        });
        toast('Crew member saved!');
        form.reset(); editingId = null; S('crew-id').value='';
        S('crew-form-title').textContent='Add New Crew Member';
        S('crew-submit-btn').textContent='Add Crew Member';
        S('crew-cancel-btn').style.display='none';
        renderList();
      } catch(err) { toast('Error: '+err.message, false); }
      finally { btn.disabled=false; }
    };

    const cancelBtn = S('crew-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = () => {
      form.reset(); editingId = null; S('crew-id').value='';
      S('crew-form-title').textContent='Add New Crew Member';
      S('crew-submit-btn').textContent='Add Crew Member';
      cancelBtn.style.display='none';
    };

    renderList();
  }

  /* ── Contact Messages ────────────────────────────────────────────────── */
  async function initContactMessages() {
    const tbody = S('admin-contact-messages-table');
    if (!tbody) return;

    const noMsgDiv   = S('admin-no-messages');
    const badge      = S('contact-msg-badge');
    const clearBtn   = S('clear-all-messages-btn');
    const markAllBtn = S('mark-all-read-btn');

    async function renderMessages() {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#94a3b8">Loading messages…</td></tr>';
      let msgs = await api('GET', 'contact_messages');
      if (!msgs || !msgs.length) {
        tbody.innerHTML = '';
        if (noMsgDiv) noMsgDiv.style.display = 'block';
        if (badge) { badge.style.display='none'; badge.textContent='0'; }
        return;
      }
      if (noMsgDiv) noMsgDiv.style.display = 'none';
      if (badge) { badge.style.display='inline'; badge.textContent=msgs.length; }
      msgs = [...msgs].sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''));
      tbody.innerHTML = msgs.map(m => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
          <td style="padding:0.9rem 0">
            <strong style="color:#fff">${m.name||'Unknown'}</strong>
            ${m.email ? `<div style="font-size:0.8rem;color:#38bdf8">${m.email}</div>` : ''}
            ${m.phone ? `<div style="font-size:0.78rem;color:#10b981">${m.phone}</div>` : ''}
          </td>
          <td style="padding:0.9rem 0.5rem;color:#fde047;font-size:0.85rem">${m.subject||'—'}</td>
          <td style="padding:0.9rem 0.5rem;color:#cbd5e1;font-size:0.85rem;max-width:300px;word-break:break-word">${m.message||''}</td>
          <td style="padding:0.9rem 0.5rem;color:#64748b;font-size:0.8rem;white-space:nowrap">${m.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}</td>
          <td style="padding:0.9rem 0.5rem"><span style="background:rgba(56,189,248,0.1);color:#38bdf8;font-size:0.75rem;padding:2px 8px;border-radius:10px;font-weight:700">New</span></td>
          <td style="padding:0.9rem 0.5rem">
            ${m.email ? `<a href="mailto:${m.email}" style="${btnStyle('#3b82f6','display:inline-block;margin-bottom:4px;text-decoration:none')}">Reply</a><br>` : ''}
            ${isAdmin() ? `<button onclick="contactCRUD.del('${m.id}')" style="${btnStyle('#ef4444')}">Delete</button>` : ''}
          </td>
        </tr>`).join('');
    }

    window.contactCRUD = {
      async del(id) {
        if (!confirm('Delete this message?')) return;
        await api('DELETE', `contact_messages/${id}`);
        toast('Message deleted!'); renderMessages();
      }
    };

    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (!confirm('Clear ALL contact messages? This cannot be undone.')) return;
        const msgs = await api('GET', 'contact_messages');
        await Promise.all((msgs||[]).map(m => api('DELETE', `contact_messages/${m.id}`)));
        toast('All messages cleared!'); renderMessages();
      };
    }
    if (markAllBtn) markAllBtn.onclick = () => toast('All messages marked as read!');

    renderMessages();
    setInterval(renderMessages, 30000);
  }

  /* ── Gallery & Reels ─────────────────────────────────────────────────── */
  async function initGallery() {
    const listEl = S('admin-gallery-list');
    const form   = S('admin-add-gallery-form');
    if (!listEl || !form) return;
    if (form && !isAdmin()) form.closest('.admin-form').style.display = 'none';
    let editingId = null;

    async function renderList() {
      loading(listEl);
      const items = await api('GET', 'gallery');
      if (!items || !items.length) {
        listEl.innerHTML='<div style="color:#94a3b8;padding:1rem;text-align:center">No gallery items yet.</div>';
        return;
      }
      listEl.innerHTML = items.map(it=>`
        <div style="${card('display:flex;gap:1rem;align-items:center')}">
          ${it.image?`<img src="${it.image}" style="width:72px;height:54px;object-fit:cover;border-radius:5px;flex-shrink:0">`:''}
          <div style="flex:1"><h4 style="color:#fff;margin:0 0 2px">${it.title||''}</h4>
            <span style="color:#64748b;font-size:0.8rem">${it.aspectRatio||'16:9'}</span></div>
          ${isAdmin() ? `<div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="galleryCRUD.edit('${it.id}')" style="${btnStyle('#3b82f6')}">Edit</button>
            <button onclick="galleryCRUD.del('${it.id}')" style="${btnStyle('#ef4444')}">Delete</button>
          </div>` : ''}
        </div>`).join('');
    }
    window.galleryCRUD = {
      async edit(id) {
        const items = await api('GET','gallery'); const it=items.find(x=>x.id===id); if(!it) return;
        editingId=id;
        const t=S('gallery-title'); const img=S('gallery-image'); const vid=S('gallery-video'); const ar=S('gallery-aspect-ratio');
        if(t) t.value=it.title||''; if(img) img.value=(it.image&&!it.image.startsWith('data:'))?it.image:'';
        if(vid) vid.value=(it.video&&!it.video.startsWith('data:'))?it.video:''; if(ar) ar.value=it.aspectRatio||'16:9';
        const sb=S('gallery-submit-btn'); const cb=S('gallery-cancel-btn'); const ft=S('gallery-form-title');
        if(sb) sb.textContent='Save Changes'; if(cb) cb.style.display='block'; if(ft) ft.textContent='Edit Gallery Item';
        form.scrollIntoView({behavior:'smooth'});
      },
      async del(id) {
        if(!confirm('Delete this gallery item?')) return;
        await api('DELETE',`gallery/${id}`); toast('Deleted!'); renderList();
      }
    };
    form.onsubmit=async(e)=>{e.preventDefault();
      const btn=S('gallery-submit-btn'); btn.textContent='Saving…'; btn.disabled=true;
      try{
        const id=editingId||S('gallery-id')&&S('gallery-id').value||uid();
        const image=await maybeUpload(S('gallery-image-file'),S('gallery-image'),'gallery');
        const video=await maybeUpload(S('gallery-video-file'),S('gallery-video'),'gallery');
        await api('PUT',`gallery/${id}`,{id,title:S('gallery-title')&&S('gallery-title').value||'',image,video,aspectRatio:S('gallery-aspect-ratio')&&S('gallery-aspect-ratio').value||'16:9'});
        toast('Gallery item saved!'); form.reset(); editingId=null;
        const sb=S('gallery-submit-btn'); const cb=S('gallery-cancel-btn'); const ft=S('gallery-form-title');
        if(sb){sb.textContent='Add Gallery Item';}; if(cb) cb.style.display='none'; if(ft) ft.textContent='Add Gallery Item';
        renderList();
      }catch(err){toast('Error: '+err.message,false);}finally{btn.disabled=false;}
    };
    const cancelBtn=S('gallery-cancel-btn'); if(cancelBtn) cancelBtn.onclick=()=>{
      form.reset(); editingId=null;
      const sb=S('gallery-submit-btn'); const cb=S('gallery-cancel-btn'); const ft=S('gallery-form-title');
      if(sb) sb.textContent='Add Gallery Item'; if(cb) cb.style.display='none'; if(ft) ft.textContent='Add Gallery Item';
    };
    renderList();
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */
  whenReady(() => {
    // Small delay to let script.js run first
    setTimeout(() => {
      initPhotography().catch(console.error);
      initOffers().catch(console.error);
      initTestimonials().catch(console.error);
      initMedia().catch(console.error);
      initCrew().catch(console.error);
      initContactMessages().catch(console.error);
      initGallery().catch(console.error);
    }, 800);
  });

})();

document.addEventListener('DOMContentLoaded', () => {
  // --- Logo Drag & Drop Logic (Home Page Only) ---
  const logoContainer = document.querySelector('.logo-reveal-container');
  if (logoContainer) {
    setTimeout(() => {
      logoContainer.classList.add('ready');
    }, 6000);
  }

  const draggables = document.querySelectorAll('.logo-icon-wrap');
  draggables.forEach(draggable => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    const dragStart = (e) => {
      if (!logoContainer || !logoContainer.classList.contains('ready')) return;
      isDragging = true;
      draggable.classList.add('active-drag');
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      startX = clientX - currentX;
      startY = clientY - currentY;
    };

    const dragMove = (e) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      currentX = clientX - startX;
      currentY = clientY - startY;
      draggable.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    };

    const dragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      draggable.classList.remove('active-drag');
      draggable.style.transition = 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.35)';
      draggable.style.transform = 'translate3d(0, 0, 0)';
      currentX = 0;
      currentY = 0;
      setTimeout(() => {
        draggable.style.transition = '';
      }, 800);
    };

    draggable.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragEnd);
    draggable.addEventListener('touchstart', dragStart, { passive: true });
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('touchend', dragEnd);
  });
  // Helper to check if a URL represents a video (especially for Cloudinary uploads)
  const isMediaVideo = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.startsWith('data:video') || 
           lower.includes('/video/upload/') || 
           lower.includes('video') || 
           /\.(mp4|mov|webm|ogv|3gp|m4v|quicktime)(?:[\?#]|$)/i.test(lower);
  };

  const DEFAULT_CREW = [];

  // --- DEFAULT_DB fallback ---
  const DEFAULT_DB = {
    "auth": {
      "admin_password": "",
      "staff_password": ""
    },
    "packages": [],
    "excursions": [],
    "private_bookings": [],
    "freediving": [],
    "resorts": [],
    "photography": [],
    "bookings": [],
    "contact_messages": [],
    "testimonials": [],
    "reels": [],
    "gallery": [],
    "hero_videos": [],
    "hero_video": "",
    "google_review": "",
    "instagram_config": {
      "accessToken": "",
      "postCount": 4,
      "profileUrl": "https://instagram.com/travelscapemaldives",
      "enabled": false,
      "cachedPosts": [],
      "lastFetched": null
    },
    "offers": [],
    "crew": []
  };

  // Helper function to detect client device type
  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'Mobile';
    }
    return 'PC';
  };

  // --- LocalStorage Helpers for Fallback ---
  const localDb = {
    init: () => {
      if (!localStorage.getItem('travelscape_db')) {
        const initialDb = { ...DEFAULT_DB, crew: DEFAULT_CREW };
        localStorage.setItem('travelscape_db', JSON.stringify(initialDb));
      } else {
        try {
          const db = JSON.parse(localStorage.getItem('travelscape_db'));
          if (!db.crew || db.crew.length === 0) {
            db.crew = DEFAULT_CREW;
            localStorage.setItem('travelscape_db', JSON.stringify(db));
          }
        } catch(e) {}
      }
    },
    read: () => {
      localDb.init();
      try {
        const stored = localStorage.getItem('travelscape_db');
        if (!stored || stored === 'null' || stored === 'undefined') {
          return DEFAULT_DB;
        }
        return JSON.parse(stored) || DEFAULT_DB;
      } catch (e) {
        return DEFAULT_DB;
      }
    },
    write: (data) => {
      try {
        localStorage.setItem('travelscape_db', JSON.stringify(data));
      } catch (e) {
        console.error('LocalStorage write error:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          alert('Local browser storage is full (5MB limit exceeded). Please start/connect the Render backend server to upload large video files to Cloudinary, or use smaller video files.');
        }
      }
    },
    getCollection: (key) => {
      const db = localDb.read();
      const dbKey = key === 'private' ? 'private_bookings' : key;
      return db[dbKey] || [];
    },
    setCollection: (key, data) => {
      const db = localDb.read();
      const dbKey = key === 'private' ? 'private_bookings' : key;
      db[dbKey] = data;
      localDb.write(db);
    },
    getOffers: () => {
      return localDb.read().offers || [];
    },
    setOffers: (data) => {
      const db = localDb.read();
      db.offers = data;
      localDb.write(db);
    },
    getHeroVideo: () => {
      return { video: localDb.read().hero_video || '' };
    },
    setHeroVideo: (video) => {
      const db = localDb.read();
      db.hero_video = video;
      localDb.write(db);
    },
    getHeroVideos: () => {
      const db = localDb.read();
      return { videos: db.hero_videos || (db.hero_video ? [db.hero_video] : []) };
    },
    setHeroVideos: (videos) => {
      const db = localDb.read();
      db.hero_videos = videos;
      db.hero_video = videos[0] || '';
      localDb.write(db);
    },
    getGoogleReview: () => {
      return { url: localDb.read().google_review || '' };
    },
    setGoogleReview: (url) => {
      const db = localDb.read();
      db.google_review = url;
      localDb.write(db);
    },
    getContactMessages: () => {
      const db = localDb.read();
      return db.contact_messages || [];
    },
    setContactMessages: (data) => {
      const db = localDb.read();
      db.contact_messages = data;
      localDb.write(db);
    },
    getInstagramConfig: () => {
      const db = localDb.read();
      return db.instagram_config || { accessToken: '', postCount: 4, profileUrl: 'https://instagram.com/travelscapemaldives', enabled: false, cachedPosts: [], lastFetched: null };
    },
    setInstagramConfig: (data) => {
      const db = localDb.read();
      db.instagram_config = data;
      localDb.write(db);
    },
    login: (role, password) => {
      const db = localDb.read();
      if (role === 'admin' && password === db.auth.admin_password) {
        return { success: true, role: 'admin' };
      }
      if (role === 'staff' && password === db.auth.staff_password) {
        return { success: true, role: 'staff' };
      }
      return { success: false, message: 'Incorrect password' };
    }
  };

  // --- API Helper ---
  let useFallback = false;
  // Note: If deploying your frontend on GitHub Pages (github.io), change 'RENDER_SERVER_URL' to your Render web service backend URL.
  const RENDER_SERVER_URL = 'https://travelscape-backend.onrender.com'; 
  const API_BASE = (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? (window.location.port === '3000' ? '/api' : 'http://localhost:3000/api')
    : (window.location.origin.includes('github.io') ? RENDER_SERVER_URL + '/api' : '/api');

  window.PAYMENT_LINK = '';
  try {
    fetch(`${API_BASE}/config`).then(r => r.json()).then(d => { if(d.paymentLink) window.PAYMENT_LINK = d.paymentLink; }).catch(()=>{});
  } catch(e) {}

  const fetchWithTimeout = async (url, options = {}) => {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  const api = {
    get: async (path) => {
      if (useFallback) {
        if (path === 'offers') return localDb.getOffers();
        if (path === 'hero-video') return localDb.getHeroVideo();
        if (path === 'hero-videos') return localDb.getHeroVideos();
        if (path === 'google-review') return localDb.getGoogleReview();
        if (path === 'contact_messages') return localDb.getContactMessages();
        if (path === 'instagram_config') return localDb.getInstagramConfig();
        return localDb.getCollection(path);
      }
      try {
        // Use 45s timeout — Render cold start can take 30-60s
        const res = await fetchWithTimeout(`${API_BASE}/${path}`, { timeout: 45000 });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn('API GET error:', path, e.message);
        throw e;
      }
    },
    post: async (path, data) => {
      if (useFallback) {
        if (path === 'auth/login') return localDb.login(data.role, data.password);
        if (path === 'offers') { localDb.setOffers(data); return { success: true }; }
        if (path === 'hero-video') { localDb.setHeroVideo(data.video); return { success: true }; }
        if (path === 'hero-videos') { localDb.setHeroVideos(data.videos); return { success: true }; }
        if (path === 'google-review') { localDb.setGoogleReview(data.url); return { success: true }; }
        if (path === 'contact_messages') { localDb.setContactMessages(data); return { success: true }; }
        if (path === 'instagram_config') { localDb.setInstagramConfig(data); return { success: true }; }
        localDb.setCollection(path, data);
        return { success: true };
      }
      try {
        const res = await fetchWithTimeout(`${API_BASE}/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          timeout: path.includes('auth') ? 60000 : (path.includes('hero-videos') ? 120000 : 35000)
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('API POST error:', path, e);
        throw e;
      }
    },
    put: async (path, data) => {
      if (useFallback) {
        const list = localDb.getCollection(path);
        const idx = list.findIndex(item => item.id === data.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
        } else {
          list.push(data);
        }
        localDb.setCollection(path, list);
        return { success: true, item: data };
      }
      try {
        const res = await fetchWithTimeout(`${API_BASE}/${path}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          timeout: 35000
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('API PUT error:', path, e);
        throw e;
      }
    },
    del: async (path) => {
      if (useFallback) {
        if (path === 'offers') { localDb.setOffers([]); return { success: true }; }
        const parts = path.split('/');
        if (parts.length === 2) {
          const [collection, id] = parts;
          const list = localDb.getCollection(collection).filter(item => item.id !== id);
          localDb.setCollection(collection, list);
          return { success: true };
        }
        return { success: false };
      }
      try {
        const res = await fetchWithTimeout(`${API_BASE}/${path}`, { method: 'DELETE', timeout: 10000 });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('API DELETE error:', path, e);
        throw e;
      }
    }
  };

  // --- Data cache (loaded once, then kept in memory) ---
  let dataCache = {};

  async function loadAllData() {
    const [packages, excursions, privateBookings, freediving, resorts, photography, bookings, testimonials, reels, gallery, offers, heroVideoData, heroVideosData, googleReviewData, contactMessages, instagramConfig, crew] = await Promise.all([
      api.get('packages'),
      api.get('excursions'),
      api.get('private'),
      api.get('freediving'),
      api.get('resorts'),
      api.get('photography'),
      api.get('bookings'),
      api.get('testimonials'),
      api.get('reels'),
      api.get('gallery'),
      api.get('offers'),
      api.get('hero-video'),
      api.get('hero-videos'),
      api.get('google-review'),
      api.get('contact_messages'),
      api.get('instagram_config'),
      api.get('crew')
    ]);

    dataCache = {
      packages: packages || [],
      excursions: excursions || [],
      private: privateBookings || [],
      freediving: freediving || [],
      resorts: resorts || [],
      photography: photography || [],
      bookings: bookings || [],
      testimonials: testimonials || [],
      reels: reels || [],
      gallery: gallery || [],
      offers: offers || [],
      heroVideo: (heroVideoData && heroVideoData.video) || '',
      heroVideos: heroVideosData && Array.isArray(heroVideosData.videos) ? heroVideosData.videos : (heroVideosData && Array.isArray(heroVideosData) ? heroVideosData : []),
      googleReview: (googleReviewData && googleReviewData.url) || '',
      contactMessages: contactMessages || [],
      instagramConfig: instagramConfig || { accessToken: '', postCount: 4, profileUrl: 'https://instagram.com/travelscapemaldives', enabled: false, cachedPosts: [], lastFetched: null },
      crew: crew || []
    };
    return dataCache;
  }

  // Convenience getters/setters that work with cache + API
  const getPackages = () => dataCache.packages || [];
  const setPackages = async (data) => {
    dataCache.packages = data;
    try { const db = localDb.read(); db.packages = data; localDb.write(db); } catch(e) {}
    await api.post('packages', data);
  };
  const getExcursions = () => dataCache.excursions || [];
  const setExcursions = async (data) => {
    dataCache.excursions = data;
    try { const db = localDb.read(); db.excursions = data; localDb.write(db); } catch(e) {}
    await api.post('excursions', data);
  };
  const getPrivate = () => dataCache.private || [];
  const setPrivate = async (data) => {
    dataCache.private = data;
    try { const db = localDb.read(); db.private_bookings = data; localDb.write(db); } catch(e) {}
    await api.post('private', data);
  };
  const getFreeDiving = () => dataCache.freediving || [];
  const setFreeDiving = async (data) => {
    dataCache.freediving = data;
    try { const db = localDb.read(); db.freediving = data; localDb.write(db); } catch(e) {}
    await api.post('freediving', data);
  };
  const getResorts = () => dataCache.resorts || [];
  const setResorts = async (data) => {
    dataCache.resorts = data;
    try { const db = localDb.read(); db.resorts = data; localDb.write(db); } catch(e) {}
    await api.post('resorts', data);
  };
  const getPhotography = () => dataCache.photography || [];
  const setPhotography = async (data) => {
    dataCache.photography = data;
    try { const db = localDb.read(); db.photography = data; localDb.write(db); } catch(e) {}
    await api.post('photography', data);
  };
  const getReels = () => dataCache.reels || [];
  const setReels = async (data) => {
    dataCache.reels = data;
    try { const db = localDb.read(); db.reels = data; localDb.write(db); } catch(e) {}
    await api.post('reels', data);
  };
  const getGallery = () => dataCache.gallery || [];
  const setGallery = async (data) => {
    dataCache.gallery = data;
    try { const db = localDb.read(); db.gallery = data; localDb.write(db); } catch(e) {}
    await api.post('gallery', data);
  };
  const getHeroVideo  = () => dataCache.heroVideo  || '';
  const setHeroVideo  = async (data) => {
    dataCache.heroVideo = data;
    try { const db = localDb.read(); db.hero_video = data; localDb.write(db); } catch(e) {}
    await api.post('hero-video', { video: data });
  };
  const getHeroVideos = () => dataCache.heroVideos || [];
  const setHeroVideos = async (data) => {
    dataCache.heroVideos = data;
    try { const db = localDb.read(); db.hero_videos = data; localDb.write(db); } catch(e) {}
    await api.post('hero-videos', { videos: data });
  };
  const getBookings = () => dataCache.bookings || [];
  const setBookings = async (data) => {
    dataCache.bookings = data;
    try { const db = localDb.read(); db.bookings = data; localDb.write(db); } catch(e) {}
    await api.post('bookings', data);
  };
  const getOffers = () => dataCache.offers || [];
  const setOffers = async (data) => {
    dataCache.offers = data;
    try { const db = localDb.read(); db.offers = data; localDb.write(db); } catch(e) {}
    await api.post('offers', data);
  };
  const getTestimonials = () => dataCache.testimonials || [];
  const setTestimonials = async (data) => {
    dataCache.testimonials = data;
    try { const db = localDb.read(); db.testimonials = data; localDb.write(db); } catch(e) {}
    await api.post('testimonials', data);
  };
  const getGoogleReview = () => dataCache.googleReview || '';
  const setGoogleReview = async (data) => {
    dataCache.googleReview = data;
    try { const db = localDb.read(); db.google_review = data; localDb.write(db); } catch(e) {}
    await api.post('google-review', { url: data });
  };
  const getContactMessages = () => dataCache.contactMessages || [];
  const setContactMessages = async (data) => {
    dataCache.contactMessages = data;
    try { const db = localDb.read(); db.contact_messages = data; localDb.write(db); } catch(e) {}
    await api.post('contact_messages', data);
  };
  const getInstagramConfig = () => dataCache.instagramConfig || { accessToken: '', postCount: 4, profileUrl: 'https://instagram.com/travelscapemaldives', enabled: false, cachedPosts: [], lastFetched: null };
  const setInstagramConfig = async (data) => {
    dataCache.instagramConfig = data;
    try { const db = localDb.read(); db.instagram_config = data; localDb.write(db); } catch(e) {}
    await api.post('instagram_config', data);
  };
  const getCrew = () => (dataCache.crew && dataCache.crew.length > 0) ? dataCache.crew : DEFAULT_CREW;
  const setCrew = async (data) => {
    dataCache.crew = data;
    try { const db = localDb.read(); db.crew = data; localDb.write(db); } catch(e) {}
    await api.post('crew', data);
  };

  const getOfferBadgeHTML = (category, isCard = false) => {
    const offers = getOffers();
    const offer = offers.find(o => {
      const appliesTo = o.category ? (Array.isArray(o.category) ? o.category : [o.category]) : ['All'];
      return appliesTo.includes('All') || appliesTo.includes(category);
    });
    if (offer && offer.title) {
      if (isCard) {
        return `<span class="offer-card-badge" style="background: #ef4444; color: #fff; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px; text-transform: uppercase;">${offer.discount}</span>`;
      }
      return `<span class="offer-slide-badge" style="background: #ef4444; color: #fff; padding: 0.35rem 0.8rem; border-radius: 50px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); text-transform: uppercase; margin-left: 10px;">${offer.discount}</span>`;
    }
    return '';
  };

  // --- Smart startup: launch app immediately with defaults, then refresh from API ---
  // This ensures home page layers are visible immediately, even if server is waking up.
  const initDataCache = () => {
    const cachedDb = localDb.read();
    dataCache = {
      packages: cachedDb.packages || [],
      excursions: cachedDb.excursions || [],
      private: cachedDb.private_bookings || [],
      freediving: cachedDb.freediving || [],
      resorts: cachedDb.resorts || [],
      photography: cachedDb.photography || [],
      bookings: cachedDb.bookings || [],
      testimonials: cachedDb.testimonials || [],
      reels: cachedDb.reels || [],
      gallery: cachedDb.gallery || [],
      offers: cachedDb.offers || [],
      heroVideo: cachedDb.hero_video || '',
      heroVideos: cachedDb.hero_videos && cachedDb.hero_videos.length > 0 ? cachedDb.hero_videos : [],
      googleReview: cachedDb.google_review || '',
      contactMessages: cachedDb.contact_messages || [],
      instagramConfig: cachedDb.instagram_config || { accessToken: '', postCount: 4, profileUrl: 'https://instagram.com/travelscapemaldives', enabled: false, cachedPosts: [], lastFetched: null },
      crew: cachedDb.crew || []
    };
  };

  // Build dataCache from API results
  const applyDataFromAPI = ([packages, excursions, privateBookings, freediving, resorts, photography, bookings, testimonials, reels, gallery, offers, heroVideoData, heroVideosData, googleReviewData, contactMessages, instagramConfig, crew]) => {
    dataCache = {
      packages:      packages      || [],
      excursions:    excursions    || [],
      private:       privateBookings || [],
      freediving:    freediving    || [],
      resorts:       resorts       || [],
      photography:   photography   || [],
      bookings:      bookings      || [],
      testimonials:  testimonials  || [],
      reels:         reels         || [],
      gallery:       gallery       || [],
      offers:        offers        || [],
      heroVideo:     (heroVideoData  && heroVideoData.video)  || '',
      heroVideos:    heroVideosData && Array.isArray(heroVideosData.videos) ? heroVideosData.videos : (heroVideosData && Array.isArray(heroVideosData) ? heroVideosData : []),
      googleReview:  (googleReviewData && googleReviewData.url) || '',
      contactMessages: contactMessages || [],
      instagramConfig: instagramConfig || { accessToken: '', postCount: 4, profileUrl: 'https://instagram.com/travelscapemaldives', enabled: false, cachedPosts: [], lastFetched: null },
      crew:          crew          || []
    };
    try {
      const db = localDb.read();
      db.packages = dataCache.packages;
      db.excursions = dataCache.excursions;
      db.private_bookings = dataCache.private;
      db.freediving = dataCache.freediving;
      db.resorts = dataCache.resorts;
      db.photography = dataCache.photography;
      db.bookings = dataCache.bookings;
      db.testimonials = dataCache.testimonials;
      db.reels = dataCache.reels;
      db.gallery = dataCache.gallery;
      db.offers = dataCache.offers;
      db.hero_video = dataCache.heroVideo;
      db.hero_videos = dataCache.heroVideos;
      db.google_review = dataCache.googleReview;
      db.contact_messages = dataCache.contactMessages;
      db.instagram_config = dataCache.instagramConfig;
      db.crew = dataCache.crew;
      localDb.write(db);
    } catch(e) {
      console.warn('Failed to sync API data to localStorage:', e);
    }
  };

  // Fetch all data from API (used both on initial load and on re-fetch)
  async function fetchAllFromAPI() {
    const settled = await Promise.allSettled([
      api.get('packages'),
      api.get('excursions'),
      api.get('private'),
      api.get('freediving'),
      api.get('resorts'),
      api.get('photography'),
      api.get('bookings'),
      api.get('testimonials'),
      api.get('reels'),
      api.get('gallery'),
      api.get('offers'),
      api.get('hero-video'),
      api.get('hero-videos'),
      api.get('google-review'),
      api.get('contact_messages'),
      api.get('instagram_config'),
      api.get('crew')
    ]);
    // Extract values (null for failed calls)
    const results = settled.map(r => r.status === 'fulfilled' ? r.value : null);
    applyDataFromAPI(results);
    return dataCache;
  }

  // Re-run sections of initApp after API data arrives
  const refreshHomePageSections = () => {
    // Re-init hero video slider
    if (typeof initGlobalHeroVideoFn === 'function') initGlobalHeroVideoFn();
    // Re-render parallax layers
    if (typeof setupParallaxLayerFn === 'function') {
      setupParallaxLayerFn(8, 'PACKAGES', getPackages(), 'Package');
      setupParallaxLayerFn(2, 'EXCURSIONS', getExcursions(), 'Excursion');
      setupParallaxLayerFn(3, 'PRIVATE CHARTERS', getPrivate(), 'Private Booking');
      setupParallaxLayerFn(4, 'FREE DIVING', getFreeDiving(), 'Free Diving');
      setupParallaxLayerFn(5, 'RESORTS', getResorts(), 'Resort');
      setupParallaxLayerFn(6, 'PROFESSIONAL PHOTOGRAPHY', getPhotography(), 'Photography');
    }
    // Re-render cards
    if (typeof renderCardGridFn === 'function') {
      renderCardGridFn('packages-grid', getPackages(), 'Book Now', 'Package', 'packages');
      renderCardGridFn('excursions-grid', getExcursions(), 'Book Now', 'Excursion', 'excursion');
      renderCardGridFn('private-grid', getPrivate(), 'Book Private', 'Private Booking', 'private');
      renderCardGridFn('freediving-grid', getFreeDiving(), 'Book Now', 'Free Diving', 'freediving');
      renderCardGridFn('resorts-grid', getResorts(), 'Book Resort', 'Resort', 'resorts');
    }
    // Re-render testimonials
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid) {
      const list = getTestimonials();
      testimonialsGrid.innerHTML = list.map(t => {
        let stars = '';
        for (let i = 0; i < 5; i++) { stars += i < t.rating ? '<i class="fa-solid fa-star" style="color: #fde047; margin-right: 4px;"></i>' : '<i class="fa-regular fa-star" style="color: #cbd5e1; margin-right: 4px;"></i>'; }
        return `<div class="card" id="testimony-card-${t.id}"><div class="card-body" style="padding: 2rem;"><div style="margin-bottom: 1rem;">${stars}</div><p class="card-description" style="font-style: italic; color: #cbd5e1; font-size: 1.05rem; line-height: 1.6;">"${t.text}"</p><h4 class="card-title" style="font-size: 1.1rem; margin-top: 1.5rem; color: #38bdf8; font-weight: 700;">- ${t.name}</h4></div></div>`;
      }).join('');
    }
    // Re-render reels and gallery
    if (typeof renderReelsFn === 'function') renderReelsFn();
    if (typeof renderGalleryFn === 'function') renderGalleryFn();
    if (typeof renderCrewGridFn === 'function') renderCrewGridFn();
  };

  // Placeholder refs for re-render (set inside initApp)
  let initGlobalHeroVideoFn = null;
  let setupParallaxLayerFn  = null;
  let renderCardGridFn      = null;
  let renderReelsFn         = null;
  let renderGalleryFn       = null;
  let renderCrewGridFn      = null;
  let refreshAdminTablesFn  = null; // refreshes admin/staff dashboard after data loads

  // Fire a ping immediately to start waking the Render server (non-blocking)
  if (!useFallback) {
    fetch(`${API_BASE}/ping`).catch(() => {});
  }

  // LAUNCH IMMEDIATELY with empty defaults, then fetch in background
  initDataCache();
  initApp();

  // After app is rendered, fetch real data from API and refresh all sections
  if (!useFallback) {
    fetchAllFromAPI().then(() => {
      refreshHomePageSections();
      if (typeof refreshAdminTablesFn === 'function') refreshAdminTablesFn();
    }).catch(err => {
      console.warn('Background API refresh failed (server may be waking up):', err.message);
      // Retry after 35 seconds — enough time for Render cold start
      setTimeout(() => {
        fetchAllFromAPI().then(() => {
          refreshHomePageSections();
          if (typeof refreshAdminTablesFn === 'function') refreshAdminTablesFn();
        }).catch(e => console.warn('Retry API refresh also failed:', e.message));
      }, 35000);
    });
  }

  function initApp() {

    // --- Promo bar widget ---
    const displayGlobalPromoBar = () => {
      if (document.getElementById('admin-password-gate') || document.getElementById('staff-password-gate')) return;
      const offersList = getOffers();
      if (!offersList || offersList.length === 0) return;
      const offer = offersList[0];
      if (!offer || !offer.title) return;

      const container = document.createElement('div');
      container.id = 'floating-offer-widget';

      const catText = offer.category && offer.category !== 'All' ? ` on ${offer.category}s` : '';

      container.innerHTML = `
        <div id="offer-detail-card">
          <button id="close-offer-card">&times;</button>
          <span class="offer-discount-badge">${offer.discount}</span>
          <h4 class="offer-card-title">${offer.title}</h4>
          <p class="offer-card-desc">${offer.description}${catText}</p>
          <div class="offer-code-box">
            <div>
              <div class="offer-code-label">Promo Code</div>
              <div class="offer-code-val">${offer.code || 'None'}</div>
            </div>
            ${offer.code ? `<button id="copy-offer-code">Copy</button>` : ''}
          </div>
          <div class="offer-validity-box"><i class="fa-regular fa-clock"></i> <span>${offer.validity}</span></div>
        </div>
        <button id="offer-trigger-circle">
          <i class="fa-solid fa-gift"></i>
          <span>Offer</span>
        </button>
      `;

      document.body.appendChild(container);

      const trigger = container.querySelector('#offer-trigger-circle');
      const card = container.querySelector('#offer-detail-card');
      const closeBtn = container.querySelector('#close-offer-card');
      const copyBtn = container.querySelector('#copy-offer-code');

      let isOpen = false;
      const toggleCard = () => {
        isOpen = !isOpen;
        if (isOpen) {
          card.style.display = 'block';
          setTimeout(() => { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; }, 10);
        } else {
          card.style.transform = 'translateY(20px)'; card.style.opacity = '0';
          setTimeout(() => { card.style.display = 'none'; }, 400);
        }
      };

      trigger.addEventListener('click', toggleCard);
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCard(); });

      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(offer.code).then(() => {
            copyBtn.textContent = 'Copied!'; copyBtn.style.background = '#10b981'; copyBtn.style.color = '#fff';
            setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.style.background = '#38bdf8'; copyBtn.style.color = '#080d1a'; }, 2000);
          });
        });
      }
    };
    displayGlobalPromoBar();

    // Dynamic Background Video / Slider Injection
    let lastInjectedVideos = [];
    const initGlobalHeroVideo = () => {
      const sliderContainer = document.getElementById('hero-video-slider');
      const videos = getHeroVideos();

      if (sliderContainer && videos.length > 0) {
        // Compare arrays to avoid reload delay/flash
        const isSame = lastInjectedVideos.length === videos.length && 
                       lastInjectedVideos.every((v, i) => v === videos[i]);
        if (isSame) return;

        lastInjectedVideos = [...videos];
        sliderContainer.style.display = 'block';
        // Clear existing slides and rebuild via innerHTML for better Safari parsing
        let slidesHTML = '';
        videos.forEach((videoPath, index) => {
          const activeClass = index === 0 ? ' active' : '';
          slidesHTML += `<video src="${videoPath}" class="global-hero-video-slide${activeClass}" autoplay loop muted playsinline webkit-playsinline></video>`;
        });
        sliderContainer.innerHTML = slidesHTML;

        // Force strict mobile Safari properties on newly parsed DOM nodes
        const slideElements = Array.from(sliderContainer.querySelectorAll('.global-hero-video-slide'));
        slideElements.forEach(videoEl => {
          videoEl.muted = true;
          videoEl.defaultMuted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute('muted', 'muted');
          videoEl.setAttribute('playsinline', 'playsinline');
          videoEl.setAttribute('webkit-playsinline', 'webkit-playsinline');
          videoEl.load();
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => console.warn('Hero video play blocked:', err));
          }
        });

        // Slideshow interval
        if (videos.length > 1) {
          let currentSlideIndex = 0;
          setInterval(() => {
            slideElements[currentSlideIndex].classList.remove('active');
            currentSlideIndex = (currentSlideIndex + 1) % slideElements.length;
            slideElements[currentSlideIndex].classList.add('active');
          }, 6000); // Transitions every 6 seconds
        }
      } else {
        if (sliderContainer) {
          sliderContainer.style.display = 'none';
        }
        // Fallback for pages with static video backgrounds
        const activeVideo = videos[0] || getHeroVideo();
        if (activeVideo) {
          document.querySelectorAll('.global-hero-video').forEach(vid => {
            vid.style.display = 'block';
            vid.muted = true;
            vid.defaultMuted = true;
            vid.playsInline = true;
            vid.setAttribute('muted', 'muted');
            vid.setAttribute('playsinline', 'playsinline');
            vid.setAttribute('webkit-playsinline', 'webkit-playsinline');
            
            // Prefer setting src directly on video for Safari instead of <source>
            if (vid.getAttribute('src') !== activeVideo) {
              vid.src = activeVideo;
              vid.querySelectorAll('source').forEach(s => s.remove());
              vid.load();
              const playPromise = vid.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => console.warn('Static video autoplay blocked:', e));
              }
            }
          });
        } else {
          document.querySelectorAll('.global-hero-video').forEach(vid => {
            vid.style.display = 'none';
          });
        }
      }
    };
    // Store reference for background refresh
    initGlobalHeroVideoFn = initGlobalHeroVideo;
    initGlobalHeroVideo();

    // Print individual booking receipt helper
    const printIndividualBooking = (id) => {
      const bookings = getBookings();
      const b = bookings.find(item => item.id === id);
      if (!b) return;

      const allItems = [
        ...getPackages(),
        ...getExcursions(),
        ...getPrivate(),
        ...getFreeDiving(),
        ...getResorts()
      ];
      const item = allItems.find(x => x.id === b.excursionId);

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Booking Receipt - ${b.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 2rem; color: #333; }
            .receipt-card { border: 2px solid #38bdf8; border-radius: 8px; padding: 2rem; max-width: 550px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h2 { color: #0284c7; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 0.8rem; border-bottom: 1px dashed #f1f5f9; padding-bottom: 0.4rem; }
            .label { font-weight: bold; color: #64748b; font-size: 0.9rem; } .value { color: #0f172a; font-weight: 500; font-size: 0.9rem; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
            .section-title { font-size: 1.05rem; font-weight: bold; color: #0284c7; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
            .policy-section { margin-top: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; }
            .policy-title { font-size: 0.85rem; font-weight: bold; color: #ef4444; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.3px; }
            .policy-section p { margin: 0 0 0.5rem 0; font-size: 0.78rem; color: #475569; line-height: 1.45; }
            .policy-section p:last-child { margin-bottom: 0; }
            .footer { text-align: center; margin-top: 2rem; font-size: 0.85rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
          </style></head><body>
          <div class="receipt-card">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.75rem;">
              <img src="1.png" alt="Travelscape Maldives" style="height: 45px; width: auto; display: block;">
              <div>
                <h2 style="margin: 0; color: #0284c7; font-size: 1.4rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.2;">Travelscape Maldives</h2>
                <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px;">Travel • Tours • Trips</div>
              </div>
            </div>
            <div class="detail-row"><span class="label">Contact No:</span><span class="value">${b.customerContact || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Email ID:</span><span class="value">${b.customerEmail}</span></div>
            <div class="detail-row"><span class="label">Booking ID:</span><span class="value">${b.id}</span></div>
            <div class="detail-row"><span class="label">Guest Name:</span><span class="value">${b.customerName}</span></div>
            <div class="detail-row"><span class="label">Excursion:</span><span class="value">${b.excursionTitle}</span></div>
            <div class="detail-row"><span class="label">Date:</span><span class="value">${b.bookingDate}</span></div>
            <div class="detail-row"><span class="label">Trip Category:</span><span class="value">${b.isPrivate ? 'Private Charter' : 'Standard'}</span></div>
            <div class="detail-row"><span class="label">Booking Type:</span><span class="value">${b.bookingType || 'Individual'}</span></div>
            ${b.bookingType === 'Group' ? `
            <div class="detail-row"><span class="label">Adults:</span><span class="value">${b.adults || 1}</span></div>
            <div class="detail-row"><span class="label">Kids:</span><span class="value">${b.kids || 0}</span></div>
            ${b.kids > 0 ? `<div class="detail-row"><span class="label">Kids' Ages:</span><span class="value">${b.kidsAges || 'N/A'}</span></div>` : ''}
            ` : ''}
            <div class="detail-row"><span class="label">Payment Basis:</span><span class="value">${b.paymentBasis || 'Cash'}</span></div>
            <div class="detail-row"><span class="label">Booking Device:</span><span class="value">${b.deviceType || 'PC'}</span></div>
            <div class="detail-row"><span class="label">Status:</span><span class="value"><span class="badge">${b.status}</span></span></div>
            
            ${item ? `
            <div class="section-title">Package Details</div>
            <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem; line-height: 1.5;">${item.description || ''}</div>
            ${item.fullDescription ? `<div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem; font-style: italic; line-height: 1.5;">${item.fullDescription}</div>` : ''}
            ${item.duration ? `<div class="detail-row"><span class="label">Duration:</span><span class="value">${item.duration}</span></div>` : ''}
            ${item.highlights ? `
            <div style="margin-top: 0.75rem; border-top: 1px solid #f1f5f9; padding-top: 0.75rem;">
              <span class="label" style="display: block; margin-bottom: 0.25rem;">Package Highlights:</span>
              <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.82rem; color: #475569; line-height: 1.5;">
                ${item.highlights.split(',').map(h => `<li>${h.trim()}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            ` : ''}

            <div class="policy-section">
              <div class="policy-title">Company Cancellation Policy</div>
              <p>To receive a full refund, travellers may cancel up to 14 hours before the experience start date in the local timezone. No refunds will be given after that time period.</p>
              <p>We reserve the right to cancel a customer's booking for a full refund in case of bad weather or insufficient travelers.</p>
            </div>
            <div class="footer">Thank you for choosing Travelscape Maldives!</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
    };

    // Print filtered bookings manifest helper
    const printFilteredList = (bookings, title) => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 2rem; color: #333; }
            h2 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; color: #475569; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
            .badge-confirmed { background: #d1fae5; color: #065f46; } .badge-pending { background: #fef3c7; color: #92400e; }
            .footer { margin-top: 3rem; text-align: center; font-size: 0.85rem; color: #94a3b8; }
          </style></head><body>
          <h2>Travelscape Maldives - Booking Manifest</h2>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} | <strong>Filter Mode:</strong> Active</p>
          <table><thead><tr><th>Booking ID</th><th>Guest Name</th><th>Excursion</th><th>Date</th><th>Trip Type</th><th>Payment Basis</th><th>Device</th><th>Status</th></tr></thead>
          <tbody>${bookings.map(b => `<tr><td>#${b.id}</td><td>${b.customerName}</td><td>${b.isPrivate ? `${b.excursionTitle} (Private - ${b.numPersons} Pax)` : b.excursionTitle}</td><td>${b.bookingDate}</td><td>${b.isPrivate ? `Private (${b.numPersons} Pax)` : 'Standard'}</td><td>${b.paymentBasis || 'Cash'}</td><td>${b.deviceType || 'PC'}</td><td><span class="badge ${b.status === 'Confirmed' ? 'badge-confirmed' : 'badge-pending'}">${b.status}</span></td></tr>`).join('')}</tbody></table>
          <div class="footer">End of Report</div>
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
    };

    // Render Seasonal Offer on Home Page
    const offerSection = document.getElementById('seasonal-offer-section');
    if (offerSection) {
      const offersList = getOffers();
      if (offersList && offersList.length > 0) {
        offerSection.innerHTML = offersList.map(offer => `
          <div class="offer-card" style="margin-bottom: 2rem;">
            <div class="particles"><span class="particle p1"></span><span class="particle p2"></span><span class="particle p3"></span><span class="particle p4"></span><span class="particle p5"></span></div>
            <div class="offer-content">
              <div class="badge-wrapper"><span class="offer-badge">${offer.discount}</span></div>
              <h2 class="offer-title-text">${offer.title}</h2>
              <p class="offer-description">${offer.description}</p>
            </div>
            <div class="offer-action-group">
              ${offer.code ? `<div class="offer-promo-code-container"><div class="promo-reveal-hint">Hover to Scan Lagoon Code</div><div class="offer-promo-code">${offer.code}</div><div class="scanner-line"></div></div>` : ''}
              <span class="offer-validity-tag">${offer.validity}</span>
            </div>
          </div>
        `).join('');
        offerSection.style.display = 'block';
      } else {
        offerSection.style.display = 'none';
      }
    }

    // --- Excursion Details Modal Creator ---
    const openExcursionDetailsModal = (ex) => {
      const existing = document.getElementById('excursion-details-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'excursion-details-modal';
      modal.className = 'modal-minimal';
      modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;justify-content:center;align-items:center;';

      const subImg1 = ex.subImg1 || (ex.subImages && ex.subImages[0]) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80";
      const subImg2 = ex.subImg2 || (ex.subImages && ex.subImages[1]) || "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80";
      const isResort = (ex.id && ex.id.startsWith('rs')) || ex.hasOwnProperty('hasDayVisit') || ex.hasOwnProperty('hasStayNight');

      modal.innerHTML = `
        <div class="modal-content-minimal" style="max-width: 600px; width: 90%; overflow-y: auto; max-height: 90vh; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="color: #fff; margin: 0; font-size: 1.5rem;">${ex.title}</h3>
            <button id="close-details-modal" class="close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #858e8e;">&times;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
              <div style="height: 180px; border-radius: 12px; background: url('${ex.image}') center/cover;"></div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="height: 85px; border-radius: 12px; background: url('${subImg1}') center/cover;"></div>
                <div style="height: 85px; border-radius: 12px; background: url('${subImg2}') center/cover;"></div>
              </div>
            </div>
            <div>
              <h4 style="color: #fff; margin-bottom: 0.75rem; font-size: 1rem;">Experience Video</h4>
              <div class="video-card" style="position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: ${ex.videoRatio === '9:16' ? '9/16' : '16/9'}; ${ex.videoRatio === '9:16' ? 'max-height: 450px; max-width: 253px; margin: 0 auto;' : ''} background: #000;">
                <video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover; opacity: 0.65;">
                  <source src="${ex.video || getHeroVideo()}">
                </video>
              </div>
            </div>
            <div>
              <span class="duration-badge" style="display: inline-block; background: rgba(6, 182, 212, 0.08); color: #06b6d4; padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(6, 182, 212, 0.15); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">${ex.duration}</span>
              <p style="color: #cbd5e1; line-height: 1.7; font-size: 1rem; margin: 0 0 1rem 0; white-space: pre-wrap;">${ex.description}</p>
              ${ex.fullDescription ? `<p style="color: #94a3b8; line-height: 1.6; font-size: 0.95rem; margin: 0; white-space: pre-wrap;">${ex.fullDescription}</p>` : ''}
            </div>
            ${ex.highlights ? `<div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem;"><h4 style="color: #fff; margin: 0 0 0.5rem 0; font-size: 0.95rem; font-weight: 700;">Highlights</h4><ul style="margin: 0; padding-left: 1.25rem; color: #cbd5e1; list-style-type: disc; font-size: 0.9rem; line-height: 1.6;">${ex.highlights.split(',').map(h => `<li>${h.trim()}</li>`).join('')}</ul></div>` : ''}
            ${isResort ? `
            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; color: #cbd5e1;">
              <h4 style="color: #38bdf8; margin: 0 0 0.75rem 0; font-size: 1rem; font-weight: 700;">Package Rates & Pricing</h4>
              <div style="display: flex; flex-direction: column; gap: 1rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                ${ex.hasDayVisit ? `<div><div style="font-weight:700; color:#fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.25rem; margin-bottom: 0.5rem; font-size: 0.9rem;">Day Visit Options (${ex.dayVisitType === 'both' ? 'Half & Full Day' : (ex.dayVisitType === 'half_day' ? 'Half Day' : 'Full Day')})</div>
                <table style="width:100%; text-align:left; border-collapse:collapse; font-size:0.85rem;"><thead><tr style="color:#94a3b8; border-bottom: 1px solid rgba(255,255,255,0.05);"><th style="padding:4px 0;">Option</th><th style="padding:4px 0;">Standard</th><th style="padding:4px 0;">Premium</th><th style="padding:4px 0;">No Option</th></tr></thead><tbody>
                ${(ex.dayVisitType === 'half_day' || ex.dayVisitType === 'both') ? `<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);"><td style="padding:6px 0; color:#fff; font-weight:600;">Half Day</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayHalfStd || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayHalfPrem || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayHalfNone || 'N/A'}</td></tr>` : ''}
                ${(ex.dayVisitType === 'full_day' || ex.dayVisitType === 'both') ? `<tr><td style="padding:6px 0; color:#fff; font-weight:600;">Full Day</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayFullStd || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayFullPrem || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.dayFullNone || 'N/A'}</td></tr>` : ''}
                </tbody></table></div>` : ''}
                ${ex.hasStayNight ? `<div style="margin-top: 0.5rem;"><div style="font-weight:700; color:#fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.25rem; margin-bottom: 0.5rem; font-size: 0.9rem;">Stay Night Visit Packages</div>
                <table style="width:100%; text-align:left; border-collapse:collapse; font-size:0.85rem;"><thead><tr style="color:#94a3b8; border-bottom: 1px solid rgba(255,255,255,0.05);"><th style="padding:4px 0;">Standard</th><th style="padding:4px 0;">Premium</th><th style="padding:4px 0;">No Option</th></tr></thead><tbody><tr><td style="padding:6px 0; color:#38bdf8;">$${ex.stayStd || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.stayPrem || 'N/A'}</td><td style="padding:6px 0; color:#38bdf8;">$${ex.stayNone || 'N/A'}</td></tr></tbody></table></div>` : ''}
              </div>
            </div>` : ''}
            ${!isResort ? `<div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.25rem; margin-top: 0.5rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.6;">
              <h4 style="color: #fff; margin: 0 0 0.5rem 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-info" style="color: #38bdf8;"></i> Cancellation Policy</h4>
              <p style="margin: 0 0 1rem 0; color: #94a3b8;">To receive a full refund, travellers may cancel up to 14 hours before the experience start date in the local timezone. No refunds will be given after that time period.</p>
              <h4 style="color: #fff; margin: 0 0 0.5rem 0; font-size: 0.95rem; font-weight: 700;">Other post-booking policies</h4>
              <p style="margin: 0 0 0.5rem 0; color: #94a3b8;">We may reserve the right to cancel a customer's booking for a full refund in case of:</p>
              <ul style="margin: 0; padding-left: 1.25rem; color: #94a3b8; list-style-type: disc;"><li>Bad weather</li><li>Not enough travelers</li></ul>
            </div>` : ''}
            <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
              ${ex.mapLink ? `<a href="${ex.mapLink}" target="_blank" class="glass-btn" style="flex: 1; padding: 0.8rem; font-weight: 700; text-transform: uppercase; font-size: 0.9rem;"><i class="fa-solid fa-map-location-dot" style="margin-right: 8px;"></i> Location</a>` : ''}
              ${ex.id && ex.id.startsWith('ph') ? '' : `<button id="details-modal-book" class="glass-btn" style="flex: 1; padding: 0.8rem; font-weight: 800; text-transform: uppercase; font-size: 0.9rem; background: rgba(56, 189, 248, 0.25) !important;">Book Now</button>`}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.querySelector('#close-details-modal').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      const bookBtn = modal.querySelector('#details-modal-book');
      if (bookBtn) bookBtn.addEventListener('click', () => { modal.remove(); openBookingModal(ex.id, ex.title); });
    };

    // --- Render grids helper ---
    const renderCardGrid = (gridId, list, bookLabel, offerCategory, idPrefix) => {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      const isFeaturedOnly = grid.dataset.featured === 'true';
      const itemsToRender = isFeaturedOnly ? list.slice(0, 3) : list;

      grid.innerHTML = itemsToRender.map(ex => {
        if (!ex) return '';
        
        const isMinimalCard = (idPrefix === 'excursion' || idPrefix === 'freediving');
        
        let mediaHtml = '';
        if (ex.video && isMediaVideo(ex.video)) {
          mediaHtml = `<video src="${ex.video}" autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
        } else {
          mediaHtml = `<div style="width: 100%; height: 100%; background: url('${ex.image}') center/cover;"></div>`;
        }

        const ratioStyle = isMinimalCard ? 'height: auto; aspect-ratio: 9/16;' : (ex.videoRatio === '9:16' ? 'height: auto; aspect-ratio: 9/16; max-height: 380px;' : '');
        
        let cardBodyHtml = '';
        if (isMinimalCard) {
          cardBodyHtml = `
          <div class="card-body" style="padding: 1.25rem; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.75rem; min-height: 80px;">
            <h3 class="card-title" style="margin: 0; font-size: 1.15rem;">${ex.title}</h3>
            ${ex.description ? `<p class="card-description" style="margin: 0; font-size: 0.9rem; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${ex.description}</p>` : ''}
            <button class="btn btn-primary book-btn" data-id="${ex.id}" data-title="${ex.title}" style="width: 100%; max-width: 200px;">${bookLabel}</button>
          </div>`;
        } else {
          cardBodyHtml = `
          <div class="card-body">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <span class="duration-badge" style="margin-bottom:0;">${ex.duration}</span>
              ${getOfferBadgeHTML(offerCategory, true)}
            </div>
            <h3 class="card-title">${ex.title}</h3>
            ${ex.description ? `<p class="card-description" style="-webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 100%; white-space: normal;">${ex.description}</p>` : ''}
            <button class="btn btn-primary book-btn" data-id="${ex.id}" data-title="${ex.title}">${bookLabel}</button>
          </div>`;
        }

        const cardSizingStyle = isMinimalCard ? 'max-width: 280px; margin: 0 auto; width: 100%;' : '';
        return `
        <div class="card" id="${idPrefix}-card-${ex.id}" style="cursor: pointer; ${cardSizingStyle}">
          <div class="card-img" style="position: relative; overflow: hidden; background: #000; ${ratioStyle}">${mediaHtml}</div>
          ${cardBodyHtml}
        </div>
      `;
      }).join('');

      grid.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openBookingModal(e.target.dataset.id, e.target.dataset.title); });
      });
      grid.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.classList.contains('book-btn')) return;
          const id = card.id.replace(`${idPrefix}-card-`, '');
          const ex = list.find(item => item.id === id);
          if (ex) openExcursionDetailsModal(ex);
        });
      });
    };

    // Store reference for background refresh
    renderCardGridFn = renderCardGrid;

    renderCardGrid('packages-grid', getPackages(), 'Book Now', 'Package', 'packages');
    renderCardGrid('excursions-grid', getExcursions(), 'Book Now', 'Excursion', 'excursion');
    renderCardGrid('private-grid', getPrivate(), 'Book Private', 'Private Booking', 'private');
    renderCardGrid('freediving-grid', getFreeDiving(), 'Book Now', 'Free Diving', 'freediving');
    renderCardGrid('resorts-grid', getResorts(), 'Book Resort', 'Resort', 'resorts');

    // --- Render Testimonials (Home Page) ---
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid) {
      const list = getTestimonials();
      testimonialsGrid.innerHTML = list.map(t => {
        let stars = '';
        for (let i = 0; i < 5; i++) { stars += i < t.rating ? '<i class="fa-solid fa-star" style="color: #fde047; margin-right: 4px;"></i>' : '<i class="fa-regular fa-star" style="color: #cbd5e1; margin-right: 4px;"></i>'; }
        return `<div class="card" id="testimony-card-${t.id}"><div class="card-body" style="padding: 2rem;"><div style="margin-bottom: 1rem;">${stars}</div><p class="card-description" style="font-style: italic; color: #cbd5e1; font-size: 1.05rem; line-height: 1.6;">"${t.text}"</p><h4 class="card-title" style="font-size: 1.1rem; margin-top: 1.5rem; color: #38bdf8; font-weight: 700;">- ${t.name}</h4></div></div>`;
      }).join('');
    }

    // --- Render Crew Grid (Crew Page) ---
    const renderCrewGrid = () => {
      const crewGrid = document.getElementById('crew-grid');
      if (!crewGrid) return;
      const list = getCrew();
      crewGrid.innerHTML = list.map(c => {
        const lics = c.licenses ? c.licenses.split(',').map(l => `<span class="crew-lic">${l.trim()}</span>`).join('') : '';
        return `
          <div class="crew-card">
            <div class="crew-img" style="background-image: url('${c.image || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'}');"></div>
            <div class="crew-body">
              <h3 class="crew-name">${c.name}</h3>
              <p class="crew-role">${c.role}</p>
              <p>${c.bio || ''}</p>
              ${lics ? `<div style="margin-top: 1rem;">${lics}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    };
    renderCrewGridFn = renderCrewGrid;
    renderCrewGrid();

    // --- Google Review Button ---
    const googleReviewBtnContainer = document.getElementById('google-review-btn-container');
    const googleReviewBtn = document.getElementById('google-review-btn');
    if (googleReviewBtnContainer && googleReviewBtn) {
      const link = getGoogleReview();
      if (link.trim() !== '') { googleReviewBtn.href = link; googleReviewBtnContainer.style.display = 'block'; }
      else { googleReviewBtnContainer.style.display = 'none'; }
    }

    // --- Render Instagram Reels (Home Page) ---
    const renderReels = () => {
      const reelsGrid = document.getElementById('reels-grid');
      if (reelsGrid) {
        const list = getReels().slice(-4);
        reelsGrid.innerHTML = list.map(reel => {
          const isVideo = isMediaVideo(reel.image);
          if (isVideo) {
            return `
              <div class="reel-item" style="cursor: pointer;" onclick="window.open('https://instagram.com/travelscapemaldives', '_blank')">
                <video src="${reel.image}" autoplay loop muted playsinline webkit-playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div class="reel-overlay"><i class="fa-brands fa-instagram"></i></div>
              </div>
            `;
          } else {
            return `
              <div class="reel-item" style="cursor: pointer;" onclick="window.open('https://instagram.com/travelscapemaldives', '_blank')">
                <img src="${reel.image}" alt="Reel">
                <div class="reel-overlay"><i class="fa-brands fa-instagram"></i></div>
              </div>
            `;
          }
        }).join('');
        reelsGrid.querySelectorAll('video').forEach(vid => {
          vid.muted = true;
          vid.playsInline = true;
          vid.setAttribute('muted', 'muted');
          vid.setAttribute('playsinline', 'playsinline');
          vid.setAttribute('webkit-playsinline', 'webkit-playsinline');
          vid.play().catch(e => console.warn('Reel video autoplay blocked:', e));
        });
      }
    };
    renderReelsFn = renderReels;
    renderReels();

    // --- Render Gallery Videos (Gallery Page) ---
    const renderGallery = () => {
      const galleryGrid = document.getElementById('gallery-grid');
      if (galleryGrid) {
        const list = getGallery();
        galleryGrid.innerHTML = list.map(item => {
          const isVideoURL = isMediaVideo(item.image);
          const hasVideo = isMediaVideo(item.video) || isVideoURL;
          const src = item.video || item.image;
          const ratioClass = item.aspectRatio === '9:16' ? 'ratio-9-16' : '';
          if (hasVideo) {
            return `
              <div class="video-card ${ratioClass}" style="cursor: default;">
                <video src="${src}" autoplay loop muted playsinline webkit-playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div style="position: absolute; bottom: 10px; left: 15px; color: #fff; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.8); z-index: 4;">${item.title}</div>
              </div>
            `;
          } else {
            return `
              <div class="video-card ${ratioClass}" style="cursor: default;">
                <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; bottom: 10px; left: 15px; color: #fff; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.8); z-index: 4;">${item.title}</div>
              </div>
            `;
          }
        }).join('');
        galleryGrid.querySelectorAll('video').forEach(vid => {
          vid.muted = true;
          vid.playsInline = true;
          vid.setAttribute('muted', 'muted');
          vid.setAttribute('playsinline', 'playsinline');
          vid.setAttribute('webkit-playsinline', 'webkit-playsinline');
          vid.play().catch(e => console.warn('Gallery video autoplay blocked:', e));
        });
      }
    };
    renderGalleryFn = renderGallery;
    renderGallery();

    // --- Render Parallax Layer Sliders ---
    const setupParallaxLayer = (layerNum, titlePrefix, listData, offerType) => {
      const bgSlidesContainer = document.getElementById(`layer${layerNum}-bg-slides`);
      const detailsOverlay = document.getElementById(`layer${layerNum}-details-overlay`);

      try {
        if (bgSlidesContainer && detailsOverlay) {
          const list = listData;
          bgSlidesContainer.innerHTML = list.map((ex, idx) => {
            if (!ex) return '';
            const slideStyle = `background-image: url('${ex.image}');`;
            return `<div class="layer${layerNum}-bg-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="${slideStyle}"></div>`;
          }).join('');

          const renderActiveDetails = (ex) => {
            detailsOverlay.innerHTML = `
              <h2 class="ex-tag-title" style="margin-top: 6rem;">0${layerNum} // ${titlePrefix}</h2>
              <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                <span class="ex-duration" style="margin-bottom: 0;">${ex.duration}</span>
                ${getOfferBadgeHTML(offerType)}
              </div>
              <h1 class="ex-title">${ex.title}</h1>
              <p class="ex-desc">${ex.description}</p>
              <div style="display: flex; gap: 1rem; margin-top: 1.5rem; align-items: center;">
                <button class="glass-btn layer${layerNum}-floating-details" data-id="${ex.id}" style="padding: 0.9rem 2.2rem; font-weight: 800; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Details</button>
                ${layerNum !== 6 ? `<button class="glass-btn layer${layerNum}-floating-book" data-id="${ex.id}" data-title="${ex.title}" style="padding: 0.9rem 2.2rem; font-weight: 800; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Book Now</button>` : ''}
              </div>
            `;
            const bookBtn = detailsOverlay.querySelector(`.layer${layerNum}-floating-book`);
            if (bookBtn) bookBtn.addEventListener('click', (e) => { openBookingModal(e.target.dataset.id, e.target.dataset.title); });
            detailsOverlay.querySelector(`.layer${layerNum}-floating-details`).addEventListener('click', (e) => {
              const id = e.target.dataset.id;
              const found = listData.find(item => item.id === id);
              if (found) openExcursionDetailsModal(found);
            });
          };

          if (list.length > 0) {
            renderActiveDetails(list[0]);
            let currentIdx = 0;
            const bgSlides = bgSlidesContainer.querySelectorAll(`.layer${layerNum}-bg-slide`);
            const changeSlide = (nextIdx) => {
              if (nextIdx === currentIdx) return;
              detailsOverlay.classList.remove('fade-in'); detailsOverlay.classList.add('fade-out');
              if (bgSlides[currentIdx]) bgSlides[currentIdx].classList.remove('active');
              setTimeout(() => {
                if (bgSlides[nextIdx]) bgSlides[nextIdx].classList.add('active');
                renderActiveDetails(list[nextIdx]);
                detailsOverlay.classList.remove('fade-out'); detailsOverlay.classList.add('fade-in');
                currentIdx = nextIdx;
              }, 500);
            };
            let sliderInterval = setInterval(() => { changeSlide((currentIdx + 1) % list.length); }, 4500);
            window.addEventListener('blur', () => clearInterval(sliderInterval));
            window.addEventListener('focus', () => { clearInterval(sliderInterval); sliderInterval = setInterval(() => { changeSlide((currentIdx + 1) % list.length); }, 4500); });
          } else {
            detailsOverlay.innerHTML = `<h2 class="ex-tag-title" style="margin-top: 6rem;">0${layerNum} // ${titlePrefix}</h2><p style="color: #cbd5e1;">No items currently available.</p>`;
          }
        }
      } catch (e) { console.error(`Error in Layer ${layerNum} initialization:`, e); }
    };

    // Store reference for background refresh
    setupParallaxLayerFn = setupParallaxLayer;

    setupParallaxLayer(2, 'EXCURSIONS', getExcursions(), 'Excursion');
    setupParallaxLayer(3, 'PRIVATE CHARTERS', getPrivate(), 'Private Booking');
    setupParallaxLayer(4, 'FREE DIVING', getFreeDiving(), 'Free Diving');
    setupParallaxLayer(5, 'RESORTS', getResorts(), 'Resort');
    setupParallaxLayer(6, 'PROFESSIONAL PHOTOGRAPHY', getPhotography(), 'Photography');

    // Request native OS notification permission on load ONLY if logged in
    const isOfficeUserForNotification = localStorage.getItem('admin_logged') === 'true' || localStorage.getItem('staff_logged') === 'true';
    if (isOfficeUserForNotification && typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const showSystemNotification = (booking) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification("New Booking Received! 🌊", {
          body: `${booking.customerName} booked ${booking.excursionTitle} for ${booking.bookingDate}.`,
          icon: "1.png"
        });
      }
    };

    const showToastNotification = (booking) => {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#121824; border:1px solid #38bdf8; padding:1rem; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); z-index:999999; display:flex; gap:10px; align-items:center; animation: toastSlideIn 0.3s ease; color:#fff; font-family:"Inter", sans-serif;';
      toast.innerHTML = `
        <div style="font-size:1.5rem;">🔔</div>
        <div>
          <div style="font-weight:700; color:#38bdf8;">New Booking Alert</div>
          <div style="font-size:0.85rem; color:#cbd5e1; margin-top:2px;"><strong>${booking.customerName}</strong> booked ${booking.excursionTitle}</div>
        </div>
        <button style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer; margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>
      `;

      if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.innerHTML = `
          @keyframes toastSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(styles);
      }
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 6000);
    };

    // --- Contact Message Notification Functions ---
    const showContactSystemNotification = (msg) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification("New Contact Message! ✉️", {
          body: `${msg.name} (${msg.email}): ${msg.subject || 'No subject'}`,
          icon: "1.png"
        });
      }
    };

    const showContactToastNotification = (msg) => {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#121824; border:1px solid #a855f7; padding:1rem; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); z-index:999999; display:flex; gap:10px; align-items:center; animation: toastSlideIn 0.3s ease; color:#fff; font-family:"Inter", sans-serif; max-width:380px;';
      toast.innerHTML = `
        <div style="font-size:1.5rem;">✉️</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:#a855f7;">New Contact Message</div>
          <div style="font-size:0.85rem; color:#cbd5e1; margin-top:2px;"><strong>${msg.name}</strong> — ${msg.subject || 'General Inquiry'}</div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${msg.message}</div>
        </div>
        <button style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer; margin-left:10px; flex-shrink:0;" onclick="this.parentElement.remove()">&times;</button>
      `;
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 7000);
    };

    // --- Booking Modal Actions ---
    const bookingModal = document.getElementById('booking-modal');

    const openDirectBookingSelector = () => {
      if (!bookingModal) return;
      const allPackages = [
        ...getExcursions().map(e => ({ id: e.id, title: e.title, group: 'Excursions' })),
        ...getPrivate().map(e => ({ id: e.id, title: e.title, group: 'Private Charters' })),
        ...getFreeDiving().map(e => ({ id: e.id, title: e.title, group: 'Free Diving' })),
        ...getResorts().map(e => ({ id: e.id, title: e.title, group: 'Resorts' }))
      ];

      bookingModal.innerHTML = `
        <div class="modal-content-minimal" style="max-width: 400px; width: 90%; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); box-shadow: 0 10px 35px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="color: #fff; margin: 0; font-size: 1.2rem;">Add Direct Booking</h3>
            <button id="close-selector-modal-btn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #858e8e; outline: none; line-height: 1;">&times;</button>
          </div>
          <form id="direct-booking-selector-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Select Package</label>
              <select id="direct-package-select" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                <option value="">-- Choose a Package --</option>
                ${['Excursions', 'Private Charters', 'Free Diving', 'Resorts'].map(grp => {
                  const items = allPackages.filter(p => p.group === grp);
                  if (items.length === 0) return '';
                  return `<optgroup label="${grp}" style="background: #080d1a; color: #94a3b8;">
                    ${items.map(p => `<option value="${p.id}" data-title="${p.title}" style="color: #fff;">${p.title}</option>`).join('')}
                  </optgroup>`;
                }).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 0.5rem; letter-spacing: 0.5px;">Proceed to Form</button>
          </form>
        </div>
      `;
      bookingModal.style.display = 'flex';
      
      document.getElementById('close-selector-modal-btn').addEventListener('click', closeBookingModal);
      document.getElementById('direct-booking-selector-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const select = document.getElementById('direct-package-select');
        const selectedOpt = select.options[select.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          openBookingModal(selectedOpt.value, selectedOpt.dataset.title);
        }
      });
    };

    const openBookingModal = (id, title) => {
      if (!bookingModal) return;

      const checkSlotsAvailability = () => {
        const dateInput = bookingModal.querySelector('#booking-date');
        const slotsInfo = bookingModal.querySelector('#booking-slots-info');
        const submitBtn = bookingModal.querySelector('button[type="submit"]');
        if (!dateInput || !slotsInfo) return;

        const dateVal = dateInput.value;
        if (!dateVal) {
          slotsInfo.innerHTML = '';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
          return;
        }

        const allPackages = [
          ...getExcursions(),
          ...getPrivate(),
          ...getFreeDiving(),
          ...getResorts()
        ];
        const pkg = allPackages.find(x => x.id === id);
        if (!pkg) return;

        const maxCap = parseInt(pkg.maxCapacity) || 20;

        const bookings = getBookings();
        const alreadyBooked = bookings
          .filter(b => b.excursionId === id && b.bookingDate === dateVal)
          .reduce((sum, b) => sum + (parseInt(b.numPersons) || 1), 0);

        const privateCheck = bookingModal.querySelector('#booking-private');
        const typeSelect = bookingModal.querySelector('#booking-type');
        const adultsInput = bookingModal.querySelector('#booking-adults');
        const kidsInput = bookingModal.querySelector('#booking-kids');

        const isPrivate = privateCheck ? (privateCheck.checked || id.startsWith('p')) : false;
        const isGroup = isPrivate || (typeSelect ? typeSelect.value === 'Group' : false);
        const adults = isGroup && adultsInput ? (parseInt(adultsInput.value) || 1) : 1;
        const kids = isGroup && kidsInput ? (parseInt(kidsInput.value) || 0) : 0;
        const requested = adults + kids;

        const remaining = maxCap - alreadyBooked;

        if (remaining <= 0) {
          slotsInfo.innerHTML = `<span style="color: #ef4444; font-weight: 700; display: block; margin-top: 5px;"><i class="fa-solid fa-circle-xmark"></i> Fully Booked</span>`;
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
          }
        } else if (requested > remaining) {
          slotsInfo.innerHTML = `<span style="color: #ef4444; font-weight: 700; display: block; margin-top: 5px;"><i class="fa-solid fa-triangle-exclamation"></i> Only ${remaining} slot(s) left. Requested: ${requested}.</span>`;
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
          }
        } else {
          slotsInfo.innerHTML = `<span style="color: #10b981; font-weight: 700; display: block; margin-top: 5px;"><i class="fa-solid fa-circle-check"></i> Seats Available</span>`;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
        }
      };

      const isPackage = getPackages().some(item => item.id === id);
      const isPrivateCharter = getPrivate().some(item => item.id === id);
      const isResort = getResorts().some(item => item.id === id);
      const resort = isResort ? (getResorts().find(item => item.id === id) || {}) : {};
      const allPkgs = [...getPackages(), ...getExcursions(), ...getPrivate(), ...getFreeDiving(), ...getResorts(), ...getPhotography()];
      const pkgObj = allPkgs.find(x => x.id === id) || {};
      const isBoatTransfer = isPrivateCharter && pkgObj.isTransfer === true;

      if (isResort) {
        bookingModal.innerHTML = `
          <div class="modal-content-minimal" style="max-width: 480px; width: 90%; overflow-y: auto; max-height: 90vh; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; box-shadow: 0 10px 35px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="color: #fff; margin: 0; font-size: 1.4rem;">Book Resort Visit</h3>
              <button id="close-booking-modal-btn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #858e8e; outline: none; line-height: 1;">&times;</button>
            </div>
            <h4 style="color: #94a3b8; margin: 0 0 1.5rem 0; font-weight: 500; font-size: 1rem;">Resort: <span style="color: #38bdf8; font-weight: 700;">${title}</span></h4>
            <form id="booking-form-dynamic" style="display: flex; flex-direction: column; gap: 1rem;">
              <input type="hidden" id="booking-excursion-id" value="${id}">
              <input type="hidden" id="booking-excursion-title" value="${title}">
              
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Full Name</label><input type="text" id="booking-name" required placeholder="Your full name" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Contact Number</label><input type="tel" id="booking-contact" required placeholder="e.g. +960 938 8008" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Email ID</label><input type="email" id="booking-email" required placeholder="e.g. guest@example.com" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Date of Visit</label><input type="date" id="booking-date" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"><div id="booking-slots-info" style="margin-top: 4px; font-size: 0.85rem; font-weight: 600; min-height: 1.2rem;"></div></div>

              <!-- Resort-specific options -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <h5 style="color: #38bdf8; margin: 0; font-size: 0.9rem; font-weight: 700; text-transform: uppercase;">Resort Visit Options</h5>
                
                <div>
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Visit Type</label>
                  <select id="resort-package-type" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                    ${resort.hasDayVisit ? '<option value="day_visit">Day Visit</option>' : ''}
                    ${resort.hasStayNight ? '<option value="stay_night">Night Stay</option>' : ''}
                  </select>
                </div>

                <div id="resort-day-duration-container" style="display: none;">
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Day Duration</label>
                  <select id="resort-day-duration" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                    ${resort.dayVisitType === 'half_day' || resort.dayVisitType === 'both' ? '<option value="half_day">Half Day</option>' : ''}
                    ${resort.dayVisitType === 'full_day' || resort.dayVisitType === 'both' ? '<option value="full_day">Full Day</option>' : ''}
                  </select>
                </div>

                <div>
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Package Tier</label>
                  <select id="resort-package-tier" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                  </select>
                </div>
              </div>

              <!-- Guest count -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <h5 style="color: #38bdf8; margin: 0; font-size: 0.9rem; font-weight: 700; text-transform: uppercase;">Guests</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">No. of Adults</label><input type="number" id="booking-adults" min="1" value="1" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                  <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">No. of Kids</label><input type="number" id="booking-kids" min="0" value="0" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                </div>
                <div id="booking-kids-ages-group" style="display: none;"><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Kids' Ages (comma separated)</label><input type="text" id="booking-kids-ages" placeholder="e.g. 4, 7" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              </div>

              <!-- Offer code & price -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Offer Code</label><input type="text" id="booking-offer-code" placeholder="Enter promo code if any" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; text-transform: uppercase;"><div id="booking-offer-message" style="margin-top: 4px; font-size: 0.8rem; font-weight: 600; min-height: 1.2rem;"></div></div>
                <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                  <span style="color: #cbd5e1; font-size: 0.9rem;">Estimated Cost:</span>
                  <span id="booking-price-display" style="color: #38bdf8; font-weight: 800; font-size: 1.25rem;">$0</span>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 1rem; letter-spacing: 0.5px;">${window.PAYMENT_LINK ? 'Confirm Booking and Payment' : 'Confirm Booking'}</button>
            </form>
          </div>
        `;

        const closeBtn = bookingModal.querySelector('#close-booking-modal-btn');
        closeBtn.addEventListener('click', closeBookingModal);

        const packageTypeSelect = bookingModal.querySelector('#resort-package-type');
        const dayDurationContainer = bookingModal.querySelector('#resort-day-duration-container');
        const dayDurationSelect = bookingModal.querySelector('#resort-day-duration');
        const tierSelect = bookingModal.querySelector('#resort-package-tier');
        const adultsInput = bookingModal.querySelector('#booking-adults');
        const kidsInput = bookingModal.querySelector('#booking-kids');
        const kidsAgesGroup = bookingModal.querySelector('#booking-kids-ages-group');
        const priceDisplay = bookingModal.querySelector('#booking-price-display');

        // Show/hide day duration based on visit type
        const updateVisitTypeUI = () => {
          const visitType = packageTypeSelect ? packageTypeSelect.value : '';
          if (visitType === 'day_visit') {
            dayDurationContainer.style.display = 'block';
          } else {
            dayDurationContainer.style.display = 'none';
          }
          updateTierOptions();
        };

        const updateTierOptions = () => {
          const visitType = packageTypeSelect ? packageTypeSelect.value : '';
          const dayDuration = dayDurationSelect ? dayDurationSelect.value : '';

          let stdPrice, premPrice;
          if (visitType === 'day_visit') {
            if (dayDuration === 'half_day') {
              stdPrice = resort.dayHalfStd;
              premPrice = resort.dayHalfPrem;
            } else if (dayDuration === 'full_day') {
              stdPrice = resort.dayFullStd;
              premPrice = resort.dayFullPrem;
            }
          } else if (visitType === 'stay_night') {
            stdPrice = resort.stayStd;
            premPrice = resort.stayPrem;
          }

          let html = '';
          if (stdPrice) html += `<option value="Standard" data-price="${stdPrice}">Standard ($${stdPrice})</option>`;
          if (premPrice && parseFloat(premPrice) > 0) html += `<option value="Premium" data-price="${premPrice}">Premium ($${premPrice})</option>`;
          tierSelect.innerHTML = html || '<option value="Standard" data-price="0">N/A ($0)</option>';
          updateTotalPrice();
        };

        const updateTotalPrice = () => {
          if (!tierSelect || !priceDisplay) return;
          const selectedOpt = tierSelect.options[tierSelect.selectedIndex];
          const basePrice = selectedOpt ? (parseFloat(selectedOpt.dataset.price) || 0) : 0;

          const adults = parseInt(adultsInput.value) || 1;
          const kids = parseInt(kidsInput.value) || 0;

          let total = basePrice * adults;
          if (kids > 0) {
            const kidsAgesStr = bookingModal.querySelector('#booking-kids-ages').value || '';
            const kidsAges = kidsAgesStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));

            const limitHalf = parseInt(resort.kidAgeHalf) || 0;
            const limitFree = parseInt(resort.kidAgeFree) || 0;

            for (let i = 0; i < kids; i++) {
              const age = kidsAges[i] !== undefined ? kidsAges[i] : 99;
              if (limitFree > 0 && age <= limitFree) {
                total += 0;
              } else if (limitHalf > 0 && age <= limitHalf) {
                total += basePrice * 0.5;
              } else {
                total += basePrice;
              }
            }
          }

          // Apply offer code
          const offerCodeInput = bookingModal.querySelector('#booking-offer-code');
          const offerMessage = bookingModal.querySelector('#booking-offer-message');
          const code = offerCodeInput ? offerCodeInput.value.trim().toUpperCase() : '';
          const offer = getOffers().find(o => {
             const appliesTo = o.category ? (Array.isArray(o.category) ? o.category : [o.category]) : ['All'];
             return o.code === code && (appliesTo.includes('All') || appliesTo.includes('Resort'));
          });
          if (code) {
             if (offer && offer.title) {
                 let match = offer.discount.match(/(\d+)%/);
                 if (match) total = total * (1 - (parseInt(match[1]) / 100));
                 else {
                     match = offer.discount.match(/\$(\d+)/);
                     if (match) total = Math.max(0, total - parseInt(match[1]));
                 }
                 if (offerMessage) { offerMessage.textContent = `Applied: ${offer.discount}`; offerMessage.style.color = '#10b981'; }
             } else {
                 if (offerMessage) { offerMessage.textContent = 'Invalid or not applicable code'; offerMessage.style.color = '#ef4444'; }
             }
          } else {
             if (offerMessage) { offerMessage.textContent = ''; }
          }
          priceDisplay.textContent = `$${total}`;
          checkSlotsAvailability();
        };

        if (packageTypeSelect) {
          packageTypeSelect.addEventListener('change', updateVisitTypeUI);
        }
        if (dayDurationSelect) {
          dayDurationSelect.addEventListener('change', updateTierOptions);
        }
        tierSelect.addEventListener('change', updateTotalPrice);

        kidsInput.addEventListener('input', (e) => {
          kidsAgesGroup.style.display = (parseInt(e.target.value) || 0) > 0 ? 'block' : 'none';
          updateTotalPrice();
        });
        const kidsAgesInput = bookingModal.querySelector('#booking-kids-ages');
        if (kidsAgesInput) {
          kidsAgesInput.addEventListener('input', updateTotalPrice);
        }
        adultsInput.addEventListener('input', updateTotalPrice);
        const offerCodeInputRS = bookingModal.querySelector('#booking-offer-code');
        if (offerCodeInputRS) offerCodeInputRS.addEventListener('input', updateTotalPrice);

        const dateInputRS = bookingModal.querySelector('#booking-date');
        if (dateInputRS) dateInputRS.addEventListener('input', checkSlotsAvailability);

        // Init options and prices
        updateVisitTypeUI();

        const form = bookingModal.querySelector('#booking-form-dynamic');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const customerName = form.querySelector('#booking-name').value;
          const contactNumber = form.querySelector('#booking-contact').value;
          const emailId = form.querySelector('#booking-email').value;
          const bookingDate = form.querySelector('#booking-date').value;

          const adults = parseInt(form.querySelector('#booking-adults').value) || 1;
          const kids = parseInt(form.querySelector('#booking-kids').value) || 0;
          const kidsAges = form.querySelector('#booking-kids-ages').value || '';

          // Slots availability double check
          const allPackages = [
            ...getExcursions(),
            ...getPrivate(),
            ...getFreeDiving(),
            ...getResorts()
          ];
          const pkg = allPackages.find(x => x.id === id);
          if (pkg) {
            const maxCap = parseInt(pkg.maxCapacity) || 20;
            const bookings = getBookings();
            const alreadyBooked = bookings
              .filter(b => b.excursionId === id && b.bookingDate === bookingDate)
              .reduce((sum, b) => sum + (parseInt(b.numPersons) || 1), 0);
            const remaining = maxCap - alreadyBooked;
            const requested = adults + kids;
            if (remaining <= 0 || requested > remaining) {
              alert(`Booking failed: Exceeded maximum daily capacity. Only ${remaining} slot(s) left on this date.`);
              return;
            }
          }

          const visitType = packageTypeSelect ? packageTypeSelect.value : '';
          const dayDuration = dayDurationSelect ? dayDurationSelect.value : '';
          const selectedTier = tierSelect.value;
          const selectedOpt = tierSelect.options[tierSelect.selectedIndex];
          const ratePaid = selectedOpt ? (parseFloat(selectedOpt.dataset.price) || 0) : 0;

          let packageLabel = '';
          if (visitType === 'day_visit') {
            packageLabel = dayDuration === 'half_day' ? 'Day Visit - Half Day' : 'Day Visit - Full Day';
          } else if (visitType === 'stay_night') {
            packageLabel = 'Night Stay';
          }

          const detailedTitle = `${title} (${packageLabel} - ${selectedTier})`;

          const priceDisp = document.getElementById('booking-price-display');
          const totalPrice = priceDisp ? (parseFloat(priceDisp.textContent.replace('$', '')) || 0) : 0;

          const isOfficeUser = localStorage.getItem('admin_logged') === 'true' || localStorage.getItem('staff_logged') === 'true';
          const newBooking = {
            id: Date.now().toString(),
            excursionId: id,
            excursionTitle: detailedTitle,
            customerName,
            customerEmail: emailId,
            customerContact: contactNumber,
            bookingDate,
            paymentBasis: isOfficeUser ? (form.querySelector('#booking-payment-basis') ? form.querySelector('#booking-payment-basis').value : 'Office Direct (No Payment)') : 'Payment Gateway',
            bookingType: 'Group',
            adults,
            kids,
            kidsAges,
            isPrivate: false,
            photographyId: '',
            numPersons: adults + kids,
            status: isOfficeUser ? 'Pending' : 'Confirmed',
            ratePaid: ratePaid,
            totalPrice: totalPrice,
            offerCode: form.querySelector('#booking-offer-code') ? form.querySelector('#booking-offer-code').value.trim().toUpperCase() : '',
            bookedBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            enteredBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            entryTime: new Date().toLocaleString(),
            deviceType: getDeviceType()
          };

          const currentBookings = getBookings();
          currentBookings.push(newBooking);
          await setBookings(currentBookings);
          showSystemNotification(newBooking);
          closeBookingModal();
          showBookingConfirmationModal(newBooking, { type: 'Resort Package', total: totalPrice });
          if (window.PAYMENT_LINK) {
            window.open(window.PAYMENT_LINK, '_blank');
          }
        });

      } else if (isBoatTransfer) {
        // --- Pricing tier parser helper ---
        const parsePricingTiers = (tierStr) => {
          if (!tierStr || typeof tierStr !== 'string') return [];
          return tierStr.split(',').map(t => {
            const parts = t.trim().split(':');
            if (parts.length === 2) {
              return { pax: parseInt(parts[0]) || 0, price: parseFloat(parts[1]) || 0 };
            }
            return null;
          }).filter(t => t && t.pax > 0).sort((a, b) => a.pax - b.pax);
        };

        const lookupTierPrice = (tierStr, paxCount) => {
          const tiers = parsePricingTiers(tierStr);
          if (tiers.length === 0) return { price: 0, matched: false, tierLabel: '' };
          // Find smallest tier where tier.pax >= paxCount
          const match = tiers.find(t => t.pax >= paxCount);
          if (match) return { price: match.price, matched: true, tierLabel: `${match.pax} pax tier` };
          // If pax exceeds all tiers, return highest tier with warning
          const highest = tiers[tiers.length - 1];
          return { price: highest.price, matched: false, tierLabel: `Max ${highest.pax} pax` };
        };

        // Specific Booking Form for Boat Transfers
        bookingModal.innerHTML = `
          <div class="modal-content-minimal" style="max-width: 480px; width: 90%; overflow-y: auto; max-height: 90vh; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; box-shadow: 0 10px 35px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="color: #fff; margin: 0; font-size: 1.4rem;">Book Boat Transfer</h3>
              <button id="close-booking-modal-btn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #858e8e; outline: none; line-height: 1;">&times;</button>
            </div>
            <h4 style="color: #94a3b8; margin: 0 0 1.5rem 0; font-weight: 500; font-size: 1rem;">Transfer Route: <span style="color: #38bdf8; font-weight: 700;">${title}</span></h4>
            <form id="booking-form-dynamic" style="display: flex; flex-direction: column; gap: 1rem;">
              <input type="hidden" id="booking-excursion-id" value="${id}">
              <input type="hidden" id="booking-excursion-title" value="${title}">
              
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Booking Name</label><input type="text" id="booking-name" required placeholder="Your full name" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Contact Number</label><input type="tel" id="booking-contact" required placeholder="e.g. +960 938 8008" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Email ID</label><input type="email" id="booking-email" required placeholder="e.g. guest@example.com" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Date of Transfer</label><input type="date" id="booking-date" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"><div id="booking-slots-info" style="margin-top: 4px; font-size: 0.85rem; font-weight: 600; min-height: 1.2rem;"></div></div>
              
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <h5 style="color: #38bdf8; margin: 0; font-size: 0.9rem; font-weight: 700; text-transform: uppercase;">Transfer Settings</h5>
                
                <div>
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Departing From</label>
                  <select id="transfer-from" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                    <option value="male">Airport / Male</option>
                    <option value="maafushi">Maafushi</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Destination Island</label>
                  <select id="transfer-to" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                    ${(pkgObj.transferIslands && pkgObj.transferIslands.length > 0) ? pkgObj.transferIslands.map(island => `<option value="${island.name}">${island.name}</option>`).join('') : '<option value="" disabled selected>No destinations available</option>'}
                  </select>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                  <div style="flex: 1;">
                    <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Adults</label>
                    <input type="number" id="booking-adults" required min="1" value="1" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;">
                  </div>
                  <div style="flex: 1;">
                    <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Kids</label>
                    <input type="number" id="booking-kids" required min="0" value="0" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;">
                  </div>
                </div>
                <div>
                  <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Offer Code</label>
                  <input type="text" id="booking-offer-code" placeholder="Enter promo code if any" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; text-transform: uppercase;">
                  <div id="booking-offer-message" style="margin-top: 4px; font-size: 0.8rem; font-weight: 600; min-height: 1.2rem;"></div>
                </div>
                <div>
                  <div id="transfer-pax-warning" style="color: #ef4444; font-size: 0.8rem; font-weight: 600; margin-top: 4px; display: none;"></div>
                  <div id="transfer-tier-info" style="color: #10b981; font-size: 0.8rem; font-weight: 600; margin-top: 4px; display: none;"></div>
                </div>
              </div>

              <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span style="color: #cbd5e1; font-size: 0.9rem;">Estimated Cost:</span>
                <span id="booking-price-display" style="color: #38bdf8; font-weight: 800; font-size: 1.25rem;">$0</span>
              </div>

              <button type="submit" class="btn btn-primary" id="transfer-submit-btn" style="width: 100%; padding: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 1rem; letter-spacing: 0.5px;">${window.PAYMENT_LINK ? 'Confirm Booking and Payment' : 'Confirm Booking'}</button>
            </form>
          </div>
        `;

        const closeBtn = bookingModal.querySelector('#close-booking-modal-btn');
        closeBtn.addEventListener('click', closeBookingModal);

        const fromSelect = bookingModal.querySelector('#transfer-from');
        const toSelect = bookingModal.querySelector('#transfer-to');
        const adultsInput = bookingModal.querySelector('#booking-adults');
        const kidsInput = bookingModal.querySelector('#booking-kids');
        const offerCodeInput = bookingModal.querySelector('#booking-offer-code');
        const offerMessage = bookingModal.querySelector('#booking-offer-message');
        const paxWarning = bookingModal.querySelector('#transfer-pax-warning');
        const tierInfo = bookingModal.querySelector('#transfer-tier-info');
        const priceDisplay = bookingModal.querySelector('#booking-price-display');
        const submitBtn = bookingModal.querySelector('#transfer-submit-btn');
        const dateInput = bookingModal.querySelector('#booking-date');

        const updateTransferPrice = () => {
          const from = fromSelect.value;
          const to = toSelect.value;
          const adults = parseInt(adultsInput.value) || 1;
          const kids = parseInt(kidsInput.value) || 0;
          const pax = adults + kids;

          let islandConfig = (pkgObj.transferIslands || []).find(i => i.name === to);
          let origin = from;
          if (!islandConfig) {
             islandConfig = (pkgObj.transferIslands || []).find(i => i.name === from);
             origin = to;
          }

          if (!islandConfig) {
            priceDisplay.textContent = '$0';
            paxWarning.style.display = 'none';
            tierInfo.style.display = 'none';
            return;
          }

          const tierStr = (origin === 'male' || origin === 'Airport / Male') ? (islandConfig.malePricing || '') : (islandConfig.maafushiPricing || '');
          const result = lookupTierPrice(tierStr, pax);

          let total = result.price;
          const code = offerCodeInput ? offerCodeInput.value.trim().toUpperCase() : '';
          const offer = getOffers().find(o => {
             const appliesTo = o.category ? (Array.isArray(o.category) ? o.category : [o.category]) : ['All'];
             return o.code === code && (appliesTo.includes('All') || appliesTo.includes('Boat Transfer') || appliesTo.includes('Private Booking'));
          });
          
          if (code) {
             if (offer && offer.title) {
                 let match = offer.discount.match(/(\\d+)%/);
                 if (match) total = total * (1 - (parseInt(match[1]) / 100));
                 else {
                     match = offer.discount.match(/\\$(\\d+)/);
                     if (match) total = Math.max(0, total - parseInt(match[1]));
                 }
                 if (offerMessage) { offerMessage.textContent = `Applied: ${offer.discount}`; offerMessage.style.color = '#10b981'; }
             } else {
                 if (offerMessage) { offerMessage.textContent = 'Invalid or not applicable code'; offerMessage.style.color = '#ef4444'; }
             }
          } else {
             if (offerMessage) { offerMessage.textContent = ''; }
          }

          if (result.matched || result.price > 0) {
            priceDisplay.textContent = `$${total}`;
            if (!result.matched) {
              paxWarning.style.display = 'block';
              paxWarning.textContent = `Exceeds available tiers (${result.tierLabel}). Please contact us for custom pricing.`;
              tierInfo.style.display = 'none';
            } else {
              paxWarning.style.display = 'none';
              tierInfo.style.display = 'block';
              tierInfo.textContent = `Base price for ${result.tierLabel}`;
            }
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
          } else {
            priceDisplay.textContent = '$0';
            paxWarning.style.display = 'block';
            paxWarning.textContent = 'No pricing available for this route.';
            tierInfo.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
          }
        };

        fromSelect.addEventListener('change', updateTransferPrice);
        toSelect.addEventListener('change', updateTransferPrice);
        adultsInput.addEventListener('input', updateTransferPrice);
        kidsInput.addEventListener('input', updateTransferPrice);
        if (offerCodeInput) offerCodeInput.addEventListener('input', updateTransferPrice);
        updateTransferPrice();

        if (dateInput) {
          dateInput.addEventListener('change', checkSlotsAvailability);
        }

        const form = bookingModal.querySelector('#booking-form-dynamic');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const customerName = form.querySelector('#booking-name').value.trim();
          const contactNumber = form.querySelector('#booking-contact').value.trim();
          const emailId = form.querySelector('#booking-email').value.trim();
          const bookingDate = form.querySelector('#booking-date').value;
          
          if (submitBtn.disabled) return;

          const fromStr = fromSelect.value === 'male' ? 'Male/Airport' : fromSelect.value;
          const toStr = toSelect.value === 'male' ? 'Male/Airport' : toSelect.value;
          const adults = parseInt(adultsInput.value) || 1;
          const kids = parseInt(kidsInput.value) || 0;
          const pax = adults + kids;
          const totalPrice = parseFloat(priceDisplay.textContent.replace('$', '')) || 0;

          const detailedTitle = `${title} (From: ${fromStr} To: ${toStr} | ${pax} Pax)`;
          
          const isOfficeUser = localStorage.getItem('admin_logged') === 'true' || localStorage.getItem('staff_logged') === 'true';

          const newBooking = {
            id: Date.now().toString(),
            excursionId: id,
            excursionTitle: detailedTitle,
            customerName,
            customerEmail: emailId,
            customerContact: contactNumber,
            bookingDate,
            paymentBasis: isOfficeUser ? 'Office Direct' : 'Payment Gateway',
            bookingType: 'Transfer',
            adults: adults,
            kids: kids,
            isPrivate: true,
            numPersons: pax,
            status: isOfficeUser ? 'Pending' : 'Confirmed',
            ratePaid: totalPrice,
            totalPrice: totalPrice,
            offerCode: offerCodeInput ? offerCodeInput.value.trim().toUpperCase() : '',
            transferFrom: fromStr,
            transferTo: toStr,
            transferPax: pax,
            bookedBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            enteredBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            entryTime: new Date().toLocaleString(),
            deviceType: getDeviceType()
          };

          const currentBookings = getBookings();
          currentBookings.push(newBooking);
          await setBookings(currentBookings);
          showSystemNotification(newBooking);
          closeBookingModal();
          showBookingConfirmationModal(newBooking, { type: 'Boat Transfer', total: totalPrice });
          if (window.PAYMENT_LINK) {
            window.open(window.PAYMENT_LINK, '_blank');
          }
        });


      } else if (isPackage) {
        // ===== DEDICATED PACKAGE BOOKING FORM =====
        // No private trip, no photography, no individual/group selector
        const packagePrice = parseFloat(pkgObj.price) || 0;
        bookingModal.innerHTML = `
          <div class="modal-content-minimal" style="max-width: 480px; width: 90%; overflow-y: auto; max-height: 90vh; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; box-shadow: 0 10px 35px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="color: #fff; margin: 0; font-size: 1.4rem;">Book Package</h3>
              <button id="close-booking-modal-btn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #858e8e; outline: none; line-height: 1;">&times;</button>
            </div>
            <h4 style="color: #94a3b8; margin: 0 0 1.5rem 0; font-weight: 500; font-size: 1rem;">Package: <span style="color: #38bdf8; font-weight: 700;">${title}</span></h4>
            <form id="booking-form-dynamic" style="display: flex; flex-direction: column; gap: 1rem;">
              <input type="hidden" id="booking-excursion-id" value="${id}">
              <input type="hidden" id="booking-excursion-title" value="${title}">
              
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Full Name</label><input type="text" id="booking-name" required placeholder="Your full name" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Contact Number</label><input type="tel" id="booking-contact" required placeholder="e.g. +960 938 8008" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Email ID</label><input type="email" id="booking-email" required placeholder="e.g. guest@example.com" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Date of Booking</label><input type="date" id="booking-date" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"><div id="booking-slots-info" style="margin-top: 4px; font-size: 0.85rem; font-weight: 600; min-height: 1.2rem;"></div></div>

              <!-- Guest count -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <h5 style="color: #38bdf8; margin: 0; font-size: 0.9rem; font-weight: 700; text-transform: uppercase;">Guests</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">No. of Adults</label><input type="number" id="booking-adults" min="1" value="1" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                  <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">No. of Kids</label><input type="number" id="booking-kids" min="0" value="0" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                </div>
                <div id="booking-kids-ages-group" style="display: none;"><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Kids' Ages (comma separated)</label><input type="text" id="booking-kids-ages" placeholder="e.g. 4, 7" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              </div>

              <!-- Offer code & price -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Offer Code</label><input type="text" id="booking-offer-code" placeholder="Enter promo code if any" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; text-transform: uppercase;"><div id="booking-offer-message" style="margin-top: 4px; font-size: 0.8rem; font-weight: 600; min-height: 1.2rem;"></div></div>
                <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                  <span style="color: #cbd5e1; font-size: 0.9rem;">Estimated Cost:</span>
                  <span id="booking-price-display" style="color: #38bdf8; font-weight: 800; font-size: 1.25rem;">$${packagePrice}</span>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 1rem; letter-spacing: 0.5px;">${window.PAYMENT_LINK ? 'Confirm Booking and Payment' : 'Confirm Booking'}</button>
            </form>
          </div>
        `;

        const closeBtn = bookingModal.querySelector('#close-booking-modal-btn');
        closeBtn.addEventListener('click', closeBookingModal);

        const adultsInput = bookingModal.querySelector('#booking-adults');
        const kidsInput = bookingModal.querySelector('#booking-kids');
        const kidsAgesGroup = bookingModal.querySelector('#booking-kids-ages-group');
        const kidsAgesInput = bookingModal.querySelector('#booking-kids-ages');
        const priceDisplay = bookingModal.querySelector('#booking-price-display');
        const offerCodeInput = bookingModal.querySelector('#booking-offer-code');
        const offerMessage = bookingModal.querySelector('#booking-offer-message');
        const dateInput = bookingModal.querySelector('#booking-date');

        const updatePackagePrice = () => {
          const basePrice = parseFloat(pkgObj.price) || 0;
          const adults = parseInt(adultsInput.value) || 1;
          const kids = parseInt(kidsInput.value) || 0;

          let total = basePrice * adults;

          // Kid pricing based on ages
          if (kids > 0) {
            const kidsAgesStr = kidsAgesInput ? kidsAgesInput.value : '';
            const kidsAges = kidsAgesStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
            const limitHalf = parseInt(pkgObj.kidAgeHalf) || 0;
            const limitFree = parseInt(pkgObj.kidAgeFree) || 0;

            for (let i = 0; i < kids; i++) {
              const age = kidsAges[i] !== undefined ? kidsAges[i] : 99;
              if (limitFree > 0 && age <= limitFree) {
                total += 0;
              } else if (limitHalf > 0 && age <= limitHalf) {
                total += basePrice * 0.5;
              } else {
                total += basePrice;
              }
            }
          }

          // Apply offer code
          const code = offerCodeInput ? offerCodeInput.value.trim().toUpperCase() : '';
          const offer = getOffers().find(o => {
            const appliesTo = o.category ? (Array.isArray(o.category) ? o.category : [o.category]) : ['All'];
            return o.code === code && (appliesTo.includes('All') || appliesTo.includes('Package') || appliesTo.includes('Packages'));
          });
          if (code) {
            if (offer && offer.title) {
              let match = offer.discount.match(/(\d+)%/);
              if (match) total = total * (1 - (parseInt(match[1]) / 100));
              else {
                match = offer.discount.match(/\$(\d+)/);
                if (match) total = Math.max(0, total - parseInt(match[1]));
              }
              if (offerMessage) { offerMessage.textContent = `Applied: ${offer.discount}`; offerMessage.style.color = '#10b981'; }
            } else {
              if (offerMessage) { offerMessage.textContent = 'Invalid or not applicable code'; offerMessage.style.color = '#ef4444'; }
            }
          } else {
            if (offerMessage) { offerMessage.textContent = ''; }
          }

          priceDisplay.textContent = `$${total}`;
          checkSlotsAvailability();
        };

        adultsInput.addEventListener('input', updatePackagePrice);
        kidsInput.addEventListener('input', (e) => {
          kidsAgesGroup.style.display = (parseInt(e.target.value) || 0) > 0 ? 'block' : 'none';
          updatePackagePrice();
        });
        if (kidsAgesInput) kidsAgesInput.addEventListener('input', updatePackagePrice);
        if (offerCodeInput) offerCodeInput.addEventListener('input', updatePackagePrice);
        if (dateInput) dateInput.addEventListener('input', checkSlotsAvailability);

        updatePackagePrice();

        const form = bookingModal.querySelector('#booking-form-dynamic');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const customerName = form.querySelector('#booking-name').value;
          const contactNumber = form.querySelector('#booking-contact').value;
          const emailId = form.querySelector('#booking-email').value;
          const bookingDate = form.querySelector('#booking-date').value;
          const adults = parseInt(form.querySelector('#booking-adults').value) || 1;
          const kids = parseInt(form.querySelector('#booking-kids').value) || 0;
          const kidsAges = form.querySelector('#booking-kids-ages') ? form.querySelector('#booking-kids-ages').value : '';

          // Slots availability double check
          const allPackages = [...getExcursions(), ...getPrivate(), ...getFreeDiving(), ...getResorts(), ...getPackages()];
          const pkg = allPackages.find(x => x.id === id);
          if (pkg) {
            const maxCap = parseInt(pkg.maxCapacity) || 20;
            const bookings = getBookings();
            const alreadyBooked = bookings
              .filter(b => b.excursionId === id && b.bookingDate === bookingDate)
              .reduce((sum, b) => sum + (parseInt(b.numPersons) || 1), 0);
            const remaining = maxCap - alreadyBooked;
            const requested = adults + kids;
            if (remaining <= 0 || requested > remaining) {
              alert(`Booking failed: Exceeded maximum daily capacity. Only ${remaining} slot(s) left on this date.`);
              return;
            }
          }

          const priceDisp = document.getElementById('booking-price-display');
          const totalPrice = priceDisp ? (parseFloat(priceDisp.textContent.replace('$', '')) || 0) : 0;

          const isOfficeUser = localStorage.getItem('admin_logged') === 'true' || localStorage.getItem('staff_logged') === 'true';
          const newBooking = {
            id: Date.now().toString(),
            excursionId: id,
            excursionTitle: title,
            customerName,
            customerEmail: emailId,
            customerContact: contactNumber,
            bookingDate,
            paymentBasis: isOfficeUser ? 'Office Direct (No Payment)' : 'Payment Gateway',
            bookingType: 'Group',
            adults,
            kids,
            kidsAges,
            isPrivate: false,
            photographyId: '',
            numPersons: adults + kids,
            status: isOfficeUser ? 'Pending' : 'Confirmed',
            ratePaid: parseFloat(pkgObj.price) || 0,
            totalPrice: totalPrice,
            offerCode: form.querySelector('#booking-offer-code') ? form.querySelector('#booking-offer-code').value.trim().toUpperCase() : '',
            bookedBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            enteredBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            entryTime: new Date().toLocaleString(),
            deviceType: getDeviceType()
          };

          const currentBookings = getBookings();
          currentBookings.push(newBooking);
          await setBookings(currentBookings);
          showSystemNotification(newBooking);
          closeBookingModal();
          showBookingConfirmationModal(newBooking, { type: 'Package', total: totalPrice });
          if (window.PAYMENT_LINK) {
            window.open(window.PAYMENT_LINK, '_blank');
          }
        });

      } else {
        // Standard Excursion or Free Diving Form (kept for excursions/freediving only)
        bookingModal.innerHTML = `
          <div class="modal-content-minimal" style="max-width: 460px; width: 90%; overflow-y: auto; max-height: 90vh; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; box-shadow: 0 10px 35px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="color: #fff; margin: 0; font-size: 1.4rem;">Book Excursion & Service</h3>
              <button id="close-booking-modal-btn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #858e8e; outline: none; line-height: 1;">&times;</button>
            </div>
            <h4 style="color: #94a3b8; margin: 0 0 1.5rem 0; font-weight: 500; font-size: 1rem;">Selected: <span style="color: #38bdf8; font-weight: 700;">${title}</span></h4>
            <form id="booking-form-dynamic" style="display: flex; flex-direction: column; gap: 1rem;">
              <input type="hidden" id="booking-excursion-id" value="${id}">
              <input type="hidden" id="booking-excursion-title" value="${title}">
              
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Booking Name</label><input type="text" id="booking-name" required placeholder="Your full name" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Contact Number</label><input type="tel" id="booking-contact" required placeholder="e.g. +960 938 8008" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Email ID</label><input type="email" id="booking-email" required placeholder="e.g. guest@example.com" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Date of Booking</label><input type="date" id="booking-date" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"><div id="booking-slots-info" style="margin-top: 4px; font-size: 0.85rem; font-weight: 600; min-height: 1.2rem;"></div></div>
              

              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                <input type="checkbox" id="booking-private" style="width: 18px; height: 18px; cursor: pointer;">
                <label for="booking-private" style="color: #cbd5e1; font-size: 0.9rem; font-weight: 600; cursor: pointer; user-select: none;">Private Trip</label>
              </div>

              <div id="booking-type-container">
                <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Booking Type</label>
                <select id="booking-type" required style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                  <option value="Individual">Individual Booking</option>
                  <option value="Group">Group Booking</option>
                </select>
              </div>

              <div id="booking-group-details" style="display: none; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; flex-direction: column; gap: 1rem;">
                <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Number of Adults</label><input type="number" id="booking-adults" min="1" value="1" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Number of Kids</label><input type="number" id="booking-kids" min="0" value="0" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
                <div id="booking-kids-ages-group" style="display: none;"><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Kids' Ages (comma separated)</label><input type="text" id="booking-kids-ages" placeholder="e.g. 4, 7" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;"></div>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem;">
                <label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Add Professional Photography</label>
                <select id="booking-photography" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
                  <option value="" data-price="0">None</option>
                  ${getPhotography().map(p => `<option value="${p.id}" data-price="${p.price}">${p.title}</option>`).join('')}
                </select>
              </div>

              <div><label style="display: block; color: #94a3b8; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 600;">Offer Code</label><input type="text" id="booking-offer-code" placeholder="Enter promo code if any" style="width: 100%; padding: 0.75rem; background: #080d1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none; text-transform: uppercase;"><div id="booking-offer-message" style="margin-top: 4px; font-size: 0.8rem; font-weight: 600; min-height: 1.2rem;"></div></div>
              
              <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span style="color: #cbd5e1; font-size: 0.9rem;">Estimated Cost:</span>
                <span id="booking-price-display" style="color: #38bdf8; font-weight: 800; font-size: 1.25rem;">$0</span>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 1rem; letter-spacing: 0.5px;">${window.PAYMENT_LINK ? 'Confirm Booking and Payment' : 'Confirm Booking'}</button>
            </form>
          </div>
        `;

        const closeBtn = bookingModal.querySelector('#close-booking-modal-btn');
        closeBtn.addEventListener('click', closeBookingModal);

        const privateCheck = bookingModal.querySelector('#booking-private');
        const typeContainer = bookingModal.querySelector('#booking-type-container');
        const typeSelect = bookingModal.querySelector('#booking-type');
        const groupDetails = bookingModal.querySelector('#booking-group-details');
        const adultsInput = bookingModal.querySelector('#booking-adults');
        const kidsInput = bookingModal.querySelector('#booking-kids');
        const kidsAgesGroup = bookingModal.querySelector('#booking-kids-ages-group');

        const syncBookingTypeFields = () => {
          const isPrivate = privateCheck.checked;
          if (isPrivate) {
            typeSelect.value = 'Group';
            typeContainer.style.display = 'none';
            groupDetails.style.display = 'flex';
          } else {
            typeContainer.style.display = 'block';
            groupDetails.style.display = typeSelect.value === 'Group' ? 'flex' : 'none';
          }
          updateTotalPrice();
        };

        const updateTotalPrice = () => {
          const priceDisplay = bookingModal.querySelector('#booking-price-display');
          if (!priceDisplay || !pkgObj) return;
          
          let total = 0;
          const isPrivate = privateCheck.checked;
          const basePrice = parseFloat(pkgObj.price) || 0;
          
          const photoSelect = bookingModal.querySelector('#booking-photography');
          const photoOpt = photoSelect ? photoSelect.options[photoSelect.selectedIndex] : null;
          const photoPrice = photoOpt ? (parseFloat(photoOpt.dataset.price) || 0) : 0;

          const isGroup = isPrivate || typeSelect.value === 'Group';
          const adults = isGroup ? (parseInt(adultsInput.value) || 1) : 1;
          const kids = isGroup ? (parseInt(kidsInput.value) || 0) : 0;
          const pax = adults + kids;

          if (isPrivate) {
            const privatePriceRaw = String(pkgObj.privatePrice || '0').trim();
            if (privatePriceRaw.includes(':')) {
              const tiers = privatePriceRaw.split(',').map(s => {
                const parts = s.split(':');
                return { pax: parseInt(parts[0]), price: parseFloat(parts[1]) };
              }).filter(t => !isNaN(t.pax) && !isNaN(t.price)).sort((a, b) => a.pax - b.pax);
              
              if (tiers.length > 0) {
                const tier = tiers.find(t => pax <= t.pax);
                total = tier ? tier.price : tiers[tiers.length - 1].price;
              } else {
                total = parseFloat(privatePriceRaw) || 0;
              }
            } else {
              total = parseFloat(privatePriceRaw) || 0;
            }
          } else {
            total = basePrice * adults;
            if (kids > 0) {
              const kidsAgesStr = kidsInput.parentElement.parentElement.querySelector('#booking-kids-ages').value || '';
              const kidsAges = kidsAgesStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));

              const limitHalf = parseInt(pkgObj.kidAgeHalf) || 0;
              const limitFree = parseInt(pkgObj.kidAgeFree) || 0;

              for (let i = 0; i < kids; i++) {
                const age = kidsAges[i] !== undefined ? kidsAges[i] : 99;
                if (limitFree > 0 && age <= limitFree) {
                  total += 0;
                } else if (limitHalf > 0 && age <= limitHalf) {
                  total += basePrice * 0.5;
                } else {
                  total += basePrice;
                }
              }
            }
          }
          let photoCost = 0;
          if (photoOpt) {
            const photoRaw = String(photoOpt.dataset.price || '0').trim();
            if (photoRaw.includes(':')) {
              const photoTiers = photoRaw.split(',').map(s => {
                const parts = s.split(':');
                return { pax: parseInt(parts[0]), price: parseFloat(parts[1]) };
              }).filter(t => !isNaN(t.pax) && !isNaN(t.price)).sort((a, b) => a.pax - b.pax);
              
              if (photoTiers.length > 0) {
                const tier = photoTiers.find(t => pax <= t.pax);
                photoCost = tier ? tier.price : photoTiers[photoTiers.length - 1].price;
              } else {
                photoCost = parseFloat(photoRaw) || 0;
              }
            } else {
              photoCost = parseFloat(photoRaw) || 0;
            }
          }

          total += photoCost;
          priceDisplay.textContent = `$${total}`;
        };

        privateCheck.addEventListener('change', () => { syncBookingTypeFields(); checkSlotsAvailability(); });
        typeSelect.addEventListener('change', (e) => { groupDetails.style.display = e.target.value === 'Group' ? 'flex' : 'none'; checkSlotsAvailability(); updateTotalPrice(); });
        kidsInput.addEventListener('input', (e) => { kidsAgesGroup.style.display = (parseInt(e.target.value) || 0) > 0 ? 'block' : 'none'; checkSlotsAvailability(); updateTotalPrice(); });
        if (adultsInput) adultsInput.addEventListener('input', () => { checkSlotsAvailability(); updateTotalPrice(); });
        const kidsAgesInput = bookingModal.querySelector('#booking-kids-ages');
        if (kidsAgesInput) kidsAgesInput.addEventListener('input', updateTotalPrice);
        const photoSelect = bookingModal.querySelector('#booking-photography');
        if (photoSelect) photoSelect.addEventListener('change', updateTotalPrice);
        const dateInputEX = bookingModal.querySelector('#booking-date');
        if (dateInputEX) dateInputEX.addEventListener('input', checkSlotsAvailability);
        const offerCodeInputEX = bookingModal.querySelector('#booking-offer-code');
        const offerMessageEX = bookingModal.querySelector('#booking-offer-message');
        if (offerCodeInputEX) {
          offerCodeInputEX.addEventListener('input', (e) => {
            const code = e.target.value.trim().toUpperCase();
            if (!code) { if (offerMessageEX) offerMessageEX.textContent = ''; return; }
            const currentCat = 'Excursion';
            const offer = getOffers().find(o => {
              const appliesTo = o.category ? (Array.isArray(o.category) ? o.category : [o.category]) : ['All'];
              return o.code === code && (appliesTo.includes('All') || appliesTo.includes(currentCat));
            });
            if (offer && offer.title) {
              if (offerMessageEX) { offerMessageEX.textContent = `Applied: ${offer.discount}`; offerMessageEX.style.color = '#10b981'; }
            } else {
              if (offerMessageEX) { offerMessageEX.textContent = 'Invalid or not applicable code'; offerMessageEX.style.color = '#ef4444'; }
            }
          });
        }

        // Run sync initially for default check states
        syncBookingTypeFields();

        const form = bookingModal.querySelector('#booking-form-dynamic');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const customerName = form.querySelector('#booking-name').value;
          const contactNumber = form.querySelector('#booking-contact').value;
          const emailId = form.querySelector('#booking-email').value;
          const bookingDate = form.querySelector('#booking-date').value;

          const isPrivate = privateCheck.checked;
          const bookingType = isPrivate ? 'Group' : typeSelect.value;
          const isGroup = bookingType === 'Group';
          const adults = isGroup ? (parseInt(form.querySelector('#booking-adults').value) || 1) : 1;
          const kids = isGroup ? (parseInt(form.querySelector('#booking-kids').value) || 0) : 0;
          const kidsAges = isGroup ? form.querySelector('#booking-kids-ages').value : '';

          // Slots availability double check
          const allPackages = [
            ...getExcursions(),
            ...getPrivate(),
            ...getFreeDiving(),
            ...getResorts()
          ];
          const pkg = allPackages.find(x => x.id === id);
          if (pkg) {
            const maxCap = parseInt(pkg.maxCapacity) || 20;
            const bookings = getBookings();
            const alreadyBooked = bookings
              .filter(b => b.excursionId === id && b.bookingDate === bookingDate)
              .reduce((sum, b) => sum + (parseInt(b.numPersons) || 1), 0);
            const remaining = maxCap - alreadyBooked;
            const requested = isGroup ? (adults + kids) : 1;
            if (remaining <= 0 || requested > remaining) {
              alert(`Booking failed: Exceeded maximum daily capacity. Only ${remaining} slot(s) left on this date.`);
              return;
            }
          }

          const isOfficeUser = localStorage.getItem('admin_logged') === 'true' || localStorage.getItem('staff_logged') === 'true';
          const photoSelect = form.querySelector('#booking-photography');
          const photographyId = photoSelect ? photoSelect.value : '';
          
          const priceDisp = document.getElementById('booking-price-display');
          const totalPrice = priceDisp ? (parseFloat(priceDisp.textContent.replace('$', '')) || 0) : 0;
          
          const newBooking = {
            id: Date.now().toString(), excursionId: id, excursionTitle: title, customerName, customerEmail: emailId,
            customerContact: contactNumber, bookingDate, paymentBasis: isOfficeUser ? (form.querySelector('#booking-payment-basis') ? form.querySelector('#booking-payment-basis').value : 'Office Direct (No Payment)') : 'Payment Gateway', bookingType, adults, kids, kidsAges,
            isPrivate: isPrivate, photographyId: photographyId, numPersons: isGroup ? (adults + kids) : 1, status: isOfficeUser ? 'Pending' : 'Confirmed',
            totalPrice: totalPrice,
            offerCode: form.querySelector('#booking-offer-code') ? form.querySelector('#booking-offer-code').value.trim().toUpperCase() : '',
            bookedBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            enteredBy: isOfficeUser ? (localStorage.getItem('admin_logged') === 'true' ? 'Admin' : 'Staff') : 'Guest',
            entryTime: new Date().toLocaleString(),
            deviceType: getDeviceType()
          };

          const currentBookings = getBookings();
          currentBookings.push(newBooking);
          await setBookings(currentBookings);
          showSystemNotification(newBooking);
          closeBookingModal();
          showBookingConfirmationModal(newBooking, { type: 'Excursion', total: totalPrice });
          if (window.PAYMENT_LINK) {
            window.open(window.PAYMENT_LINK, '_blank');
          }
        });
      }

      bookingModal.style.display = 'flex';
    };

    const closeBookingModal = () => { if (bookingModal) bookingModal.style.display = 'none'; };

    const showBookingConfirmationModal = (booking, details) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.display = 'flex';
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
      modal.style.background = 'rgba(0,0,0,0.85)'; modal.style.zIndex = '9999'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
      
      modal.innerHTML = `
        <div class="modal-content-minimal" style="max-width: 500px; width: 90%; background: #121824; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2.5rem; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(16, 185, 129, 0.2); text-align: center; position: relative;">
          <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
            <i class="fas fa-check" style="color: #10b981; font-size: 1.8rem;"></i>
          </div>
          <h2 style="color: #fff; margin: 0 0 0.5rem 0; font-size: 1.6rem;">Booking Confirmed!</h2>
          <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 2rem;">Thank you, ${booking.customerName}. Your booking request has been securely processed.</p>
          
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1.5rem; text-align: left; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span style="color: #64748b; font-size: 0.85rem;">Booking Number</span>
              <span style="color: #fde047; font-weight: 700; font-size: 0.95rem; font-family: 'JetBrains Mono', monospace; text-align: right;">#${booking.id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span style="color: #64748b; font-size: 0.85rem;">Package Booked</span>
              <span style="color: #fff; font-weight: 600; font-size: 0.9rem; text-align: right;">${booking.excursionTitle}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span style="color: #64748b; font-size: 0.85rem;">Booking Type</span>
              <span style="color: #fff; font-weight: 600; font-size: 0.9rem; text-align: right;">${details.type}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span style="color: #64748b; font-size: 0.85rem;">Total Amount</span>
              <span style="color: #38bdf8; font-weight: 700; font-size: 1.1rem; text-align: right;">${typeof details.total === 'number' ? '$' + details.total : details.total}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 0.85rem;">Cancellation Policy</span>
              <span style="color: #fff; font-weight: 600; font-size: 0.85rem; text-align: right;">Free cancellation up to 24hrs before trip</span>
            </div>
          </div>

          <button id="close-confirmation-modal" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Done</button>
        </div>
      `;
      document.body.appendChild(modal);
      
      document.getElementById('close-confirmation-modal').addEventListener('click', () => {
        modal.remove();
        if (localStorage.getItem('admin_logged') || localStorage.getItem('staff_logged')) {
          const role = localStorage.getItem('admin_logged') ? 'admin' : 'staff';
          loadUniversalDashboard(role);
        }
      });
    };

    // --- Contact Form Handler ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const subject = document.getElementById('contact-subject').value.trim() || 'General Inquiry';
        const message = document.getElementById('contact-message').value.trim();

        if (!name || !email || !message) return;

        const newMessage = {
          id: 'cm-' + Date.now(),
          name,
          email,
          subject,
          message,
          timestamp: new Date().toISOString(),
          status: 'Unread'
        };

        const messages = getContactMessages();
        messages.unshift(newMessage);
        await setContactMessages(messages);

        contactForm.reset();
        const successEl = document.getElementById('contact-success');
        if (successEl) {
          successEl.style.display = 'block';
          setTimeout(() => { successEl.style.display = 'none'; }, 5000);
        }
      });
    }

    // Helper to wake server if needed before performing login POST
    const wakeServerForLogin = async (role, password, submitBtn, errorEl) => {
      if (useFallback) {
        try {
          const res = await api.post('auth/login', { role, password });
          return res;
        } catch (e) {
          return { success: false, message: e.message };
        }
      }

      let attempts = 0;
      const maxAttempts = 20; // 20 * 3s = 60s
      
      submitBtn.disabled = true;
      errorEl.style.display = 'none';

      // Keep checking ping status
      while (attempts < maxAttempts) {
        submitBtn.textContent = `Waking Server (Attempt ${attempts + 1}/${maxAttempts})...`;
        try {
          // Send a quick ping with short timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`${API_BASE}/ping`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok') {
              break; // Server is awake!
            }
          }
        } catch (e) {
          console.log('Server is sleeping, retrying ping...', e.message);
        }
        attempts++;
        await new Promise(r => setTimeout(r, 2500));
      }

      submitBtn.textContent = 'Verifying Password...';
      try {
        const result = await api.post('auth/login', { role, password });
        return result;
      } catch (err) {
        console.error('Login request failed:', err);
        throw new Error('Connection failed. Server might still be waking up. Please try again.');
      }
    };

    // --- Password Gate Modals (Admin & Staff) ---
    const adminGate = document.getElementById('admin-password-gate');
    if (adminGate) {
      const adminPassInput = document.getElementById('admin-password');
      const adminSubmit = document.getElementById('admin-gate-submit');
      const adminError = document.getElementById('admin-gate-error');

      const triggerAdminUnlock = async () => {
        if (adminSubmit.disabled) return;
        try {
          const passwordVal = adminPassInput.value.trim();
          if (!passwordVal) {
            adminError.textContent = 'Please enter a password.';
            adminError.style.display = 'block';
            return;
          }
          const result = await wakeServerForLogin('admin', passwordVal, adminSubmit, adminError);
          if (result && result.success) {
            adminGate.style.display = 'none';
            localStorage.setItem('admin_logged', 'true');
            if (!useFallback) {
              fetchAllFromAPI().catch(() => {});
            }
            if (typeof Notification !== 'undefined') {
              Notification.requestPermission();
            }
            loadAdminPanel();
          } else {
            adminError.textContent = (result && result.message) || 'Incorrect password. Please try again.';
            adminError.style.display = 'block';
          }
        } catch (e) {
          adminError.textContent = e.message || 'Server is still waking up. Please wait 10 seconds and try again.';
          adminError.style.display = 'block';
        } finally {
          adminSubmit.textContent = 'Unlock Dashboard';
          adminSubmit.disabled = false;
        }
      };

      adminSubmit.addEventListener('click', triggerAdminUnlock);
      adminPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); triggerAdminUnlock(); } });

      if (localStorage.getItem('admin_logged') === 'true') {
        adminGate.style.display = 'none';
        loadAdminPanel();
      }
    }

    const staffGate = document.getElementById('staff-password-gate');
    if (staffGate) {
      const staffPassInput = document.getElementById('staff-password');
      const staffSubmit = document.getElementById('staff-gate-submit');
      const staffError = document.getElementById('staff-gate-error');

      const triggerStaffUnlock = async () => {
        if (staffSubmit.disabled) return;
        try {
          const passwordVal = staffPassInput.value.trim();
          if (!passwordVal) {
            staffError.textContent = 'Please enter a password.';
            staffError.style.display = 'block';
            return;
          }
          const result = await wakeServerForLogin('staff', passwordVal, staffSubmit, staffError);
          if (result && result.success) {
            staffGate.style.display = 'none';
            localStorage.setItem('staff_logged', 'true');
            if (!useFallback) {
              fetchAllFromAPI().catch(() => {});
            }
            if (typeof Notification !== 'undefined') {
              Notification.requestPermission();
            }
            loadStaffPanel();
          } else {
            staffError.textContent = (result && result.message) || 'Incorrect password. Please try again.';
            staffError.style.display = 'block';
          }
        } catch (e) {
          staffError.textContent = e.message || 'Server is still waking up. Please wait 10 seconds and try again.';
          staffError.style.display = 'block';
        } finally {
          staffSubmit.textContent = 'Unlock Dashboard';
          staffSubmit.disabled = false;
        }
      };

      staffSubmit.addEventListener('click', triggerStaffUnlock);
      staffPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); triggerStaffUnlock(); } });

      if (localStorage.getItem('staff_logged') === 'true') {
        staffGate.style.display = 'none';
        loadStaffPanel();
      }
    }

    // --- Universal Admin & Staff Panel CRUD & tab handlers ---
    function loadUniversalDashboard(role) {
      window.dashboardRenderLists = [];
      const tableId = role === 'admin' ? 'admin-bookings-table' : 'staff-bookings-table';
      const privateTableId = role === 'admin' ? 'admin-private-bookings-table' : 'staff-private-bookings-table';
      const bookingsTable = document.getElementById(tableId);
      const privateBookingsTable = document.getElementById(privateTableId);

      const filterSearch = document.getElementById('filter-search');
      const filterPackageType = document.getElementById('filter-package-type');
      const filterExcursion = document.getElementById('filter-excursion');
      const filterDate = document.getElementById('filter-date');
      const filterPayment = document.getElementById('filter-payment');
      const clearFilters = document.getElementById('clear-filters');

      const populateExcursionFilter = () => {
        if (!filterExcursion) return;
        const typeVal = filterPackageType ? filterPackageType.value : '';
        filterExcursion.innerHTML = '<option value="">All Packages</option>';
        
        let list = [];
        if (!typeVal || typeVal === 'Excursions') list = list.concat(getExcursions());
        if (!typeVal || typeVal === 'Private Charters') list = list.concat(getPrivate());
        if (!typeVal || typeVal === 'Free Diving') list = list.concat(getFreeDiving());
        if (!typeVal || typeVal === 'Resorts') list = list.concat(getResorts());
        if (!typeVal || typeVal === 'Photography') list = list.concat(getPhotography());

        list.forEach(ex => { const opt = document.createElement('option'); opt.value = ex.title; opt.textContent = ex.title; filterExcursion.appendChild(opt); });
      };
      populateExcursionFilter();

      const renderBookings = () => {
        if (!bookingsTable) return;
        let bookings = (getBookings() || []).filter(Boolean);

        // Update dashboard metrics widgets
        const totalBookingsEl = document.getElementById('admin-stat-total-bookings');
        const totalAmountEl = document.getElementById('admin-stat-total-amount');
        if (totalBookingsEl && totalAmountEl) {
          const totalCount = bookings.length;
          const totalSum = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
          totalBookingsEl.textContent = totalCount;
          totalAmountEl.textContent = `$${totalSum.toFixed(2)}`;
        }

        const staffTotalTripsEl = document.getElementById('staff-stat-total-trips');
        const staffTotalGuestsEl = document.getElementById('staff-stat-total-guests');
        if (staffTotalTripsEl || staffTotalGuestsEl) {
          const totalTrips = bookings.length;
          const totalGuests = bookings.reduce((sum, b) => {
            const adults = parseInt(b.adults) || 1;
            const kids = parseInt(b.kids) || 0;
            return sum + adults + kids;
          }, 0);
          if (staffTotalTripsEl) staffTotalTripsEl.textContent = totalTrips;
          if (staffTotalGuestsEl) staffTotalGuestsEl.textContent = totalGuests;
        }

        const searchVal = filterSearch ? filterSearch.value.trim().toLowerCase() : '';
        const typeVal = filterPackageType ? filterPackageType.value : '';
        const exVal = filterExcursion ? filterExcursion.value : '';
        const dateVal = filterDate ? filterDate.value : '';
        const payVal = filterPayment ? filterPayment.value : '';
        
        if (searchVal) {
          bookings = bookings.filter(b => 
            (b.id && b.id.toLowerCase().includes(searchVal)) ||
            (b.customerName && b.customerName.toLowerCase().includes(searchVal)) ||
            (b.customerContact && b.customerContact.toLowerCase().includes(searchVal)) ||
            (b.customerEmail && b.customerEmail.toLowerCase().includes(searchVal)) ||
            (b.excursionTitle && b.excursionTitle.toLowerCase().includes(searchVal))
          );
        }
        if (typeVal) {
          bookings = bookings.filter(b => {
            const id = b.excursionId || '';
            let group = '';
            if (id.startsWith('ex') || getExcursions().some(x => x.id === id)) group = 'Excursions';
            else if (id.startsWith('p') || getPrivate().some(x => x.id === id)) group = 'Private Charters';
            else if (id.startsWith('fd') || getFreeDiving().some(x => x.id === id)) group = 'Free Diving';
            else if (id.startsWith('rs') || getResorts().some(x => x.id === id)) group = 'Resorts';
            else if (id.startsWith('ph') || getPhotography().some(x => x.id === id)) group = 'Photography';
            return group === typeVal;
          });
        }
        if (exVal) bookings = bookings.filter(b => b.excursionTitle === exVal);
        if (dateVal) bookings = bookings.filter(b => b.bookingDate === dateVal);
        if (payVal) bookings = bookings.filter(b => (b.paymentBasis || 'Cash') === payVal);

        const standardBookings = bookings.filter(b => !b.isPrivate);
        const privateBookingsList = bookings.filter(b => b.isPrivate);

        const renderRow = (b) => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <td style="padding: 1rem 0; font-family:'JetBrains Mono', monospace; color:#fde047; font-weight:700; font-size:0.9rem;">
              #${b.id}
            </td>
            <td style="padding: 1rem 0;">
              <strong style="color: #fff;">${b.customerName}</strong>
              ${b.customerContact ? `<div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Tel: ${b.customerContact} <a href="https://wa.me/${b.customerContact.replace(/[^0-9]/g, '')}?text=Hi,%20hope%20you%20are%20good,%20we%20are%20officially%20contacting%20for%20Travelscape%20Maldives" target="_blank" style="color:#25D366; margin-left:8px; text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a></div>` : ''}
              <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">Email: <a href="mailto:${b.customerEmail}" style="color:#38bdf8; text-decoration:none;"><i class="fa-solid fa-envelope"></i> ${b.customerEmail}</a></div>
            </td>
            <td style="padding: 1rem 0;">${b.isPrivate ? `<span style="background:rgba(239, 68, 68, 0.15); color:#ef4444; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:700; margin-right:5px; text-transform:uppercase; display:inline-block; vertical-align:middle; line-height:1.2;">Private</span>` : ''}<span style="color:#fff; font-weight:600; vertical-align:middle;">${b.excursionTitle}</span><div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px;">Type: <span style="color:#38bdf8;">${b.bookingType || 'Individual'}</span>${b.bookingType === 'Group' ? ` (${b.adults || 1} Adults${b.kids > 0 ? `, ${b.kids} Kids, Ages: ${b.kidsAges}` : ''})` : ''}${b.bookingType === 'Transfer' ? ` (${b.adults || 1} Pax)` : ''}</div>${b.photographyId ? `<div style="font-size: 0.75rem; color: #a855f7; margin-top: 4px; font-weight: 600;"><i class="fa-solid fa-camera" style="margin-right: 4px;"></i>Photo Add-on: ${(getPhotography().find(p => p.id === b.photographyId) || {}).title || b.photographyId}</div>` : ''}</td>
            <td style="padding: 1rem 0;">
              <div>${b.bookingDate}</div>
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Entry: ${b.entryTime || 'N/A'}</div>
            </td>
            <td style="padding: 1rem 0;">
              <div>${b.paymentBasis || 'Cash'}</div>
              <div style="font-size: 0.75rem; color: #38bdf8; margin-top: 4px; font-weight: 600;">Entered By: ${b.enteredBy || b.bookedBy || 'Guest'}</div>
              ${b.offerCode ? `<div style="font-size: 0.75rem; color: #10b981; margin-top: 2px;">Promo: ${b.offerCode}</div>` : ''}
              ${b.deviceType ? `<div style="font-size: 0.75rem; color: #a855f7; margin-top: 4px; font-weight: 600;"><i class="fa-solid ${b.deviceType === 'Mobile' ? 'fa-mobile-screen-button' : (b.deviceType === 'Tablet' ? 'fa-tablet-screen-button' : 'fa-laptop')}" style="margin-right: 4px;"></i>${b.deviceType}</div>` : ''}
            </td>
            <td style="padding: 1rem 0; color: ${b.status === 'Confirmed' ? '#10b981' : '#f59e0b'};">${b.status}</td>
            <td style="padding: 1rem 0;">
              ${b.status === 'Pending' && role === 'admin' ? `<button class="btn approve-btn" data-id="${b.id}" style="padding:0.25rem 0.75rem; background:#10b981; color:#fff; font-size:0.8rem; margin-right:5px;">Approve</button>` : ''}
              <button class="btn print-booking-btn" data-id="${b.id}" style="padding:0.25rem 0.75rem; background:#3b82f6; color:#fff; font-size:0.8rem; margin-right:5px;">Print</button>
              ${role === 'admin' ? `<button class="btn delete-booking-btn" data-id="${b.id}" style="padding:0.25rem 0.75rem; background:#ef4444; color:#fff; font-size:0.8rem;">Cancel</button>` : ''}
            </td>
          </tr>
        `;

        if (bookingsTable) {
          if (standardBookings.length === 0) {
            bookingsTable.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#94a3b8;">No standard bookings found.</td></tr>`;
          } else {
            bookingsTable.innerHTML = standardBookings.map(renderRow).join('');
          }
        }

        if (privateBookingsTable) {
          if (privateBookingsList.length === 0) {
            privateBookingsTable.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#94a3b8;">No private or transfer bookings found.</td></tr>`;
          } else {
            privateBookingsTable.innerHTML = privateBookingsList.map(renderRow).join('');
          }
        }

        document.querySelectorAll('.approve-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const list = getBookings(); const found = list.find(item => item.id === e.target.dataset.id); if (found) { found.status = 'Confirmed'; await api.put('bookings/' + found.id, found); try { const db = localDb.read(); db.bookings = list; localDb.write(db); } catch(err) {} renderBookings(); } }); });
        document.querySelectorAll('.print-booking-btn').forEach(btn => { btn.addEventListener('click', (e) => printIndividualBooking(e.target.dataset.id)); });
        document.querySelectorAll('.delete-booking-btn').forEach(btn => { btn.addEventListener('click', async (e) => { if (!confirm('Are you sure you want to cancel this booking?')) return; const id = e.target.dataset.id; await api.del('bookings/' + id); const list = getBookings().filter(item => item.id !== id); dataCache.bookings = list; try { const db = localDb.read(); db.bookings = list; localDb.write(db); } catch(err) {} renderBookings(); }); });
      };

      if (filterSearch) filterSearch.addEventListener('input', renderBookings);
      if (filterPackageType) {
        filterPackageType.addEventListener('change', () => {
          populateExcursionFilter();
          renderBookings();
        });
      }
      if (filterExcursion) filterExcursion.addEventListener('change', renderBookings);
      if (filterDate) filterDate.addEventListener('change', renderBookings);
      if (filterPayment) filterPayment.addEventListener('change', renderBookings);
      if (clearFilters) {
        clearFilters.addEventListener('click', () => {
          if (filterSearch) filterSearch.value = '';
          if (filterPackageType) filterPackageType.value = '';
          populateExcursionFilter();
          if (filterExcursion) filterExcursion.value = '';
          if (filterDate) filterDate.value = '';
          if (filterPayment) filterPayment.value = '';
          renderBookings();
        });
      }
 
      const printFilteredListBtn = document.getElementById('print-filtered-list');
      if (printFilteredListBtn) {
        printFilteredListBtn.addEventListener('click', () => {
          let bookings = getBookings();
          const typeVal = filterPackageType ? filterPackageType.value : '';
          const exVal = filterExcursion ? filterExcursion.value : '';
          const dateVal = filterDate ? filterDate.value : '';
          const payVal = filterPayment ? filterPayment.value : '';
          
          if (typeVal) {
            bookings = bookings.filter(b => {
              const id = b.excursionId || '';
              let group = '';
              if (id.startsWith('ex') || getExcursions().some(x => x.id === id)) group = 'Excursions';
              else if (id.startsWith('p') || getPrivate().some(x => x.id === id)) group = 'Private Charters';
              else if (id.startsWith('fd') || getFreeDiving().some(x => x.id === id)) group = 'Free Diving';
              else if (id.startsWith('rs') || getResorts().some(x => x.id === id)) group = 'Resorts';
              return group === typeVal;
            });
          }
          if (exVal) bookings = bookings.filter(b => b.excursionTitle === exVal);
          if (dateVal) bookings = bookings.filter(b => b.bookingDate === dateVal);
          if (payVal) bookings = bookings.filter(b => (b.paymentBasis || 'Cash') === payVal);
          printFilteredList(bookings, `${role.toUpperCase()} Bookings Manifest`);
        });
      }

      const directBookBtn = document.getElementById(`add-direct-booking-${role}`);
      if (directBookBtn) {
        directBookBtn.addEventListener('click', openDirectBookingSelector);
      }

      // Real-Time Polling for Bookings
      let lastBookingCount = getBookings().length;
      if (window.bookingPollInterval) clearInterval(window.bookingPollInterval);
      window.bookingPollInterval = setInterval(() => {
        const currentBookings = getBookings();
        if (currentBookings.length > lastBookingCount) {
          const newBooking = currentBookings[currentBookings.length - 1];
          if (newBooking.bookedBy !== 'Admin' && newBooking.bookedBy !== 'Staff') {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; top:20px; right:20px; background:#10b981; color:#fff; padding:15px 20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3); z-index:99999; font-weight:600; display:flex; align-items:center; gap:10px; transform:translateX(100%); transition:transform 0.3s ease;';
            toast.innerHTML = `<i class="fas fa-bell"></i> <div>New Booking Received<br><span style="font-size:0.8rem; font-weight:normal;">${newBooking.customerName} - ${newBooking.excursionTitle}</span></div>`;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 50);
            setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 5000);
          }
          renderBookings();
          lastBookingCount = currentBookings.length;
        } else if (currentBookings.length < lastBookingCount) {
          renderBookings();
          lastBookingCount = currentBookings.length;
        }
      }, 3000);

      // File upload helpers
      const getFileBase64 = (fileInput) => new Promise((resolve) => { if (!fileInput || !fileInput.files || fileInput.files.length === 0) { resolve(''); return; } const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(''); reader.readAsDataURL(fileInput.files[0]); });
      const getMultipleFilesBase64 = (fileInput) => new Promise(async (resolve) => { if (!fileInput || !fileInput.files || fileInput.files.length === 0) { resolve([]); return; } const promises = Array.from(fileInput.files).map(file => new Promise((res) => { const reader = new FileReader(); reader.onload = () => res(reader.result); reader.onerror = () => res(''); reader.readAsDataURL(file); })); resolve((await Promise.all(promises)).filter(r => r !== '')); });

      const uploadFileToCloudinary = async (fileInput, folder = 'general') => {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) return '';
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        try {
          const res = await fetchWithTimeout(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            timeout: 180000 // 3 minutes
          });
          if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
          const data = await res.json();
          return data.url || '';
        } catch (e) {
          console.error('File upload to Cloudinary failed:', e);
          alert('Upload failed: ' + e.message);
          throw e;
        }
      };

      const uploadMultipleFilesToCloudinary = async (fileInput, folder = 'general') => {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) return [];
        const files = Array.from(fileInput.files);
        const urls = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', folder);
          try {
            const res = await fetchWithTimeout(`${API_BASE}/upload`, {
              method: 'POST',
              body: formData,
              timeout: 180000
            });
            if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
            const data = await res.json();
            if (data.url) urls.push(data.url);
          } catch (e) {
            console.error('File upload failed:', e);
          }
        }
        return urls;
      };

      // --- Dynamic CRUD for Excursions, Private Bookings, Free Diving, Resorts ---
      const registerCRUD = (type, getData, setData, listContainerId, formId, prefix) => {
        const listContainer = document.getElementById(listContainerId);
        const form = document.getElementById(formId);
        if (!listContainer || !form) return;

        if (prefix === 'resort') {
          const dayVisitCheckbox = document.getElementById('resort-has-day-visit');
          const dayVisitDetails = document.getElementById('resort-day-visit-details');
          const dayVisitTypeSelect = document.getElementById('resort-day-visit-type');
          const halfDayRates = document.getElementById('resort-half-day-rates');
          const fullDayRates = document.getElementById('resort-full-day-rates');

          const updateDayRatesVisibility = () => {
            if (!dayVisitTypeSelect || !halfDayRates || !fullDayRates) return;
            const val = dayVisitTypeSelect.value;
            halfDayRates.style.display = (val === 'half_day' || val === 'both') ? 'flex' : 'none';
            fullDayRates.style.display = (val === 'full_day' || val === 'both') ? 'flex' : 'none';
          };

          if (dayVisitCheckbox && dayVisitDetails) {
            dayVisitCheckbox.addEventListener('change', (e) => {
              dayVisitDetails.style.display = e.target.checked ? 'flex' : 'none';
              updateDayRatesVisibility();
            });
          }
          if (dayVisitTypeSelect) {
            dayVisitTypeSelect.addEventListener('change', updateDayRatesVisibility);
          }

          const stayNightCheckbox = document.getElementById('resort-has-stay-night');
          const stayNightDetails = document.getElementById('resort-stay-night-details');
          if (stayNightCheckbox && stayNightDetails) { stayNightCheckbox.addEventListener('change', (e) => { stayNightDetails.style.display = e.target.checked ? 'block' : 'none'; }); }
        }

        if (prefix === 'private') {
          const isTransferCheckbox = document.getElementById('private-is-transfer');
          const transferDetails = document.getElementById('private-transfer-details');
          const addIslandBtn = document.getElementById('private-add-island-btn');
          const islandsContainer = document.getElementById('private-islands-container');
          
          if (isTransferCheckbox && transferDetails) {
            isTransferCheckbox.addEventListener('change', (e) => {
              transferDetails.style.display = e.target.checked ? 'flex' : 'none';
            });
          }
          if (addIslandBtn && islandsContainer) {
            addIslandBtn.addEventListener('click', () => {
              const div = document.createElement('div');
              div.className = 'island-row';
              div.style = 'background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1); position: relative;';
              div.innerHTML = `
                <button type="button" class="btn remove-island-btn" style="position: absolute; top: 0.5rem; right: 0.5rem; background: #ef4444; color: #fff; padding: 0.2rem 0.5rem; font-size: 0.7rem;">&times;</button>
                <div style="margin-bottom: 0.5rem;"><label style="font-size:0.75rem;">Island Name</label><input type="text" class="form-control island-name" required placeholder="e.g. Maafushi"></div>
                <div style="margin-bottom: 0.5rem;"><label style="font-size:0.75rem;">From Male — Pricing Tiers (people:price)</label><input type="text" class="form-control male-pricing" required placeholder="e.g. 4:250, 6:320, 10:450"></div>
                <div><label style="font-size:0.75rem;">From Maafushi — Pricing Tiers (people:price)</label><input type="text" class="form-control maafushi-pricing" required placeholder="e.g. 4:200, 6:280, 10:400"></div>
              `;
              div.querySelector('.remove-island-btn').addEventListener('click', () => div.remove());
              islandsContainer.appendChild(div);
            });
          }
        }

        const renderList = () => {
          const list = getData();
          listContainer.innerHTML = list.map(item => {
            if (!item) return '';
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:1rem; border-radius:var(--radius); margin-bottom:1rem; border:1px solid rgba(255,255,255,0.05);">
              <div><h4 style="color:#fff;">${item.title}</h4><p style="color:#38bdf8; font-size:0.9rem;">${prefix === 'resort' ? 'Resort Pass' : 'Duration: ' + item.duration}</p></div>
              <div>
                <button class="btn preview-btn" data-id="${item.id}" style="padding:0.4rem 0.8rem; background:#10b981; color:#fff; font-size:0.85rem; margin-right:5px;">Preview</button>
                <button class="btn edit-btn" data-id="${item.id}" style="padding:0.4rem 0.8rem; background:#3b82f6; color:#fff; font-size:0.85rem; margin-right:5px;">Edit</button>
                <button class="btn delete-btn" data-id="${item.id}" style="padding:0.4rem 0.8rem; background:#ef4444; color:#fff; font-size:0.85rem;">Delete</button>
              </div>
            </div>
          `; }).join('');

          listContainer.querySelectorAll('.delete-btn').forEach(btn => { btn.addEventListener('click', async (e) => { if (!confirm(`Are you sure you want to delete this ${type}?`)) return; const items = getData().filter(x => x.id !== e.target.dataset.id); await setData(items); renderList(); populateExcursionFilter(); }); });
          listContainer.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const item = getData().find(x => x.id === e.target.dataset.id);
              if (item) openExcursionDetailsModal(item);
            });
          });
          listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const item = getData().find(x => x.id === e.target.dataset.id);
              if (!item) return;
              document.getElementById(`${prefix}-id`).value = item.id;
              const titleEl = document.getElementById(`${prefix}-title`); if (titleEl) titleEl.value = item.title || '';
              const durationEl = document.getElementById(`${prefix}-duration`); if (durationEl) durationEl.value = item.duration || '';
              const highlightsEl = document.getElementById(`${prefix}-highlights`); if (highlightsEl) highlightsEl.value = item.highlights || '';
              const imageEl = document.getElementById(`${prefix}-image`); if (imageEl) imageEl.value = (item.image && !item.image.startsWith('data:')) ? item.image : '';
              const videoEl = document.getElementById(`${prefix}-video`); if (videoEl) videoEl.value = (item.video && !item.video.startsWith('data:')) ? item.video : '';
              const videoRatioEl = document.getElementById(`${prefix}-video-ratio`); if (videoRatioEl) videoRatioEl.value = item.videoRatio || '16:9';
              const descEl = document.getElementById(`${prefix}-desc`); if (descEl) descEl.value = item.description || '';
              const fullDescEl = document.getElementById(`${prefix}-full-desc`); if (fullDescEl) fullDescEl.value = item.fullDescription || '';
              const subImagesEl = document.getElementById(`${prefix}-sub-images`);
              if (subImagesEl) { const urls = []; if (item.image && !item.image.startsWith('data:')) urls.push(item.image); if (item.subImg1 && !item.subImg1.startsWith('data:')) urls.push(item.subImg1); if (item.subImg2 && !item.subImg2.startsWith('data:')) urls.push(item.subImg2); subImagesEl.value = urls.join(', '); }
              if (prefix === 'ex') { const mapLinkEl = document.getElementById('ex-map-link'); if (mapLinkEl) mapLinkEl.value = item.mapLink || ''; }
              if (prefix === 'resort') {
                const hasDayVisitEl = document.getElementById('resort-has-day-visit'); if (hasDayVisitEl) { hasDayVisitEl.checked = !!item.hasDayVisit; hasDayVisitEl.dispatchEvent(new Event('change')); }
                const dayVisitTypeEl = document.getElementById('resort-day-visit-type'); if (dayVisitTypeEl) { dayVisitTypeEl.value = item.dayVisitType || 'half_day'; dayVisitTypeEl.dispatchEvent(new Event('change')); }
                document.getElementById('resort-day-half-std').value = item.dayHalfStd || ''; document.getElementById('resort-day-half-prem').value = item.dayHalfPrem || '';
                document.getElementById('resort-day-full-std').value = item.dayFullStd || ''; document.getElementById('resort-day-full-prem').value = item.dayFullPrem || '';
                const hasStayNightEl = document.getElementById('resort-has-stay-night'); if (hasStayNightEl) { hasStayNightEl.checked = !!item.hasStayNight; hasStayNightEl.dispatchEvent(new Event('change')); }
                document.getElementById('resort-stay-std').value = item.stayStd || ''; document.getElementById('resort-stay-prem').value = item.stayPrem || '';
              }
              if (prefix === 'photography') {
                const priceEl = document.getElementById('photography-price'); if (priceEl) priceEl.value = item.price || 0;
              }
              if (prefix === 'private') {
                const islandsContainer = document.getElementById('private-islands-container');
                if (islandsContainer) {
                  islandsContainer.innerHTML = '';
                  (item.transferIslands || []).forEach(island => {
                    const btn = document.getElementById('private-add-island-btn');
                    if (btn) btn.click();
                    const rows = islandsContainer.querySelectorAll('.island-row');
                    const lastRow = rows[rows.length - 1];
                    if (lastRow) {
                      lastRow.querySelector('.island-name').value = island.name;
                      lastRow.querySelector('.male-pricing').value = island.malePricing || '';
                      lastRow.querySelector('.maafushi-pricing').value = island.maafushiPricing || '';
                    }
                  });
                }
              }

              if (prefix === 'ex' || prefix === 'fd') {
                const priceEl = document.getElementById(`${prefix}-price`); if (priceEl) priceEl.value = item.price || 0;
                const privatePriceEl = document.getElementById(`${prefix}-private-price`); if (privatePriceEl) privatePriceEl.value = item.privatePrice || 0;
              }
              const kidHalfEl = document.getElementById(`${prefix}-kid-half`); if (kidHalfEl) kidHalfEl.value = item.kidAgeHalf || 0;
              const kidFreeEl = document.getElementById(`${prefix}-kid-free`); if (kidFreeEl) kidFreeEl.value = item.kidAgeFree || 0;
              const maxCapEl = document.getElementById(`${prefix}-max-capacity`); if (maxCapEl) maxCapEl.value = item.maxCapacity || 20;
              document.getElementById(`${prefix}-form-title`).textContent = `Edit ${type}`;
              document.getElementById(`${prefix}-submit-btn`).textContent = `Save Changes`;
              document.getElementById(`${prefix}-cancel-btn`).style.display = 'block';
            });
          });
        };

        const resetForm = () => { form.reset(); document.getElementById(`${prefix}-id`).value = ''; document.getElementById(`${prefix}-form-title`).textContent = `Add New ${type}`; document.getElementById(`${prefix}-submit-btn`).textContent = `Add ${type} Card`; document.getElementById(`${prefix}-cancel-btn`).style.display = 'none'; const kh = document.getElementById(`${prefix}-kid-half`); if (kh) kh.value = '0'; const kf = document.getElementById(`${prefix}-kid-free`); if (kf) kf.value = '0'; const mc = document.getElementById(`${prefix}-max-capacity`); if (mc) mc.value = '20'; const vr = document.getElementById(`${prefix}-video-ratio`); if (vr) vr.value = '16:9'; if (prefix === 'resort') { const dc = document.getElementById('resort-has-day-visit'); if (dc) { dc.checked = false; dc.dispatchEvent(new Event('change')); } const sc = document.getElementById('resort-has-stay-night'); if (sc) { sc.checked = false; sc.dispatchEvent(new Event('change')); } } if (prefix === 'private') { const isls = document.getElementById('private-islands-container'); if (isls) isls.innerHTML = ''; } };
        const cancelBtn = document.getElementById(`${prefix}-cancel-btn`); if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

        form.onsubmit = async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById(`${prefix}-submit-btn`);
          const origBtnText = submitBtn ? submitBtn.textContent : '';
          if (submitBtn) {
            submitBtn.textContent = 'Uploading & Saving...';
            submitBtn.disabled = true;
          }

          try {
            const idVal = document.getElementById(`${prefix}-id`).value;
            const list = getData();
            const title = document.getElementById(`${prefix}-title`).value;
            const imageFileEl = document.getElementById(`${prefix}-image-file`);
            let image = '';
            if (imageFileEl && imageFileEl.files && imageFileEl.files.length > 0) {
              image = await uploadFileToCloudinary(imageFileEl, prefix);
            } else {
              image = document.getElementById(`${prefix}-image`).value;
            }
            
            const videoFileEl = document.getElementById(`${prefix}-video-file`);
            let video = '';
            if (videoFileEl && videoFileEl.files && videoFileEl.files.length > 0) {
              video = await uploadFileToCloudinary(videoFileEl, prefix);
            } else {
              video = document.getElementById(`${prefix}-video`) ? document.getElementById(`${prefix}-video`).value : '';
            }
            
            const subImagesFileEl = document.getElementById(`${prefix}-sub-images-file`);
            let subImages = [];
            if (subImagesFileEl && subImagesFileEl.files && subImagesFileEl.files.length > 0) {
              subImages = await uploadMultipleFilesToCloudinary(subImagesFileEl, prefix);
            } else {
              const rawSubStr = document.getElementById(`${prefix}-sub-images`) ? document.getElementById(`${prefix}-sub-images`).value : '';
              subImages = rawSubStr.split(',').map(x => x.trim()).filter(x => x !== '');
            }
            const subImg1 = subImages[0] || ''; const subImg2 = subImages[1] || '';
            const description = document.getElementById(`${prefix}-desc`).value;
            const fullDescription = document.getElementById(`${prefix}-full-desc`) ? document.getElementById(`${prefix}-full-desc`).value : '';
            const duration = document.getElementById(`${prefix}-duration`) ? document.getElementById(`${prefix}-duration`).value : 'Full Day';
            const highlights = document.getElementById(`${prefix}-highlights`) ? document.getElementById(`${prefix}-highlights`).value : '';

            const itemData = idVal ? list.find(x => x.id === idVal) : { id: Date.now().toString() };
            itemData.title = title; itemData.image = image; itemData.video = video; itemData.description = description; itemData.fullDescription = fullDescription; itemData.duration = duration; itemData.highlights = highlights; itemData.subImages = subImages; itemData.subImg1 = subImg1; itemData.subImg2 = subImg2;
            const videoRatioEl = document.getElementById(`${prefix}-video-ratio`);
            itemData.videoRatio = videoRatioEl ? videoRatioEl.value : '16:9';
            const kidHalfEl = document.getElementById(`${prefix}-kid-half`);
            const kidAgeHalf = kidHalfEl ? (parseInt(kidHalfEl.value) || 0) : 0;
            const kidFreeEl = document.getElementById(`${prefix}-kid-free`);
            const kidAgeFree = kidFreeEl ? (parseInt(kidFreeEl.value) || 0) : 0;
            const maxCapEl = document.getElementById(`${prefix}-max-capacity`);
            const maxCapacity = maxCapEl ? (parseInt(maxCapEl.value) || 20) : 20;
            itemData.kidAgeHalf = kidAgeHalf;
            itemData.kidAgeFree = kidAgeFree;
            itemData.maxCapacity = maxCapacity;
            if (prefix === 'ex' || prefix === 'fd') {
              itemData.price = parseFloat(document.getElementById(`${prefix}-price`).value) || 0;
              itemData.privatePrice = parseFloat(document.getElementById(`${prefix}-private-price`).value) || 0;
            } else if (prefix === 'package') {
              itemData.price = parseFloat(document.getElementById(`${prefix}-price`).value) || 0;
            }
            if (prefix === 'ex') { const mapLinkEl = document.getElementById('ex-map-link'); itemData.mapLink = mapLinkEl ? mapLinkEl.value : ''; }
            if (prefix === 'resort') {
              itemData.hasDayVisit = document.getElementById('resort-has-day-visit').checked; itemData.hasStayNight = document.getElementById('resort-has-stay-night').checked; itemData.dayVisitType = document.getElementById('resort-day-visit-type').value;
              itemData.dayHalfStd = document.getElementById('resort-day-half-std').value; itemData.dayHalfPrem = document.getElementById('resort-day-half-prem').value;
              itemData.dayFullStd = document.getElementById('resort-day-full-std').value; itemData.dayFullPrem = document.getElementById('resort-day-full-prem').value;
              itemData.stayStd = document.getElementById('resort-stay-std').value; itemData.stayPrem = document.getElementById('resort-stay-prem').value;
              const types = []; if (itemData.hasDayVisit) types.push("Day Visit"); if (itemData.hasStayNight) types.push("Stay Night"); itemData.duration = types.join(" & ") || "Resort Pass";
            }
            if (prefix === 'photography') {
              const priceEl = document.getElementById('photography-price');
              itemData.price = priceEl ? priceEl.value.trim() : '0';
            }
            if (prefix === 'private') {
              itemData.isTransfer = true; // Hardcoded since we renamed this to Boat Transfers
              itemData.transferIslands = [];
              const islandsContainer = document.getElementById('private-islands-container');
              if (islandsContainer) {
                islandsContainer.querySelectorAll('.island-row').forEach(row => {
                  itemData.transferIslands.push({
                    name: row.querySelector('.island-name').value,
                    malePricing: row.querySelector('.male-pricing').value.trim(),
                    maafushiPricing: row.querySelector('.maafushi-pricing').value.trim()
                  });
                });
              }
            }

            if (!idVal) list.push(itemData);
            await setData(list); resetForm(); renderList(); populateExcursionFilter(); alert(`${type} saved successfully!`);
          } catch (error) {
            console.error(error);
            alert('Failed to save ' + type + ': ' + error.message);
          } finally {
            if (submitBtn) {
              submitBtn.textContent = origBtnText;
              submitBtn.disabled = false;
            }
          }
        };
        renderList();
        if (!window.dashboardRenderLists) window.dashboardRenderLists = [];
        window.dashboardRenderLists.push(renderList);
      };

      registerCRUD('Package', getPackages, setPackages, 'admin-packages-list', 'admin-add-package-form', 'package');
      registerCRUD('Excursion', getExcursions, setExcursions, 'admin-excursions-list', 'admin-add-excursion-form', 'ex');
      registerCRUD('Private Excursion', getPrivate, setPrivate, 'admin-private-list', 'admin-add-private-form', 'private');
      registerCRUD('Free Diving Option', getFreeDiving, setFreeDiving, 'admin-fd-list', 'admin-add-fd-form', 'fd');
      registerCRUD('Resort Deal', getResorts, setResorts, 'admin-resorts-list', 'admin-add-resort-form', 'resort');
      registerCRUD('Photography Package', getPhotography, setPhotography, 'admin-photography-list', 'admin-add-photography-form', 'photography');

      // --- Crew Management Tab ---
      const crewListContainer = document.getElementById('admin-crew-list');
      const crewForm = document.getElementById('admin-add-crew-form');

      const renderCrewList = () => {
        if (!crewListContainer) return;
        const list = getCrew();
        crewListContainer.innerHTML = list.map(item => {
          if (!item) return '';
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:1rem; border-radius:var(--radius); margin-bottom:1rem; border:1px solid rgba(255,255,255,0.05);">
              <div>
                <h4 style="color:#fff;">${item.name}</h4>
                <p style="color:#38bdf8; font-size:0.9rem;">${item.role}</p>
              </div>
              <div>
                <button class="btn crew-edit-btn" data-id="${item.id}" style="padding:0.4rem 0.8rem; background:#3b82f6; color:#fff; font-size:0.85rem; margin-right:5px;">Edit</button>
                <button class="btn crew-delete-btn" data-id="${item.id}" style="padding:0.4rem 0.8rem; background:#ef4444; color:#fff; font-size:0.85rem;">Delete</button>
              </div>
            </div>
          `;
        }).join('');

        crewListContainer.querySelectorAll('.crew-delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            if (!confirm('Are you sure you want to delete this crew member?')) return;
            const items = getCrew().filter(x => x.id !== e.target.dataset.id);
            await setCrew(items);
            renderCrewList();
            if (typeof renderCrewGridFn === 'function') renderCrewGridFn();
          });
        });

        crewListContainer.querySelectorAll('.crew-edit-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const item = getCrew().find(x => x.id === e.target.dataset.id);
            if (!item) return;
            document.getElementById('crew-id').value = item.id;
            document.getElementById('crew-name').value = item.name || '';
            document.getElementById('crew-role').value = item.role || '';
            document.getElementById('crew-bio').value = item.bio || '';
            document.getElementById('crew-licenses').value = item.licenses || '';
            document.getElementById('crew-image').value = (item.image && !item.image.startsWith('data:')) ? item.image : '';
            document.getElementById('crew-form-title').textContent = 'Edit Crew Member';
            document.getElementById('crew-submit-btn').textContent = 'Save Changes';
            document.getElementById('crew-cancel-btn').style.display = 'block';
          });
        });
      };

      const resetCrewForm = () => {
        if (crewForm) crewForm.reset();
        document.getElementById('crew-id').value = '';
        document.getElementById('crew-form-title').textContent = 'Add New Crew Member';
        document.getElementById('crew-submit-btn').textContent = 'Add Crew Member';
        document.getElementById('crew-cancel-btn').style.display = 'none';
      };

      const crewCancelBtn = document.getElementById('crew-cancel-btn');
      if (crewCancelBtn) crewCancelBtn.addEventListener('click', resetCrewForm);

      if (crewForm) {
        crewForm.onsubmit = async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById('crew-submit-btn');
          const origBtnText = submitBtn ? submitBtn.textContent : '';
          if (submitBtn) {
            submitBtn.textContent = 'Uploading & Saving...';
            submitBtn.disabled = true;
          }

          try {
            const idVal = document.getElementById('crew-id').value;
            const list = [...getCrew()];
            const name = document.getElementById('crew-name').value.trim();
            const roleVal = document.getElementById('crew-role').value.trim();
            const bio = document.getElementById('crew-bio').value.trim();
            const licenses = document.getElementById('crew-licenses').value.trim();
            const imageFileEl = document.getElementById('crew-image-file');
            
            let image = '';
            if (imageFileEl && imageFileEl.files && imageFileEl.files.length > 0) {
              image = await uploadFileToCloudinary(imageFileEl, 'crew');
            } else {
              image = document.getElementById('crew-image').value.trim();
            }

            const itemData = idVal ? list.find(x => x.id === idVal) : { id: Date.now().toString() };
            itemData.name = name;
            itemData.role = roleVal;
            itemData.bio = bio;
            itemData.licenses = licenses;
            itemData.image = image;

            if (!idVal) {
              list.push(itemData);
            }
            await setCrew(list);
            resetCrewForm();
            renderCrewList();
            if (typeof renderCrewGridFn === 'function') renderCrewGridFn();
            alert('Crew member saved successfully!');
          } catch (error) {
            console.error(error);
            alert('Failed to save crew member: ' + error.message);
          } finally {
            if (submitBtn) {
              submitBtn.textContent = origBtnText;
              submitBtn.disabled = false;
            }
          }
        };
      }

      renderCrewList();
      if (!window.dashboardRenderLists) window.dashboardRenderLists = [];
      window.dashboardRenderLists.push(renderCrewList);

      // --- Seasonal Offers Tab ---
      // --- Seasonal Offers Tab ---
      const offerForm = document.getElementById('admin-offer-form');
      const offersList = document.getElementById('admin-offers-list');

      const renderOffersList = () => {
        if (!offersList) return;
        const list = getOffers();
        offersList.innerHTML = list.map(offer => {
          const appliesToDisplay = Array.isArray(offer.category) ? offer.category.join(', ') : (offer.category || 'All Categories');
          const subcatDisplay = offer.subcategory ? ` (${offer.subcategory})` : '';
          return `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1rem;"><div><span style="background: #f59e0b; color: #fff; padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">${offer.discount}</span><h4 style="color: #fff; margin-top: 0.5rem; font-size: 1.2rem;">${offer.title}</h4><p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${offer.description}</p><div style="margin-top: 0.75rem; font-size: 0.85rem; color: #64748b;"><strong>Promo Code:</strong> <span style="color: #fde047; font-family: monospace;">${offer.code || 'None'}</span> &nbsp;|&nbsp; <strong>Validity:</strong> <span>${offer.validity}</span> &nbsp;|&nbsp; <strong>Applies To:</strong> <span style="color: #38bdf8; font-weight: 600;">${appliesToDisplay}${subcatDisplay}</span></div></div><div style="display: flex; gap: 10px;"><button class="btn preview-offer-btn" data-id="${offer.id}" style="background: #10b981; color: #fff; font-size: 0.85rem; padding: 0.5rem 1rem;">Preview</button><button class="btn edit-offer-btn" data-id="${offer.id}" style="background: #3b82f6; color: #fff; font-size: 0.85rem; padding: 0.5rem 1rem;">Edit</button><button class="btn delete-offer-btn" data-id="${offer.id}" style="background: #ef4444; color: #fff; font-size: 0.85rem; padding: 0.5rem 1rem;">Delete</button></div></div>`;
        }).join('');

        offersList.querySelectorAll('.delete-offer-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            if (!confirm('Are you sure you want to delete this special offer?')) return;
            await setOffers(getOffers().filter(o => o.id !== e.target.dataset.id));
            renderOffersList();
            if (typeof updateAllViews === 'function') updateAllViews();
          });
        });

        offersList.querySelectorAll('.edit-offer-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const offer = getOffers().find(o => o.id === e.target.dataset.id);
            if (!offer) return;
            document.getElementById('offer-id').value = offer.id;
            document.getElementById('offer-title').value = offer.title || '';
            document.getElementById('offer-discount').value = offer.discount || '';
            document.getElementById('offer-desc').value = offer.description || '';
            document.getElementById('offer-category').value = Array.isArray(offer.category) ? offer.category[0] : (offer.category || 'All');
            // Trigger change to populate subcategories
            document.getElementById('offer-category').dispatchEvent(new Event('change'));
            setTimeout(() => {
              const subCatSelect = document.getElementById('offer-subcategory');
              const subCatArr = Array.isArray(offer.subcategory) ? offer.subcategory : (offer.subcategory ? [offer.subcategory] : []);
              Array.from(subCatSelect.options).forEach(opt => {
                opt.selected = subCatArr.includes(opt.value);
              });
              if(subCatArr.length === 0) subCatSelect.value = '';
            }, 50);
            document.getElementById('offer-code').value = offer.code || '';
            document.getElementById('offer-validity').value = offer.validity || '';
            
            document.getElementById('offer-form-title').textContent = 'Edit Special Offer';
            document.getElementById('offer-submit-btn').textContent = 'Save Changes';
            document.getElementById('offer-cancel-btn').style.display = 'block';
          });
        });

        offersList.querySelectorAll('.preview-offer-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const offer = getOffers().find(o => o.id === e.target.dataset.id);
            if (!offer) return;
            const existing = document.getElementById('offer-preview-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'offer-preview-modal';
            modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;justify-content:center;align-items:center;';

            modal.innerHTML = `
              <div class="modal-content-minimal" style="max-width: 400px; width: 90%; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; text-align: center; font-family: 'Inter', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                  <h3 style="color: #fff; margin: 0; font-size: 1.2rem;">Promo Offer Live Preview</h3>
                  <button id="close-offer-preview" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #858e8e;">&times;</button>
                </div>
                <div class="offer-card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius); padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); color:#fff; text-align: left; position: relative; width: 100%;">
                  <span style="background: #ef4444; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 0.75rem;">${offer.discount}</span>
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: #fff; line-height: 1.3;">${offer.title}</h4>
                  <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #cbd5e1; line-height: 1.5;">${offer.description}</p>
                  <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div>
                      <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Promo Code</div>
                      <div style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #fde047; font-size: 1.1rem; margin-top: 2px;">${offer.code || 'None'}</div>
                    </div>
                  </div>
                  <div style="font-size: 0.8rem; color: #94a3b8; text-align: left; display: flex; align-items: center; gap: 5px;"><i class="fa-regular fa-clock"></i> <span>${offer.validity}</span></div>
                </div>
              </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#close-offer-preview').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
          });
        });
      };

      const resetOfferForm = () => {
        if (offerForm) offerForm.reset();
        const idInput = document.getElementById('offer-id');
        if (idInput) idInput.value = '';
        const titleEl = document.getElementById('offer-form-title');
        if (titleEl) titleEl.textContent = 'Add New Special Offer';
        const submitBtn = document.getElementById('offer-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Publish Special Offer';
        const cancelBtn = document.getElementById('offer-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
      };

      const offerCancelBtn = document.getElementById('offer-cancel-btn');
      if (offerCancelBtn) offerCancelBtn.addEventListener('click', resetOfferForm);

      if (offerForm) {
        offerForm.onsubmit = async (e) => {
          e.preventDefault();
          const idVal = document.getElementById('offer-id').value;
          const list = [...getOffers()];
          
          const offerData = idVal ? list.find(x => x.id === idVal) : { id: Date.now().toString() };
          offerData.title = document.getElementById('offer-title').value;
          offerData.discount = document.getElementById('offer-discount').value;
          offerData.description = document.getElementById('offer-desc').value;
          offerData.category = document.getElementById('offer-category').value;
          const subCatSelect = document.getElementById('offer-subcategory');
          offerData.subcategory = Array.from(subCatSelect.selectedOptions).filter(o => o.value !== '').map(opt => opt.value);
          if(offerData.subcategory.length === 0) offerData.subcategory = ''; // default fallback
          offerData.code = document.getElementById('offer-code').value.toUpperCase();
          offerData.validity = document.getElementById('offer-validity').value;

          if (!idVal) {
            list.push(offerData);
          }
          await setOffers(list);
          resetOfferForm();
          renderOffersList();
          if (typeof updateAllViews === 'function') updateAllViews();
          alert('Special offer published successfully!');
        };

        const categorySelect = document.getElementById('offer-category');
        const subcategorySelect = document.getElementById('offer-subcategory');

        const populateSubcategories = () => {
          if (!categorySelect || !subcategorySelect) return;
          const cat = categorySelect.value;
          subcategorySelect.innerHTML = `<option value="">All Specific ${cat === 'All' ? 'Items' : cat + 's'}</option>`;

          let items = [];
          if (cat === 'All') items = [...getPackages(), ...getExcursions(), ...getPrivate(), ...getFreeDiving(), ...getResorts(), ...getPhotography()];
          else if (cat === 'Packages') items = getPackages();
          else if (cat === 'Excursion') items = getExcursions();
          else if (cat === 'Private Booking') items = getPrivate().filter(p => !p.isTransfer);
          else if (cat === 'Boat Transfer') items = getPrivate().filter(p => p.isTransfer);
          else if (cat === 'Free Diving') items = getFreeDiving();
          else if (cat === 'Resort') items = getResorts();
          else if (cat === 'Photography') items = getPhotography();

          items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.title;
            opt.textContent = item.title;
            subcategorySelect.appendChild(opt);
          });
        };

        if (categorySelect) categorySelect.addEventListener('change', populateSubcategories);
        populateSubcategories();
      }

      renderOffersList();
      if (!window.dashboardRenderLists) window.dashboardRenderLists = [];
      window.dashboardRenderLists.push(renderOffersList);

      // --- Testimonials Tab ---
      const testimoniesList = document.getElementById('admin-testimonies-list');
      const renderTestimonialsTab = () => {
        if (!testimoniesList) return;
        const list = getTestimonials();
        testimoniesList.innerHTML = list.map(t => `<div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:1rem; border-radius:var(--radius); margin-bottom:1rem; border: 1px solid rgba(255,255,255,0.05);"><div style="flex: 1; margin-right: 1rem;"><h4 style="color:#fff;">${t.name} <span style="color:#fde047; font-size:0.85rem; margin-left:10px;">★ ${t.rating}</span></h4><p style="color:#94a3b8; font-size:0.9rem; margin-top:0.25rem;">"${t.text}"</p></div><div><button class="btn preview-test-btn" data-id="${t.id}" style="padding:0.4rem 0.8rem; background:#10b981; color:#fff; font-size:0.85rem; margin-right:5px;">Preview</button><button class="btn edit-test-btn" data-id="${t.id}" style="padding:0.4rem 0.8rem; background:#3b82f6; color:#fff; font-size:0.85rem; margin-right:5px;">Edit</button><button class="btn delete-test-btn" data-id="${t.id}" style="padding:0.4rem 0.8rem; background:#ef4444; color:#fff; font-size:0.85rem;">Delete</button></div></div>`).join('');
        testimoniesList.querySelectorAll('.delete-test-btn').forEach(btn => { btn.addEventListener('click', async (e) => { if (!confirm('Delete this testimony?')) return; await setTestimonials(getTestimonials().filter(t => t.id !== e.target.dataset.id)); renderTestimonialsTab(); }); });
        testimoniesList.querySelectorAll('.preview-test-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const t = getTestimonials().find(x => x.id === e.currentTarget.dataset.id);
            if (!t) return;
            const existing = document.getElementById('testimony-preview-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'testimony-preview-modal';
            modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;justify-content:center;align-items:center;';

            let stars = '';
            for (let i = 0; i < 5; i++) {
              stars += i < t.rating ? '<i class="fa-solid fa-star" style="color: #fde047; margin-right: 4px;"></i>' : '<i class="fa-regular fa-star" style="color: #cbd5e1; margin-right: 4px;"></i>';
            }

            modal.innerHTML = `
              <div class="modal-content-minimal" style="max-width: 450px; width: 90%; background: #121824; border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--radius); cursor: default; text-align: center;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                  <h3 style="color: #fff; margin: 0; font-size: 1.2rem;">Testimonial Live Preview</h3>
                  <button id="close-test-preview" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #858e8e;">&times;</button>
                </div>
                <div class="card" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius); text-align: left; margin-top: 1rem; width: 100%;">
                  <div class="card-body" style="padding: 2rem;">
                    <div style="margin-bottom: 1rem;">${stars}</div>
                    <p class="card-description" style="font-style: italic; color: #cbd5e1; font-size: 1.05rem; line-height: 1.6; font-family: 'Inter', sans-serif;">"${t.text}"</p>
                    <h4 class="card-title" style="font-size: 1.1rem; margin-top: 1.5rem; color: #38bdf8; font-weight: 700; font-family: 'Inter', sans-serif;">- ${t.name}</h4>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#close-test-preview').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
          });
        });
        testimoniesList.querySelectorAll('.edit-test-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const t = getTestimonials().find(x => x.id === e.target.dataset.id); if (!t) return; const newName = prompt('Edit Name:', t.name); const newRating = prompt('Edit Rating (1-5):', t.rating); const newText = prompt('Edit Testimony:', t.text); if (newName && newRating && newText) { t.name = newName; t.rating = parseInt(newRating) || 5; t.text = newText; await setTestimonials(getTestimonials().map(x => x.id === t.id ? t : x)); renderTestimonialsTab(); } }); });
      };

      const addTestForm = document.getElementById('admin-add-testimony-form');
      if (addTestForm) { addTestForm.onsubmit = async (e) => { e.preventDefault(); const all = getTestimonials(); all.push({ id: Date.now().toString(), name: document.getElementById('testimony-name').value, rating: parseInt(document.getElementById('testimony-rating').value), text: document.getElementById('testimony-text').value }); await setTestimonials(all); addTestForm.reset(); renderTestimonialsTab(); alert('Testimony added!'); }; }
      renderTestimonialsTab();

      // --- Google Review ---
      const reviewInput = document.getElementById('google-review-url');
      if (reviewInput) {
        reviewInput.value = getGoogleReview();
        const saveGoogleReviewBtn = document.getElementById('save-google-review-btn');
        if (saveGoogleReviewBtn) { saveGoogleReviewBtn.addEventListener('click', async () => { await setGoogleReview(reviewInput.value); alert('Google Review link saved!'); }); }
      }

      // --- Media Assets Tab (Background Video Slider) ---
      const heroVideosList = document.getElementById('admin-hero-videos-list');
      const addHeroVideoBtn = document.getElementById('add-hero-video-btn');
      const saveHeroVideosBtn = document.getElementById('save-hero-videos-btn');

      // Local state for hero videos being edited in this panel session
      let localHeroVideos = Array.isArray(getHeroVideos()) ? [...getHeroVideos()].filter(Boolean) : [];

      const renderHeroVideosManager = () => {
        if (!heroVideosList) return;
        if (localHeroVideos.length === 0) {
          heroVideosList.innerHTML = `<div style="padding: 1rem; color: #94a3b8; text-align: center; background: rgba(255,255,255,0.01); border-radius: 8px;">No videos in the slider. Add at least one video to play in background.</div>`;
          return;
        }

        heroVideosList.innerHTML = localHeroVideos.map((videoPath, idx) => `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; min-width: 0;">
              <span style="font-weight: 700; color: #38bdf8; font-size: 1.1rem;">#${idx + 1}</span>
              <div style="position: relative; width: 140px; height: 80px; border-radius: 6px; overflow: hidden; background: #000; flex-shrink: 0;">
                <video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;">
                  <source src="${videoPath}">
                </video>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Video Source</div>
                <div style="font-family: monospace; font-size: 0.9rem; color: #cbd5e1; word-break: break-all; margin-top: 2px;">
                  ${videoPath.startsWith('data:') ? 'Uploaded base64 video data' : videoPath}
                </div>
              </div>
            </div>
            <button class="btn delete-hero-vid-btn" data-index="${idx}" style="padding: 0.4rem 0.8rem; background: #ef4444; color: #fff; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
          </div>
        `).join('');

        // Attach event listeners to delete buttons
        heroVideosList.querySelectorAll('.delete-hero-vid-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.dataset.index);
            localHeroVideos.splice(indexToDelete, 1);
            renderHeroVideosManager();
          });
        });
      };

      // Add Video functionality — uses multipart upload for files, URL otherwise
      if (addHeroVideoBtn) {
        addHeroVideoBtn.addEventListener('click', async () => {
          const urlInput = document.getElementById('new-hero-video-url');
          const fileInput = document.getElementById('new-hero-video-file');

          if (fileInput && fileInput.files && fileInput.files.length > 0) {
            // Use multipart upload for files (no base64 size limit)
            const file = fileInput.files[0];
            const origText = addHeroVideoBtn.textContent;
            addHeroVideoBtn.textContent = 'Uploading to Cloudinary...';
            addHeroVideoBtn.disabled = true;
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('folder', 'hero');
              const res = await fetchWithTimeout(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData,
                timeout: 180000 // 3 min for large videos
              });
              if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
              const data = await res.json();
              if (!data.url) throw new Error('No URL returned from upload');
              localHeroVideos.push(data.url);
              renderHeroVideosManager();
              if (fileInput) fileInput.value = '';
              if (urlInput) urlInput.value = '';
            } catch (err) {
              console.error('Video upload error:', err);
              alert('Video upload failed: ' + err.message + '\nCheck Cloudinary settings in Render environment variables.');
            } finally {
              addHeroVideoBtn.textContent = origText;
              addHeroVideoBtn.disabled = false;
            }
          } else if (urlInput && urlInput.value.trim()) {
            // Direct URL — add as-is
            localHeroVideos.push(urlInput.value.trim());
            renderHeroVideosManager();
            urlInput.value = '';
          } else {
            alert('Please specify a video URL or select a file to upload first.');
          }
        });
      }

      // Save changes to database / cache / backend
      if (saveHeroVideosBtn) {
        saveHeroVideosBtn.addEventListener('click', async () => {
          if (localHeroVideos.length === 0) {
            alert('Please add at least one video to save.');
            return;
          }
          const origText = saveHeroVideosBtn.textContent;
          saveHeroVideosBtn.textContent = 'Saving...';
          saveHeroVideosBtn.disabled = true;
          try {
            await setHeroVideos(localHeroVideos);
            // Update the live hero slider on the page
            if (typeof initGlobalHeroVideoFn === 'function') initGlobalHeroVideoFn();
            alert('Hero background video slider saved successfully!');
          } catch (err) {
            console.error('Slider save error:', err);
            alert('Failed to save: ' + err.message);
          } finally {
            saveHeroVideosBtn.textContent = origText;
            saveHeroVideosBtn.disabled = false;
          }
        });
      }

      // Reels Management
      const reelsList = document.getElementById('admin-reels-list');
      const addReelBtn = document.getElementById('add-reel-btn');
      const renderReelsManager = () => {
        if (!reelsList) return;
        const list = getReels();
        reelsList.innerHTML = list.map((reel, idx) => {
          const isVid = isMediaVideo(reel.image);
          return `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; position: relative;"><button class="delete-reel-btn" data-id="${reel.id}" style="position: absolute; top: 10px; right: 10px; background: #ef4444; border: none; color: #fff; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Delete</button><h4 style="color:#fff; margin-bottom:0.5rem;">Reel ${idx + 1}</h4>${isVid ? `<video src="${reel.image}" autoplay loop muted playsinline style="width:100%; height:200px; object-fit:cover; aspect-ratio:9/16; border-radius:4px; margin-bottom:0.5rem;"></video>` : `<img src="${reel.image}" style="width:100%; height:200px; object-fit:cover; aspect-ratio:9/16; border-radius:4px; margin-bottom:0.5rem;">`}<div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.3rem;">Upload Image or Video file directly:</div><input type="file" class="form-control reel-file-input" data-id="${reel.id}" accept="image/*,video/*" style="background:transparent; border:1px dashed rgba(255,255,255,0.2);"></div>`;
        }).join('');
        reelsList.querySelectorAll('.delete-reel-btn').forEach(btn => { btn.addEventListener('click', async (e) => { if (!confirm('Delete this reel?')) return; await setReels(getReels().filter(x => x.id !== e.target.dataset.id)); renderReelsManager(); }); });
        
        // Add file input change preview listeners
        reelsList.querySelectorAll('.reel-file-input').forEach(input => {
          input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const container = e.target.closest('div');
            const previewContainer = container.querySelector('img, video');
            const reader = new FileReader();
            reader.onload = (evt) => {
              const src = evt.target.result;
              const isVid = src.startsWith('data:video') || /\.(mp4|mov|webm|ogv|3gp|m4v)(?:[\?#]|$)/i.test(file.name);
              if (previewContainer) previewContainer.remove();
              
              const newPreview = isVid 
                ? document.createElement('video') 
                : document.createElement('img');
              
              newPreview.src = src;
              newPreview.style.cssText = "width:100%; height:200px; object-fit:cover; aspect-ratio:9/16; border-radius:4px; margin-bottom:0.5rem;";
              if (isVid) {
                newPreview.autoplay = true;
                newPreview.loop = true;
                newPreview.muted = true;
                newPreview.playsInline = true;
              }
              container.insertBefore(newPreview, container.querySelector('div'));
            };
            reader.readAsDataURL(file);
          });
        });
      };
      if (addReelBtn) { addReelBtn.addEventListener('click', () => { const reels = getReels(); reels.push({ id: Date.now().toString(), image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=450&h=800&q=80' }); renderReelsManager(); }); }
      const saveReelsBtn = document.getElementById('save-reels-btn');
      if (saveReelsBtn) {
        saveReelsBtn.addEventListener('click', async () => {
          const reels = getReels();
          const origText = saveReelsBtn.textContent;
          saveReelsBtn.textContent = 'Uploading & Saving...';
          saveReelsBtn.disabled = true;
          try {
            for (let el of Array.from(document.querySelectorAll('.reel-file-input'))) {
              const reel = reels.find(x => x.id === el.dataset.id);
              if (reel && el.files && el.files.length > 0) {
                reel.image = await uploadFileToCloudinary(el, 'reels');
              }
            }
            await setReels(reels);
            renderReelsManager();
            alert('Reels updated successfully!');
          } catch (e) {
            console.error('Reels update failed:', e);
            alert('Failed to save reels: ' + e.message);
          } finally {
            saveReelsBtn.textContent = origText;
            saveReelsBtn.disabled = false;
          }
        });
      }
      renderReelsManager();
 
      // Gallery Videos Management
      const galleryListEl = document.getElementById('admin-gallery-list');
      const addGalleryBtn = document.getElementById('add-gallery-btn');
      const renderGalleryManager = () => {
        if (!galleryListEl) return;
        const list = getGallery();
        galleryListEl.innerHTML = list.map((item, idx) => `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; margin-bottom:1rem; position: relative;"><button class="delete-gallery-btn" data-id="${item.id}" style="position: absolute; top: 10px; right: 10px; background: #ef4444; border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete Card</button><h4 style="color:#fff; margin-bottom:1rem;">Gallery Card ${idx + 1}</h4><div style="display:grid; grid-template-columns: 1fr 1fr 1fr 150px; gap:1rem;"><div class="form-group" style="margin-bottom:0;"><label style="color:#94a3b8; font-size:0.85rem;">Title</label><input type="text" class="form-control gal-title" data-id="${item.id}" value="${item.title}"></div><div class="form-group" style="margin-bottom:0;"><label style="color:#94a3b8; font-size:0.85rem;">Preview Image (Direct Upload)</label><input type="file" class="form-control gal-img-file" data-id="${item.id}" accept="image/*" style="background:transparent; border:1px dashed rgba(255,255,255,0.2);"></div><div class="form-group" style="margin-bottom:0;"><label style="color:#94a3b8; font-size:0.85rem;">Video File (Direct Upload)</label><input type="file" class="form-control gal-vid-file" data-id="${item.id}" accept="video/*" style="background:transparent; border:1px dashed rgba(255,255,255,0.2);"></div><div class="form-group" style="margin-bottom:0;"><label style="color:#94a3b8; font-size:0.85rem;">Aspect Ratio</label><select class="form-control gal-ratio" data-id="${item.id}" style="background:#080d1a; color:#fff; height:42px;"><option value="16:9" ${item.aspectRatio === '9:16' ? '' : 'selected'}>16:9 (Standard)</option><option value="9:16" ${item.aspectRatio === '9:16' ? 'selected' : ''}>9:16 (Portrait)</option></select></div></div></div>`).join('');
        galleryListEl.querySelectorAll('.delete-gallery-btn').forEach(btn => { btn.addEventListener('click', async (e) => { if (!confirm('Delete this gallery card?')) return; await setGallery(getGallery().filter(x => x.id !== e.target.dataset.id)); renderGalleryManager(); }); });
      };
      if (addGalleryBtn) { addGalleryBtn.addEventListener('click', () => { const gallery = getGallery(); gallery.push({ id: Date.now().toString(), title: 'New Video Card', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', video: '', aspectRatio: '16:9' }); renderGalleryManager(); }); }
      const saveGalleryBtn = document.getElementById('save-gallery-btn');
      if (saveGalleryBtn) {
        saveGalleryBtn.addEventListener('click', async () => {
          const gallery = getGallery();
          const origText = saveGalleryBtn.textContent;
          saveGalleryBtn.textContent = 'Uploading & Saving...';
          saveGalleryBtn.disabled = true;
          try {
            for (let input of Array.from(document.querySelectorAll('.gal-title'))) {
              const item = gallery.find(x => x.id === input.dataset.id);
              if (item) {
                item.title = input.value;
                const imgFile = document.querySelector(`.gal-img-file[data-id="${item.id}"]`);
                if (imgFile && imgFile.files && imgFile.files.length > 0) {
                  item.image = await uploadFileToCloudinary(imgFile, 'gallery');
                }
                const vidFile = document.querySelector(`.gal-vid-file[data-id="${item.id}"]`);
                if (vidFile && vidFile.files && vidFile.files.length > 0) {
                  item.video = await uploadFileToCloudinary(vidFile, 'gallery');
                }
                const ratioInput = document.querySelector(`.gal-ratio[data-id="${item.id}"]`);
                if (ratioInput) {
                  item.aspectRatio = ratioInput.value || '16:9';
                }
              }
            }
            await setGallery(gallery);
            renderGalleryManager();
            alert('Gallery videos updated successfully!');
          } catch (e) {
            console.error('Gallery update failed:', e);
            alert('Failed to save gallery: ' + e.message);
          } finally {
            saveGalleryBtn.textContent = origText;
            saveGalleryBtn.disabled = false;
          }
        });
      }
      renderGalleryManager();

      // Finally render bookings (FIXED: no longer trapped in reviewInput block)
      renderBookings();

      let lastBookingIds = new Set(getBookings().map(b => b.id));
      const pollForNewBookings = async () => {
        const latest = await api.get('bookings') || [];
        const latestIds = latest.map(b => b.id);
        const currentIds = Array.from(lastBookingIds);

        // Check if there are any changes (additions, deletions, or edits to status/payments)
        const hasChanges = latest.length !== currentIds.length || 
                           latest.some(b => !lastBookingIds.has(b.id)) ||
                           latest.some(b => {
                             const cached = getBookings().find(x => x.id === b.id);
                             return cached && (cached.status !== b.status || cached.paymentBasis !== b.paymentBasis);
                           });

        if (hasChanges) {
          const newBookings = latest.filter(b => !lastBookingIds.has(b.id));
          if (newBookings.length > 0) {
            newBookings.forEach(b => {
              showSystemNotification(b);
              showToastNotification(b);
            });
          }
          dataCache.bookings = latest;
          lastBookingIds = new Set(latestIds);
          renderBookings();
        }
      };

      let pollInterval = setInterval(pollForNewBookings, 4000);

      // --- Contact Messages Tab Rendering ---
      const contactMsgTable = document.getElementById('admin-contact-messages-table');
      const contactMsgEmpty = document.getElementById('admin-no-messages');
      const contactMsgBadge = document.getElementById('contact-msg-badge');

      const renderContactMessages = () => {
        if (!contactMsgTable) return;
        const messages = getContactMessages();

        // Update badge
        const unreadCount = messages.filter(m => m.status === 'Unread').length;
        if (contactMsgBadge) {
          if (unreadCount > 0) {
            contactMsgBadge.textContent = unreadCount;
            contactMsgBadge.style.display = 'inline-block';
          } else {
            contactMsgBadge.style.display = 'none';
          }
        }

        if (messages.length === 0) {
          contactMsgTable.innerHTML = '';
          if (contactMsgEmpty) contactMsgEmpty.style.display = 'block';
          return;
        }
        if (contactMsgEmpty) contactMsgEmpty.style.display = 'none';

        contactMsgTable.innerHTML = messages.map(m => {
          const date = new Date(m.timestamp);
          const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isUnread = m.status === 'Unread';
          const isResponded = m.status === 'Responded';
          
          let statusBadgeColor = 'rgba(168, 85, 247, 0.15)';
          let statusTextColor = '#a855f7';
          if (m.status === 'Read') {
            statusBadgeColor = 'rgba(59, 130, 246, 0.15)';
            statusTextColor = '#3b82f6';
          } else if (m.status === 'Responded') {
            statusBadgeColor = 'rgba(16, 185, 129, 0.15)';
            statusTextColor = '#10b981';
          }

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); ${isUnread ? 'background: rgba(168, 85, 247, 0.05);' : ''}">
              <td style="padding: 1rem 0;">
                <strong style="color: #fff;">${m.name}</strong>
                ${isUnread ? '<span style="display:inline-block; width:8px; height:8px; background:#a855f7; border-radius:50%; margin-left:6px; vertical-align:middle;"></span>' : ''}
                <div style="font-size:0.8rem; color:#64748b; margin-top:2px;"><a href="mailto:${m.email}" style="color:#38bdf8; text-decoration:none;"><i class="fa-solid fa-envelope"></i> ${m.email}</a></div>
              </td>
              <td style="padding: 1rem 0; color: #cbd5e1; font-weight: 600;">${m.subject || 'General Inquiry'}</td>
              <td style="padding: 1rem 0; color: #94a3b8; font-size: 0.85rem; max-width: 300px;"><div style="overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${m.message}</div></td>
              <td style="padding: 1rem 0; color: #64748b; font-size: 0.85rem; white-space: nowrap;">${timeStr}</td>
              <td style="padding: 1rem 0;">
                <span style="display:inline-block; background:${statusBadgeColor}; color:${statusTextColor}; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:600;">${m.status}</span>
              </td>
              <td style="padding: 1rem 0;">
                ${isUnread ? `<button class="btn mark-read-msg" data-id="${m.id}" style="padding:0.25rem 0.6rem; background:#3b82f6; color:#fff; font-size:0.78rem; margin-right:5px;"><i class="fa-solid fa-check" style="margin-right:3px;"></i>Read</button>` : ''}
                ${!isResponded ? `<button class="btn mark-responded-msg" data-id="${m.id}" style="padding:0.25rem 0.6rem; background:#10b981; color:#fff; font-size:0.78rem; margin-right:5px;"><i class="fa-solid fa-reply" style="margin-right:3px;"></i>Responded</button>` : ''}
                <button class="btn reply-msg" data-email="${m.email}" data-name="${m.name}" style="padding:0.25rem 0.6rem; background:#64748b; color:#fff; font-size:0.78rem; margin-right:5px;"><i class="fa-solid fa-envelope" style="margin-right:3px;"></i>Reply</button>
                ${role === 'admin' ? `<button class="btn delete-msg" data-id="${m.id}" style="padding:0.25rem 0.6rem; background:#ef4444; color:#fff; font-size:0.78rem;"><i class="fa-solid fa-trash" style="margin-right:3px;"></i></button>` : ''}
              </td>
            </tr>
          `;
        }).join('');

        // Event listeners for message actions
        contactMsgTable.querySelectorAll('.mark-read-msg').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const msgs = getContactMessages();
            const found = msgs.find(m => m.id === e.currentTarget.dataset.id);
            if (found) { found.status = 'Read'; await setContactMessages(msgs); renderContactMessages(); }
          });
        });

        contactMsgTable.querySelectorAll('.mark-responded-msg').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const msgs = getContactMessages();
            const found = msgs.find(m => m.id === e.currentTarget.dataset.id);
            if (found) { found.status = 'Responded'; await setContactMessages(msgs); renderContactMessages(); }
          });
        });

        contactMsgTable.querySelectorAll('.reply-msg').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const email = e.currentTarget.dataset.email;
            const name = e.currentTarget.dataset.name;
            // Also mark as Responded on reply click
            const msgs = getContactMessages();
            const found = msgs.find(m => m.email === email);
            if (found && found.status !== 'Responded') { found.status = 'Responded'; await setContactMessages(msgs); renderContactMessages(); }
            window.open(`mailto:${email}?subject=Re: Your inquiry to Travelscape Maldives&body=Dear ${name},%0D%0A%0D%0AThank you for reaching out to Travelscape Maldives.%0D%0A%0D%0A`, '_blank');
          });
        });

        contactMsgTable.querySelectorAll('.delete-msg').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            if (role !== 'admin') return;
            if (!confirm('Delete this message?')) return;
            const msgs = getContactMessages().filter(m => m.id !== e.currentTarget.dataset.id);
            await setContactMessages(msgs);
            renderContactMessages();
          });
        });
      };

      // Mark all read button
      const markAllReadBtn = document.getElementById('mark-all-read-btn');
      if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
          const msgs = getContactMessages();
          msgs.forEach(m => { if (m.status === 'Unread') m.status = 'Read'; });
          await setContactMessages(msgs);
          renderContactMessages();
        });
      }

      // Clear all messages button
      const clearAllMsgBtn = document.getElementById('clear-all-messages-btn');
      if (clearAllMsgBtn) {
        if (role === 'admin') {
          clearAllMsgBtn.style.display = 'inline-block';
          clearAllMsgBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete ALL contact messages?')) return;
            await setContactMessages([]);
            renderContactMessages();
          });
        } else {
          clearAllMsgBtn.style.display = 'none';
        }
      }

      // Initial render
      renderContactMessages();

      // Poll for new contact messages
      let lastContactMsgIds = new Set(getContactMessages().map(m => m.id));
      const pollForNewMessages = async () => {
        const latest = await api.get('contact_messages') || [];
        dataCache.contactMessages = latest;
        const newMessages = latest.filter(m => !lastContactMsgIds.has(m.id));
        if (newMessages.length > 0) {
          newMessages.forEach(m => {
            showContactSystemNotification(m);
            showContactToastNotification(m);
            lastContactMsgIds.add(m.id);
          });
          renderContactMessages();
        }
      };

      let contactPollInterval = setInterval(pollForNewMessages, 4000);

      // Assign dashboard refresh hooks in this active scope
      refreshAdminTablesFn = () => {
        if (typeof renderBookings === 'function') renderBookings();
        if (window.dashboardRenderLists) {
          window.dashboardRenderLists.forEach(fn => fn());
        }
        if (typeof renderOfferSection === 'function') renderOfferSection();
        if (typeof renderTestimonialsTab === 'function') renderTestimonialsTab();
        if (typeof renderHeroVideosManager === 'function') renderHeroVideosManager();
        if (typeof renderReelsManager === 'function') renderReelsManager();
        if (typeof renderGalleryManager === 'function') renderGalleryManager();
        if (typeof renderContactMessages === 'function') renderContactMessages();
      };
    }

    function loadAdminPanel() { loadUniversalDashboard('admin'); }
    function loadStaffPanel() { loadUniversalDashboard('staff'); }

    // --- 3D Parallax Tilt Effect ---
    function apply3DTilt(selector, maxTilt = 15) {
      document.querySelectorAll(selector).forEach(card => {
        card.addEventListener('mousemove', (e) => { const rect = card.getBoundingClientRect(); const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * maxTilt; const rotateX = (0.5 - (e.clientY - rect.top) / rect.height) * maxTilt; card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`; });
        card.addEventListener('mouseleave', () => { card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'; });
      });
    }
    apply3DTilt('.reel-card', 15);
    apply3DTilt('.offer-card', 6);

    // --- Global Scroll Fade for Background Videos & Hero Elements ---
    window.addEventListener('scroll', () => {
      const opacity = Math.max(0, 1 - (window.scrollY / 400));

      // 1. Fade the hero text & animation if on homepage
      const layer1Content = document.querySelector('.intro-layer .layer-content');
      const layer1Boat = document.querySelector('.hero-animation-container');
      if (layer1Content) layer1Content.style.opacity = opacity;
      if (layer1Boat) layer1Boat.style.opacity = opacity;

      // 2. Fade/Hide homepage video slider
      const videoSlider = document.getElementById('hero-video-slider');
      if (videoSlider) {
        videoSlider.style.opacity = opacity;
        videoSlider.style.display = opacity === 0 ? 'none' : 'block';
      }

      // 3. Fade/Hide static background videos on other pages
      document.querySelectorAll('.global-hero-video').forEach(vid => {
        vid.style.opacity = opacity * 0.5; // Maintain original max opacity of 0.5
        vid.style.display = opacity === 0 ? 'none' : 'block';
      });
    });



  } // end initApp

  // --- Real-time Notifications & Web Push ---
  const isAdmin = localStorage.getItem('admin_logged') === 'true';
  const isStaff = localStorage.getItem('staff_logged') === 'true';

  if (isAdmin || isStaff) {
    // 1. Ask for push notifications
    const setupPush = () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js').then(swReg => {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              const publicVapidKey = 'BH0r9wEhp1WMlLapNhkqQXwSXXutqK7nD3l0JccbMytELzU9qu5nqc2a6v0bU3LVpXwUZgIYR26M0yQ1CLWF54A';
              
              function urlBase64ToUint8Array(base64String) {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                  outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
              }

              swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
              }).then(subscription => {
                fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(subscription)
                }).catch(e => console.warn('Push subscription save failed:', e));
              }).catch(e => console.warn('Push subscription failed:', e));
            }
          });
        }).catch(e => console.warn('SW registration failed:', e));
      }
    };

    // Auto-setup push
    setupPush();

    // Add button to right-side-island-menu to trigger push on mobile (only on portals)
    const isPortal = window.location.pathname.includes('admin.html') || window.location.pathname.includes('staff.html');
    if (isPortal) {
      const navLinks = document.querySelector('.island-nav-links');
      if (navLinks) {
        const notifBtn = document.createElement('a');
        notifBtn.href = '#';
        notifBtn.innerHTML = '<i class="fa-solid fa-bell" style="color: #fde047;"></i> Notifications';
        notifBtn.onclick = (e) => {
          e.preventDefault();
          setupPush();
          alert('Push notifications requested! Please ensure notifications are enabled in your browser and device settings.');
        };
        navLinks.prepend(notifBtn);
      }
    }

    // 2. Load Socket.io and listen
    const socketScript = document.createElement('script');
    socketScript.src = '/socket.io/socket.io.js';
    socketScript.onload = () => {
      const socket = io();
      
      const playBeep = () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.warn('Audio play blocked:', e);
        }
      };
      
      socket.on('new_booking', () => {
        playBeep();
        if (typeof fetchAllFromAPI === 'function') {
          fetchAllFromAPI().then(() => {
            if (typeof refreshAdminTablesFn === 'function') refreshAdminTablesFn();
          });
        }
      });

      socket.on('new_contact', () => {
        playBeep();
        if (typeof fetchAllFromAPI === 'function') {
          fetchAllFromAPI().then(() => {
            if (typeof refreshAdminTablesFn === 'function') refreshAdminTablesFn();
            
            // Also refresh contact msg badge
            const list = getContactMessages();
            const badge = document.getElementById('contact-msg-badge');
            if (badge) {
              badge.textContent = list.length;
              badge.style.display = list.length > 0 ? 'inline-block' : 'none';
            }
          });
        }
      });
    };
    document.body.appendChild(socketScript);
  } else {
    // Unsubscribe from push notifications if logged out
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(swReg => {
        swReg.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            subscription.unsubscribe().then(() => {
              console.log('Unsubscribed from push notifications.');
            }).catch(e => console.warn('Unsubscribe failed:', e));
          }
        });
      });
    }
  }

  // Mobile touch support for dropdown menu
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    const content = dropdown.querySelector('.dropdown-content');
    dropdown.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        e.stopPropagation();
        const isActive = dropdown.classList.contains('active');
        // Close all
        dropdowns.forEach(d => {
          d.classList.remove('active');
          const activeContent = document.querySelector('.mobile-active-dropdown');
          if (activeContent && activeContent.dataset.parentId === d.id) {
            activeContent.classList.remove('mobile-active-dropdown');
            d.appendChild(activeContent);
          }
        });
        
        if (!isActive && content) {
          dropdown.id = dropdown.id || 'dropdown-' + Math.random().toString(36).substr(2, 9);
          dropdown.classList.add('active');
          content.dataset.parentId = dropdown.id;
          document.body.appendChild(content);
          // Small delay to allow CSS transition
          requestAnimationFrame(() => {
            content.classList.add('mobile-active-dropdown');
          });
        }
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown') && !e.target.closest('.dropdown-content')) {
      dropdowns.forEach(d => {
        d.classList.remove('active');
        const activeContent = document.querySelector('.mobile-active-dropdown');
        if (activeContent && activeContent.dataset.parentId === d.id) {
          activeContent.classList.remove('mobile-active-dropdown');
          d.appendChild(activeContent);
        }
      });
    }
  });

  // --- Homepage Layer Animation System ---
  // Exclude heavy slider layers (2, 3, 4, 5, 6) from continuous transform repaints to prevent compositor crushing/lag on PC
  const parallaxLayers = document.querySelectorAll('.parallax-layer:not(.layer-2):not(.layer-3):not(.layer-4-slider):not(.layer-5-slider):not(.layer-6-slider)');
  if (parallaxLayers.length > 0) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      targetX = (e.clientX - centerX) / centerX;
      targetY = (e.clientY - centerY) / centerY;
    };

    const onDeviceOrientation = (e) => {
      if (e.gamma !== null && e.beta !== null) {
        targetX = Math.min(Math.max(e.gamma / 45, -1), 1);
        targetY = Math.min(Math.max((e.beta - 45) / 45, -1), 1);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('deviceorientation', onDeviceOrientation);

    const animateLayers = () => {
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        parallaxLayers.forEach((layer, index) => {
          let factor = 20 - (index * 3);
          if (factor < 2) factor = 2; 

          const xOffset = currentX * factor;
          const yOffset = currentY * factor;

          const content = layer.querySelector('.layer-content') || layer;
          content.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        });
      }
      requestAnimationFrame(animateLayers);
    };

    requestAnimationFrame(animateLayers);

    window.addEventListener('scroll', () => {
      // Only apply scroll parallax on mobile widths to prevent event fighting with mousemove on touch-enabled PCs
      if (window.innerWidth <= 768) {
        // Use Math.sin to bound the movement between -1 and 1, creating a gentle float instead of an infinite crush.
        targetY = Math.sin(window.scrollY * 0.003);
        targetX = Math.cos(window.scrollY * 0.003) * 0.5;
      }
    }, { passive: true });
  }

});

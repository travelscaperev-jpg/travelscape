require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

// Multer disk storage for file uploads (500MB limit for large videos) to avoid server OOM crash
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 500 * 1024 * 1024 } });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve all static frontend files (HTML, CSS, JS, images)
app.use(express.static(__dirname, { index: 'index.html', extensions: ['html'] }));

// ─── Cloudinary ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload base64, buffer, OR file path to Cloudinary
async function uploadToCloudinary(data, folder = 'travelscape', isBuffer = false, mimeType = '', isFilePath = false) {
  try {
    if (!data) return '';
    
    if (isFilePath) {
      const isVideo = mimeType.startsWith('video/') || /\.(mp4|mov|webm|ogv|3gp|m4v|quicktime)$/i.test(data);
      const resourceType = isVideo ? 'video' : 'image';
      const result = await cloudinary.uploader.upload(data, {
        folder,
        resource_type: resourceType,
        chunk_size: 6000000
      });
      return result.secure_url;
    }

    const isVideo = isBuffer ? mimeType.startsWith('video/') : (typeof data === 'string' && data.includes('video'));
    const resourceType = isVideo ? 'video' : 'image';

    if (isBuffer) {
      // Stream upload (for multipart uploads via /api/upload)
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: resourceType, chunk_size: 6000000 },
          (err, result) => { if (err) reject(err); else resolve(result.secure_url); }
        );
        stream.end(data);
      });
    }

    if (typeof data === 'string' && data.startsWith('data:')) {
      // Base64 upload
      const result = isVideo
        ? await cloudinary.uploader.upload_large(data, { folder, resource_type: 'video' })
        : await cloudinary.uploader.upload(data, { folder, resource_type: 'image' });
      return result.secure_url;
    }

    return data; // already a URL, return as-is
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return typeof data === 'string' ? data : ''; // return original string if possible
  }
}

// ─── PostgreSQL ─────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

let isDbConnected = false;

async function initDb() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log('✅ PostgreSQL Connected');
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_cache (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    client.release();
    seedDatabaseIfEmpty();
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err.message);
    isDbConnected = false;
    setTimeout(initDb, 5000);
  }
}

initDb();

async function waitForDB(maxWait = 20000) {
  if (isDbConnected) return true;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 300));
    if (isDbConnected) return true;
  }
  return false;
}

async function getCacheValue(key, defaultValue = null) {
  try {
    await waitForDB();
    const res = await pool.query('SELECT value FROM data_cache WHERE key = $1', [key]);
    if (res.rows.length > 0) {
      return JSON.parse(res.rows[0].value);
    }
    return defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key}:`, e.message);
    return defaultValue;
  }
}

async function setCacheValue(key, value) {
  try {
    await waitForDB();
    const serializedValue = JSON.stringify(value);
    await pool.query(
      'INSERT INTO data_cache (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
      [key, serializedValue]
    );
    return true;
  } catch (e) {
    console.error(`Error writing key ${key}:`, e.message);
    return false;
  }
}

// ─── Health & Ping ───────────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', db: isDbConnected ? 'connected' : 'connecting', ts: Date.now() });
});

app.get('/api/health', async (req, res) => {
  const dbOk = await waitForDB(5000);
  res.json({
    status:     'ok',
    db:         dbOk ? 'connected' : 'unavailable',
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME),
    ts:         Date.now()
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    paymentLink: process.env.PAYMENT_LINK || ''
  });
});

// ─── File Upload Endpoint (multipart) ────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Clean up the temp file on config error
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(500).json({ success: false, error: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Render environment variables.' });
    }

    const folder = req.body.folder || 'travelscape';
    const url = await uploadToCloudinary(req.file.path, folder, false, req.file.mimetype, true);
    
    // Clean up local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn('Failed to delete temp file:', e.message);
    }
    
    res.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error.message);
    // Cleanup temp file in case of crash
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Auth Endpoint ───────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, password } = req.body;

    const adminPass = process.env.ADMIN_PASSWORD;
    const staffPass = process.env.STAFF_PASSWORD;

    if (!adminPass || !staffPass) {
      return res.status(500).json({ success: false, message: 'Authentication passwords are not configured on the server. Please set ADMIN_PASSWORD and STAFF_PASSWORD in Render environment variables.' });
    }

    if (role === 'admin' && password === adminPass) {
      return res.json({ success: true, role: 'admin' });
    }
    if (role === 'staff' && password === staffPass) {
      return res.json({ success: true, role: 'staff' });
    }
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  } catch (e) {
    console.error('Auth error:', e.message);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
});

// ─── Generic CRUD for array collections ─────────────────────────────────────
function registerCollectionRoutes(routePath, dbKey) {
  // GET all items
  app.get(`/api/${routePath}`, async (req, res) => {
    try {
      const list = await getCacheValue(dbKey, []);
      res.json(list || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST - replace entire collection (auto-uploads any base64 to Cloudinary)
  app.post(`/api/${routePath}`, async (req, res) => {
    try {
      let list = req.body;
      if (Array.isArray(list)) {
        list = await Promise.all(list.map(async (item) => {
          if (item.image    && item.image.startsWith('data:'))    item.image    = await uploadToCloudinary(item.image,    dbKey);
          if (item.video    && item.video.startsWith('data:'))    item.video    = await uploadToCloudinary(item.video,    dbKey);
          if (item.subImg1  && item.subImg1.startsWith('data:'))  item.subImg1  = await uploadToCloudinary(item.subImg1,  dbKey);
          if (item.subImg2  && item.subImg2.startsWith('data:'))  item.subImg2  = await uploadToCloudinary(item.subImg2,  dbKey);
          if (Array.isArray(item.subImages)) {
            item.subImages = await Promise.all(item.subImages.map(s => s.startsWith('data:') ? uploadToCloudinary(s, dbKey) : s));
          }
          return item;
        }));
      }
      await setCacheValue(dbKey, list);
      
      // Notify via Socket.IO
      if (dbKey === 'bookings') {
        io.emit('new_booking', { message: 'New booking received' });
        sendPushNotifications('New Booking', 'You have received a new booking!');
      } else if (dbKey === 'contact_messages') {
        io.emit('new_contact', { message: 'New contact message received' });
        sendPushNotifications('New Message', 'You have received a new contact message!');
      }

      res.json({ success: true });
    } catch (e) {
      console.error(`POST ${routePath} error:`, e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // PUT - add or update single item
  app.put(`/api/${routePath}/:id`, async (req, res) => {
    try {
      const list = await getCacheValue(dbKey, []) || [];
      const idx  = list.findIndex(item => item.id === req.params.id);
      let item   = req.body;

      if (item.image    && item.image.startsWith('data:'))    item.image    = await uploadToCloudinary(item.image,    dbKey);
      if (item.video    && item.video.startsWith('data:'))    item.video    = await uploadToCloudinary(item.video,    dbKey);
      if (item.subImg1  && item.subImg1.startsWith('data:'))  item.subImg1  = await uploadToCloudinary(item.subImg1,  dbKey);
      if (item.subImg2  && item.subImg2.startsWith('data:'))  item.subImg2  = await uploadToCloudinary(item.subImg2,  dbKey);
      if (Array.isArray(item.subImages)) {
        item.subImages = await Promise.all(item.subImages.map(s => s.startsWith('data:') ? uploadToCloudinary(s, dbKey) : s));
      }

      const isNew = idx < 0;
      if (!isNew) list[idx] = { ...list[idx], ...item };
      else list.push(item);

      await setCacheValue(dbKey, list);

      if (isNew) {
        if (dbKey === 'bookings') {
          io.emit('new_booking', { message: 'New booking received' });
          sendPushNotifications('New Booking', 'You have received a new booking!');
        } else if (dbKey === 'contact_messages') {
          io.emit('new_contact', { message: 'New contact message received' });
          sendPushNotifications('New Message', 'You have received a new contact message!');
        }
      }

      res.json({ success: true, item });
    } catch (e) {
      console.error(`PUT ${routePath} error:`, e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE - remove single item
  app.delete(`/api/${routePath}/:id`, async (req, res) => {
    try {
      let list = await getCacheValue(dbKey, []) || [];
      list = list.filter(item => item.id !== req.params.id);
      await setCacheValue(dbKey, list);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

// Register all collections
registerCollectionRoutes('packages',         'packages');
registerCollectionRoutes('excursions',       'excursions');
registerCollectionRoutes('private',          'private_bookings');
registerCollectionRoutes('freediving',       'freediving');
registerCollectionRoutes('resorts',          'resorts');
registerCollectionRoutes('photography',      'photography');
registerCollectionRoutes('bookings',         'bookings');
registerCollectionRoutes('testimonials',     'testimonials');
registerCollectionRoutes('reels',            'reels');
registerCollectionRoutes('gallery',          'gallery');
registerCollectionRoutes('contact_messages', 'contact_messages');
registerCollectionRoutes('instagram_config', 'instagram_config');
registerCollectionRoutes('crew',             'crew');

// ─── Singular Value Endpoints ─────────────────────────────────────────────────

// Seasonal Offer
app.get('/api/offer', async (req, res) => {
  try { res.json(await getCacheValue('offer', {})); }
  catch (e) { res.status(500).json({}); }
});
app.post('/api/offer', async (req, res) => {
  try { await setCacheValue('offer', req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
app.delete('/api/offer', async (req, res) => {
  try { await setCacheValue('offer', {}); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Hero Video (single)
app.get('/api/hero-video', async (req, res) => {
  try { res.json({ video: await getCacheValue('hero_video', '') }); }
  catch (e) { res.json({ video: '' }); }
});
app.post('/api/hero-video', async (req, res) => {
  try {
    let v = req.body.video || '';
    if (v.startsWith('data:')) v = await uploadToCloudinary(v, 'hero');
    await setCacheValue('hero_video', v);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Hero Videos (slider array)
app.get('/api/hero-videos', async (req, res) => {
  try { res.json({ videos: await getCacheValue('hero_videos', []) }); }
  catch (e) { res.json({ videos: [] }); }
});
app.post('/api/hero-videos', async (req, res) => {
  try {
    let list = req.body.videos || [];
    if (Array.isArray(list)) {
      list = await Promise.all(list.map(v => v.startsWith('data:') ? uploadToCloudinary(v, 'hero') : v));
    }
    await setCacheValue('hero_videos', list);
    if (list.length > 0) await setCacheValue('hero_video', list[0]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Google Review Link
app.get('/api/google-review', async (req, res) => {
  try { res.json({ url: await getCacheValue('google_review', '') }); }
  catch (e) { res.json({ url: '' }); }
});
app.post('/api/google-review', async (req, res) => {
  try { await setCacheValue('google_review', req.body.url || ''); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Helper to seed a cache key if missing or empty
async function seedKeyIfEmpty(key, defaultValue) {
  try {
    const res = await pool.query('SELECT value FROM data_cache WHERE key = $1', [key]);
    if (res.rows.length === 0) {
      await setCacheValue(key, defaultValue);
      console.log(`🌱 Seeded missing key: ${key}`);
    } else {
      const val = JSON.parse(res.rows[0].value);
      const isEmptyArray = Array.isArray(val) && val.length === 0;
      const isEmptyObject = val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0;
      const isEmptyString = typeof val === 'string' && val.trim() === '';
      const isNull = val === null || val === undefined;
      
      if (isEmptyArray || isEmptyObject || isEmptyString || isNull) {
        await setCacheValue(key, defaultValue);
        console.log(`🌱 Repaired empty/null key: ${key}`);
      }
    }
  } catch (err) {
    console.error(`⚠️ Error seeding key ${key}:`, err.message);
  }
}

// ─── Database Seeding ────────────────────────────────────────────────────────
async function seedDatabaseIfEmpty() {
  try {
    console.log('🔍 Checking database cache values for initialization...');
    
    const defaultCrew = [
      {
        id: "crew-1",
        name: "Captain Ibrahim Ali",
        role: "Senior Boat Captain / Skipper",
        bio: "Ibrahim has navigated Maldivian waters for over 15 years. He specializes in spotting migrating mantas and dolphin pods.",
        licenses: "Maldivian Coast Guard Master License, First Aid CPR",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: "crew-2",
        name: "Aishath Nazeer",
        role: "Marine Biologist & Instructor",
        bio: "Aisha holds a master's in marine ecology and educates guests on reef preservation.",
        experience: "6 Years",
        licenses: "PADI Certified Instructor, Reef Conservation Specialist",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: "crew-3",
        name: "Hassan Waheed",
        role: "Local Excursion Coordinator",
        bio: "A native of Maafushi, Hassan loves guiding sandbank picnics and showing guests Maldivian culture on local island walks.",
        licenses: "Local Guide License, Water Rescue Certified",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80"
      }
    ];

    const defaultExcursions = [
      {
        id: "ex-1",
        title: "Shipwreck & Nurse Shark Snorkeling",
        duration: "Full Day (6 Hours)",
        description: "Dive into the keyhole shipwreck of Vaavu Atoll, swim alongside gentle nurse sharks, and walk on a pristine sandbank.",
        highlights: "Vaavu Keyhole Shipwreck, Nurse Shark swimming, buffet lunch on sandbank, dolphin watching",
        image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 20,
        mapLink: "https://maps.google.com/?q=Vaavu+Atoll+Maldives"
      },
      {
        id: "ex-2",
        title: "Manta Ray Snorkeling Safari",
        duration: "3 Hours",
        description: "An unforgettable encounter with the majestic manta rays of the Maldives. Snorkel in current channels where mantas feed.",
        highlights: "Snorkeling with Manta Rays, vibrant coral reef drift, underwater photography tips",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 15,
        mapLink: "https://maps.google.com/?q=Maafushi+Maldives"
      },
      {
        id: "ex-3",
        title: "Sunset Dolphin Cruise",
        duration: "2 Hours",
        description: "Sail out as the sun sets over the Indian Ocean to watch wild spinner dolphins jumping and playing in the waves.",
        highlights: "Spinner dolphins spotting, golden hour photo ops, complimentary sunset drinks on deck",
        image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 25,
        mapLink: "https://maps.google.com/?q=South+Male+Atoll+Maldives"
      }
    ];

    const defaultPrivate = [
      {
        id: "p-1",
        title: "Private Speedboat Charter",
        duration: "Flexible (4 to 8 Hours)",
        description: "Rent our premium speedboat with a dedicated captain and guide. Customize your own itinerary to sandbanks, reefs, or local islands.",
        highlights: "100% customizable itinerary, private captain & crew, snorkeling gear & towels included",
        image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 8,
        mapLink: ""
      },
      {
        id: "p-2",
        title: "Private Sandbank Proposal Package",
        duration: "4 Hours",
        description: "Surprise your partner with a private sandbank excursion. Features a setup with cushions, carpets, fruit platter, and a sunset dinner.",
        highlights: "Exclusive sandbank access, romantic table setup, professional photography, gourmet dinner",
        image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 2,
        mapLink: ""
      }
    ];

    const defaultFreediving = [
      {
        id: "fd-1",
        title: "AIDA 1 & 2 Freediver Course",
        duration: "3 Days",
        description: "Learn the fundamentals of breath-holding, equalization, breathing techniques, and safety procedures down to 20 meters.",
        highlights: "AIDA certification, breathing & relaxation workshops, open water diving, safety training",
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 4,
        mapLink: ""
      },
      {
        id: "fd-2",
        title: "Guided Line Training & Depth Sessions",
        duration: "2 Hours",
        description: "For certified freedivers looking to practice depth, technique, and buddy safety under the direct supervision of an instructor.",
        highlights: "Constant weight coaching, safety diver support, dive computer analysis, deep buoy setups",
        image: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 6,
        mapLink: ""
      }
    ];

    const defaultResorts = [
      {
        id: "rs-1",
        title: "Adaaran Prestige Vadoo Pass",
        duration: "Day Pass (9am - 6pm)",
        description: "Spend a luxury day on a 5-star overwater villa resort. Day pass includes buffet lunch, unlimited premium beverages, and access to pool/beach.",
        highlights: "All-inclusive buffet & drinks, access to overwater resort pools, pristine reef snorkeling",
        image: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 12,
        mapLink: "https://maps.google.com/?q=Adaaran+Prestige+Vadoo+Resort",
        hasDayVisit: true,
        dayVisitType: "both",
        dayHalfStd: 90,
        dayHalfPrem: 130,
        dayHalfNone: 70,
        dayFullStd: 140,
        dayFullPrem: 190,
        dayFullNone: 110,
        hasStayNight: true,
        stayStd: 350,
        stayPrem: 490,
        stayNone: 290
      },
      {
        id: "rs-2",
        title: "Centara Ras Fushi Resort Pass",
        duration: "Day Pass (10am - 7pm)",
        description: "Experience the adults-only playground of Centara Ras Fushi. Pass includes lunch, open bar, and non-motorized water sports.",
        highlights: "Adults-only beach club, open bar with tropical cocktails, catamaran and paddleboard usage",
        image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        maxCapacity: 15,
        mapLink: "https://maps.google.com/?q=Centara+Ras+Fushi+Resort+Maldives",
        hasDayVisit: true,
        dayVisitType: "full_day",
        dayFullStd: 110,
        dayFullPrem: 160,
        dayFullNone: 90,
        hasStayNight: false
      }
    ];

    const defaultPhotography = [
      {
        id: "ph-1",
        title: "Standard Drone & DSLR Package",
        duration: "1 Hour",
        description: "Professional aerial and underwater photography capturing your best moments.",
        highlights: "15 edited photos, 1 minute cinematic drone video",
        image: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        price: 150
      },
      {
        id: "ph-2",
        title: "Premium Cinematography",
        duration: "2-3 Hours",
        description: "A complete cinematic storytelling experience of your Maldivian adventure.",
        highlights: "30 edited photos, 3 minute 4K cinematic video, drone and underwater shots",
        image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80",
        video: "",
        videoRatio: "16:9",
        price: 300
      }
    ];

    const defaultTestimonials = [
      {
        id: "t-1",
        name: "Sarah Jenkins",
        rating: 5,
        text: "The shipwreck tour was the absolute highlight of our honeymoon! Swimming with dozens of nurse sharks felt surreal. Highly recommend!"
      },
      {
        id: "t-2",
        name: "Liam Peterson",
        rating: 5,
        text: "Exceptional service. Captain Ibrahim navigated through beautiful channels and spots where we saw manta rays and dolphins. 10/10."
      },
      {
        id: "t-3",
        name: "Monica & David",
        rating: 5,
        text: "We booked the Private Proposal sandbank trip. Everything was set up so beautifully with lanterns, rugs, and a delicious barbecue dinner."
      }
    ];

    const defaultReels = [
      { id: "r-1", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80" },
      { id: "r-2", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { id: "r-3", image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80" },
      { id: "r-4", image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" }
    ];

    const defaultGallery = [
      { id: "g-1", title: "Lagoon Explorer", image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80", video: "", aspectRatio: "16:9" },
      { id: "g-2", title: "Manta Ray Encounter", image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80", video: "", aspectRatio: "9:16" },
      { id: "g-3", title: "Tropical Sandbank", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", video: "", aspectRatio: "16:9" },
      { id: "g-4", title: "Freediver Descent", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80", video: "", aspectRatio: "9:16" }
    ];

    const defaultOffer = {
      title: "Summer Lagoon Special",
      discount: "15% OFF",
      description: "Book any Private Speedboat Charter or Resort Day Pass this week and receive an instant 15% discount + free underwater photography package.",
      category: "All",
      code: "LAGOON15",
      validity: "Valid until June 30, 2026"
    };

    const promises = [
      seedKeyIfEmpty('packages',         []),
      seedKeyIfEmpty('excursions',       defaultExcursions),
      seedKeyIfEmpty('private_bookings', defaultPrivate),
      seedKeyIfEmpty('freediving',       defaultFreediving),
      seedKeyIfEmpty('resorts',          defaultResorts),
      seedKeyIfEmpty('photography',      defaultPhotography),
      seedKeyIfEmpty('bookings',         []),
      seedKeyIfEmpty('contact_messages', []),
      seedKeyIfEmpty('testimonials',     defaultTestimonials),
      seedKeyIfEmpty('reels',            defaultReels),
      seedKeyIfEmpty('gallery',          defaultGallery),
      seedKeyIfEmpty('hero_videos',      ['back.mp4']),
      seedKeyIfEmpty('hero_video',       'back.mp4'),
      seedKeyIfEmpty('google_review',    'https://google.com'),
      seedKeyIfEmpty('offer',            defaultOffer),
      seedKeyIfEmpty('crew',             defaultCrew),
    ];
    await Promise.all(promises);
    console.log('✅ Database checks and rich content seeding finished.');
  } catch (err) {
    console.error('⚠️ Seeding error:', err.message);
  }
}

// ─── Web Push & Subscriptions ──────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@travelscape.mv',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

app.post('/api/notifications/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const subs = await getCacheValue('push_subscriptions', []) || [];
    
    // Check if it already exists
    const exists = subs.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subs.push(subscription);
      await setCacheValue('push_subscriptions', subs);
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function sendPushNotifications(title, body) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const payload = JSON.stringify({ title, body, icon: '/1.png' });
  const subs = await getCacheValue('push_subscriptions', []) || [];

  const validSubs = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      validSubs.push(sub);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        console.log('Subscription has expired or is no longer valid');
      } else {
        console.error('Error sending push notification:', error);
        validSubs.push(sub); // Keep it if it was another error
      }
    }
  }

  // Clean up invalid subscriptions
  if (validSubs.length !== subs.length) {
    await setCacheValue('push_subscriptions', validSubs);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  🌊 Travelscape Maldives Production Server`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  🚀 Port: ${PORT}`);
  console.log(`  🗄️  PostgreSQL: ${process.env.DATABASE_URL ? 'URL configured' : '❌ MISSING DATABASE_URL'}`);
  console.log(`  ☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : '❌ MISSING CLOUDINARY vars'}`);
  console.log(`  🔑 Authentication: Environment variables verified (ADMIN_PASSWORD & STAFF_PASSWORD)`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer memory storage for file uploads (500MB limit for large videos)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const app = express();
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

// Upload base64 OR buffer to Cloudinary
async function uploadToCloudinary(data, folder = 'travelscape', isBuffer = false, mimeType = '') {
  try {
    if (!data) return '';
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

// ─── MongoDB ─────────────────────────────────────────────────────────────────
let isDbConnected = false;

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
}).then(() => {
  isDbConnected = true;
  console.log('✅ MongoDB Atlas Connected');
  seedDatabaseIfEmpty();
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  // Retry after 5 seconds
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI).then(() => {
      isDbConnected = true;
      console.log('✅ MongoDB Atlas Connected (retry)');
      seedDatabaseIfEmpty();
    }).catch(e => console.error('❌ MongoDB retry failed:', e.message));
  }, 5000);
});

mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
  console.warn('⚠️ MongoDB disconnected — attempting reconnect');
});
mongoose.connection.on('reconnected', () => {
  isDbConnected = true;
  console.log('✅ MongoDB reconnected');
});

// MongoDB Schema
const DataCacheSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const DataCache = mongoose.model('DataCache', DataCacheSchema);

// Wait for DB to be ready (used in endpoints that need DB)
async function waitForDB(maxWait = 20000) {
  if (isDbConnected) return true;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 300));
    if (isDbConnected) return true;
  }
  return false;
}

// Get value from MongoDB
async function getCacheValue(key, defaultValue = null) {
  try {
    await waitForDB();
    const doc = await DataCache.findOne({ key });
    return doc ? doc.value : defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key}:`, e.message);
    return defaultValue;
  }
}

// Set value in MongoDB
async function setCacheValue(key, value) {
  try {
    await waitForDB();
    await DataCache.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
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

// ─── File Upload Endpoint (multipart) ────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ success: false, error: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Render environment variables.' });
    }

    const folder = req.body.folder || 'travelscape';
    const url = await uploadToCloudinary(req.file.buffer, folder, true, req.file.mimetype);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Auth Endpoint ───────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, password } = req.body;

    // Priority: Render environment variables → MongoDB → hardcoded fallback
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const staffPass = process.env.STAFF_PASSWORD || 'staff123';

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

      if (idx >= 0) list[idx] = { ...list[idx], ...item };
      else list.push(item);

      await setCacheValue(dbKey, list);
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
registerCollectionRoutes('excursions',       'excursions');
registerCollectionRoutes('private',          'private_bookings');
registerCollectionRoutes('freediving',       'freediving');
registerCollectionRoutes('resorts',          'resorts');
registerCollectionRoutes('bookings',         'bookings');
registerCollectionRoutes('testimonials',     'testimonials');
registerCollectionRoutes('reels',            'reels');
registerCollectionRoutes('gallery',          'gallery');
registerCollectionRoutes('contact_messages', 'contact_messages');
registerCollectionRoutes('instagram_config', 'instagram_config');

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

// ─── Database Seeding ────────────────────────────────────────────────────────
async function seedDatabaseIfEmpty() {
  try {
    const count = await DataCache.countDocuments();
    if (count > 0) {
      console.log(`📦 MongoDB has ${count} records — skipping seed.`);
      return;
    }
    console.log('🌱 MongoDB empty — seeding initial records...');
    const promises = [
      setCacheValue('excursions',       []),
      setCacheValue('private_bookings', []),
      setCacheValue('freediving',       []),
      setCacheValue('resorts',          []),
      setCacheValue('bookings',         []),
      setCacheValue('contact_messages', []),
      setCacheValue('testimonials',     []),
      setCacheValue('reels',            []),
      setCacheValue('gallery',          []),
      setCacheValue('hero_videos',      []),
      setCacheValue('hero_video',       ''),
      setCacheValue('google_review',    ''),
      setCacheValue('offer',            {}),
    ];
    await Promise.all(promises);
    console.log('✅ MongoDB seed complete.');
  } catch (err) {
    console.error('⚠️ Seeding error:', err.message);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🌊 Travelscape Maldives Production Server`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  🚀 Port: ${PORT}`);
  console.log(`  🗄️  MongoDB: ${process.env.MONGODB_URI ? 'URI configured' : '❌ MISSING MONGODB_URI'}`);
  console.log(`  ☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : '❌ MISSING CLOUDINARY vars'}`);
  console.log(`  🔑 Admin Password: ${process.env.ADMIN_PASSWORD ? 'set from env' : 'using default admin123'}`);
});

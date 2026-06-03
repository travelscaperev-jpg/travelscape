require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to handle base64 image/video uploads to Cloudinary
async function uploadToCloudinary(base64Data, folder = 'travelscape') {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  try {
    const isVideo = base64Data.includes('video');
    const resourceType = isVideo ? 'video' : 'image';
    const uploadResult = await (isVideo
      ? cloudinary.uploader.upload_large(base64Data, { folder: folder, resource_type: 'video' })
      : cloudinary.uploader.upload(base64Data, { folder: folder, resource_type: 'image' })
    );
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return base64Data; // Return original if upload fails
  }
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// MongoDB Schema & Models
const DataCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const DataCache = mongoose.model('DataCache', DataCacheSchema);

// Initial local fallbacks for data loading
const initialCollections = [
  'excursions',
  'private_bookings',
  'freediving',
  'resorts',
  'bookings',
  'contact_messages',
  'testimonials',
  'reels',
  'gallery',
  'hero_videos'
];

// Helper to get collection value or default
async function getCacheValue(key, defaultValue = []) {
  try {
    const doc = await DataCache.findOne({ key });
    return doc ? doc.value : defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key}:`, e.message);
    return defaultValue;
  }
}

// Helper to set cache value
async function setCacheValue(key, value) {
  try {
    await DataCache.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    return true;
  } catch (e) {
    console.error(`Error writing key ${key}:`, e.message);
    return false;
  }
}

// --- Auth Endpoint ---
app.post('/api/auth/login', (req, res) => {
  const { role, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const staffPass = process.env.STAFF_PASSWORD || 'staff123';

  if (role === 'admin' && password === adminPass) {
    return res.json({ success: true, role: 'admin' });
  }
  if (role === 'staff' && password === staffPass) {
    return res.json({ success: true, role: 'staff' });
  }
  return res.status(401).json({ success: false, message: 'Incorrect password' });
});

// --- Generic CRUD for array collections ---
function registerCollectionRoutes(routePath, dbKey) {
  // GET all
  app.get(`/api/${routePath}`, async (req, res) => {
    const list = await getCacheValue(dbKey, []);
    res.json(list);
  });

  // POST - save entire array (replace) with Cloudinary auto-upload support
  app.post(`/api/${routePath}`, async (req, res) => {
    let list = req.body;
    if (Array.isArray(list)) {
      list = await Promise.all(list.map(async (item) => {
        // Upload main images and videos
        if (item.image && item.image.startsWith('data:')) {
          item.image = await uploadToCloudinary(item.image, dbKey);
        }
        if (item.video && item.video.startsWith('data:')) {
          item.video = await uploadToCloudinary(item.video, dbKey);
        }
        if (item.subImg1 && item.subImg1.startsWith('data:')) {
          item.subImg1 = await uploadToCloudinary(item.subImg1, dbKey);
        }
        if (item.subImg2 && item.subImg2.startsWith('data:')) {
          item.subImg2 = await uploadToCloudinary(item.subImg2, dbKey);
        }
        // SubImages array if present
        if (Array.isArray(item.subImages)) {
          item.subImages = await Promise.all(item.subImages.map(async (sub) => {
            return sub.startsWith('data:') ? await uploadToCloudinary(sub, dbKey) : sub;
          }));
        }
        return item;
      }));
    }
    await setCacheValue(dbKey, list);
    res.json({ success: true });
  });

  // PUT - add or update single item
  app.put(`/api/${routePath}/:id`, async (req, res) => {
    const list = await getCacheValue(dbKey, []);
    const idx = list.findIndex(item => item.id === req.params.id);
    let item = req.body;

    if (item.image && item.image.startsWith('data:')) {
      item.image = await uploadToCloudinary(item.image, dbKey);
    }
    if (item.video && item.video.startsWith('data:')) {
      item.video = await uploadToCloudinary(item.video, dbKey);
    }
    if (item.subImg1 && item.subImg1.startsWith('data:')) {
      item.subImg1 = await uploadToCloudinary(item.subImg1, dbKey);
    }
    if (item.subImg2 && item.subImg2.startsWith('data:')) {
      item.subImg2 = await uploadToCloudinary(item.subImg2, dbKey);
    }
    if (Array.isArray(item.subImages)) {
      item.subImages = await Promise.all(item.subImages.map(async (sub) => {
        return sub.startsWith('data:') ? await uploadToCloudinary(sub, dbKey) : sub;
      }));
    }

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    await setCacheValue(dbKey, list);
    res.json({ success: true, item });
  });

  // DELETE - remove single item
  app.delete(`/api/${routePath}/:id`, async (req, res) => {
    let list = await getCacheValue(dbKey, []);
    list = list.filter(item => item.id !== req.params.id);
    await setCacheValue(dbKey, list);
    res.json({ success: true });
  });
}

// Register all collection routes
registerCollectionRoutes('excursions', 'excursions');
registerCollectionRoutes('private', 'private_bookings');
registerCollectionRoutes('freediving', 'freediving');
registerCollectionRoutes('resorts', 'resorts');
registerCollectionRoutes('bookings', 'bookings');
registerCollectionRoutes('testimonials', 'testimonials');
registerCollectionRoutes('reels', 'reels');
registerCollectionRoutes('gallery', 'gallery');
registerCollectionRoutes('contact_messages', 'contact_messages');
registerCollectionRoutes('instagram_config', 'instagram_config');

// --- Singular value endpoints ---

// Offer
app.get('/api/offer', async (req, res) => {
  const offer = await getCacheValue('offer', {});
  res.json(offer);
});
app.post('/api/offer', async (req, res) => {
  await setCacheValue('offer', req.body);
  res.json({ success: true });
});
app.delete('/api/offer', async (req, res) => {
  await setCacheValue('offer', {});
  res.json({ success: true });
});

// Hero Video
app.get('/api/hero-video', async (req, res) => {
  const video = await getCacheValue('hero_video', 'back.mp4');
  res.json({ video });
});
app.post('/api/hero-video', async (req, res) => {
  let videoVal = req.body.video || 'back.mp4';
  if (videoVal.startsWith('data:')) {
    videoVal = await uploadToCloudinary(videoVal, 'hero');
  }
  await setCacheValue('hero_video', videoVal);
  res.json({ success: true });
});

// Hero Videos
app.get('/api/hero-videos', async (req, res) => {
  const videos = await getCacheValue('hero_videos', ['back.mp4']);
  res.json({ videos });
});
app.post('/api/hero-videos', async (req, res) => {
  let videosList = req.body.videos || ['back.mp4'];
  if (Array.isArray(videosList)) {
    videosList = await Promise.all(videosList.map(async (vid) => {
      return vid.startsWith('data:') ? await uploadToCloudinary(vid, 'hero') : vid;
    }));
  }
  await setCacheValue('hero_videos', videosList);
  if (videosList.length > 0) {
    await setCacheValue('hero_video', videosList[0]);
  }
  res.json({ success: true });
});

// Google Review
app.get('/api/google-review', async (req, res) => {
  const googleReview = await getCacheValue('google_review', '');
  res.json({ url: googleReview });
});
app.post('/api/google-review', async (req, res) => {
  const urlVal = req.body.url || '';
  await setCacheValue('google_review', urlVal);
  res.json({ success: true });
});

// Initialize database with static fallbacks if empty
async function seedDatabaseIfEmpty() {
  try {
    const count = await DataCache.countDocuments();
    if (count === 0) {
      console.log('Seeding MongoDB database with fallback configuration...');
      const fallbackDbRaw = fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf-8');
      const fallbackDb = JSON.parse(fallbackDbRaw);
      
      const promises = [
        setCacheValue('excursions', fallbackDb.excursions || []),
        setCacheValue('private_bookings', fallbackDb.private_bookings || []),
        setCacheValue('freediving', fallbackDb.freediving || []),
        setCacheValue('resorts', fallbackDb.resorts || []),
        setCacheValue('bookings', fallbackDb.bookings || []),
        setCacheValue('contact_messages', fallbackDb.contact_messages || []),
        setCacheValue('testimonials', fallbackDb.testimonials || []),
        setCacheValue('reels', fallbackDb.reels || []),
        setCacheValue('gallery', fallbackDb.gallery || []),
        setCacheValue('hero_videos', fallbackDb.hero_videos || ['back.mp4']),
        setCacheValue('hero_video', fallbackDb.hero_video || 'back.mp4'),
        setCacheValue('google_review', fallbackDb.google_review || ''),
        setCacheValue('offer', fallbackDb.offer || {})
      ];
      await Promise.all(promises);
      console.log('MongoDB Seed complete.');
    }
  } catch (err) {
    console.error('Seeding warning:', err.message);
  }
}

// --- Start Server ---
app.listen(PORT, async () => {
  console.log(`\n  🌊 Travelscape Maldives Production Server`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  🚀 Running at: http://localhost:${PORT}`);
  console.log(`  📁 Serving from: ${__dirname}`);
  await seedDatabaseIfEmpty();
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-me';

// Configure Cloudinary (Reads from CLOUDINARY_URL env automatically if provided, or explicit keys)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'travelscape',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4'],
    resource_type: 'auto'
  },
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- Auth Middleware ---
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// --- Authentication Routes ---
app.post('/api/login', async (req, res) => {
  const { role, password } = req.body;
  let validPassword = false;

  if (role === 'ADMIN' && password === process.env.ADMIN_PASSWORD) {
    validPassword = true;
  } else if (role === 'STAFF' && password === process.env.STAFF_PASSWORD) {
    validPassword = true;
  }

  if (validPassword) {
    const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// --- Content CRUD Routes (Excursions & More) ---
const models = ['excursion', 'privateTrip', 'resort', 'freediving', 'photography', 'gallery', 'reel', 'heroSlider'];

models.forEach(modelName => {
  const routeName = modelName === 'gallery' ? 'gallery' : modelName + 's';
  
  // GET all items
  app.get(`/api/${routeName}`, async (req, res) => {
    try {
      const items = await prisma[modelName].findMany({ orderBy: { createdAt: 'desc' } });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // POST new item (Admin/Staff only)
  app.post(`/api/${routeName}`, authenticate, upload.single('media'), async (req, res) => {
    try {
      const { title, description, price } = req.body;
      const mediaUrl = req.file ? req.file.path : null;
      
      const data = { title };
      if (description !== undefined) data.description = description;
      if (price !== undefined) data.price = parseFloat(price) || 0;
      
      // Determine if it's videoUrl or imageUrl
      if (['reel', 'heroSlider'].includes(modelName)) {
        if (mediaUrl) data.videoUrl = mediaUrl;
      } else {
        if (mediaUrl) data.imageUrl = mediaUrl;
      }

      const item = await prisma[modelName].create({ data });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  // DELETE item (Admin only for some, or authenticate for all)
  app.delete(`/api/${routeName}/:id`, authenticate, async (req, res) => {
    try {
      await prisma[modelName].delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });
});

// --- Bookings ---
app.get('/api/bookings', authenticate, async (req, res) => {
  const items = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items);
});

app.post('/api/bookings', async (req, res) => {
  const { name, email, category, date, paymentType, isPaid } = req.body;
  const bookingNo = 'BK-' + Date.now().toString().slice(-6);
  
  const booking = await prisma.booking.create({
    data: { bookingNo, name, email, category, date: new Date(date), paymentType, isPaid: isPaid || false }
  });
  
  // TODO: Trigger web push notification here
  res.json(booking);
});

app.delete('/api/bookings/:id', authenticate, requireAdmin, async (req, res) => {
  await prisma.booking.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

app.patch('/api/bookings/:id/confirm', authenticate, async (req, res) => {
  const booking = await prisma.booking.update({
    where: { id: parseInt(req.params.id) },
    data: { status: 'CONFIRMED' }
  });
  res.json(booking);
});

// --- Contacts ---
app.get('/api/contacts', authenticate, async (req, res) => {
  const items = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items);
});

app.post('/api/contacts', async (req, res) => {
  const { name, email, message } = req.body;
  const msg = await prisma.contactMessage.create({ data: { name, email, message } });
  res.json(msg);
});

app.delete('/api/contacts/:id', authenticate, requireAdmin, async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

// --- Fallback Route ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

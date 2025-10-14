const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:4200', 
  credentials: true 
}));
app.use(express.json());

// Serve static images from the root images directory
app.use('/images', express.static(path.join(__dirname, '../images')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ibnexp API Server with Images',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/meals', (req, res) => {
  res.json({
    success: true,
    data: [
      { 
        id: 1, 
        name: 'Grilled Chicken Salad', 
        arName: 'سلطة دجاج مشوي',
        description: 'A light and healthy salad with grilled chicken breast',
        arDescription: 'سلطة خفيفة وصحية مع صدر دجاج مشوي',
        imageUrl: '/images/ChickenKabsa.png',
        macros: { calories: 350, protein: 30, carbs: 10, fat: 20 }
      },
      { 
        id: 2, 
        name: 'Vegan Lentil Soup', 
        arName: 'شوربة عدس نباتية',
        description: 'A hearty and nutritious soup made with red lentils',
        arDescription: 'شوربة غنية ومغذية مصنوعة من العدس الأحمر',
        imageUrl: '/images/Grilled Chicken Breast.png',
        macros: { calories: 300, protein: 15, carbs: 45, fat: 5 }
      }
    ]
  });
});

app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Program 16',
        arName: 'برنامج ١٦',
        description: 'A great start with 4 meals delivered weekly',
        arDescription: 'بداية رائعة مع ٤ وجبات يتم توصيلها أسبوعياً',
        pricePerMonth: 460,
        mealsPerMonth: 16,
        isPopular: false
      },
      {
        id: 2,
        name: 'Program 26', 
        arName: 'برنامج ٢٦',
        description: 'Perfect for a consistent, semi-daily meal plan',
        arDescription: 'مثالي لخطة وجبات شبه يومية ومتسقة',
        pricePerMonth: 650,
        mealsPerMonth: 26,
        isPopular: true
      }
    ]
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email /*, password */ } = req.body;

  const DEV_ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || 'admin@ibnexp.com';
  const DEV_ADMIN_TOKEN = process.env.DEV_ADMIN_TOKEN || 'test-jwt-token';

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Mock login disabled in production' });
  }

  if (email === DEV_ADMIN_EMAIL) {
    res.json({
      success: true,
      message: 'Login successful (dev mock)',
      data: {
        user: {
          user_id: 'admin-1',
          email: email,
          first_name: 'Admin',
          last_name: 'User',
          is_admin: true,
          is_student: false
        },
        token: DEV_ADMIN_TOKEN
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || (req.cookies && req.cookies.token);
  const DEV_ADMIN_TOKEN = process.env.DEV_ADMIN_TOKEN || 'test-jwt-token';
  const DEV_ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || 'admin@ibnexp.com';

  if (process.env.NODE_ENV !== 'production' && token === DEV_ADMIN_TOKEN) {
    return res.json({
      success: true,
      data: {
        user: {
          user_id: 'admin-1',
          email: DEV_ADMIN_EMAIL,
          first_name: 'Admin',
          last_name: 'User',
          is_admin: true,
          is_student: false
        }
      }
    });
  }

  res.status(401).json({ success: false, error: 'Not authenticated' });
});

// Test image endpoint
app.get('/api/test-image', (req, res) => {
  res.json({
    success: true,
    images: {
      background: '/images/herobackground.png',
      logo: '/images/LogoChef.png',
      mansaf: '/images/mansaf.png'
    }
  });
});

console.log('🖼️  Image Server Starting...');
console.log('📂 Images directory:', path.join(__dirname, '../images'));
console.log('✅ Backend API running on http://localhost:' + PORT);
console.log('🖼️  Images served from http://localhost:' + PORT + '/images/');

app.listen(PORT);

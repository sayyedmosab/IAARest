import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';

// Import database and run migrations
import { DatabaseConnection } from './database/database.js';
// import { runMigrations } from './database/migrate';

// Import repositories and auth utilities for admin user creation
import { profileRepo, mealRepo, planRepo, subscriptionRepo, menuDayAssignmentRepo, mealIngredientRepo, ingredientRepo } from './services/repositories.js';
import { hashPassword } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import mealRoutes from './routes/meals.js';
import planRoutes from './routes/plans.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import adminRoutes from './routes/admin.js';
import ingredientsRoutes from './routes/ingredients.js';
import paymentRoutes from './routes/payments.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser (required for cookie-based auth)
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
// Static file serving for images
app.use('/images', express.static(path.join(__dirname, '../../../images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ibnexp API Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
// Debug middleware - log all requests
app.use('/api/admin', (req, res, next) => {
  console.log(`=== ADMIN REQUEST: ${req.method} ${req.path} ===`);
  next();
});

// Trace requests to /api/ingredients to help debug 404s
app.use('/api/ingredients', (req, res, next) => {
  try {
    console.log(`=== INGREDIENTS TRACE: ${req.method} ${req.originalUrl} headers=${JSON.stringify(req.headers, null, 2)}`);
  } catch (e) {
    console.log('=== INGREDIENTS TRACE: (failed to stringify headers)');
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  DatabaseConnection.getInstance().close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  DatabaseConnection.getInstance().close();
  process.exit(0);
});

// Generate secure password function
function generateSecurePassword(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

// Initialize admin user on startup
async function initializeAdminUser() {
  try {
    console.log('🔑 Checking for admin user...');
    const existingAdmins = profileRepo.findAdmins();
    
    if (existingAdmins.length === 0) {
      console.log('⚠️ No admin user found. Creating default admin...');
      
      // Hash the password - use environment variable or generate a secure one
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || generateSecurePassword();
      const hashedPassword = await hashPassword(adminPassword);
      
      const newAdmin = profileRepo.create({
        email: 'admin@ibnexp2.com',
        password: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        phone_e164: '+971500000000',
        language_pref: 'en',
        is_admin: true,
        is_student: false,
        address: 'Sharjah, UAE',
        district: 'University City',
        university_email: 'admin@ibnexp2.com',
        student_id_expiry: undefined
      });
      
      console.log('✅ Admin user created successfully:', newAdmin.email);
      console.log('🔑 Login credentials:');
      console.log('   Email: admin@ibnexp2.com');
      console.log('   Password:', adminPassword);
      console.log('⚠️  SECURITY: Please change the default password after first login!');
    } else {
      console.log('✅ Admin user already exists:', existingAdmins.map(a => a.email).join(', '));
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error);
  }
}

// Initialize dummy data for testing
async function initializeDummyData() {
  try {
    console.log('📊 Initializing dummy data for testing...');
    
    // Check what data we already have
    console.log('[DEBUG] Checking existing data...');
    const existingMeals = mealRepo.findAll();
    const existingSubscriptions = subscriptionRepo.findAll();
    const existingMenuCycles = menuDayAssignmentRepo.query('SELECT * FROM menu_cycles WHERE is_active = 1');
    const existingPlans = planRepo.findAll();
    const existingProfiles = profileRepo.findAll();
    const existingIngredients = ingredientRepo.findAll();
    
    console.log('[DEBUG] Existing data counts:');
    console.log('  Meals:', existingMeals.length);
    console.log('  Subscriptions:', existingSubscriptions.length);
    console.log('  Active Menu Cycles:', existingMenuCycles.length);
    console.log('  Plans:', existingPlans.length);
    console.log('  Profiles:', existingProfiles.length);
    console.log('  Ingredients:', existingIngredients.length);
    
    // Force creation of dummy data for testing
    console.log('[DEBUG] Forcing dummy data creation for testing...');
    
    // Create dummy meal-ingredient relationships
    if (existingMeals.length > 0 && existingIngredients.length > 0) {
      console.log('🍽️ Creating meal-ingredient relationships...');
      
      // Clear existing relationships first
      try {
        menuDayAssignmentRepo.execute('DELETE FROM meal_ingredients');
        console.log('[DEBUG] Cleared existing meal-ingredient relationships');
      } catch (err) {
        console.log('[DEBUG] Error clearing meal-ingredients:', err);
      }
      
      existingMeals.forEach((meal: any, index: number) => {
        // Add 2-3 ingredients per meal
        const ingredientCount = Math.min(3, existingIngredients.length);
        for (let i = 0; i < ingredientCount; i++) {
          const ingredient = existingIngredients[i];
          const weight = 100 + (index * 50) + (i * 25); // Varying weights
          
          try {
            mealIngredientRepo.create({
              meal_id: meal.id,
              ingredient_id: ingredient.id,
              weight_g: weight,
              notes: `Sample ingredient for ${meal.name_en}`
            });
            console.log(`[DEBUG] Created relationship: ${meal.name_en} -> ${ingredient.name_en} (${weight}g)`);
          } catch (err) {
            console.log(`[DEBUG] Error creating meal-ingredient relationship:`, err);
          }
        }
      });
      console.log('✅ Meal-ingredient relationships created');
    }
    
    // Create dummy active subscriptions
    if (existingPlans.length > 0 && existingProfiles.length > 0) {
      console.log('👥 Creating dummy active subscriptions...');
      
      // Clear existing subscriptions first
      try {
        menuDayAssignmentRepo.execute("DELETE FROM subscriptions WHERE status = 'active'");
        console.log('[DEBUG] Cleared existing active subscriptions');
      } catch (err) {
        console.log('[DEBUG] Error clearing subscriptions:', err);
      }
      
      const nonAdminProfiles = existingProfiles.filter(p => !p.is_admin);
      console.log('[DEBUG] Non-admin profiles available:', nonAdminProfiles.length);
      
      // Create 3-5 active subscriptions
      const subscriptionCount = Math.min(5, nonAdminProfiles.length);
      for (let i = 0; i < subscriptionCount; i++) {
        const profile = nonAdminProfiles[i];
        const plan = existingPlans[i % existingPlans.length];
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 10); // Started 10 days ago
        
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 20); // Ends in 20 days
        
        try {
          subscriptionRepo.create({
            user_id: profile.user_id,
            plan_id: plan.id,
            status: 'Active',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            student_discount_applied: (profile.is_student ? 1 : 0) as any,
            price_charged_aed: plan.discounted_price_aed || plan.base_price_aed,
            currency: 'AED',
            renewal_type: 'manual',
            has_successful_payment: 1 as any,
            payment_method: 'credit_card',
            auto_renewal: 0 as any,
            completed_cycles: 0 as any
          });
          console.log(`[DEBUG] Created subscription: ${profile.email} -> ${plan.name_en}`);
        } catch (err) {
          console.log(`[DEBUG] Error creating subscription:`, err);
        }
      }
      console.log('✅ Dummy active subscriptions created');
    }
    
    // Create dummy menu cycle
    if (existingMeals.length >= 2) {
      console.log('📅 Creating dummy menu cycle...');
      
      // Clear existing menu data first
      try {
        menuDayAssignmentRepo.execute('DELETE FROM menu_day_assignments');
        menuDayAssignmentRepo.execute('DELETE FROM menu_cycle_days');
        menuDayAssignmentRepo.execute('DELETE FROM menu_cycles WHERE is_active = 1');
        console.log('[DEBUG] Cleared existing menu cycle data');
      } catch (err) {
        console.log('[DEBUG] Error clearing menu cycle data:', err);
      }
      
      // Create menu cycle
      const cycleId = `cycle_${Date.now()}`;
      try {
        menuDayAssignmentRepo.execute(`
          INSERT INTO menu_cycles (id, name, cycle_length_days, is_active)
          VALUES (?, ?, ?, ?)
        `, [cycleId, 'Test Weekly Menu', 7, 1]);
        console.log(`[DEBUG] Created menu cycle: ${cycleId}`);
      } catch (err) {
        console.log('[DEBUG] Error creating menu cycle:', err);
      }
      
      // Create menu cycle days (7 days)
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const cycleDayId = `cycle_day_${cycleId}_${dayIndex}`;
        try {
          menuDayAssignmentRepo.execute(`
            INSERT INTO menu_cycle_days (id, cycle_id, day_index, label)
            VALUES (?, ?, ?, ?)
          `, [cycleDayId, cycleId, dayIndex, `Day ${dayIndex + 1}`]);
          console.log(`[DEBUG] Created cycle day: ${cycleDayId} (index ${dayIndex})`);
          
          // Assign meals to lunch and dinner for each day
          // Lunch meal
          const lunchMeal = existingMeals[dayIndex % existingMeals.length];
          menuDayAssignmentRepo.execute(`
            INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot)
            VALUES (?, ?, ?, ?)
          `, [`assignment_lunch_${cycleDayId}`, cycleDayId, lunchMeal.id, 'lunch']);
          console.log(`[DEBUG] Assigned lunch: ${lunchMeal.name_en} to day ${dayIndex}`);
          
          // Dinner meal
          const dinnerMeal = existingMeals[(dayIndex + 1) % existingMeals.length];
          menuDayAssignmentRepo.execute(`
            INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot)
            VALUES (?, ?, ?, ?)
          `, [`assignment_dinner_${cycleDayId}`, cycleDayId, dinnerMeal.id, 'dinner']);
          console.log(`[DEBUG] Assigned dinner: ${dinnerMeal.name_en} to day ${dayIndex}`);
          
        } catch (err) {
          console.log(`[DEBUG] Error creating cycle day ${dayIndex}:`, err);
        }
      }
      
      console.log('✅ Dummy menu cycle created with meal assignments');
    }
    
    console.log('🎉 Dummy data initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing dummy data:', error);
  }
}

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting Ibnexp Backend Server...');
    console.log('📍 Port:', PORT);
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔗 Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:4200');

    // Initialize database connection
    console.log('🗄️  Initializing database connection...');
    DatabaseConnection.getInstance();
    console.log('✅ Database connection initialized');

    // Run database migrations
    // console.log('📊 Running database migrations...');
    // await runMigrations();

    // Initialize admin user
    await initializeAdminUser();
    
    // Initialize dummy data for testing
    await initializeDummyData();

    // Start HTTP server
    console.log('🌐 Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
      console.log('🎉 Server startup complete!');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

  } catch (error: unknown) {
    console.error('❌ Failed to start server:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Stack trace: Not available (error is not an Error instance)');
    }
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Import database and run migrations
const database_js_1 = require("./database/database.js");
// import { runMigrations } from './database/migrate';
// Import repositories and auth utilities for admin user creation
const repositories_js_1 = require("./services/repositories.js");
const auth_js_1 = require("./middleware/auth.js");
// Import routes
const auth_js_2 = __importDefault(require("./routes/auth.js"));
const meals_js_1 = __importDefault(require("./routes/meals.js"));
const plans_js_1 = __importDefault(require("./routes/plans.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const subscriptions_js_1 = __importDefault(require("./routes/subscriptions.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const ingredients_js_1 = __importDefault(require("./routes/ingredients.js"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Trust proxy for rate limiting
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Compression middleware
app.use((0, compression_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser (required for cookie-based auth)
app.use((0, cookie_parser_1.default)());
// Static file serving for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Static file serving for images
app.use('/images', express_1.default.static(path_1.default.join(__dirname, '../../../images')));
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
    }
    catch (e) {
        console.log('=== INGREDIENTS TRACE: (failed to stringify headers)');
    }
    next();
});
app.use('/api/auth', auth_js_2.default);
app.use('/api/meals', meals_js_1.default);
app.use('/api/plans', plans_js_1.default);
app.use('/api/users', users_js_1.default);
app.use('/api/subscriptions', subscriptions_js_1.default);
app.use('/api/admin', admin_js_1.default);
app.use('/api/ingredients', ingredients_js_1.default);
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
app.use((error, req, res, next) => {
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
    database_js_1.DatabaseConnection.getInstance().close();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    database_js_1.DatabaseConnection.getInstance().close();
    process.exit(0);
});
// Initialize admin user on startup
async function initializeAdminUser() {
    try {
        console.log('🔑 Checking for admin user...');
        const existingAdmins = repositories_js_1.profileRepo.findAdmins();
        if (existingAdmins.length === 0) {
            console.log('⚠️ No admin user found. Creating default admin...');
            // Hash the password 'admin123'
            const hashedPassword = await (0, auth_js_1.hashPassword)('admin123');
            const newAdmin = repositories_js_1.profileRepo.create({
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
            console.log('   Password: admin123');
        }
        else {
            console.log('✅ Admin user already exists:', existingAdmins.map(a => a.email).join(', '));
        }
    }
    catch (error) {
        console.error('❌ Error initializing admin user:', error);
    }
}
// Initialize dummy data for testing
async function initializeDummyData() {
    try {
        console.log('📊 Initializing dummy data for testing...');
        // Check what data we already have
        console.log('[DEBUG] Checking existing data...');
        const existingMeals = repositories_js_1.mealRepo.findAll();
        const existingSubscriptions = repositories_js_1.subscriptionRepo.findAll();
        const existingMenuCycles = repositories_js_1.menuDayAssignmentRepo.query('SELECT * FROM menu_cycles WHERE is_active = 1');
        const existingPlans = repositories_js_1.planRepo.findAll();
        const existingProfiles = repositories_js_1.profileRepo.findAll();
        const existingIngredients = repositories_js_1.ingredientRepo.findAll();
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
                repositories_js_1.menuDayAssignmentRepo.execute('DELETE FROM meal_ingredients');
                console.log('[DEBUG] Cleared existing meal-ingredient relationships');
            }
            catch (err) {
                console.log('[DEBUG] Error clearing meal-ingredients:', err);
            }
            existingMeals.forEach((meal, index) => {
                // Add 2-3 ingredients per meal
                const ingredientCount = Math.min(3, existingIngredients.length);
                for (let i = 0; i < ingredientCount; i++) {
                    const ingredient = existingIngredients[i];
                    const weight = 100 + (index * 50) + (i * 25); // Varying weights
                    try {
                        repositories_js_1.mealIngredientRepo.create({
                            meal_id: meal.id,
                            ingredient_id: ingredient.id,
                            weight_g: weight,
                            notes: `Sample ingredient for ${meal.name_en}`
                        });
                        console.log(`[DEBUG] Created relationship: ${meal.name_en} -> ${ingredient.name_en} (${weight}g)`);
                    }
                    catch (err) {
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
                repositories_js_1.menuDayAssignmentRepo.execute("DELETE FROM subscriptions WHERE status = 'active'");
                console.log('[DEBUG] Cleared existing active subscriptions');
            }
            catch (err) {
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
                    repositories_js_1.subscriptionRepo.create({
                        user_id: profile.user_id,
                        plan_id: plan.id,
                        status: 'active',
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: endDate.toISOString().split('T')[0],
                        student_discount_applied: (profile.is_student ? 1 : 0),
                        price_charged_aed: plan.discounted_price_aed || plan.base_price_aed,
                        currency: 'AED',
                        renewal_type: 'manual',
                        has_successful_payment: 1
                    });
                    console.log(`[DEBUG] Created subscription: ${profile.email} -> ${plan.name_en}`);
                }
                catch (err) {
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
                repositories_js_1.menuDayAssignmentRepo.execute('DELETE FROM menu_day_assignments');
                repositories_js_1.menuDayAssignmentRepo.execute('DELETE FROM menu_cycle_days');
                repositories_js_1.menuDayAssignmentRepo.execute('DELETE FROM menu_cycles WHERE is_active = 1');
                console.log('[DEBUG] Cleared existing menu cycle data');
            }
            catch (err) {
                console.log('[DEBUG] Error clearing menu cycle data:', err);
            }
            // Create menu cycle
            const cycleId = `cycle_${Date.now()}`;
            try {
                repositories_js_1.menuDayAssignmentRepo.execute(`
          INSERT INTO menu_cycles (id, name, cycle_length_days, is_active)
          VALUES (?, ?, ?, ?)
        `, [cycleId, 'Test Weekly Menu', 7, 1]);
                console.log(`[DEBUG] Created menu cycle: ${cycleId}`);
            }
            catch (err) {
                console.log('[DEBUG] Error creating menu cycle:', err);
            }
            // Create menu cycle days (7 days)
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const cycleDayId = `cycle_day_${cycleId}_${dayIndex}`;
                try {
                    repositories_js_1.menuDayAssignmentRepo.execute(`
            INSERT INTO menu_cycle_days (id, cycle_id, day_index, label)
            VALUES (?, ?, ?, ?)
          `, [cycleDayId, cycleId, dayIndex, `Day ${dayIndex + 1}`]);
                    console.log(`[DEBUG] Created cycle day: ${cycleDayId} (index ${dayIndex})`);
                    // Assign meals to lunch and dinner for each day
                    // Lunch meal
                    const lunchMeal = existingMeals[dayIndex % existingMeals.length];
                    repositories_js_1.menuDayAssignmentRepo.execute(`
            INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot)
            VALUES (?, ?, ?, ?)
          `, [`assignment_lunch_${cycleDayId}`, cycleDayId, lunchMeal.id, 'lunch']);
                    console.log(`[DEBUG] Assigned lunch: ${lunchMeal.name_en} to day ${dayIndex}`);
                    // Dinner meal
                    const dinnerMeal = existingMeals[(dayIndex + 1) % existingMeals.length];
                    repositories_js_1.menuDayAssignmentRepo.execute(`
            INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot)
            VALUES (?, ?, ?, ?)
          `, [`assignment_dinner_${cycleDayId}`, cycleDayId, dinnerMeal.id, 'dinner']);
                    console.log(`[DEBUG] Assigned dinner: ${dinnerMeal.name_en} to day ${dayIndex}`);
                }
                catch (err) {
                    console.log(`[DEBUG] Error creating cycle day ${dayIndex}:`, err);
                }
            }
            console.log('✅ Dummy menu cycle created with meal assignments');
        }
        console.log('🎉 Dummy data initialization complete!');
    }
    catch (error) {
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
        database_js_1.DatabaseConnection.getInstance();
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
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
        else {
            console.error('Stack trace: Not available (error is not an Error instance)');
        }
        process.exit(1);
    }
}
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map
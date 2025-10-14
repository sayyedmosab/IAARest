-- Initial database schema for Ibnexp application

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Ingredients table
CREATE TABLE ingredients (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    unit_base TEXT NOT NULL CHECK (unit_base IN ('g', 'ml', 'pcs')),
    per100g_calories REAL NOT NULL DEFAULT 0,
    per100g_protein_g REAL NOT NULL DEFAULT 0,
    per100g_carbs_g REAL NOT NULL DEFAULT 0,
    per100g_fat_g REAL NOT NULL DEFAULT 0,
    per100g_fiber_g REAL NOT NULL DEFAULT 0,
    per100g_sodium_mg REAL NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL CHECK (source_type IN ('local', 'usda_fdc')),
    source_ref TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Plans table
CREATE TABLE plans (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    meals_per_day INTEGER NOT NULL CHECK (meals_per_day > 0 AND meals_per_day <= 6),
    delivery_days INTEGER NOT NULL CHECK (delivery_days > 0 AND delivery_days <= 31),
    duration_label TEXT NOT NULL,
    base_price_aed REAL NOT NULL CHECK (base_price_aed >= 0),
    position_note_en TEXT,
    position_note_ar TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discounted_price_aed REAL CHECK (discounted_price_aed >= 0)
);

-- Profiles table (users)
CREATE TABLE profiles (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    language_pref TEXT NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'ar')),
    date_of_birth DATE,
    height_cm INTEGER CHECK (height_cm > 0),
    weight_kg REAL CHECK (weight_kg > 0),
    goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')),
    phone_e164 TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_student INTEGER NOT NULL DEFAULT 0 CHECK (is_student IN (0, 1)),
    university_email TEXT,
    student_id_expiry DATE,
    address TEXT,
    district TEXT
);

-- Meals table
CREATE TABLE meals (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    image_filename TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nutritional_facts_en TEXT,
    nutritional_facts_ar TEXT,
    ingredients_en TEXT,
    ingredients_ar TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Meal ingredients junction table
CREATE TABLE meal_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id TEXT NOT NULL,
    ingredient_id TEXT NOT NULL,
    weight_g REAL NOT NULL CHECK (weight_g > 0),
    notes TEXT,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE(meal_id, ingredient_id)
);

-- Meal images table
CREATE TABLE meal_images (
    id TEXT PRIMARY KEY,
    meal_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'paused', 'cancelled', 'expired')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    student_discount_applied INTEGER NOT NULL DEFAULT 0 CHECK (student_discount_applied IN (0, 1)),
    price_charged_aed REAL NOT NULL CHECK (price_charged_aed >= 0),
    currency TEXT NOT NULL DEFAULT 'AED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    renewal_type TEXT NOT NULL DEFAULT 'manual',
    has_successful_payment INTEGER NOT NULL DEFAULT 0 CHECK (has_successful_payment IN (0, 1)),
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);

-- Payments table
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('card', 'apple_pay', 'google_pay', 'other')),
    amount_aed REAL NOT NULL CHECK (amount_aed >= 0),
    currency TEXT NOT NULL DEFAULT 'AED',
    status TEXT NOT NULL CHECK (status IN ('requires_action', 'succeeded', 'failed', 'refunded')),
    provider TEXT,
    provider_txn_id TEXT,
    receipt_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Discounts table
CREATE TABLE discounts (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    is_student_only INTEGER NOT NULL DEFAULT 0 CHECK (is_student_only IN (0, 1)),
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
    value REAL NOT NULL CHECK (value > 0),
    starts_at DATETIME,
    ends_at DATETIME,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- Menu cycles table
CREATE TABLE menu_cycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cycle_length_days INTEGER NOT NULL CHECK (cycle_length_days > 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Menu cycle days table
CREATE TABLE menu_cycle_days (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL,
    day_index INTEGER NOT NULL CHECK (day_index >= 0),
    label TEXT,
    FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE CASCADE,
    UNIQUE(cycle_id, day_index)
);

-- Menu day assignments table
CREATE TABLE menu_day_assignments (
    id TEXT PRIMARY KEY,
    cycle_day_id TEXT NOT NULL,
    meal_id TEXT NOT NULL,
    slot TEXT NOT NULL CHECK (slot IN ('lunch', 'dinner')),
    plan_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_day_id) REFERENCES menu_cycle_days(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- Deliveries table
CREATE TABLE deliveries (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    meals_count INTEGER NOT NULL CHECK (meals_count > 0),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'delivered', 'failed', 'skipped')),
    address_snapshot TEXT NOT NULL, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_meals_is_active ON meals(is_active);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_code ON plans(code);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_meal_ingredients_meal_id ON meal_ingredients(meal_id);
CREATE INDEX idx_meal_ingredients_ingredient_id ON meal_ingredients(ingredient_id);
CREATE INDEX idx_meal_images_meal_id ON meal_images(meal_id);
CREATE INDEX idx_menu_cycles_is_active ON menu_cycles(is_active);
CREATE INDEX idx_menu_cycle_days_cycle_id ON menu_cycle_days(cycle_id);
CREATE INDEX idx_menu_day_assignments_cycle_day_id ON menu_day_assignments(cycle_day_id);
CREATE INDEX idx_menu_day_assignments_meal_id ON menu_day_assignments(meal_id);
CREATE INDEX idx_menu_day_assignments_plan_id ON menu_day_assignments(plan_id);
CREATE INDEX idx_deliveries_subscription_id ON deliveries(subscription_id);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_status ON deliveries(status);
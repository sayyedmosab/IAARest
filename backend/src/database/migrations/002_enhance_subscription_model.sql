-- Enhanced Subscription Model Migration
-- This migration adds new subscription states and tracking capabilities

-- Step 1: Add new columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'wire_transfer', 'other'));
ALTER TABLE subscriptions ADD COLUMN auto_renewal INTEGER NOT NULL DEFAULT 1 CHECK (auto_renewal IN (0, 1));
ALTER TABLE subscriptions ADD COLUMN completed_cycles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN notes TEXT;

-- Step 2: Create subscription state history table
CREATE TABLE subscription_state_history (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT NOT NULL,
    reason TEXT,
    changed_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Step 3: Create indexes for state history
CREATE INDEX idx_subscription_state_history_subscription_id ON subscription_state_history(subscription_id);
CREATE INDEX idx_subscription_state_history_created_at ON subscription_state_history(created_at);

-- Step 4: Migrate existing data based on current status and payment history
UPDATE subscriptions SET 
    payment_method = CASE 
        WHEN renewal_type = 'manual' THEN 'wire_transfer'
        ELSE 'credit_card'
    END,
    auto_renewal = CASE 
        WHEN renewal_type = 'auto' THEN 1
        ELSE 0
    END,
    completed_cycles = CASE 
        WHEN has_successful_payment = 1 AND status = 'active' THEN 2
        WHEN has_successful_payment = 1 THEN 1
        ELSE 0
    END;

-- Step 5: Create initial state history records for existing subscriptions
INSERT INTO subscription_state_history (id, subscription_id, previous_state, new_state, changed_by)
SELECT 
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
    id,
    NULL,
    status,
    'system'
FROM subscriptions;

-- Step 6: Create new subscriptions table with updated constraints
CREATE TABLE subscriptions_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'Pending_Approval', 'New_Joiner', 'Curious', 'Active', 'Frozen', 'Exiting', 'cancelled', 'expired')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    student_discount_applied INTEGER NOT NULL DEFAULT 0 CHECK (student_discount_applied IN (0, 1)),
    price_charged_aed REAL NOT NULL CHECK (price_charged_aed >= 0),
    currency TEXT NOT NULL DEFAULT 'AED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    renewal_type TEXT NOT NULL DEFAULT 'manual',
    has_successful_payment INTEGER NOT NULL DEFAULT 0 CHECK (has_successful_payment IN (0, 1)),
    payment_method TEXT NOT NULL DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'wire_transfer', 'other')),
    auto_renewal INTEGER NOT NULL DEFAULT 1 CHECK (auto_renewal IN (0, 1)),
    completed_cycles INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);

-- Step 7: Copy data to new table
INSERT INTO subscriptions_new SELECT * FROM subscriptions;

-- Step 8: Drop old table and rename new table
DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

-- Step 9: Recreate indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_payment_method ON subscriptions(payment_method);
CREATE INDEX idx_subscriptions_auto_renewal ON subscriptions(auto_renewal);
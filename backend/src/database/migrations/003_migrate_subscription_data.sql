-- Migration script to update existing subscriptions to new state model
-- This script preserves all existing data while mapping to new states

-- First, let's analyze the current data and create a backup
CREATE TABLE IF NOT EXISTS subscriptions_backup_003 AS SELECT * FROM subscriptions;

-- Update existing subscriptions based on their current status and payment method
-- Mapping logic:
-- 1. pending_payment -> Pending_Approval (if manual payment) or New_Joiner (if credit card)
-- 2. active -> Active (default, but could be New_Joiner if recently created)
-- 3. cancelled -> Cancelled (but could be Exiting if recently cancelled)

-- Update pending_payment subscriptions
-- Those with manual payment method go to Pending_Approval
-- Those with credit card payment method go to New_Joiner
UPDATE subscriptions 
SET status = 'Pending_Approval',
    payment_method = 'manual',
    auto_renewal = 0,
    completed_cycles = 0,
    notes = 'Migrated from pending_payment - manual payment'
WHERE status = 'pending_payment' 
AND (payment_method IS NULL OR payment_method = 'manual');

UPDATE subscriptions 
SET status = 'New_Joiner',
    payment_method = 'credit_card',
    auto_renewal = 1,
    completed_cycles = 0,
    notes = 'Migrated from pending_payment - credit card payment'
WHERE status = 'pending_payment' 
AND payment_method = 'credit_card';

-- For any remaining pending_payment with unknown payment method, default to Pending_Approval
UPDATE subscriptions 
SET status = 'Pending_Approval',
    payment_method = 'manual',
    auto_renewal = 0,
    completed_cycles = 0,
    notes = 'Migrated from pending_payment - unknown payment method, defaulted to manual'
WHERE status = 'pending_payment';

-- Update active subscriptions
-- Recently created active subscriptions (within last 30 days) become New_Joiner
-- Older active subscriptions remain Active
UPDATE subscriptions 
SET status = 'New_Joiner',
    payment_method = COALESCE(payment_method, 'credit_card'),
    auto_renewal = COALESCE(auto_renewal, 1),
    completed_cycles = 0,
    notes = 'Migrated from active - recent subscription'
WHERE status = 'active' 
AND created_at >= date('now', '-30 days');

UPDATE subscriptions 
SET status = 'Active',
    payment_method = COALESCE(payment_method, 'credit_card'),
    auto_renewal = COALESCE(auto_renewal, 1),
    completed_cycles = CASE 
        WHEN created_at >= date('now', '-60 days') THEN 1
        WHEN created_at >= date('now', '-90 days') THEN 2
        ELSE 3
    END,
    notes = 'Migrated from active - established subscription'
WHERE status = 'active' 
AND created_at < date('now', '-30 days');

-- Update cancelled subscriptions
-- Recently cancelled (within last 30 days) become Exiting
-- Older cancelled remain Cancelled
UPDATE subscriptions 
SET status = 'Exiting',
    payment_method = COALESCE(payment_method, 'credit_card'),
    auto_renewal = 0,
    completed_cycles = CASE 
        WHEN created_at >= date('now', '-60 days') THEN 1
        WHEN created_at >= date('now', '-90 days') THEN 2
        ELSE 3
    END,
    notes = 'Migrated from cancelled - recent cancellation'
WHERE status = 'cancelled' 
AND end_date >= date('now', '-30 days');

UPDATE subscriptions 
SET status = 'cancelled',
    payment_method = COALESCE(payment_method, 'credit_card'),
    auto_renewal = 0,
    completed_cycles = CASE 
        WHEN created_at >= date('now', '-60 days') THEN 1
        WHEN created_at >= date('now', '-90 days') THEN 2
        ELSE 3
    END,
    notes = 'Migrated from cancelled - old cancellation'
WHERE status = 'cancelled' 
AND end_date < date('now', '-30 days');

-- Create state history entries for all migrated subscriptions
INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'pending_payment',
    'Pending_Approval',
    'system_migration',
    'Migrated from pending_payment to Pending_Approval',
    datetime('now')
FROM subscriptions 
WHERE status = 'Pending_Approval' 
AND notes LIKE '%Migrated from pending_payment%';

INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'pending_payment',
    'New_Joiner',
    'system_migration',
    'Migrated from pending_payment to New_Joiner',
    datetime('now')
FROM subscriptions 
WHERE status = 'New_Joiner' 
AND notes LIKE '%Migrated from pending_payment%';

INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'active',
    'New_Joiner',
    'system_migration',
    'Migrated from active to New_Joiner',
    datetime('now')
FROM subscriptions 
WHERE status = 'New_Joiner' 
AND notes LIKE '%Migrated from active%';

INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'active',
    'Active',
    'system_migration',
    'Migrated from active to Active',
    datetime('now')
FROM subscriptions 
WHERE status = 'Active' 
AND notes LIKE '%Migrated from active%';

INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'cancelled',
    'Exiting',
    'system_migration',
    'Migrated from cancelled to Exiting',
    datetime('now')
FROM subscriptions 
WHERE status = 'Exiting' 
AND notes LIKE '%Migrated from cancelled%';

INSERT INTO subscription_state_history (
    subscription_id, 
    old_status, 
    new_status, 
    changed_by, 
    change_reason,
    created_at
)
SELECT 
    id,
    'cancelled',
    'cancelled',
    'system_migration',
    'Migrated from cancelled to cancelled',
    datetime('now')
FROM subscriptions 
WHERE status = 'cancelled' 
AND notes LIKE '%Migrated from cancelled%';

-- Update any remaining NULL values to ensure data integrity
UPDATE subscriptions 
SET payment_method = 'credit_card', auto_renewal = 1, completed_cycles = 0
WHERE payment_method IS NULL;

UPDATE subscriptions 
SET auto_renewal = 1 
WHERE auto_renewal IS NULL;

UPDATE subscriptions 
SET completed_cycles = 0 
WHERE completed_cycles IS NULL;

UPDATE subscriptions 
SET notes = 'Migrated subscription - updated with default values'
WHERE notes IS NULL;

-- Log migration summary
SELECT 
    status,
    payment_method,
    auto_renewal,
    COUNT(*) as count,
    AVG(completed_cycles) as avg_cycles
FROM subscriptions 
GROUP BY status, payment_method, auto_renewal
ORDER BY status;

-- Verify data integrity
SELECT 
    'Total subscriptions' as metric,
    COUNT(*) as value
FROM subscriptions
UNION ALL
SELECT 
    'Subscriptions with state history' as metric,
    COUNT(DISTINCT subscription_id) as value
FROM subscription_state_history
UNION ALL
SELECT 
    'Subscriptions without state history' as metric,
    COUNT(*) as value
FROM subscriptions s
LEFT JOIN subscription_state_history h ON s.id = h.subscription_id
WHERE h.subscription_id IS NULL;

-- This migration ensures all existing subscriptions are properly mapped to the new state model
-- while preserving their original data and creating audit trails for the changes
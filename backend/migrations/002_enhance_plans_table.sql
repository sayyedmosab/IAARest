-- Migration: Enhance plans table to support flexible meal plan variables
-- This adds support for billing cycles and delivery patterns

-- Add new columns to plans table
ALTER TABLE plans ADD COLUMN billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly'));
ALTER TABLE plans ADD COLUMN delivery_pattern TEXT DEFAULT '[1,2,3,4,5]';

-- Update existing plans with appropriate values
-- FUEL plan: 1 meal/day, 20 delivery days (Mon-Fri), monthly billing
UPDATE plans 
SET billing_cycle = 'monthly', 
    delivery_pattern = '[1,2,3,4,5]'
WHERE code = 'FUEL';

-- FOCUS plan: 2 meals/day, 26 delivery days (Mon-Sat), monthly billing  
UPDATE plans 
SET billing_cycle = 'monthly', 
    delivery_pattern = '[1,2,3,4,5,6]',
    meals_per_day = 2
WHERE code = 'FOCUS';

-- FLEX plan: 1 meal/day, 26 delivery days (Mon-Sat), monthly billing
UPDATE plans 
SET billing_cycle = 'monthly', 
    delivery_pattern = '[1,2,3,4,5,6]',
    meals_per_day = 1
WHERE code = 'FLEX';

-- Remove the old duration_label column if it exists (optional)
-- ALTER TABLE plans DROP COLUMN duration_label;
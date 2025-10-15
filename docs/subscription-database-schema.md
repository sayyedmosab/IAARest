# Subscription Database Schema Documentation

## Overview

This document provides comprehensive technical documentation for the database schema changes implemented to support the enhanced subscription model with 7 distinct states. The changes include new columns, tables, constraints, and migration scripts to ensure data integrity and proper state management.

## Database Schema Changes

### Enhanced Subscriptions Table

#### Table: `subscriptions`
**Description**: Main table storing subscription information with enhanced state management capabilities.

**Schema Changes**:
```sql
-- Previous schema (simplified)
CREATE TABLE subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Enhanced schema with new columns
ALTER TABLE subscriptions 
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'credit_card' AFTER status,
ADD COLUMN completed_cycles INT DEFAULT 0 AFTER auto_renewal,
ADD COLUMN notes TEXT AFTER completed_cycles,
ADD COLUMN metadata JSON AFTER notes,
MODIFY COLUMN status VARCHAR(25) NOT NULL COMMENT 'Enhanced subscription state: Pending_Approval, Curious, New_Joiner, Active, Frozen, Exiting, Cancelled';
```

**New Columns**:

| Column | Type | Description | Default | Constraints |
|--------|------|-------------|---------|-------------|
| `payment_method` | VARCHAR(20) | Payment method used for subscription | 'credit_card' | NOT NULL, CHECK IN ('credit_card', 'wire_transfer', 'other') |
| `completed_cycles` | INT | Number of successful payment cycles completed | 0 | NOT NULL, >= 0 |
| `notes` | TEXT | Admin notes and customer communications | NULL | - |
| `metadata` | JSON | Additional subscription metadata | NULL | - |

**Modified Columns**:

| Column | Previous Type | New Type | Description |
|--------|---------------|----------|-------------|
| `status` | VARCHAR(20) | VARCHAR(25) | Enhanced to support 7 distinct states |

**New Constraints**:
```sql
-- Payment method constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT chk_payment_method 
CHECK (payment_method IN ('credit_card', 'wire_transfer', 'other'));

-- Completed cycles constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT chk_completed_cycles 
CHECK (completed_cycles >= 0);

-- Enhanced status constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT chk_subscription_state 
CHECK (status IN ('Pending_Approval', 'Curious', 'New_Joiner', 'Active', 'Frozen', 'Exiting', 'cancelled'));
```

### New Subscription State History Table

#### Table: `subscription_state_history`
**Description**: Tracks all state transitions for subscriptions with complete audit trail.

```sql
CREATE TABLE subscription_state_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id VARCHAR(50) NOT NULL,
    previous_state VARCHAR(25),
    new_state VARCHAR(25) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(50) NOT NULL,
    changed_by_type ENUM('admin', 'system', 'customer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_new_state (new_state),
    INDEX idx_created_at (created_at),
    INDEX idx_changed_by (changed_by)
);
```

**Columns**:

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INT AUTO_INCREMENT | Primary key | PRIMARY KEY |
| `subscription_id` | VARCHAR(50) | Reference to subscription | FOREIGN KEY, NOT NULL |
| `previous_state` | VARCHAR(25) | Previous subscription state | NULL for initial state |
| `new_state` | VARCHAR(25) | New subscription state | NOT NULL |
| `reason` | TEXT | Reason for state transition | NULL |
| `changed_by` | VARCHAR(50) | ID of user/system who made change | NOT NULL |
| `changed_by_type` | ENUM | Type of entity that made change | NOT NULL |
| `created_at` | TIMESTAMP | When the transition occurred | DEFAULT CURRENT_TIMESTAMP |

**Indexes**:
- `idx_subscription_id`: Fast lookup by subscription
- `idx_new_state`: Filter by current state
- `idx_created_at`: Chronological ordering
- `idx_changed_by`: Track changes by specific users

### Payment Integration Table

#### Table: `subscription_payments`
**Description**: Tracks payment attempts and their relationship to subscription state changes.

```sql
CREATE TABLE subscription_payments (
    id VARCHAR(50) PRIMARY KEY,
    subscription_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    status ENUM('pending', 'success', 'failed', 'refunded') NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(100),
    failure_reason TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

## Migration Scripts

### Migration 001: Enhanced Subscription Model

**File**: `backend/src/database/migrations/002_enhance_subscription_model.sql`

```sql
-- Migration: Enhanced Subscription Model
-- Version: 2.0
-- Date: 2025-10-15

-- Add new columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'credit_card' AFTER status,
ADD COLUMN completed_cycles INT DEFAULT 0 AFTER auto_renewal,
ADD COLUMN notes TEXT AFTER completed_cycles,
ADD COLUMN metadata JSON AFTER notes;

-- Modify status column to support new states
ALTER TABLE subscriptions 
MODIFY COLUMN status VARCHAR(25) NOT NULL COMMENT 'Enhanced subscription state: Pending_Approval, Curious, New_Joiner, Active, Frozen, Exiting, Cancelled';

-- Add constraints
ALTER TABLE subscriptions 
ADD CONSTRAINT chk_payment_method 
CHECK (payment_method IN ('credit_card', 'wire_transfer', 'other'));

ALTER TABLE subscriptions 
ADD CONSTRAINT chk_completed_cycles 
CHECK (completed_cycles >= 0);

ALTER TABLE subscriptions 
ADD CONSTRAINT chk_subscription_state 
CHECK (status IN ('Pending_Approval', 'Curious', 'New_Joiner', 'Active', 'Frozen', 'Exiting', 'cancelled'));

-- Create subscription state history table
CREATE TABLE subscription_state_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id VARCHAR(50) NOT NULL,
    previous_state VARCHAR(25),
    new_state VARCHAR(25) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(50) NOT NULL,
    changed_by_type ENUM('admin', 'system', 'customer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_new_state (new_state),
    INDEX idx_created_at (created_at),
    INDEX idx_changed_by (changed_by)
);

-- Create subscription payments table
CREATE TABLE subscription_payments (
    id VARCHAR(50) PRIMARY KEY,
    subscription_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    status ENUM('pending', 'success', 'failed', 'refunded') NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(100),
    failure_reason TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Add indexes for performance
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_payment_method ON subscriptions(payment_method);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
```

### Migration 002: Data Migration

**File**: `backend/src/database/migrations/003_migrate_subscription_data.sql`

```sql
-- Migration: Migrate Subscription Data to Enhanced Model
-- Version: 2.0.1
-- Date: 2025-10-15

-- Migrate existing subscription data to new state model
-- This migration preserves all existing data while mapping to new states

-- Update existing subscriptions based on their current status and payment method
UPDATE subscriptions SET 
    status = CASE 
        WHEN status = 'active' AND auto_renewal = true AND completed_cycles >= 2 THEN 'Active'
        WHEN status = 'active' AND auto_renewal = true AND completed_cycles < 2 THEN 'New_Joiner'
        WHEN status = 'active' AND auto_renewal = false THEN 'Curious'
        WHEN status = 'pending' AND payment_method != 'credit_card' THEN 'Pending_Approval'
        WHEN status = 'pending' AND payment_method = 'credit_card' THEN 'pending_payment'
        WHEN status = 'cancelled' THEN 'cancelled'
        WHEN status = 'frozen' THEN 'Frozen'
        ELSE 'Active'
    END,
    payment_method = CASE 
        WHEN payment_method IS NULL OR payment_method = '' THEN 'credit_card'
        ELSE payment_method
    END;

-- Initialize completed_cycles for existing subscriptions
UPDATE subscriptions SET 
    completed_cycles = CASE 
        WHEN status IN ('Active', 'New_Joiner') AND auto_renewal = true THEN 
            GREATEST(0, FLOOR(DATEDIFF(CURRENT_DATE, start_date) / 30))
        WHEN status = 'Curious' AND auto_renewal = false THEN 1
        ELSE 0
    END;

-- Create initial state history entries for existing subscriptions
INSERT INTO subscription_state_history (
    subscription_id, 
    previous_state, 
    new_state, 
    reason, 
    changed_by, 
    changed_by_type
)
SELECT 
    id,
    NULL,
    status,
    'Initial state migration to enhanced model',
    'system',
    'system'
FROM subscriptions
WHERE id NOT IN (
    SELECT subscription_id FROM subscription_state_history
);

-- Update completed_cycles based on payment history if available
UPDATE subscriptions s
SET completed_cycles = (
    SELECT COUNT(*) 
    FROM subscription_payments p 
    WHERE p.subscription_id = s.id 
    AND p.status = 'success'
)
WHERE EXISTS (
    SELECT 1 FROM subscription_payments p 
    WHERE p.subscription_id = s.id 
    AND p.status = 'success'
);

-- Add metadata for existing subscriptions
UPDATE subscriptions SET 
    metadata = JSON_OBJECT(
        'migrated_from_legacy', true,
        'migration_date', CURRENT_TIMESTAMP,
        'original_status', status
    )
WHERE metadata IS NULL;

-- Verify migration integrity
SELECT 
    'Migration Summary' as summary,
    COUNT(*) as total_subscriptions,
    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count,
    SUM(CASE WHEN status = 'New_Joiner' THEN 1 ELSE 0 END) as new_joiner_count,
    SUM(CASE WHEN status = 'Curious' THEN 1 ELSE 0 END) as curious_count,
    SUM(CASE WHEN status = 'Pending_Approval' THEN 1 ELSE 0 END) as pending_approval_count,
    SUM(CASE WHEN status = 'Frozen' THEN 1 ELSE 0 END) as frozen_count,
    SUM(CASE WHEN status = 'Exiting' THEN 1 ELSE 0 END) as exiting_count,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
FROM subscriptions;
```

## Database Views

### Subscription Analytics View

```sql
CREATE VIEW subscription_analytics AS
SELECT 
    s.status as subscription_state,
    s.payment_method,
    s.auto_renewal,
    COUNT(*) as subscription_count,
    SUM(s.completed_cycles) as total_completed_cycles,
    AVG(s.completed_cycles) as avg_completed_cycles,
    SUM(CASE WHEN s.end_date > CURRENT_DATE THEN 1 ELSE 0 END) as active_until_future,
    SUM(CASE WHEN s.end_date <= CURRENT_DATE THEN 1 ELSE 0 END) as expired_count
FROM subscriptions s
GROUP BY s.status, s.payment_method, s.auto_renewal;
```

### State Transition History View

```sql
CREATE VIEW state_transition_summary AS
SELECT 
    DATE(sh.created_at) as transition_date,
    sh.previous_state,
    sh.new_state,
    sh.changed_by_type,
    COUNT(*) as transition_count,
    COUNT(DISTINCT sh.subscription_id) as unique_subscriptions
FROM subscription_state_history sh
GROUP BY DATE(sh.created_at), sh.previous_state, sh.new_state, sh.changed_by_type
ORDER BY transition_date DESC;
```

## Stored Procedures

### Process Automatic Transitions

```sql
DELIMITER //

CREATE PROCEDURE ProcessAutomaticTransitions()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Transition New_Joiner to Active after 2 completed cycles
    UPDATE subscriptions s
    SET s.status = 'Active',
        s.updated_at = CURRENT_TIMESTAMP
    WHERE s.status = 'New_Joiner'
    AND s.completed_cycles >= 2
    AND s.auto_renewal = true;

    -- Log transitions
    INSERT INTO subscription_state_history (
        subscription_id, previous_state, new_state, reason, changed_by, changed_by_type
    )
    SELECT 
        id, 
        'New_Joiner', 
        'Active', 
        'Completed 2 successful payment cycles', 
        'system', 
        'system'
    FROM subscriptions
    WHERE status = 'Active'
    AND id IN (
        SELECT subscription_id FROM subscription_state_history 
        WHERE new_state = 'Active' 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL 1 MINUTE
    );

    -- Transition Curious to Exiting when cycle ends
    UPDATE subscriptions s
    SET s.status = 'Exiting',
        s.updated_at = CURRENT_TIMESTAMP
    WHERE s.status = 'Curious'
    AND s.end_date <= CURRENT_DATE;

    -- Log transitions
    INSERT INTO subscription_state_history (
        subscription_id, previous_state, new_state, reason, changed_by, changed_by_type
    )
    SELECT 
        id, 
        'Curious', 
        'Exiting', 
        'Subscription cycle completed', 
        'system', 
        'system'
    FROM subscriptions
    WHERE status = 'Exiting'
    AND id IN (
        SELECT subscription_id FROM subscription_state_history 
        WHERE new_state = 'Exiting' 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL 1 MINUTE
    );

    -- Transition Exiting to Cancelled when end_date reached
    UPDATE subscriptions s
    SET s.status = 'cancelled',
        s.updated_at = CURRENT_TIMESTAMP
    WHERE s.status = 'Exiting'
    AND s.end_date <= CURRENT_DATE;

    -- Log transitions
    INSERT INTO subscription_state_history (
        subscription_id, previous_state, new_state, reason, changed_by, changed_by_type
    )
    SELECT 
        id, 
        'Exiting', 
        'cancelled', 
        'Paid period ended', 
        'system', 
        'system'
    FROM subscriptions
    WHERE status = 'cancelled'
    AND id IN (
        SELECT subscription_id FROM subscription_state_history 
        WHERE new_state = 'cancelled' 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL 1 MINUTE
    );

    COMMIT;
END //

DELIMITER ;
```

## Performance Considerations

### Indexing Strategy

1. **Primary Indexes**: All foreign keys have proper indexes
2. **State Indexes**: Frequent queries by status are optimized
3. **Date Indexes**: Time-based queries are optimized
4. **Composite Indexes**: Common query patterns are supported

### Query Optimization

```sql
-- Optimized query for subscriptions by state
EXPLAIN SELECT * FROM subscriptions 
WHERE status = 'Active' 
AND end_date > CURRENT_DATE 
ORDER BY created_at DESC 
LIMIT 20;

-- Optimized query for state history
EXPLAIN SELECT sh.*, s.user_id 
FROM subscription_state_history sh
JOIN subscriptions s ON sh.subscription_id = s.id
WHERE sh.new_state = 'Active'
AND sh.created_at >= '2025-10-01'
ORDER BY sh.created_at DESC;
```

## Data Integrity

### Constraints and Validation

1. **State Transitions**: Application-level validation ensures only valid transitions
2. **Foreign Keys**: Referential integrity maintained
3. **Check Constraints**: Business rules enforced at database level
4. **Cascade Deletes**: History properly maintained

### Backup and Recovery

```sql
-- Backup critical tables
mysqldump -u root -p ibnexp2_db subscriptions > subscriptions_backup.sql
mysqldump -u root -p ibnexp2_db subscription_state_history > history_backup.sql

-- Recovery procedure
mysql -u root -p ibnexp2_db < subscriptions_backup.sql
mysql -u root -p ibnexp2_db < history_backup.sql
```

## Monitoring and Maintenance

### Health Check Queries

```sql
-- Check for orphaned history records
SELECT COUNT(*) as orphaned_history
FROM subscription_state_history sh
LEFT JOIN subscriptions s ON sh.subscription_id = s.id
WHERE s.id IS NULL;

-- Check for inconsistent states
SELECT s.id, s.status, s.auto_renewal, s.completed_cycles
FROM subscriptions s
WHERE (s.status = 'Active' AND s.auto_renewal = false)
   OR (s.status = 'New_Joiner' AND s.auto_renewal = false)
   OR (s.status = 'Curious' AND s.auto_renewal = true);

-- Check for payment history consistency
SELECT s.id, s.completed_cycles, COUNT(p.id) as payment_count
FROM subscriptions s
LEFT JOIN subscription_payments p ON s.id = p.subscription_id AND p.status = 'success'
GROUP BY s.id
HAVING s.completed_cycles != COUNT(p.id);
```

## Security Considerations

### Access Control

```sql
-- Create read-only role for analytics
CREATE ROLE subscription_analytics;
GRANT SELECT ON ibnexp2_db.subscriptions TO subscription_analytics;
GRANT SELECT ON ibnexp2_db.subscription_state_history TO subscription_analytics;
GRANT SELECT ON ibnexp2_db.subscription_payments TO subscription_analytics;

-- Create admin role with full access
CREATE ROLE subscription_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ibnexp2_db.subscriptions TO subscription_admin;
GRANT SELECT, INSERT ON ibnexp2_db.subscription_state_history TO subscription_admin;
GRANT SELECT, INSERT, UPDATE ON ibnexp2_db.subscription_payments TO subscription_admin;
```

## Conclusion

The enhanced database schema provides a robust foundation for the new subscription model with 7 distinct states. The changes ensure data integrity, performance, and maintainability while supporting complex business rules and state transitions. The migration scripts preserve existing data while enabling the new functionality, and the monitoring procedures ensure ongoing system health.
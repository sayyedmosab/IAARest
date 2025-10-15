# Enhanced Subscription Model Implementation Guide

## Overview

This guide provides detailed implementation instructions for each component of the enhanced subscription model. It follows the design outlined in the [enhanced-subscription-model-design.md](enhanced-subscription-model-design.md) document.

## Implementation Steps

### 1. Database Migration Script

Create file: `backend/src/database/migrations/002_enhance_subscription_model.sql`

```sql
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

-- Step 4: Migrate existing data
-- Update existing subscriptions based on current status and payment history
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

-- Step 6: Update status constraint to include new states
-- Note: SQLite doesn't support ALTER CONSTRAINT, so we'll need to recreate the table
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
```

### 2. Backend TypeScript Interface Updates

Update file: `backend/src/models/types.ts`

```typescript
// Add new subscription status type
export type SubscriptionStatus = 
  | 'pending_payment' 
  | 'Pending_Approval' 
  | 'New_Joiner' 
  | 'Curious' 
  | 'Active' 
  | 'Frozen' 
  | 'Exiting' 
  | 'cancelled' 
  | 'expired';

export type PaymentMethod = 'credit_card' | 'wire_transfer' | 'other';

// Update Subscription interface
export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  student_discount_applied: boolean;
  price_charged_aed: number;
  currency: string;
  created_at: string;
  updated_at: string;
  renewal_type: string;
  has_successful_payment: boolean;
  // New fields
  payment_method: PaymentMethod;
  auto_renewal: boolean;
  completed_cycles: number;
  notes?: string;
}

// Add new interface for state history
export interface SubscriptionStateHistory {
  id: string;
  subscription_id: string;
  previous_state?: SubscriptionStatus;
  new_state: SubscriptionStatus;
  reason?: string;
  changed_by?: string;
  created_at: string;
}

// Update DTOs for subscription creation
export interface CreateSubscriptionDto {
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  student_discount_applied?: boolean;
  price_charged_aed: number;
  payment_method?: PaymentMethod;
  auto_renewal?: boolean;
  notes?: string;
}

export interface UpdateSubscriptionDto extends Partial<CreateSubscriptionDto> {
  status?: SubscriptionStatus;
}

export interface SubscriptionStateTransitionDto {
  new_state: SubscriptionStatus;
  reason?: string;
}
```

### 3. Enhanced Subscription Repository

Update file: `backend/src/services/repositories.ts`

```typescript
// Add new repository class for state history
export class SubscriptionStateHistoryRepository extends BaseRepository<SubscriptionStateHistory> {
  constructor() {
    super('subscription_state_history');
  }

  findBySubscription(subscriptionId: string): SubscriptionStateHistory[] {
    return this.query(
      'SELECT * FROM subscription_state_history WHERE subscription_id = ? ORDER BY created_at DESC',
      [subscriptionId]
    );
  }

  create(historyEntry: Omit<SubscriptionStateHistory, 'id' | 'created_at'>): SubscriptionStateHistory {
    const id = generateUUID();
    const now = new Date().toISOString();
    
    this.db.execute(`
      INSERT INTO subscription_state_history (id, subscription_id, previous_state, new_state, reason, changed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, historyEntry.subscription_id, historyEntry.previous_state, historyEntry.new_state, historyEntry.reason, historyEntry.changed_by, now]);

    return this.queryOne('SELECT * FROM subscription_state_history WHERE id = ?', [id]) as SubscriptionStateHistory;
  }
}

// Update SubscriptionRepository with new methods
export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor() {
    super('subscriptions');
  }

  // Existing methods...
  findByUser(userId: string): Subscription[] {
    return this.findAll('user_id = ?', [userId]);
  }

  findByStatus(status: string): Subscription[] {
    return this.findAll('status = ?', [status]);
  }

  findActiveByUser(userId: string): Subscription[] {
    return this.findAll('user_id = ? AND status = ?', [userId, 'active']);
  }

  // New methods for enhanced model
  findByPaymentMethod(method: PaymentMethod): Subscription[] {
    return this.findAll('payment_method = ?', [method]);
  }

  findNewJoinersReadyForActivation(): Subscription[] {
    return this.findAll('status = ? AND completed_cycles >= 2', ['New_Joiner']);
  }

  findExitingSubscriptionsReadyToCancel(): Subscription[] {
    return this.query(`
      SELECT * FROM subscriptions 
      WHERE status = 'Exiting' 
      AND end_date < date('now')
    `);
  }

  findAutoRenewalDue(): Subscription[] {
    return this.query(`
      SELECT * FROM subscriptions 
      WHERE status IN ('Active', 'New_Joiner') 
      AND auto_renewal = 1 
      AND end_date <= date('now', '+3 days')
      AND end_date >= date('now')
    `);
  }

  transitionState(subscriptionId: string, newState: SubscriptionStatus, reason?: string, changedBy?: string): boolean {
    const subscription = this.findById(subscriptionId);
    if (!subscription) return false;

    // Record state change in history
    const stateHistoryRepo = new SubscriptionStateHistoryRepository();
    stateHistoryRepo.create({
      subscription_id: subscriptionId,
      previous_state: subscription.status,
      new_state: newState,
      reason,
      changed_by: changedBy || 'system'
    });

    // Update subscription status
    return this.update(subscriptionId, { 
      status: newState,
      updated_at: new Date().toISOString()
    });
  }

  incrementCompletedCycles(subscriptionId: string): boolean {
    const subscription = this.findById(subscriptionId);
    if (!subscription) return false;

    return this.db.execute(`
      UPDATE subscriptions 
      SET completed_cycles = completed_cycles + 1, updated_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), subscriptionId]).changes > 0;
  }

  // Override create to handle new fields
  create(data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Subscription {
    const id = generateUUID();
    const now = new Date().toISOString();

    const subscriptionData = {
      ...data,
      auto_renewal: data.auto_renewal ? 1 : 0,
      student_discount_applied: data.student_discount_applied ? 1 : 0,
      has_successful_payment: data.has_successful_payment ? 1 : 0
    };

    const sql = `
      INSERT INTO subscriptions (
        id, user_id, plan_id, status, start_date, end_date, 
        student_discount_applied, price_charged_aed, currency, 
        created_at, updated_at, renewal_type, has_successful_payment,
        payment_method, auto_renewal, completed_cycles, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      id,
      subscriptionData.user_id,
      subscriptionData.plan_id,
      subscriptionData.status,
      subscriptionData.start_date,
      subscriptionData.end_date,
      subscriptionData.student_discount_applied,
      subscriptionData.price_charged_aed,
      subscriptionData.currency,
      now,
      now,
      subscriptionData.renewal_type,
      subscriptionData.has_successful_payment,
      subscriptionData.payment_method,
      subscriptionData.auto_renewal,
      subscriptionData.completed_cycles || 0,
      subscriptionData.notes
    ]);

    // Create initial state history record
    const stateHistoryRepo = new SubscriptionStateHistoryRepository();
    stateHistoryRepo.create({
      subscription_id: id,
      previous_state: undefined,
      new_state: subscriptionData.status,
      reason: 'Initial subscription creation',
      changed_by: 'system'
    });

    return this.findById(id) as Subscription;
  }
}

// Export new repository instance
export const subscriptionStateHistoryRepo = new SubscriptionStateHistoryRepository();
```

### 4. State Transition Service

Create file: `backend/src/services/subscription-state-service.ts`

```typescript
import { subscriptionRepo, subscriptionStateHistoryRepo } from './repositories.js';
import { SubscriptionStatus, PaymentMethod } from '../models/types.js';

export class SubscriptionStateService {
  // Define valid state transitions
  private static readonly VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    'pending_payment': ['New_Joiner', 'Curious', 'Cancelled'],
    'Pending_Approval': ['Active', 'Cancelled'],
    'New_Joiner': ['Active', 'Frozen', 'Exiting', 'Cancelled'],
    'Curious': ['Exiting', 'Frozen', 'Cancelled'],
    'Active': ['Frozen', 'Exiting', 'Cancelled'],
    'Frozen': ['Active', 'Cancelled'],
    'Exiting': ['Cancelled', 'Frozen'],
    'cancelled': [], // Terminal state
    'expired': [] // Terminal state
  };

  // Business rules for state transitions
  private static readonly BUSINESS_RULES = {
    'New_Joiner->Active': (subscription: any) => subscription.completed_cycles >= 2,
    'Pending_Approval->Active': (subscription: any) => subscription.payment_method !== 'credit_card',
    'Exiting->Cancelled': (subscription: any) => new Date(subscription.end_date) < new Date()
  };

  static validateTransition(currentState: SubscriptionStatus, newState: SubscriptionStatus): boolean {
    const validTransitions = this.VALID_TRANSITIONS[currentState] || [];
    return validTransitions.includes(newState);
  }

  static canTransition(subscription: any, newState: SubscriptionStatus): { canTransition: boolean; reason?: string } {
    const currentState = subscription.status;
    
    // Check if transition is valid
    if (!this.validateTransition(currentState, newState)) {
      return { 
        canTransition: false, 
        reason: `Invalid transition from ${currentState} to ${newState}` 
      };
    }

    // Check business rules
    const transitionKey = `${currentState}->${newState}`;
    const businessRule = this.BUSINESS_RULES[transitionKey as keyof typeof this.BUSINESS_RULES];
    
    if (businessRule && !businessRule(subscription)) {
      return { 
        canTransition: false, 
        reason: `Business rule not satisfied for ${transitionKey}` 
      };
    }

    return { canTransition: true };
  }

  static executeTransition(
    subscriptionId: string, 
    newState: SubscriptionStatus, 
    reason?: string, 
    changedBy?: string
  ): { success: boolean; error?: string } {
    const subscription = subscriptionRepo.findById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const canTransition = this.canTransition(subscription, newState);
    if (!canTransition.canTransition) {
      return { success: false, error: canTransition.reason };
    }

    try {
      const success = subscriptionRepo.transitionState(subscriptionId, newState, reason, changedBy);
      return { success };
    } catch (error) {
      return { success: false, error: 'Failed to execute transition' };
    }
  }

  static processPaymentSuccess(subscriptionId: string): boolean {
    const subscription = subscriptionRepo.findById(subscriptionId);
    if (!subscription) return false;

    // Increment completed cycles
    subscriptionRepo.incrementCompletedCycles(subscriptionId);

    // Check if New_Joiner should become Active
    if (subscription.status === 'New_Joiner') {
      const updatedSubscription = subscriptionRepo.findById(subscriptionId);
      if (updatedSubscription && updatedSubscription.completed_cycles >= 2) {
        this.executeTransition(subscriptionId, 'Active', 'Completed required payment cycles', 'system');
      }
    }

    return true;
  }

  static processPaymentFailure(subscriptionId: string): boolean {
    const subscription = subscriptionRepo.findById(subscriptionId);
    if (!subscription) return false;

    // For payment failures, move to Cancelled
    this.executeTransition(subscriptionId, 'Cancelled', 'Payment failure', 'system');
    return true;
  }

  static checkAndActivateNewJoiners(): number {
    const readyJoiners = subscriptionRepo.findNewJoinersReadyForActivation();
    let activatedCount = 0;

    readyJoiners.forEach(joiner => {
      const result = this.executeTransition(
        joiner.id, 
        'Active', 
        'Completed 2 successful payment cycles', 
        'system'
      );
      if (result.success) activatedCount++;
    });

    return activatedCount;
  }

  static checkAndCancelExitingSubscriptions(): number {
    const readyToCancel = subscriptionRepo.findExitingSubscriptionsReadyToCancel();
    let cancelledCount = 0;

    readyToCancel.forEach(subscription => {
      const result = this.executeTransition(
        subscription.id, 
        'Cancelled', 
        'Subscription period ended', 
        'system'
      );
      if (result.success) cancelledCount++;
    });

    return cancelledCount;
  }

  static getStateHistory(subscriptionId: string) {
    return subscriptionStateHistoryRepo.findBySubscription(subscriptionId);
  }
}
```

### 5. Frontend TypeScript Interface Updates

Update file: `src/models/subscription.model.ts`

```typescript
import { User } from './user.model';

export type SubscriptionStatus = 
  | 'pending_payment' 
  | 'Pending_Approval' 
  | 'New_Joiner' 
  | 'Curious' 
  | 'Active' 
  | 'Frozen' 
  | 'Exiting' 
  | 'cancelled' 
  | 'expired';

export type PaymentMethod = 'credit_card' | 'wire_transfer' | 'other';

export interface Subscription {
  id: string;
  userId: string;
  user: User;
  planId: string;
  planName: string;
  planPrice: number;
  startDate: string; // ISO string date
  endDate?: string;
  status: SubscriptionStatus;
  deliveryAddress: {
    street: string;
    city: string;
    district: string;
  };
  paymentMethod: PaymentMethod;
  autoRenewal: boolean;
  completedCycles: number;
  notes?: string;
  paymentProof?: string; // base64 data URL
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionStateHistory {
  id: string;
  subscriptionId: string;
  previousState?: SubscriptionStatus;
  newState: SubscriptionStatus;
  reason?: string;
  changedBy?: string;
  createdAt: string;
}

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  priceCharged: number;
  paymentMethod: PaymentMethod;
  autoRenewal: boolean;
  notes?: string;
}

export interface UpdateSubscriptionRequest {
  status?: SubscriptionStatus;
  autoRenewal?: boolean;
  notes?: string;
}

export interface SubscriptionStateTransitionRequest {
  newState: SubscriptionStatus;
  reason?: string;
}
```

### 6. API Endpoint Updates

Update file: `backend/src/routes/subscriptions.ts`

```typescript
import { SubscriptionStateService } from '../services/subscription-state-service.js';

// Add new routes for state management

// Get subscription state history
router.get('/:id/history', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = SubscriptionStateService.getStateHistory(id);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history'
    });
  }
});

// Transition subscription state
router.post('/:id/transition', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newState, reason } = req.body;

    // Validate request body
    if (!newState) {
      return res.status(400).json({
        success: false,
        error: 'New state is required'
      });
    }

    // Execute state transition
    const result = SubscriptionStateService.executeTransition(
      id, 
      newState, 
      reason, 
      req.user?.userId || 'admin'
    );

    if (result.success) {
      const updatedSubscription = subscriptionRepo.findById(id);
      res.json({
        success: true,
        message: 'Subscription state transitioned successfully',
        data: updatedSubscription
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Subscription state transition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transition subscription state'
    });
  }
});

// Update subscription status endpoint (enhanced)
router.put('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['pending_payment', 'Pending_Approval', 'New_Joiner', 'Curious', 'Active', 'Frozen', 'Exiting', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Execute state transition
    const result = SubscriptionStateService.executeTransition(
      id, 
      status, 
      reason || 'Status updated by admin', 
      req.user?.userId || 'admin'
    );

    if (result.success) {
      const updatedSubscription = subscriptionRepo.findById(id);
      res.json({
        success: true,
        message: 'Subscription status updated successfully',
        data: updatedSubscription
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription status'
    });
  }
});
```

### 7. Frontend Component Updates

Create a new component for subscription state management:

Create file: `src/components/admin/subscription-state-management/subscription-state-management.component.ts`

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { Subscription, SubscriptionStatus, SubscriptionStateHistory } from '../../../models/subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-subscription-state-management',
  templateUrl: './subscription-state-management.component.html',
  styleUrls: ['./subscription-state-management.component.css']
})
export class SubscriptionStateManagementComponent implements OnInit {
  @Input() subscription!: Subscription;
  
  stateHistory: SubscriptionStateHistory[] = [];
  availableStates: SubscriptionStatus[] = [];
  selectedNewState: SubscriptionStatus | null = null;
  transitionReason: string = '';
  isTransitioning = false;

  // State display mapping
  stateDisplayNames: Record<SubscriptionStatus, string> = {
    'pending_payment': 'Pending Payment',
    'Pending_Approval': 'Pending Approval',
    'New_Joiner': 'New Joiner',
    'Curious': 'Curious',
    'Active': 'Active',
    'Frozen': 'Frozen',
    'Exiting': 'Exiting',
    'cancelled': 'Cancelled',
    'expired': 'Expired'
  };

  // State color mapping
  stateColors: Record<SubscriptionStatus, string> = {
    'pending_payment': 'warning',
    'Pending_Approval': 'info',
    'New_Joiner': 'primary',
    'Curious': 'secondary',
    'Active': 'success',
    'Frozen': 'light',
    'Exiting': 'warning',
    'cancelled': 'danger',
    'expired': 'dark'
  };

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    this.loadStateHistory();
    this.setAvailableStates();
  }

  loadStateHistory(): void {
    this.subscriptionService.getSubscriptionStateHistory(this.subscription.id)
      .subscribe(history => {
        this.stateHistory = history;
      });
  }

  setAvailableStates(): void {
    // Define available transitions based on current state
    const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      'pending_payment': ['New_Joiner', 'Curious', 'cancelled'],
      'Pending_Approval': ['Active', 'cancelled'],
      'New_Joiner': ['Active', 'Frozen', 'Exiting', 'cancelled'],
      'Curious': ['Exiting', 'Frozen', 'cancelled'],
      'Active': ['Frozen', 'Exiting', 'cancelled'],
      'Frozen': ['Active', 'cancelled'],
      'Exiting': ['cancelled', 'Frozen'],
      'cancelled': [],
      'expired': []
    };

    this.availableStates = transitions[this.subscription.status] || [];
  }

  onStateTransition(): void {
    if (!this.selectedNewState) return;

    this.isTransitioning = true;
    
    this.subscriptionService.transitionSubscriptionState(
      this.subscription.id,
      this.selectedNewState,
      this.transitionReason
    ).subscribe({
      next: (result) => {
        if (result.success) {
          // Update subscription locally
          this.subscription.status = this.selectedNewState!;
          this.selectedNewState = null;
          this.transitionReason = '';
          this.loadStateHistory();
          this.setAvailableStates();
        }
        this.isTransitioning = false;
      },
      error: (error) => {
        console.error('State transition failed:', error);
        this.isTransitioning = false;
      }
    });
  }

  getStateDisplayName(status: SubscriptionStatus): string {
    return this.stateDisplayNames[status] || status;
  }

  getStateColor(status: SubscriptionStatus): string {
    return this.stateColors[status] || 'secondary';
  }
}
```

## Testing Strategy

### Unit Tests

Create file: `backend/src/tests/subscription-state-service.test.ts`

```typescript
import { SubscriptionStateService } from '../services/subscription-state-service.js';
import { subscriptionRepo } from '../services/repositories.js';

describe('SubscriptionStateService', () => {
  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(SubscriptionStateService.validateTransition('pending_payment', 'New_Joiner')).toBe(true);
      expect(SubscriptionStateService.validateTransition('New_Joiner', 'Active')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(SubscriptionStateService.validateTransition('Active', 'pending_payment')).toBe(false);
      expect(SubscriptionStateService.validateTransition('cancelled', 'Active')).toBe(false);
    });
  });

  describe('canTransition', () => {
    it('should check business rules for New_Joiner to Active', () => {
      const subscriptionWithOneCycle = { status: 'New_Joiner', completed_cycles: 1 };
      const subscriptionWithTwoCycles = { status: 'New_Joiner', completed_cycles: 2 };

      expect(SubscriptionStateService.canTransition(subscriptionWithOneCycle, 'Active').canTransition).toBe(false);
      expect(SubscriptionStateService.canTransition(subscriptionWithTwoCycles, 'Active').canTransition).toBe(true);
    });
  });

  describe('processPaymentSuccess', () => {
    it('should increment completed cycles', () => {
      const mockSubscription = { id: 'test-id', status: 'New_Joiner', completed_cycles: 1 };
      jest.spyOn(subscriptionRepo, 'findById').mockReturnValue(mockSubscription);
      jest.spyOn(subscriptionRepo, 'incrementCompletedCycles').mockReturnValue(true);

      const result = SubscriptionStateService.processPaymentSuccess('test-id');
      expect(result).toBe(true);
      expect(subscriptionRepo.incrementCompletedCycles).toHaveBeenCalledWith('test-id');
    });
  });
});
```

## Deployment Checklist

1. [ ] Database backup created
2. [ ] Migration script tested on staging
3. [ ] Backend unit tests passing
4. [ ] Frontend components updated
5. [ ] API endpoints tested
6. [ ] Admin dashboard updated
7. [ ] User management interface updated
8. [ ] Documentation updated
9. [ ] Rollback plan prepared
10. [ ] Monitoring configured for state transitions

## Monitoring and Maintenance

1. Monitor state transition success rates
2. Track subscription lifecycle metrics
3. Set up alerts for failed transitions
4. Regular audits of state history
5. Performance monitoring for new queries
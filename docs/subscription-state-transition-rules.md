# Subscription State Transition Rules and Validation

## Overview

This document provides comprehensive documentation of the state transition rules and validation logic for the enhanced subscription model. The system implements strict business rules to ensure data integrity and proper subscription lifecycle management across 7 distinct states.

## State Transition Matrix

### Transition Rules Overview

| Current State | Pending_Approval | Curious | New_Joiner | Active | Frozen | Exiting | Cancelled |
|---------------|------------------|---------|------------|--------|--------|---------|-----------|
| **Pending_Approval** | - | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Curious** | ❌ | - | ❌ | ❌ | ✅ | ✅ | ✅ |
| **New_Joiner** | ❌ | ❌ | - | ✅ | ✅ | ✅ | ✅ |
| **Active** | ❌ | ❌ | ❌ | - | ✅ | ✅ | ✅ |
| **Frozen** | ❌ | ❌ | ✅ | ✅ | - | ❌ | ✅ |
| **Exiting** | ❌ | ❌ | ❌ | ❌ | ✅ | - | ✅ |
| **Cancelled** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - |

**Legend**:
- ✅ = Valid transition
- ❌ = Invalid transition
- - = Same state (no transition)

## Detailed State Transition Rules

### 1. Pending_Approval State

**Description**: Customers who signed up with manual payment methods requiring admin approval.

**Valid Transitions**:
- **→ Active**: Admin approval after payment confirmation
- **→ Cancelled**: Admin rejection or customer cancellation

**Business Rules**:
```typescript
// Validation rules for Pending_Approval
const pendingApprovalRules = {
  canTransitionTo: {
    Active: {
      requiredRole: 'admin',
      conditions: [
        'payment_method !== "credit_card"',
        'admin_approval_received === true',
        'payment_confirmed === true'
      ],
      automatic: false
    },
    Cancelled: {
      requiredRole: 'admin',
      conditions: [
        'admin_rejection === true || customer_cancellation === true'
      ],
      automatic: false
    }
  }
};
```

**Validation Examples**:
```javascript
// Valid transition: Admin approval
{
  currentState: 'Pending_Approval',
  newState: 'Active',
  changedBy: 'admin_123',
  reason: 'Wire transfer payment confirmed',
  metadata: {
    paymentConfirmed: true,
    paymentReference: 'WTR20251015001',
    approvalDate: '2025-10-15T14:30:00Z'
  }
}

// Valid transition: Admin rejection
{
  currentState: 'Pending_Approval',
  newState: 'Cancelled',
  changedBy: 'admin_456',
  reason: 'Customer provided invalid payment information',
  metadata: {
    rejectionReason: 'invalid_payment_info',
    customerNotified: true
  }
}
```

### 2. Curious State

**Description**: Trial customers with single-cycle subscription and no auto-renewal.

**Valid Transitions**:
- **→ Exiting**: Automatic transition when cycle ends
- **→ Frozen**: Customer request for temporary pause
- **→ Cancelled**: Immediate customer cancellation

**Business Rules**:
```typescript
// Validation rules for Curious
const curiousRules = {
  canTransitionTo: {
    Exiting: {
      requiredRole: 'system',
      conditions: [
        'end_date <= CURRENT_DATE',
        'auto_renewal === false'
      ],
      automatic: true
    },
    Frozen: {
      requiredRole: 'admin',
      conditions: [
        'customer_request === true',
        'freeze_reason_provided === true'
      ],
      automatic: false
    },
    Cancelled: {
      requiredRole: 'admin',
      conditions: [
        'customer_cancellation === true'
      ],
      automatic: false
    }
  }
};
```

**Validation Examples**:
```javascript
// Automatic transition: Cycle completion
{
  currentState: 'Curious',
  newState: 'Exiting',
  changedBy: 'system',
  reason: 'Subscription cycle completed',
  metadata: {
    endDate: '2025-10-15T23:59:59Z',
    completedCycles: 1,
    automaticTransition: true
  }
}

// Manual transition: Customer request
{
  currentState: 'Curious',
  newState: 'Frozen',
  changedBy: 'admin_789',
  reason: 'Customer requested freeze due to travel',
  metadata: {
    customerRequest: true,
    freezeReason: 'travel',
    requestedBy: 'customer_123',
    freezeDuration: 14
  }
}
```

### 3. New_Joiner State

**Description**: New customers with auto-renewal establishing payment history.

**Valid Transitions**:
- **→ Active**: Automatic transition after 2 successful payment cycles
- **→ Frozen**: Customer request for temporary pause
- **→ Exiting**: Customer cancellation
- **→ Cancelled**: Payment failure

**Business Rules**:
```typescript
// Validation rules for New_Joiner
const newJoinerRules = {
  canTransitionTo: {
    Active: {
      requiredRole: 'system',
      conditions: [
        'completed_cycles >= 2',
        'auto_renewal === true',
        'payment_method === "credit_card"'
      ],
      automatic: true
    },
    Frozen: {
      requiredRole: 'admin',
      conditions: [
        'customer_request === true'
      ],
      automatic: false
    },
    Exiting: {
      requiredRole: 'admin',
      conditions: [
        'customer_cancellation === true',
        'auto_renewal_disabled === true'
      ],
      automatic: false
    },
    Cancelled: {
      requiredRole: 'system',
      conditions: [
        'payment_failure === true',
        'retry_attempts >= 3'
      ],
      automatic: true
    }
  }
};
```

**Validation Examples**:
```javascript
// Automatic transition: Completed 2 cycles
{
  currentState: 'New_Joiner',
  newState: 'Active',
  changedBy: 'system',
  reason: 'Completed 2 successful payment cycles',
  metadata: {
    completedCycles: 2,
    successfulPayments: [
      { date: '2025-09-15', amount: 299.99 },
      { date: '2025-10-15', amount: 299.99 }
    ],
    automaticTransition: true
  }
}

// Automatic transition: Payment failure
{
  currentState: 'New_Joiner',
  newState: 'Cancelled',
  changedBy: 'system',
  reason: 'Payment processing failed after 3 attempts',
  metadata: {
    paymentFailure: true,
    retryAttempts: 3,
    lastFailureReason: 'card_expired',
    automaticTransition: true
  }
}
```

### 4. Active State

**Description**: Established customers with successful payment history.

**Valid Transitions**:
- **→ Frozen**: Customer request for temporary pause
- **→ Exiting**: Customer cancellation
- **→ Cancelled**: Payment failure

**Business Rules**:
```typescript
// Validation rules for Active
const activeRules = {
  canTransitionTo: {
    Frozen: {
      requiredRole: 'admin',
      conditions: [
        'customer_request === true',
        'account_in_good_standing === true'
      ],
      automatic: false
    },
    Exiting: {
      requiredRole: 'admin',
      conditions: [
        'customer_cancellation === true',
        'auto_renewal_disabled === true'
      ],
      automatic: false
    },
    Cancelled: {
      requiredRole: 'system',
      conditions: [
        'payment_failure === true',
        'retry_attempts >= 3'
      ],
      automatic: true
    }
  }
};
```

### 5. Frozen State

**Description**: Temporarily suspended accounts with no deliveries or payments.

**Valid Transitions**:
- **→ Active**: Customer reactivation (returns to previous state)
- **→ New_Joiner**: Customer reactivation (if was New_Joiner)
- **→ Cancelled**: Customer cancellation

**Business Rules**:
```typescript
// Validation rules for Frozen
const frozenRules = {
  canTransitionTo: {
    Active: {
      requiredRole: 'admin',
      conditions: [
        'customer_reactivation === true',
        'previous_state === "Active"',
        'payment_method_valid === true'
      ],
      automatic: false
    },
    New_Joiner: {
      requiredRole: 'admin',
      conditions: [
        'customer_reactivation === true',
        'previous_state === "New_Joiner"',
        'payment_method_valid === true'
      ],
      automatic: false
    },
    Cancelled: {
      requiredRole: 'admin',
      conditions: [
        'customer_cancellation === true'
      ],
      automatic: false
    }
  }
};
```

### 6. Exiting State

**Description**: Cancelled subscriptions continuing service until paid period ends.

**Valid Transitions**:
- **→ Cancelled**: Automatic transition when end_date reached
- **→ Frozen**: Customer request before end_date

**Business Rules**:
```typescript
// Validation rules for Exiting
const exitingRules = {
  canTransitionTo: {
    Cancelled: {
      requiredRole: 'system',
      conditions: [
        'end_date <= CURRENT_DATE'
      ],
      automatic: true
    },
    Frozen: {
      requiredRole: 'admin',
      conditions: [
        'customer_request === true',
        'end_date > CURRENT_DATE'
      ],
      automatic: false
    }
  }
};
```

### 7. Cancelled State

**Description**: Fully terminated subscriptions with no active service.

**Valid Transitions**:
- None (terminal state)

**Business Rules**:
```typescript
// Validation rules for Cancelled
const cancelledRules = {
  canTransitionTo: {
    // No transitions allowed from Cancelled state
  },
  isTerminalState: true
};
```

## Validation Engine Implementation

### Core Validation Logic

```typescript
class SubscriptionStateValidator {
  private transitionRules: Map<string, TransitionRuleSet>;

  constructor() {
    this.transitionRules = new Map([
      ['Pending_Approval', pendingApprovalRules],
      ['Curious', curiousRules],
      ['New_Joiner', newJoinerRules],
      ['Active', activeRules],
      ['Frozen', frozenRules],
      ['Exiting', exitingRules],
      ['Cancelled', cancelledRules]
    ]);
  }

  validateTransition(
    currentState: string,
    newState: string,
    context: TransitionContext
  ): ValidationResult {
    const rules = this.transitionRules.get(currentState);
    
    if (!rules) {
      return {
        valid: false,
        reason: `Invalid current state: ${currentState}`
      };
    }

    const transitionRule = rules.canTransitionTo[newState];
    
    if (!transitionRule) {
      return {
        valid: false,
        reason: `Cannot transition from ${currentState} to ${newState}`
      };
    }

    // Check role requirements
    if (transitionRule.requiredRole !== context.userRole) {
      return {
        valid: false,
        reason: `Transition requires ${transitionRule.requiredRole} role`
      };
    }

    // Check conditions
    for (const condition of transitionRule.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return {
          valid: false,
          reason: `Condition not met: ${condition}`
        };
      }
    }

    return {
      valid: true,
      automatic: transitionRule.automatic
    };
  }

  private evaluateCondition(condition: string, context: TransitionContext): boolean {
    // Implement condition evaluation logic
    // This would parse and evaluate conditions like "completed_cycles >= 2"
    return true; // Simplified for example
  }
}
```

### Transition Context Structure

```typescript
interface TransitionContext {
  subscriptionId: string;
  userId: string;
  userRole: 'admin' | 'system' | 'customer';
  currentState: string;
  newState: string;
  reason: string;
  metadata: Record<string, any>;
  subscriptionData: {
    paymentMethod: string;
    autoRenewal: boolean;
    completedCycles: number;
    endDate: Date;
    // ... other subscription properties
  };
}
```

### Validation Result Structure

```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;
  automatic?: boolean;
  warnings?: string[];
  requiredActions?: string[];
}
```

## Automatic Transition Processing

### Daily Automatic Transitions

```typescript
class AutomaticTransitionProcessor {
  async processDailyTransitions(): Promise<ProcessingResult> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    try {
      // Process New_Joiner to Active transitions
      const newJoinerResults = await this.processNewJoinerToActive();
      results.processed += newJoinerResults.processed;
      results.successful += newJoinerResults.successful;
      results.failed += newJoinerResults.failed;
      results.details.push(...newJoinerResults.details);

      // Process Curious to Exiting transitions
      const curiousResults = await this.processCuriousToExiting();
      results.processed += curiousResults.processed;
      results.successful += curiousResults.successful;
      results.failed += curiousResults.failed;
      results.details.push(...curiousResults.details);

      // Process Exiting to Cancelled transitions
      const exitingResults = await this.processExitingToCancelled();
      results.processed += exitingResults.processed;
      results.successful += exitingResults.successful;
      results.failed += exitingResults.failed;
      results.details.push(...exitingResults.details);

      return results;
    } catch (error) {
      console.error('Error processing automatic transitions:', error);
      throw error;
    }
  }

  private async processNewJoinerToActive(): Promise<ProcessingResult> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE status = 'New_Joiner' 
      AND completed_cycles >= 2 
      AND auto_renewal = true
    `;

    const subscriptions = await this.database.query(query);
    const results = { processed: 0, successful: 0, failed: 0, details: [] };

    for (const subscription of subscriptions) {
      try {
        await this.transitionSubscription(
          subscription.id,
          'New_Joiner',
          'Active',
          'system',
          'Completed 2 successful payment cycles'
        );
        results.successful++;
        results.details.push({
          subscriptionId: subscription.id,
          success: true,
          message: 'Transitioned to Active'
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message
        });
      }
      results.processed++;
    }

    return results;
  }
}
```

## Error Handling and Edge Cases

### Common Validation Errors

```typescript
const validationErrors = {
  INVALID_TRANSITION: 'Invalid state transition',
  INSUFFICIENT_PERMISSIONS: 'User lacks required permissions',
  CONDITION_NOT_MET: 'Business rule condition not satisfied',
  SUBSCRIPTION_NOT_FOUND: 'Subscription does not exist',
  PAYMENT_METHOD_INVALID: 'Payment method is not valid for this transition',
  ACCOUNT_NOT_IN_GOOD_STANDING: 'Account has outstanding issues',
  TRANSITION_ALREADY_PROCESSED: 'Transition has already been processed'
};
```

### Edge Case Handling

```typescript
class EdgeCaseHandler {
  async handlePaymentFailureGracePeriod(subscriptionId: string): Promise<void> {
    // Give customers 3 days to update payment method before cancellation
    const subscription = await this.getSubscription(subscriptionId);
    
    if (subscription.lastPaymentFailure) {
      const daysSinceFailure = this.daysSince(subscription.lastPaymentFailure);
      
      if (daysSinceFailure < 3) {
        // Send reminder notifications
        await this.sendPaymentReminder(subscriptionId);
        return;
      }
    }
    
    // Proceed with cancellation
    await this.transitionSubscription(
      subscriptionId,
      subscription.status,
      'Cancelled',
      'system',
      'Payment failure after grace period'
    );
  }

  async handleConcurrentTransitions(subscriptionId: string): Promise<void> {
    // Prevent multiple concurrent transitions
    const lockKey = `subscription_transition_${subscriptionId}`;
    
    if (await this.redis.exists(lockKey)) {
      throw new Error('Transition already in progress');
    }
    
    await this.redis.setex(lockKey, 60, 'locked'); // 60 second lock
    
    try {
      // Process transition
      await this.processTransition(subscriptionId);
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
```

## Testing and Validation

### Unit Test Examples

```typescript
describe('Subscription State Validation', () => {
  let validator: SubscriptionStateValidator;

  beforeEach(() => {
    validator = new SubscriptionStateValidator();
  });

  test('should allow New_Joiner to Active after 2 cycles', () => {
    const context = {
      userRole: 'system',
      subscriptionData: {
        completedCycles: 2,
        autoRenewal: true,
        paymentMethod: 'credit_card'
      }
    };

    const result = validator.validateTransition(
      'New_Joiner',
      'Active',
      context
    );

    expect(result.valid).toBe(true);
    expect(result.automatic).toBe(true);
  });

  test('should prevent invalid transition from Active to Pending_Approval', () => {
    const context = {
      userRole: 'admin',
      subscriptionData: {}
    };

    const result = validator.validateTransition(
      'Active',
      'Pending_Approval',
      context
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Cannot transition from Active to Pending_Approval');
  });
});
```

### Integration Test Examples

```typescript
describe('Subscription State Integration', () => {
  test('should process complete lifecycle from signup to cancellation', async () => {
    // Start with Pending_Approval
    let subscription = await createSubscription({
      paymentMethod: 'wire_transfer',
      autoRenewal: true
    });
    expect(subscription.status).toBe('Pending_Approval');

    // Approve to Active
    subscription = await transitionSubscription(
      subscription.id,
      'Pending_Approval',
      'Active',
      'admin',
      'Payment confirmed'
    );
    expect(subscription.status).toBe('Active');

    // Freeze temporarily
    subscription = await transitionSubscription(
      subscription.id,
      'Active',
      'Frozen',
      'admin',
      'Customer vacation'
    );
    expect(subscription.status).toBe('Frozen');

    // Reactivate
    subscription = await transitionSubscription(
      subscription.id,
      'Frozen',
      'Active',
      'admin',
      'Customer returned from vacation'
    );
    expect(subscription.status).toBe('Active');

    // Cancel
    subscription = await transitionSubscription(
      subscription.id,
      'Active',
      'Cancelled',
      'admin',
      'Customer requested cancellation'
    );
    expect(subscription.status).toBe('Cancelled');
  });
});
```

## Performance Considerations

### Database Optimization

```sql
-- Indexes for transition validation
CREATE INDEX idx_subscriptions_status_completed_cycles 
ON subscriptions(status, completed_cycles);

CREATE INDEX idx_subscriptions_status_end_date 
ON subscriptions(status, end_date);

CREATE INDEX idx_subscriptions_auto_renewal 
ON subscriptions(auto_renewal);

-- Optimized queries for automatic transitions
-- New_Joiner to Active
SELECT id FROM subscriptions 
WHERE status = 'New_Joiner' 
AND completed_cycles >= 2 
AND auto_renewal = true;

-- Curious to Exiting
SELECT id FROM subscriptions 
WHERE status = 'Curious' 
AND end_date <= CURRENT_DATE;

-- Exiting to Cancelled
SELECT id FROM subscriptions 
WHERE status = 'Exiting' 
AND end_date <= CURRENT_DATE;
```

### Caching Strategy

```typescript
class TransitionCache {
  private cache = new Map<string, CachedValidationResult>();

  getCachedValidation(
    currentState: string,
    newState: string,
    subscriptionData: any
  ): CachedValidationResult | null {
    const cacheKey = this.generateCacheKey(currentState, newState, subscriptionData);
    return this.cache.get(cacheKey) || null;
  }

  setCachedValidation(
    currentState: string,
    newState: string,
    subscriptionData: any,
    result: ValidationResult
  ): void {
    const cacheKey = this.generateCacheKey(currentState, newState, subscriptionData);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private generateCacheKey(
    currentState: string,
    newState: string,
    subscriptionData: any
  ): string {
    return `${currentState}_${newState}_${JSON.stringify(subscriptionData)}`;
  }
}
```

## Monitoring and Alerting

### Transition Metrics

```typescript
class TransitionMetrics {
  async trackTransition(transition: StateTransition): Promise<void> {
    const metrics = {
      transitionType: `${transition.previousState}_to_${transition.newState}`,
      timestamp: transition.createdAt,
      duration: this.calculateTransitionDuration(transition),
      success: transition.success,
      error: transition.error
    };

    await this.metricsCollector.record('subscription_transition', metrics);
  }

  async generateTransitionReport(
    startDate: Date,
    endDate: Date
  ): Promise<TransitionReport> {
    const query = `
      SELECT 
        previous_state,
        new_state,
        COUNT(*) as transition_count,
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_duration
      FROM subscription_state_history
      WHERE created_at BETWEEN ? AND ?
      GROUP BY previous_state, new_state
      ORDER BY transition_count DESC
    `;

    const results = await this.database.query(query, [startDate, endDate]);
    return this.formatReport(results);
  }
}
```

### Alert Conditions

```typescript
const alertConditions = {
  HIGH_FAILURE_RATE: {
    threshold: 0.1, // 10% failure rate
    window: '1h',
    message: 'High subscription transition failure rate detected'
  },
  STUCK_TRANSITIONS: {
    threshold: 100, // 100 stuck transitions
    window: '24h',
    message: 'Multiple subscriptions stuck in transition states'
  },
  UNUSUAL_PATTERN: {
    threshold: 3, // 3 standard deviations
    window: '24h',
    message: 'Unusual transition pattern detected'
  }
};
```

## Conclusion

The state transition rules and validation system provide a robust framework for managing the subscription lifecycle with proper business rule enforcement, data integrity, and comprehensive error handling. The system ensures that all transitions follow established business rules while maintaining flexibility for future enhancements.

Regular monitoring, testing, and optimization of the transition system will ensure continued reliability and performance as the subscription base grows and business requirements evolve.
import { subscriptionRepo, subscriptionStateHistoryRepo } from './repositories.js';
import { SubscriptionStatus, PaymentMethod } from '../models/types.js';

export class SubscriptionStateService {
  // Define valid state transitions
  private static readonly VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    'pending_payment': ['New_Joiner', 'Curious', 'cancelled'],
    'Pending_Approval': ['Active', 'cancelled'],
    'New_Joiner': ['Active', 'Frozen', 'Exiting', 'cancelled'],
    'Curious': ['Exiting', 'Frozen', 'cancelled'],
    'Active': ['Frozen', 'Exiting', 'cancelled'],
    'Frozen': ['Active', 'cancelled'],
    'Exiting': ['cancelled', 'Frozen'],
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
    this.executeTransition(subscriptionId, 'cancelled', 'Payment failure', 'system');
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
        'cancelled', 
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

  // Helper method to determine initial state based on subscription creation parameters
  static determineInitialState(paymentMethod: PaymentMethod, autoRenewal: boolean): SubscriptionStatus {
    if (paymentMethod === 'credit_card') {
      return autoRenewal ? 'New_Joiner' : 'Curious';
    } else {
      return 'Pending_Approval';
    }
  }

  // Method to process subscription creation with proper state assignment
  static createSubscriptionWithState(subscriptionData: any): { success: boolean; subscription?: any; error?: string } {
    try {
      // Determine initial state
      const initialState = this.determineInitialState(
        subscriptionData.payment_method || 'credit_card',
        subscriptionData.auto_renewal !== false // Default to true
      );

      // Create subscription with determined state
      const subscription = subscriptionRepo.create({
        ...subscriptionData,
        status: initialState,
        payment_method: subscriptionData.payment_method || 'credit_card',
        auto_renewal: subscriptionData.auto_renewal !== false,
        completed_cycles: 0
      });

      return { success: true, subscription };
    } catch (error) {
      return { success: false, error: 'Failed to create subscription' };
    }
  }
}
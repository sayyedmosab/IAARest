import { Router, Request, Response } from 'express';
import { subscriptionRepo, planRepo, profileRepo, subscriptionStateHistoryRepo } from '../services/repositories.js';
import { requireAdmin, AuthRequest, authenticateToken } from '../middleware/auth.js';
import { SubscriptionStateService } from '../services/subscription-state-service.js';
import { SubscriptionStatus, PaymentMethod } from '../models/types.js';

const router = Router();
const stateService = new SubscriptionStateService();

// Get all subscriptions (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptions = subscriptionRepo.findAll();
    // Return all DB fields for each subscription
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions'
    });
  }
});

// Get subscription by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subscription = subscriptionRepo.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription'
    });
  }
});

// Get current user's subscriptions
router.get('/my/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const subscriptions = subscriptionRepo.findByUser(req.user.user_id);

    res.json({
      success: true,
      data: subscriptions
    });

  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions'
    });
  }
});

// Create new subscription
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      plan_id,
      start_date,
      end_date,
      student_discount_applied,
      price_charged_aed,
      payment_method,
      auto_renewal,
      notes
    } = req.body;

    // Validate required fields
    if (!plan_id || !start_date || !end_date || !price_charged_aed) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: plan_id, start_date, end_date, price_charged_aed'
      });
    }

    // Verify plan exists
    const plan = planRepo.findById(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Create subscription using state service
    const result = SubscriptionStateService.createSubscriptionWithState({
      user_id: req.user.user_id,
      plan_id,
      start_date,
      end_date,
      student_discount_applied: student_discount_applied || false,
      price_charged_aed,
      currency: 'AED',
      renewal_type: auto_renewal ? 'auto' : 'manual',
      has_successful_payment: false,
      payment_method: payment_method || 'credit_card',
      auto_renewal: auto_renewal !== false, // Default to true
      notes
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create subscription'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: result.subscription
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

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
      req.user?.user_id || 'admin'
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

// Update subscription status (admin only) - Enhanced
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
      req.user?.user_id || 'admin'
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

// Process payment success (webhook endpoint)
router.post('/:id/payment-success', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = SubscriptionStateService.processPaymentSuccess(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Payment processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process payment'
      });
    }
  } catch (error) {
    console.error('Process payment success error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    });
  }
});

// Process payment failure (webhook endpoint)
router.post('/:id/payment-failure', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = SubscriptionStateService.processPaymentFailure(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Payment failure processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process payment failure'
      });
    }
  } catch (error) {
    console.error('Process payment failure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment failure'
    });
  }
});

// Admin endpoint to run automated state transitions
router.post('/admin/process-transitions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const activatedCount = SubscriptionStateService.checkAndActivateNewJoiners();
    const cancelledCount = SubscriptionStateService.checkAndCancelExitingSubscriptions();
    
    res.json({
      success: true,
      message: 'State transitions processed successfully',
      data: {
        newJoinersActivated: activatedCount,
        exitingCancelled: cancelledCount
      }
    });
  } catch (error) {
    console.error('Process state transitions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process state transitions'
    });
  }
});

export default router;

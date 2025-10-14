import { Router, Request, Response } from 'express';
import { subscriptionRepo, planRepo, profileRepo } from '../services/repositories.js';
import { requireAdmin, AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

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

    const { plan_id, start_date, end_date, student_discount_applied, price_charged_aed } = req.body;

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

    // Create subscription
    const newSubscription = subscriptionRepo.create({
      user_id: req.user.user_id,
      plan_id,
      status: 'pending_payment',
      start_date,
      end_date,
      student_discount_applied: student_discount_applied || false,
      price_charged_aed,
      currency: 'AED',
      renewal_type: 'manual',
      has_successful_payment: false
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: newSubscription
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
// Update subscription status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'rejected', 'paused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, rejected, paused'
      });
    }

    // Find subscription
    const subscription = subscriptionRepo.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Update subscription status
    const updatedSubscription = subscriptionRepo.update(id, { status });

    res.json({
      success: true,
      message: 'Subscription status updated successfully',
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription status'
    });
  }
});

});

export default router;

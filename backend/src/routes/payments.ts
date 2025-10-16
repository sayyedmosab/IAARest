import { Router, Request, Response } from 'express';
import { StripeService } from '../services/stripe-service.js';
import { subscriptionRepo } from '../services/repositories.js';
import { SubscriptionStateService } from '../services/subscription-state-service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Lazy initialization of StripeService to ensure environment variables are loaded
let stripeService: StripeService | null = null;

function getStripeService(): StripeService {
  if (!stripeService) {
    console.log('[PAYMENTS] Initializing StripeService with environment variables...');
    console.log('[PAYMENTS] STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    stripeService = new StripeService();
    console.log('[PAYMENTS] StripeService initialized successfully');
  }
  return stripeService;
}

// Create payment intent for a subscription
router.post('/create-payment-intent', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { subscriptionId, amount, currency = 'aed' } = req.body;

    // Validate required fields
    if (!subscriptionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subscriptionId, amount'
      });
    }

    // Verify subscription exists and belongs to user
    const subscription = subscriptionRepo.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    if (subscription.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Subscription does not belong to user'
      });
    }

    // Create payment intent
    const paymentIntent = await getStripeService().createPaymentIntent(
      subscriptionId,
      amount,
      currency,
      req.user.email
    );

    res.json({
      success: true,
      data: paymentIntent
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// Confirm payment after successful Stripe payment
router.post('/confirm-payment', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Confirm payment with Stripe
    const paymentResult = await getStripeService().confirmPayment(paymentIntentId);

    if (paymentResult.success && paymentResult.payment) {
      // Process successful payment
      const success = SubscriptionStateService.processPaymentSuccess(paymentResult.payment.subscription_id);
      
      if (success) {
        res.json({
          success: true,
          message: 'Payment confirmed and subscription updated',
          data: paymentResult.payment
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Payment confirmed but failed to update subscription'
        });
      }
    } else {
      // Payment failed
      if (paymentResult.payment) {
        SubscriptionStateService.processPaymentFailure(paymentResult.payment.subscription_id);
      }
      
      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment confirmation failed'
      });
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
      return res.status(500).json({
        success: false,
        error: 'Webhook secret not configured'
      });
    }

    const result = await getStripeService().processWebhook(
      req.body,
      sig,
      webhookSecret
    );

    if (result.processed) {
      res.json({
        success: true,
        message: `Webhook processed: ${result.event}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to process webhook'
      });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

// Get payment details
router.get('/:paymentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { paymentId } = req.params;
    
    // This would require adding a findById method to PaymentRepository
    // For now, we'll return a not implemented response
    res.status(501).json({
      success: false,
      error: 'Get payment details not implemented yet'
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment details'
    });
  }
});

export default router;
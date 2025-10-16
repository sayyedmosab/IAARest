import Stripe from 'stripe';
import { Payment, PaymentStatus } from '../models/types.js';
import { paymentRepo } from './repositories.js';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Create a payment intent for a subscription
   */
  async createPaymentIntent(
    subscriptionId: string,
    amount: number,
    currency: string = 'aed',
    customerEmail?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          subscriptionId,
        },
        receipt_email: customerEmail,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      await paymentRepo.create({
        subscription_id: subscriptionId,
        method: 'card',
        amount_aed: amount,
        currency: currency.toUpperCase(),
        status: 'requires_action' as PaymentStatus,
        provider: 'stripe',
        provider_txn_id: paymentIntent.id,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a payment after successful Stripe payment
   */
  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    try {
      // Retrieve the payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update payment record in database
        const updatedPayment = await paymentRepo.updateByProviderTxnId(paymentIntentId, {
          status: 'succeeded' as PaymentStatus,
          receipt_url: paymentIntent.latest_charge ? `https://dashboard.stripe.com/payments/${paymentIntent.latest_charge}` : undefined,
        });

        return {
          success: true,
          payment: updatedPayment || undefined,
        };
      } else {
        // Payment failed or requires action
        const updatedPayment = await paymentRepo.updateByProviderTxnId(paymentIntentId, {
          status: paymentIntent.status === 'requires_action' ? 'requires_action' as PaymentStatus : 'failed' as PaymentStatus,
        });

        return {
          success: false,
          payment: updatedPayment || undefined,
          error: `Payment status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: `Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Process webhook events from Stripe
   */
  async processWebhook(
    payload: string,
    sigHeader: string,
    webhookSecret: string
  ): Promise<{ event: string; processed: boolean; error?: string }> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret);

      let processed = false;

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.confirmPayment(paymentIntent.id);
          processed = true;
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          await paymentRepo.updateByProviderTxnId(failedPaymentIntent.id, {
            status: 'failed' as PaymentStatus,
          });
          processed = true;
          break;

        case 'payment_intent.requires_action':
          const actionPaymentIntent = event.data.object as Stripe.PaymentIntent;
          await paymentRepo.updateByProviderTxnId(actionPaymentIntent.id, {
            status: 'requires_action' as PaymentStatus,
          });
          processed = true;
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return {
        event: event.type,
        processed,
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        event: 'unknown',
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundParams);

      // Update payment record
      await paymentRepo.updateByProviderTxnId(paymentIntentId, {
        status: 'refunded' as PaymentStatus,
      });

      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new Error(`Failed to refund payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
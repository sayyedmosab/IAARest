import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Observable, BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../constants/api';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaymentConfirmation {
  paymentIntentId: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripe: Stripe | null = null;
  private paymentProcessing$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.initializeStripe();
  }

  private async initializeStripe() {
    // Using a test key for development - replace with actual key in production
    const stripePublishableKey = 'pk_test_51234567890abcdef';
    
    this.stripe = await loadStripe(stripePublishableKey);
    if (!this.stripe) {
      console.error('Failed to load Stripe');
    }
  }

  get paymentProcessing(): Observable<boolean> {
    return this.paymentProcessing$.asObservable();
  }

  private setPaymentProcessing(processing: boolean) {
    this.paymentProcessing$.next(processing);
  }

  /**
   * Create a payment intent for a subscription
   */
  createPaymentIntent(subscriptionId: string, amount: number, currency: string = 'aed'): Observable<{ success: boolean; data?: PaymentIntent; error?: string }> {
    return new Observable(observer => {
      this.setPaymentProcessing(true);

      this.http.post<{ success: boolean; data?: PaymentIntent; error?: string }>(
        `${API_BASE_URL}/payments/create-payment-intent`,
        { subscriptionId, amount, currency }
      ).subscribe({
        next: (response) => {
          this.setPaymentProcessing(false);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          this.setPaymentProcessing(false);
          observer.next({
            success: false,
            error: error.error?.error || 'Failed to create payment intent'
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * Confirm payment using Stripe Elements
   */
  async confirmPayment(clientSecret: string, cardElement: any): Promise<{ success: boolean; error?: string; paymentIntent?: any }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe not initialized' };
    }

    try {
      this.setPaymentProcessing(true);

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer Name', // This should come from user profile
          },
        },
      });

      this.setPaymentProcessing(false);

      if (error) {
        return { success: false, error: error.message };
      }

      // Confirm payment with backend
      const confirmationResult = await this.confirmPaymentBackend(paymentIntent.id);
      
      if (confirmationResult.success) {
        return { success: true, paymentIntent };
      } else {
        return { success: false, error: confirmationResult.error || 'Payment confirmation failed' };
      }

    } catch (error) {
      this.setPaymentProcessing(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment confirmation failed' 
      };
    }
  }

  /**
   * Confirm payment with backend after successful Stripe payment
   */
  private confirmPaymentBackend(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.http.post<{ success: boolean; error?: string }>(
        `${API_BASE_URL}/payments/confirm-payment`,
        { paymentIntentId }
      ).subscribe({
        next: (response) => {
          resolve(response);
        },
        error: (error) => {
          resolve({
            success: false,
            error: error.error?.error || 'Failed to confirm payment with backend'
          });
        }
      });
    });
  }

  /**
   * Create Stripe Elements instance
   */
  createElements(clientSecret: string) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    return this.stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#dc2626', // Red-600 to match app theme
          colorBackground: '#ffffff',
          colorText: '#1f2937', // Gray-800
        },
      },
    });
  }

  /**
   * Handle payment method changes (e.g., when user switches between card and other methods)
   */
  handlePaymentMethodChange(method: 'card' | 'wire_transfer') {
    // This can be used to update UI state when payment method changes
    console.log('Payment method changed to:', method);
  }

  /**
   * Get payment status for a subscription
   */
  getPaymentStatus(subscriptionId: string): Observable<{ success: boolean; data?: any; error?: string }> {
    return this.http.get<{ success: boolean; data?: any; error?: string }>(
      `${API_BASE_URL}/payments/subscription/${subscriptionId}/status`
    );
  }

  /**
   * Handle payment errors gracefully
   */
  handlePaymentError(error: any): { message: string; isRecoverable: boolean } {
    if (error.type === 'card_error') {
      return {
        message: error.message || 'Your card was declined.',
        isRecoverable: true
      };
    }

    if (error.type === 'validation_error') {
      return {
        message: error.message || 'Please check your payment details.',
        isRecoverable: true
      };
    }

    if (error.type === 'api_error') {
      return {
        message: 'A temporary error occurred. Please try again.',
        isRecoverable: true
      };
    }

    return {
      message: 'An unexpected error occurred. Please contact support.',
      isRecoverable: false
    };
  }
}

import { Component, ChangeDetectionStrategy, inject, signal, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { Plan } from '../../models/plan.model';
import { User } from '../../models/user.model';
import { SHARJAH_DISTRICTS } from '../../constants/sharjah-districts';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit, AfterViewInit {
  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);
  dataService = inject(DataService);
  subscriptionService = inject(SubscriptionService);
  authService = inject(AuthService);
  paymentService = inject(PaymentService);
  fb: FormBuilder = inject(FormBuilder);

  plan = signal<Plan | undefined>(undefined);
  currentUser = this.authService.currentUser;
  
  paymentMethod = signal<'credit_card' | 'wire_transfer'>('wire_transfer');
  paymentProof = signal<string | null>(null);
  paymentProofName = signal<string | null>(null);
  showSuccessMessage = signal(false);
  
  // Stripe related properties
  @ViewChild('cardElement') cardElement!: ElementRef;
  stripeElements: any;
  isProcessingPayment = signal(false);
  paymentError = signal<string | null>(null);
  paymentSuccess = signal(false);

  ngOnInit() {
    const planId = Number(this.route.snapshot.paramMap.get('planId'));
    if (planId) {
      this.plan.set(this.dataService.getPlanById(String(planId)));
    }
  }

  ngAfterViewInit() {
    // Initialize Stripe Elements when component is ready
    if (this.paymentMethod() === 'credit_card') {
      this.initializeStripeElements();
    }
  }

  async initializeStripeElements() {
    // Create a payment intent first to get client secret
    const plan = this.plan();
    if (!plan) return;

    try {
      const result = await this.paymentService.createPaymentIntent(
        'temp-subscription-id', // This will be replaced with actual subscription ID
        plan.pricePerMonth
      ).toPromise();

      if (result?.success && result.data) {
        this.stripeElements = this.paymentService.createElements(result.data.clientSecret);
        const cardElement = this.stripeElements.create('payment-element');
        cardElement.mount(this.cardElement.nativeElement);
      }
    } catch (error) {
      console.error('Error initializing Stripe Elements:', error);
      this.paymentError.set('Failed to initialize payment form');
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.paymentProofName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e) => this.paymentProof.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async confirmSubscription() {
    if (!this.plan() || !this.currentUser()) {
      return;
    }
    
    const user = this.currentUser() as User;
    const plan = this.plan() as Plan;
    
    if (!user.address) {
      alert('Please complete your address in your profile before subscribing.');
      // REQ-FUTURE: Redirect to a profile page.
      this.router.navigate(['/home']);
      return;
    }

    if (this.paymentMethod() === 'credit_card') {
      await this.processCreditCardPayment(user, plan);
    } else {
      await this.processWireTransferPayment(user, plan);
    }
  }

  private async processCreditCardPayment(user: User, plan: Plan) {
    if (!this.stripeElements) {
      this.paymentError.set('Payment form not initialized');
      return;
    }

    this.isProcessingPayment.set(true);
    this.paymentError.set(null);

    try {
      // First create subscription
      const subscriptionResult = await this.subscriptionService.addSubscription({
        userId: user.email,
        user: user,
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.pricePerMonth,
        startDate: new Date().toISOString().split('T')[0],
        deliveryAddress: user.address,
        paymentMethod: this.paymentMethod(),
        autoRenewal: true,
        completedCycles: 0
      }).toPromise();

      if (subscriptionResult?.success && subscriptionResult.data) {
        // Create payment intent for the subscription
        const paymentResult = await this.paymentService.createPaymentIntent(
          subscriptionResult.data.id,
          plan.pricePerMonth
        ).toPromise();

        if (paymentResult?.success && paymentResult.data) {
          // Confirm payment with Stripe
          const confirmResult = await this.paymentService.confirmPayment(
            paymentResult.data.clientSecret,
            this.stripeElements
          );

          if (confirmResult.success) {
            this.paymentSuccess.set(true);
            this.showSuccessMessage.set(true);
          } else {
            this.paymentError.set(confirmResult.error || 'Payment failed');
          }
        } else {
          this.paymentError.set(paymentResult?.error || 'Failed to create payment');
        }
      } else {
        this.paymentError.set('Failed to create subscription');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      this.paymentError.set('An unexpected error occurred during payment');
    } finally {
      this.isProcessingPayment.set(false);
    }
  }

  private async processWireTransferPayment(user: User, plan: Plan) {
    try {
      this.subscriptionService.addSubscription({
        userId: user.email,
        user: user,
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.pricePerMonth,
        startDate: new Date().toISOString().split('T')[0],
        deliveryAddress: user.address,
        paymentMethod: this.paymentMethod(),
        paymentProof: this.paymentProof() ?? undefined,
        autoRenewal: false,
        completedCycles: 0
      });

      this.showSuccessMessage.set(true);
    } catch (error) {
      console.error('Subscription creation error:', error);
      this.paymentError.set('Failed to create subscription');
    }
  }

  onPaymentMethodChange(method: 'credit_card' | 'wire_transfer') {
    this.paymentMethod.set(method);
    this.paymentError.set(null);
    
    if (method === 'credit_card' && !this.stripeElements) {
      setTimeout(() => this.initializeStripeElements(), 100);
    }
  }
}

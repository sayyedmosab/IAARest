
import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { Plan } from '../../models/plan.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-ar-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ar-checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArCheckoutComponent implements OnInit, OnDestroy {
  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);
  dataService = inject(DataService);
  subscriptionService = inject(SubscriptionService);
  authService = inject(AuthService);
  fb: FormBuilder = inject(FormBuilder);

  plan = signal<Plan | undefined>(undefined);
  currentUser = this.authService.currentUser;
  
  paymentMethod = signal<'credit_card' | 'wire_transfer'>('wire_transfer');
  paymentProof = signal<string | null>(null);
  paymentProofName = signal<string | null>(null);
  showSuccessMessage = signal(false);

  constructor() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('planId');
    if (planId) {
      this.plan.set(this.dataService.getPlanById(planId));
    }
  }

  ngOnDestroy() {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
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

  confirmSubscription() {
    if (!this.plan() || !this.currentUser()) {
      return;
    }
    
    const user = this.currentUser() as User;
    const plan = this.plan() as Plan;
    
    if (!user.address) {
      alert('يرجى إكمال عنوانك في ملفك الشخصي قبل الاشتراك.');
      // REQ-FUTURE: Redirect to a profile page.
      this.router.navigate(['/ar-home']);
      return;
    }

    this.subscriptionService.addSubscription({
      userId: user.email,
      user: user,
      planId: plan.id,
      planName: plan.arName || plan.name,
      planPrice: plan.pricePerMonth,
      startDate: new Date().toISOString().split('T')[0],
      deliveryAddress: user.address,
      paymentMethod: this.paymentMethod(),
      paymentProof: this.paymentProof() ?? undefined,
      autoRenewal: false,
      completedCycles: 0
    });

    this.showSuccessMessage.set(true);
  }
}

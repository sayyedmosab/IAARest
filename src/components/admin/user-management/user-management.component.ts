
import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../services/subscription.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  subscriptionService = inject(SubscriptionService);
  authService = inject(AuthService);
  
  pendingSubscriptions = computed(() => this.subscriptionService.subscriptions().filter(s => s.status === 'pending'));
  allUsers = signal<User[]>([]);

  ngOnInit(): void {
    this.authService.getAllUsers().subscribe(res => {
      if (res.success) {
        this.allUsers.set(res.data);
      }
    });
  }
  
  approve(id: number) {
    this.subscriptionService.approveSubscription(id).subscribe();
  }
  
  reject(id: number) {
    this.subscriptionService.rejectSubscription(id).subscribe();
  }
}

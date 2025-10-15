
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, SubscriptionStatus, SubscriptionStateTransitionRequest, SubscriptionStateHistory } from '../models/subscription.model';
import { tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

export interface DaySchedule {
  lunch: number | null;
  dinner: number | null;
}

export interface MenuSchedule {
  [dateKey: string]: DaySchedule;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface DashboardData {
  customerPipeline: {
    new: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    active: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    exiting: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    pendingApproval: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    newJoiner: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    curious: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    frozen: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
    cancelled: {
      count: number;
      revenue: number;
      byPlan: Array<{
        planId: string;
        planCode: string;
        planName: string;
        count: number;
        revenue: number;
      }>;
    };
  };
  calendar: Array<{
    date: string;
    dayName: string;
    dayNumber: number;
    lunchCount: number;
    dinnerCount: number;
    totalMeals: number;
  }>;
}

import { API_BASE_URL } from '../constants/api';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = API_BASE_URL;

  private _subscriptions = signal<Subscription[]>([]);
  private _dashboardData = signal<DashboardData | null>(null);
  private _menuSchedule = signal<MenuSchedule>(this.generateInitialMenu());

  subscriptions = this._subscriptions.asReadonly();
  dashboardData = this._dashboardData.asReadonly();
  menuSchedule = this._menuSchedule.asReadonly();

  constructor() {
    this.loadSubscriptions();
    this.loadDashboardData();
  }

  private loadSubscriptions() {
    this.http.get<ApiResponse<Subscription[]>>(`${this.apiUrl}/admin/subscriptions`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
    }).subscribe(res => {
      if (res.success) {
        this._subscriptions.set(res.data);
      }
    });
  }

  private loadDashboardData() {
    this.http.get<ApiResponse<DashboardData>>(`${this.apiUrl}/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
    }).subscribe(res => {
      if (res.success) {
        this._dashboardData.set(res.data);
      }
    });
  }

  private getAuthToken(): string {
    // For now, return a dummy token since the backend doesn't fully implement JWT yet
    // In a real implementation, this would return the stored JWT token
    return 'dummy-admin-token';
  }

  // Enhanced subscription state management methods
  transitionSubscriptionState(subscriptionId: string, request: SubscriptionStateTransitionRequest): Observable<ApiResponse<Subscription>> {
    return this.http.put<ApiResponse<Subscription>>(`${this.apiUrl}/admin/subscriptions/${subscriptionId}/state`, request).pipe(
      tap(() => {
        this.loadSubscriptions();
        this.loadDashboardData();
      })
    );
  }

  approveSubscription(subscriptionId: string): Observable<ApiResponse<Subscription>> {
    return this.transitionSubscriptionState(subscriptionId, {
      newState: 'Active',
      reason: 'Approved by admin'
    });
  }

  rejectSubscription(subscriptionId: string): Observable<ApiResponse<Subscription>> {
    return this.transitionSubscriptionState(subscriptionId, {
      newState: 'cancelled',
      reason: 'Rejected by admin'
    });
  }

  freezeSubscription(subscriptionId: string, reason?: string): Observable<ApiResponse<Subscription>> {
    return this.transitionSubscriptionState(subscriptionId, {
      newState: 'Frozen',
      reason: reason || 'Account frozen by admin'
    });
  }

  unfreezeSubscription(subscriptionId: string, reason?: string): Observable<ApiResponse<Subscription>> {
    return this.transitionSubscriptionState(subscriptionId, {
      newState: 'Active',
      reason: reason || 'Account reactivated by admin'
    });
  }

  cancelSubscription(subscriptionId: string, reason?: string): Observable<ApiResponse<Subscription>> {
    return this.transitionSubscriptionState(subscriptionId, {
      newState: 'Exiting',
      reason: reason || 'Cancellation requested by admin'
    });
  }

  getSubscriptionStateHistory(subscriptionId: string): Observable<ApiResponse<SubscriptionStateHistory[]>> {
    return this.http.get<ApiResponse<SubscriptionStateHistory[]>>(`${this.apiUrl}/admin/subscriptions/${subscriptionId}/history`);
  }

  bulkTransitionSubscriptionStates(subscriptionIds: string[], request: SubscriptionStateTransitionRequest): Observable<ApiResponse<Subscription[]>> {
    return this.http.put<ApiResponse<Subscription[]>>(`${this.apiUrl}/admin/subscriptions/bulk-state`, {
      subscriptionIds,
      ...request
    }).pipe(
      tap(() => {
        this.loadSubscriptions();
        this.loadDashboardData();
      })
    );
  }

  // Public method to get subscriptions
  getSubscriptions(): Observable<ApiResponse<Subscription[]>> {
    return this.http.get<ApiResponse<Subscription[]>>(`${this.apiUrl}/admin/subscriptions`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
    });
  }

  // Legacy methods for backward compatibility
  private updateSubscriptionStatus(id: number, status: 'active' | 'rejected') {
    return this.http.put<ApiResponse<Subscription>>(`${this.apiUrl}/subscriptions/${id}/status`, { status }).pipe(
      tap(() => {
        this.loadSubscriptions();
        this.loadDashboardData(); // Refresh dashboard data after status change
      })
    );
  }

  approveSubscriptionLegacy(id: number) {
    return this.updateSubscriptionStatus(id, 'active');
  }

  rejectSubscriptionLegacy(id: number) {
    return this.updateSubscriptionStatus(id, 'rejected');
  }

  // --- Mocked/Placeholder Methods ---

  generateDateRange(days: number): Date[] {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private generateInitialMenu(): MenuSchedule {
    const schedule: MenuSchedule = {};
    const dates = this.generateDateRange(30);
    dates.forEach(date => {
      const dateKey = this.formatDateKey(date);
      const day = date.getDate();
      schedule[dateKey] = {
        lunch: (day % 4) + 1,
        dinner: ((day + 1) % 4) + 1
      };
    });
    return schedule;
  }

  updateMenu(dateKey: string, mealType: 'lunch' | 'dinner', mealId: number | null) {
    this._menuSchedule.update(schedule => {
      const newSchedule = { ...schedule };
      if (!newSchedule[dateKey]) {
        newSchedule[dateKey] = { lunch: null, dinner: null };
      }
      newSchedule[dateKey][mealType] = mealId;
      return newSchedule;
    });
  }

  addSubscription(subscription: Omit<Subscription, 'id' | 'status' | 'endDate'>): Observable<ApiResponse<Subscription>> {
    return this.http.post<ApiResponse<Subscription>>(`${this.apiUrl}/admin/subscriptions`, subscription).pipe(
      tap(() => {
        this.loadSubscriptions();
        this.loadDashboardData();
      })
    );
  }

  updateSubscription(id: string, subscription: Partial<Subscription>): Observable<ApiResponse<Subscription>> {
    return this.http.put<ApiResponse<Subscription>>(`${this.apiUrl}/admin/subscriptions/${id}`, subscription).pipe(
      tap(() => {
        this.loadSubscriptions();
        this.loadDashboardData();
      })
    );
  }
}

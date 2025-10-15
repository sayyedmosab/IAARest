import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService, DashboardData } from '../../../services/subscription.service';

interface CalendarDay {
  date: string;
  dayName: string;
  dayNumber: number;
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
  isCurrentMonth?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  subscriptionService = inject(SubscriptionService);

  // Data from Service
  dashboardData = computed(() => this.subscriptionService.dashboardData());

  // Calendar Data (now full month from backend)
  calendarData = computed(() => {
    const data = this.dashboardData()?.calendar || [];
    console.log('[FRONTEND DEBUG] Calendar data received:', data.length, 'days');
    const today = new Date().toISOString().split('T')[0];
    const todayData = data.find(day => day.date === today);
    if (todayData) {
      console.log('[FRONTEND DEBUG] Today data:', todayData);
      console.log('[FRONTEND DEBUG] Today lunchCount:', todayData.lunchCount);
      console.log('[FRONTEND DEBUG] Today dinnerCount:', todayData.dinnerCount);
      console.log('[FRONTEND DEBUG] Today totalMeals:', todayData.totalMeals);
      console.log('[FRONTEND DEBUG] Calculated total:', todayData.lunchCount + todayData.dinnerCount);
      
      // Check if totalMeals matches lunchCount + dinnerCount
      if (todayData.totalMeals !== todayData.lunchCount + todayData.dinnerCount) {
        console.error('[FRONTEND DEBUG] MATH ERROR: totalMeals != lunchCount + dinnerCount');
      }
    }
    return data;
  });

  // Selected day for daily summary
  selectedDay = signal<CalendarDay | null>(null);

  // Current month/year for display
  currentMonth = signal(new Date());

  // Helper computed properties
  todayData = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.calendarData().find(day => day.date === today);
  });

  selectedDayData = computed(() => {
    return this.selectedDay() || this.todayData();
  });

  monthTotal = computed(() => {
    return this.calendarData().reduce((total, day) => total + day.totalMeals, 0);
  });

  monthAverage = computed(() => {
    const days = this.calendarData().length;
    return days > 0 ? Math.round(this.monthTotal() / days) : 0;
  });

  // Get calendar weeks for proper month layout
  calendarWeeks = computed(() => {
    const days = this.calendarData();
    const weeks: CalendarDay[][] = [];
    
    // Group days into weeks (7 days each)
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return weeks;
  });

  subscribersByPlan = computed(() => {
    // Transform new data structure to old format for any remaining dependencies
    const activeByPlan = this.dashboardData()?.customerPipeline?.active?.byPlan || [];
    return activeByPlan.map(plan => ({
      name: plan.planName,
      count: plan.count
    }));
  });

  totalSubscribers = computed(() => {
    // Sum all active states (Active + Curious for business metrics)
    const activeCount = this.dashboardData()?.customerPipeline?.active?.count || 0;
    const curiousCount = this.dashboardData()?.customerPipeline?.curious?.count || 0;
    return activeCount + curiousCount;
  });

  // New business metrics according to requirements
  newSubscribers = computed(() => {
    // New subscribers should show New_Joiners (not Pending_Approval)
    return this.dashboardData()?.customerPipeline?.newJoiner?.count || 0;
  });

  activeSubscribers = computed(() => {
    // Active subscribers should show Active + Curious
    const activeCount = this.dashboardData()?.customerPipeline?.active?.count || 0;
    const curiousCount = this.dashboardData()?.customerPipeline?.curious?.count || 0;
    return activeCount + curiousCount;
  });

  exitingSubscribers = computed(() => {
    // Exiting should show Exiting (not Cancelled)
    return this.dashboardData()?.customerPipeline?.exiting?.count || 0;
  });

  // For meal calculation, we still need Active + Frozen
  totalMealSubscribers = computed(() => {
    const activeCount = this.dashboardData()?.customerPipeline?.active?.count || 0;
    const frozenCount = this.dashboardData()?.customerPipeline?.frozen?.count || 0;
    return activeCount + frozenCount;
  });

  // New computed properties for enhanced dashboard
  totalPendingApproval = computed(() => {
    return this.dashboardData()?.customerPipeline?.pendingApproval?.count || 0;
  });

  totalNewJoiners = computed(() => {
    return this.dashboardData()?.customerPipeline?.newJoiner?.count || 0;
  });

  totalCurious = computed(() => {
    return this.dashboardData()?.customerPipeline?.curious?.count || 0;
  });

  totalFrozen = computed(() => {
    return this.dashboardData()?.customerPipeline?.frozen?.count || 0;
  });

  totalExiting = computed(() => {
    return this.dashboardData()?.customerPipeline?.exiting?.count || 0;
  });

  totalCancelled = computed(() => {
    return this.dashboardData()?.customerPipeline?.cancelled?.count || 0;
  });

  // Total revenue across all states
  totalRevenue = computed(() => {
    const pipeline = this.dashboardData()?.customerPipeline;
    if (!pipeline) return 0;
    
    return Object.values(pipeline).reduce((total: number, state: any) => {
      return total + (state?.revenue || 0);
    }, 0);
  });

  // Active revenue (Active + Frozen)
  activeRevenue = computed(() => {
    const activeRev = this.dashboardData()?.customerPipeline?.active?.revenue || 0;
    const frozenRev = this.dashboardData()?.customerPipeline?.frozen?.revenue || 0;
    return activeRev + frozenRev;
  });

  // Interactive methods
  onDayClick(day: CalendarDay): void {
    this.selectedDay.set(day);
  }

  onTodayClick(): void {
    this.selectedDay.set(null);
  }

  isSelectedDay(day: CalendarDay): boolean {
    const selected = this.selectedDay();
    if (!selected) {
      // If no day is selected, today is considered selected
      const today = new Date().toISOString().split('T')[0];
      return day.date === today;
    }
    return day.date === selected.date;
  }

  isToday(day: CalendarDay): boolean {
    const today = new Date().toISOString().split('T')[0];
    return day.date === today;
  }

  getMonthName(): string {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // State transition methods for quick actions
  onApproveSubscription(subscriptionId: string): void {
    this.subscriptionService.approveSubscription(subscriptionId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Subscription approved successfully');
          // Data will be automatically refreshed via the service
        }
      },
      error: (error) => {
        console.error('Error approving subscription:', error);
      }
    });
  }

  onRejectSubscription(subscriptionId: string): void {
    this.subscriptionService.rejectSubscription(subscriptionId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Subscription rejected successfully');
          // Data will be automatically refreshed via the service
        }
      },
      error: (error) => {
        console.error('Error rejecting subscription:', error);
      }
    });
  }

  onFreezeSubscription(subscriptionId: string): void {
    this.subscriptionService.freezeSubscription(subscriptionId, 'Frozen by admin from dashboard').subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Subscription frozen successfully');
          // Data will be automatically refreshed via the service
        }
      },
      error: (error) => {
        console.error('Error freezing subscription:', error);
      }
    });
  }

  onUnfreezeSubscription(subscriptionId: string): void {
    this.subscriptionService.unfreezeSubscription(subscriptionId, 'Reactivated by admin from dashboard').subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Subscription unfrozen successfully');
          // Data will be automatically refreshed via the service
        }
      },
      error: (error) => {
        console.error('Error unfreezing subscription:', error);
      }
    });
  }

  onCancelSubscription(subscriptionId: string): void {
    this.subscriptionService.cancelSubscription(subscriptionId, 'Cancelled by admin from dashboard').subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Subscription cancelled successfully');
          // Data will be automatically refreshed via the service
        }
      },
      error: (error) => {
        console.error('Error cancelling subscription:', error);
      }
    });
  }

  // Get state description for tooltips
  getStateDescription(state: string): string {
    const descriptions: { [key: string]: string } = {
      'Pending_Approval': 'Signed up not through credit card (requires manual approval)',
      'Curious': 'Subscribed for one cycle and asked from start not to auto-renew (trying us out)',
      'New_Joiner': 'Asked to auto-renew and after two cycles of successful payment becomes Active',
      'Frozen': 'Asked to put account on hold (no delivery or payments until reactivating)',
      'Exiting': 'Submitted cancellation and service rendered till the paid cycle ends',
      'Cancelled': 'No liabilities and no activity',
      'Active': 'Fully active subscriber with regular deliveries and payments'
    };
    return descriptions[state] || 'Unknown state';
  }

  // Get state color for styling
  getStateColor(state: string): string {
    const colors: { [key: string]: string } = {
      'Pending_Approval': 'yellow',
      'Curious': 'purple',
      'New_Joiner': 'blue',
      'Frozen': 'cyan',
      'Exiting': 'orange',
      'Cancelled': 'red',
      'Active': 'green'
    };
    return colors[state] || 'gray';
  }
}

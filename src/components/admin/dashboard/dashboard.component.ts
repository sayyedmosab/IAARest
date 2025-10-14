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
    return this.dashboardData()?.customerPipeline?.active?.count || 0;
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
}

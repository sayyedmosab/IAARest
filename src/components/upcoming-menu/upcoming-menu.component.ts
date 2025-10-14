
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../services/subscription.service';
import { DataService } from '../../services/data.service';
import { Meal } from '../../models/meal.model';
import { ImagePathPipe } from '../../pipes/image-path.pipe';

@Component({
  selector: 'app-upcoming-menu',
  standalone: true,
  imports: [CommonModule, ImagePathPipe],
  templateUrl: './upcoming-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingMenuComponent {
  subscriptionService = inject(SubscriptionService);
  dataService = inject(DataService);

  dates = this.subscriptionService.generateDateRange(14);
  schedule = this.subscriptionService.menuSchedule;

  getMeal(mealId: number | null): Meal | undefined {
    if (mealId === null) return undefined;
    return this.dataService.getMealById(String(mealId));
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

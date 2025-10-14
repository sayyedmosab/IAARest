
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagePathPipe } from '../../pipes/image-path.pipe';
import { SubscriptionService } from '../../services/subscription.service';
import { DataService } from '../../services/data.service';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-ar-menu',
  standalone: true,
  imports: [CommonModule, ImagePathPipe],
  templateUrl: './ar-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArMenuComponent {
  subscriptionService = inject(SubscriptionService);
  dataService = inject(DataService);

  dates = this.subscriptionService.generateDateRange(14);
  schedule = this.subscriptionService.menuSchedule;

  constructor() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  ngOnDestroy() {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }

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

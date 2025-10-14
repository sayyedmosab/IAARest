
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../services/subscription.service';
import { DataService } from '../../../services/data.service';
import { Meal } from '../../../models/meal.model';

@Component({
  selector: 'app-menu-scheduler',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-scheduler.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuSchedulerComponent {
  subscriptionService = inject(SubscriptionService);
  dataService = inject(DataService);

  dates = this.subscriptionService.generateDateRange(14);
  schedule = this.subscriptionService.menuSchedule;
  allMeals = this.dataService.meals();

  onMenuChange(event: Event, date: Date, mealType: 'lunch' | 'dinner') {
    const selectElement = event.target as HTMLSelectElement;
    const mealId = selectElement.value ? Number(selectElement.value) : null;
    const dateKey = date.toISOString().split('T')[0];
    this.subscriptionService.updateMenu(dateKey, mealType, mealId);
  }
}

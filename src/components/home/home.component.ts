
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';
import { ImagePathPipe } from '../../pipes/image-path.pipe';

type MealTab = 'description' | 'ingredients' | 'nutrition';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePathPipe],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  dataService = inject(DataService);
  plans = this.dataService.plans;
  meals = this.dataService.meals;
  
  activeTabs = signal(new Map<string, MealTab>());

  constructor() {
    // Initialize all meal tabs to 'description' by default
    const initialTabs = new Map<string, MealTab>();
    this.meals().forEach(meal => initialTabs.set(meal.id, 'description'));
    this.activeTabs.set(initialTabs);
  }

  setActiveTab(mealId: string, tab: MealTab) {
    this.activeTabs.update(tabs => new Map(tabs).set(mealId, tab));
  }

  getActiveTab(mealId: string): MealTab {
    return this.activeTabs().get(mealId) || 'description';
  }

  handleImageError(event: any) {
    // Fallback to a default image if the program-specific image fails to load
    event.target.src = '/images/LogoChef.png';
  }
}

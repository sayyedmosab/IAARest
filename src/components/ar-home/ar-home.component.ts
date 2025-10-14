
import { Component, ChangeDetectionStrategy, inject, signal, Renderer2, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagePathPipe } from '../../pipes/image-path.pipe';
import { RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';

type MealTab = 'description' | 'ingredients' | 'macros';

@Component({
  selector: 'app-ar-home',
  standalone: true,
    imports: [CommonModule, RouterModule, ImagePathPipe],
  templateUrl: './ar-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArHomeComponent implements OnInit, OnDestroy {
  dataService = inject(DataService);
  renderer = inject(Renderer2);
  // Map backend fields to expected frontend fields for plans (only use fields that exist)
  plans = computed(() => this.dataService.plans().map(plan => ({
    ...plan,
    arName: plan.arName || plan.name,
    name: plan.name,
    arDescription: plan.arDescription || plan.description,
    description: plan.description,
    pricePerMonth: plan.pricePerMonth,
    originalPricePerMonth: plan.originalPricePerMonth,
    arFeatures: plan.arFeatures || plan.features,
    features: plan.features
  })));
  ingredients = this.dataService.ingredients;

  // Meals with joined ingredient details and mapped fields for template (only use fields that exist)
  meals = computed(() => {
    const ingredients = this.ingredients();
    return this.dataService.meals().map(meal => ({
      ...meal,
      arName: meal.name_ar,
      name: meal.name_en,
      arDescription: meal.description_ar,
      description: meal.description_en,
      // Join ingredient details for template
      ingredients: meal.ingredients.map(mi => {
        const ing = ingredients.find(i => i.id === mi.ingredient_id);
        return ing ? {
          ...ing,
          quantity: mi.weight_g,
          unit: ing.unit_base,
          name: ing.name_en,
          arName: ing.name_ar
        } : {
          name: '???',
          arName: '???',
          quantity: mi.weight_g,
          unit: '',
        };
      })
    }));
  });
  
  activeTabs = signal(new Map<string, MealTab>());

  constructor() {
  const initialTabs = new Map<string, MealTab>();
  this.meals().forEach(meal => initialTabs.set(meal.id, 'description'));
  this.activeTabs.set(initialTabs);
  }

  ngOnInit() {
    this.renderer.setAttribute(document.documentElement, 'lang', 'ar');
    this.renderer.setAttribute(document.documentElement, 'dir', 'rtl');
  }

  ngOnDestroy() {
    this.renderer.removeAttribute(document.documentElement, 'lang');
    this.renderer.removeAttribute(document.documentElement, 'dir');
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
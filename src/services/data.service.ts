
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Meal } from '../models/meal.model';
// Ingredient type for frontend
export interface Ingredient {
  id: string;
  name_en: string;
  name_ar: string;
  unit_base: 'g' | 'ml' | 'pcs';
}
import { Plan } from '../models/plan.model';
import { tap } from 'rxjs/operators';

// Define a generic response structure based on the backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

import { API_BASE_URL } from '../constants/api';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;


  private _meals = signal<Meal[]>([]);
  private _plans = signal<Plan[]>([]);
  private _ingredients = signal<Ingredient[]>([]);

  meals = this._meals.asReadonly();
  plans = this._plans.asReadonly();
  ingredients = this._ingredients.asReadonly();

  constructor() {
    this.loadMeals();
    this.loadPlans();
    this.loadIngredients();
  }
  private loadIngredients() {
    console.log('[DEBUG] Loading ingredients from:', `${this.apiUrl}/ingredients`);
    this.http.get<ApiResponse<Ingredient[]>>(`${this.apiUrl}/ingredients`).subscribe({
      next: res => {
        console.log('[DEBUG] Ingredients API response:', res);
        if (res.success) {
          console.log('[DEBUG] Setting ingredients:', res.data?.length || 0, 'items');
          this._ingredients.set(res.data);
        } else {
          console.error('[DEBUG] Ingredients API error:', res);
        }
      },
      error: err => {
        console.error('[DEBUG] Ingredients HTTP error:', err);
      }
    });
  }

  private loadMeals() {
    console.log('[DEBUG] Loading meals from:', `${this.apiUrl}/meals`);
    this.http.get<ApiResponse<Meal[]>>(`${this.apiUrl}/meals`).subscribe({
      next: res => {
        console.log('[DEBUG] Meals API response:', res);
        if (res.success) {
          console.log('[DEBUG] Setting meals:', res.data?.length || 0, 'items');
          this._meals.set(res.data);
        } else {
          console.error('[DEBUG] Meals API error:', res);
        }
      },
      error: err => {
        console.error('[DEBUG] Meals HTTP error:', err);
      }
    });
  }

  private loadPlans() {
    console.log('[DEBUG] Loading plans from:', `${this.apiUrl}/plans`);
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/plans`).subscribe({
      next: res => {
        console.log('[DEBUG] Plans API response:', res);
        if (res.success) {
          console.log('[DEBUG] Setting plans:', res.data?.length || 0, 'items');
          // Map API response to frontend model with backward compatibility
          const mappedPlans = res.data.map(plan => ({
            ...plan,
            name: plan.name_en,
            arName: plan.name_ar,
            pricePerMonth: plan.discounted_price_aed || plan.base_price_aed,
            originalPricePerMonth: plan.discounted_price_aed ? plan.base_price_aed : undefined,
            description: plan.position_note_en,
            arDescription: plan.position_note_ar,
            features: [], // API doesn't provide features, initialize as empty array
            arFeatures: [] // API doesn't provide arFeatures, initialize as empty array
          }));
          this._plans.set(mappedPlans);
        } else {
          console.error('[DEBUG] Plans API error:', res);
        }
      },
      error: err => {
        console.error('[DEBUG] Plans HTTP error:', err);
      }
    });
  }

  getPlanById(id: string) {
    return this.plans().find(p => p.id === id);
  }

  getMealById(id: string) {
    return this.meals().find(m => m.id === id);
  }

  // --- Meal CRUD ---
  addMeal(meal: Omit<Meal, 'id'>) {
    return this.http.post<ApiResponse<Meal>>(`${this.apiUrl}/meals`, meal).pipe(
      tap(() => this.loadMeals())
    );
  }

  updateMeal(updatedMeal: Meal) {
    return this.http.put<ApiResponse<Meal>>(`${this.apiUrl}/meals/${updatedMeal.id}`, updatedMeal).pipe(
      tap(() => this.loadMeals())
    );
  }

  deleteMeal(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/meals/${id}`).pipe(
      tap(() => this.loadMeals())
    );
  }

  // --- Plan CRUD ---
  addPlan(plan: Omit<Plan, 'id'>) {
    return this.http.post<ApiResponse<Plan>>(`${this.apiUrl}/plans`, plan).pipe(
      tap(() => this.loadPlans())
    );
  }

  updatePlan(updatedPlan: Plan) {
    return this.http.put<ApiResponse<Plan>>(`${this.apiUrl}/plans/${updatedPlan.id}`, updatedPlan).pipe(
      tap(() => this.loadPlans())
    );
  }

  deletePlan(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/plans/${id}`).pipe(
      tap(() => this.loadPlans())
    );
  }
}

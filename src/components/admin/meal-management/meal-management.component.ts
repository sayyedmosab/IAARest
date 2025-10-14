
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagePathPipe } from '../../../pipes/image-path.pipe';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { Meal } from '../../../models/meal.model';

@Component({
  selector: 'app-meal-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImagePathPipe],
  templateUrl: './meal-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MealManagementComponent {
  dataService = inject(DataService);
  fb: FormBuilder = inject(FormBuilder);

  meals = this.dataService.meals;
  isModalOpen = signal(false);
  editingMeal = signal<Meal | null>(null);

  mealForm: FormGroup;

  constructor() {
    this.mealForm = this.fb.group({
      id: [null],
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      description_en: ['', Validators.required],
      description_ar: ['', Validators.required],
      image_filename: ['/images/placeholder.png', Validators.required],
      nutritional_facts_en: [''],
      nutritional_facts_ar: [''],
      ingredients_en: [''],
      ingredients_ar: [''],
      is_active: [true]
    });
  }
  
  



  openModal(meal: Meal | null) {
    this.editingMeal.set(meal);
    this.isModalOpen.set(true);
    
  this.mealForm.reset({
    image_filename: '/images/placeholder.png',
    is_active: true
  });
    
    if (meal) {
      this.mealForm.patchValue(meal);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSubmit() {
    if (this.mealForm.invalid) return;

    if (this.editingMeal()) {
      this.dataService.updateMeal(this.mealForm.value).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.dataService.addMeal(this.mealForm.value).subscribe(() => {
        this.closeModal();
      });
    }
  }
  
  deleteMeal(id: string) {
    if (confirm('Are you sure you want to delete this meal?')) {
      this.dataService.deleteMeal(id).subscribe();
    }
  }
}

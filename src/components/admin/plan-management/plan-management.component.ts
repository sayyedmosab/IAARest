
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { Plan } from '../../../models/plan.model';

@Component({
  selector: 'app-plan-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanManagementComponent {
  dataService = inject(DataService);
  fb: FormBuilder = inject(FormBuilder);

  plans = this.dataService.plans;
  isModalOpen = signal(false);
  editingPlan = signal<Plan | null>(null);

  planForm: FormGroup;

  constructor() {
    this.planForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      description: ['', Validators.required],
      pricePerMonth: [0, [Validators.required, Validators.min(1)]],
      originalPricePerMonth: [null],
      mealsPerMonth: [1, [Validators.required, Validators.min(1)]],
      calories: ['', Validators.required],
      isPopular: [false],
      features: this.fb.array([]),
    });
  }
  
  get features(): FormArray {
    return this.planForm.get('features') as FormArray;
  }
  
  addFeature() {
    this.features.push(this.fb.control('', Validators.required));
  }
  
  removeFeature(index: number) {
    this.features.removeAt(index);
  }

  openModal(plan: Plan | null) {
    this.editingPlan.set(plan);
    this.isModalOpen.set(true);
    
    this.planForm.reset({ isPopular: false });
    this.features.clear();
    
    if (plan) {
      this.planForm.patchValue(plan);
      plan.features.forEach(feature => this.features.push(this.fb.control(feature)));
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSubmit() {
    if (this.planForm.invalid) return;

    if (this.editingPlan()) {
      this.dataService.updatePlan(this.planForm.value).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.dataService.addPlan(this.planForm.value).subscribe(() => {
        this.closeModal();
      });
    }
  }
  
  deletePlan(id: string) {
    if (confirm('Are you sure you want to delete this plan?')) {
      this.dataService.deletePlan(id).subscribe();
    }
  }
}

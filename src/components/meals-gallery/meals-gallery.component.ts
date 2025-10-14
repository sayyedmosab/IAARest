
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagePathPipe } from '../../pipes/image-path.pipe';
import { DataService } from '../../services/data.service';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-meals-gallery',
  standalone: true,
  imports: [CommonModule, ImagePathPipe],
  templateUrl: './meals-gallery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MealsGalleryComponent {
  dataService = inject(DataService);
  private allMeals = this.dataService.meals;
  
  // Ensure we always have a display `name` on the client (fallback to name_en/name_ar)
  mealsNormalized = computed(() => this.allMeals().map(meal => ({
    ...meal,
    name: (meal as any).name || (meal as any).name_en || (meal as any).name_ar || ''
  })));

  allTags = computed(() => {
    const tags = new Set<string>();
    this.mealsNormalized().forEach(meal => (meal.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags);
  });

  searchTerm = signal('');
  selectedTag = signal<string | null>(null);

  filteredMeals = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const tag = this.selectedTag();

    return this.mealsNormalized().filter(meal => {
      const nameMatch = (meal.name || '').toLowerCase().includes(term);
      const tagMatch = tag ? (meal.tags || []).includes(tag) : true;
      return nameMatch && tagMatch;
    });
  });

  updateSearchTerm(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  filterByTag(tag: string | null) {
    this.selectedTag.set(tag);
  }
}

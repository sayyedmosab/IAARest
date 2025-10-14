

export interface MealIngredient {
  meal_id: string;
  ingredient_id: string;
  weight_g: number;
  notes?: string;
}

export interface MealImage {
  id: string;
  meal_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Meal {
  id: string;
  name_en: string;
  name_ar: string;
  name: string; // For backward compatibility
  description_en?: string;
  description_ar?: string;
  image_filename?: string;
  imageUrl?: string;
  created_at: string;
  updated_at: string;
  nutritional_facts_en?: string;
  nutritional_facts_ar?: string;
  ingredients_en?: string;
  ingredients_ar?: string;
  is_active?: boolean;
  tags?: string[]; // For backward compatibility
  ingredients: MealIngredient[];
  meal_images: MealImage[];
}

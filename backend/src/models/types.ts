// Database model types for Ibnexp application

export interface Ingredient {
  id: string;
  name_en: string;
  name_ar: string;
  unit_base: string;
  per100g_calories: number;
  per100g_protein_g: number;
  per100g_carbs_g: number;
  per100g_fat_g: number;
  per100g_fiber_g: number;
  per100g_sodium_mg: number;
  source_type: 'local' | 'usda_fdc';
  source_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  meals_per_day: number; // 1 or 2 meals per delivery
  delivery_days: number; // 4 (half-week) or 6 (full-week)
  billing_cycle: 'weekly' | 'monthly'; // Billing frequency
  delivery_pattern: string; // JSON string describing which days of week (e.g., "1,2,3,4" for Mon-Thu)
  base_price_aed: number;
  position_note_en?: string;
  position_note_ar?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  discounted_price_aed?: number;
}

export interface Profile {
  user_id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  language_pref: 'en' | 'ar';
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  goal?: 'lose' | 'maintain' | 'gain';
  phone_e164: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  is_student: boolean;
  university_email?: string;
  student_id_expiry?: string;
  address?: string;
  district?: string;
}

export interface Meal {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  // image_filename is the canonical DB column (may include leading '/')
  image_filename?: string;
  created_at: string;
  updated_at: string;
  nutritional_facts_en?: string;
  nutritional_facts_ar?: string;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }; // Added for frontend
  ingredients_en?: string;
  ingredients_ar?: string;
  is_active: boolean;
}

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

// Add new subscription status type
export type SubscriptionStatus =
  | 'pending_payment'
  | 'Pending_Approval'
  | 'New_Joiner'
  | 'Curious'
  | 'Active'
  | 'Frozen'
  | 'Exiting'
  | 'cancelled'
  | 'expired';

export type PaymentMethod = 'credit_card' | 'wire_transfer' | 'other';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  student_discount_applied: boolean;
  price_charged_aed: number;
  currency: string;
  created_at: string;
  updated_at: string;
  renewal_type: string;
  has_successful_payment: boolean;
  // New fields
  payment_method: PaymentMethod;
  auto_renewal: boolean;
  completed_cycles: number;
  notes?: string;
}

// Add new interface for state history
export interface SubscriptionStateHistory {
  id: string;
  subscription_id: string;
  previous_state?: SubscriptionStatus;
  new_state: SubscriptionStatus;
  reason?: string;
  changed_by?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string;
  method: 'card' | 'apple_pay' | 'google_pay' | 'other';
  amount_aed: number;
  currency: string;
  status: 'requires_action' | 'succeeded' | 'failed' | 'refunded';
  provider?: string;
  provider_txn_id?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  plan_id?: string;
  is_student_only: boolean;
  discount_type: 'percent' | 'flat';
  value: number;
  starts_at?: string;
  ends_at?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCycle {
  id: string;
  name: string;
  cycle_length_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCycleDay {
  id: string;
  cycle_id: string;
  day_index: number;
  label?: string;
}

export interface MenuDayAssignment {
  id: string;
  cycle_day_id: string;
  meal_id: string;
  slot: 'lunch' | 'dinner';
  plan_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  subscription_id: string;
  delivery_date: string;
  meals_count: number;
  status: 'scheduled' | 'delivered' | 'failed' | 'skipped';
  address_snapshot: string; // JSON string
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// DTOs for API requests
export interface CreateMealDto {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  image_filename?: string;
  nutritional_facts_en?: string;
  nutritional_facts_ar?: string;
  ingredients_en?: string;
  ingredients_ar?: string;
  is_active?: boolean;
}

export interface UpdateMealDto extends Partial<CreateMealDto> {}

export interface CreatePlanDto {
  code: string;
  name_en: string;
  name_ar: string;
  meals_per_day: number; // 1 or 2 meals per delivery
  delivery_days: number; // 4 (half-week) or 6 (full-week)
  billing_cycle: 'weekly' | 'monthly'; // Billing frequency
  delivery_pattern?: string; // JSON string describing delivery days (optional, will be generated)
  base_price_aed: number;
  position_note_en?: string;
  position_note_ar?: string;
  status?: 'active' | 'archived';
  discounted_price_aed?: number;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

export interface CreateSubscriptionDto {
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  student_discount_applied?: boolean;
  price_charged_aed: number;
  payment_method?: PaymentMethod;
  auto_renewal?: boolean;
  notes?: string;
}

export interface UpdateSubscriptionDto extends Partial<CreateSubscriptionDto> {
  status?: SubscriptionStatus;
}

export interface SubscriptionStateTransitionDto {
  new_state: SubscriptionStatus;
  reason?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_e164: string;
  language_pref?: 'en' | 'ar';
  address?: string;
  district?: string;
  is_student?: boolean;
  university_email?: string;
  student_id_expiry?: string;
}

// Enums for type safety
export type ContentStatus = 'active' | 'archived';
// Note: SubscriptionStatus and PaymentMethod are now defined above
export type PaymentStatus = 'requires_action' | 'succeeded' | 'failed' | 'refunded';
export type DeliveryStatus = 'scheduled' | 'delivered' | 'failed' | 'skipped';
export type MealSlot = 'lunch' | 'dinner';
export type DiscountType = 'percent' | 'flat';
export type DataSource = 'local' | 'usda_fdc';
export type Language = 'en' | 'ar';
export type UserGoal = 'lose' | 'maintain' | 'gain';
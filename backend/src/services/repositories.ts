import { BaseRepository } from './base-repository.js';
import {
  Ingredient,
  Plan,
  Profile,
  Meal,
  Subscription,
  Payment,
  MealIngredient,
  MealImage,
  Discount,
  MenuCycle,
  MenuCycleDay,
  MenuDayAssignment,
  Delivery
} from '../models/types.js';

export class IngredientRepository extends BaseRepository<Ingredient> {
  constructor() {
    super('ingredients');
  }

  findBySource(sourceType: string, sourceRef?: string): Ingredient[] {
    let sql = 'SELECT * FROM ingredients WHERE source_type = ?';
    const params: any[] = [sourceType];

    if (sourceRef) {
      sql += ' AND source_ref = ?';
      params.push(sourceRef);
    }

    return this.query(sql, params);
  }
}

export class PlanRepository extends BaseRepository<Plan> {
  constructor() {
    super('plans');
  }

  findActive(): Plan[] {
    return this.findAll('status = ?', ['active']);
  }

  findByCode(code: string): Plan | null {
    return this.queryOne('SELECT * FROM plans WHERE code = ?', [code]);
  }
}

export class ProfileRepository extends BaseRepository<Profile> {
  constructor() {
    super('profiles');
  }

  // Custom create method for profiles table (uses user_id instead of id)
  create(data: Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>): Profile {
    // Get the next sequential user ID
    const lastUserResult = this.queryOne('SELECT user_id FROM profiles ORDER BY user_id DESC LIMIT 1');
    let nextNumber = 1;
    
    if (lastUserResult && lastUserResult.user_id) {
      // Extract number from user-XXX format
      const match = lastUserResult.user_id.match(/user-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    const user_id = `user-${nextNumber.toString().padStart(3, '0')}`; // user-001, user-002, etc.
    const now = new Date().toISOString();

    // Convert boolean values to integers for SQLite
    const profileData = {
      ...data,
      is_admin: data.is_admin ? 1 : 0,
      is_student: data.is_student ? 1 : 0
    };

    const sql = `
      INSERT INTO profiles (
        user_id, email, password, first_name, last_name, phone_e164, 
        language_pref, is_admin, is_student, address, district, 
        university_email, student_id_expiry, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      user_id,
      profileData.email,
      profileData.password,
      profileData.first_name,
      profileData.last_name,
      profileData.phone_e164,
      profileData.language_pref,
      profileData.is_admin,
      profileData.is_student,
      profileData.address,
      profileData.district,
      profileData.university_email,
      profileData.student_id_expiry,
      now,
      now
    ]);

    // Return the created record
    return this.queryOne('SELECT * FROM profiles WHERE user_id = ?', [user_id]) as Profile;
  }

  findByEmail(email: string): Profile | null {
    return this.queryOne('SELECT * FROM profiles WHERE email = ?', [email]);
  }

  findByUserId(userId: string): Profile | null {
    return this.queryOne('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  }

  findAdmins(): Profile[] {
    return this.findAll('is_admin = ?', [1]);
  }

  findStudents(): Profile[] {
    return this.findAll('is_student = ?', [1]);
  }
}

export class MealRepository extends BaseRepository<Meal> {
  constructor() {
    super('meals');
  }

  findActive(): Meal[] {
    return this.findAll('is_active = ?', [1]);
  }

  findByName(name: string): Meal[] {
    const sql = 'SELECT * FROM meals WHERE name_en LIKE ? OR name_ar LIKE ?';
    return this.query(sql, [`%${name}%`, `%${name}%`]);
  }
}

export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor() {
    super('subscriptions');
  }

  findByUser(userId: string): Subscription[] {
    return this.findAll('user_id = ?', [userId]);
  }

  findByStatus(status: string): Subscription[] {
    return this.findAll('status = ?', [status]);
  }

  findActiveByUser(userId: string): Subscription[] {
    return this.findAll('user_id = ? AND status = ?', [userId, 'active']);
  }

  findUpcomingDeliveries(): Delivery[] {
    const sql = `
      SELECT d.* FROM deliveries d
      JOIN subscriptions s ON d.subscription_id = s.id
      WHERE d.delivery_date >= date('now')
      AND s.status = 'active'
      ORDER BY d.delivery_date
    `;
    return this.query(sql);
  }
}

export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super('payments');
  }

  findBySubscription(subscriptionId: string): Payment[] {
    return this.findAll('subscription_id = ?', [subscriptionId]);
  }

  findSuccessfulBySubscription(subscriptionId: string): Payment[] {
    return this.findAll('subscription_id = ? AND status = ?', [subscriptionId, 'succeeded']);
  }
}

export class MealIngredientRepository extends BaseRepository<MealIngredient> {
  constructor() {
    super('meal_ingredients');
  }

  findByMeal(mealId: string): MealIngredient[] {
    return this.findAll('meal_id = ?', [mealId]);
  }

  findByIngredient(ingredientId: string): MealIngredient[] {
    return this.findAll('ingredient_id = ?', [ingredientId]);
  }

  create(mealIngredient: Omit<MealIngredient, 'id'>): MealIngredient {
    const sql = `
      INSERT INTO meal_ingredients (meal_id, ingredient_id, weight_g, notes)
      VALUES (?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      mealIngredient.meal_id,
      mealIngredient.ingredient_id,
      mealIngredient.weight_g,
      mealIngredient.notes
    ]);

    return this.findByMeal(mealIngredient.meal_id).find(
      mi => mi.ingredient_id === mealIngredient.ingredient_id
    ) as MealIngredient;
  }

  deleteByMealAndIngredient(mealId: string, ingredientId: string): boolean {
    const sql = 'DELETE FROM meal_ingredients WHERE meal_id = ? AND ingredient_id = ?';
    const result = this.db.execute(sql, [mealId, ingredientId]);
    return result.changes > 0;
  }
}

export class MealImageRepository extends BaseRepository<MealImage> {
  constructor() {
    super('meal_images');
  }

  findByMeal(mealId: string): MealImage[] {
    return this.findAll('meal_id = ?', [mealId]);
  }

  findByMealOrdered(mealId: string): MealImage[] {
    return this.query('SELECT * FROM meal_images WHERE meal_id = ? ORDER BY sort_order', [mealId]);
  }
}

export class DiscountRepository extends BaseRepository<Discount> {
  constructor() {
    super('discounts');
  }

  findActive(): Discount[] {
    return this.findAll('active = ? AND (starts_at IS NULL OR starts_at <= datetime("now")) AND (ends_at IS NULL OR ends_at >= datetime("now"))', [1]);
  }

  findByPlan(planId: string): Discount[] {
    return this.findAll('plan_id = ? AND active = ?', [planId, 1]);
  }

  findStudentDiscounts(): Discount[] {
    return this.findAll('is_student_only = ? AND active = ?', [1, 1]);
  }
}

export class MenuCycleRepository extends BaseRepository<MenuCycle> {
  constructor() {
    super('menu_cycles');
  }

  findActive(): MenuCycle[] {
    return this.findAll('is_active = ?', [1]);
  }
}

export class MenuCycleDayRepository extends BaseRepository<MenuCycleDay> {
  constructor() {
    super('menu_cycle_days');
  }

  findByCycle(cycleId: string): MenuCycleDay[] {
    return this.findAll('cycle_id = ?', [cycleId]);
  }

  findByCycleOrdered(cycleId: string): MenuCycleDay[] {
    return this.query('SELECT * FROM menu_cycle_days WHERE cycle_id = ? ORDER BY day_index', [cycleId]);
  }
}

export class MenuDayAssignmentRepository extends BaseRepository<MenuDayAssignment> {
  constructor() {
    super('menu_day_assignments');
  }

  findByCycleDay(cycleDayId: string): MenuDayAssignment[] {
    return this.findAll('cycle_day_id = ?', [cycleDayId]);
  }

  findByMeal(mealId: string): MenuDayAssignment[] {
    return this.findAll('meal_id = ?', [mealId]);
  }

  findByPlan(planId: string): MenuDayAssignment[] {
    return this.findAll('plan_id = ?', [planId]);
  }
}

export class DeliveryRepository extends BaseRepository<Delivery> {
  constructor() {
    super('deliveries');
  }

  findBySubscription(subscriptionId: string): Delivery[] {
    return this.findAll('subscription_id = ?', [subscriptionId]);
  }

  findByDate(date: string): Delivery[] {
    return this.findAll('delivery_date = ?', [date]);
  }

  findUpcomingDeliveries(limit: number = 10): Delivery[] {
    const sql = `
      SELECT d.* FROM deliveries d
      JOIN subscriptions s ON d.subscription_id = s.id
      WHERE d.delivery_date >= date('now')
      AND s.status = 'active'
      ORDER BY d.delivery_date
      LIMIT ?
    `;
    return this.query(sql, [limit]);
  }
}

// Export repository instances
export const ingredientRepo = new IngredientRepository();
export const planRepo = new PlanRepository();
export const profileRepo = new ProfileRepository();
export const mealRepo = new MealRepository();
export const subscriptionRepo = new SubscriptionRepository();
export const paymentRepo = new PaymentRepository();
export const mealIngredientRepo = new MealIngredientRepository();
export const mealImageRepo = new MealImageRepository();
export const discountRepo = new DiscountRepository();
export const menuCycleRepo = new MenuCycleRepository();
export const menuCycleDayRepo = new MenuCycleDayRepository();
export const menuDayAssignmentRepo = new MenuDayAssignmentRepository();
export const deliveryRepo = new DeliveryRepository();
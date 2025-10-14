import { BaseRepository } from './base-repository.js';
import { Ingredient, Plan, Profile, Meal, Subscription, Payment, MealIngredient, MealImage, Discount, MenuCycle, MenuCycleDay, MenuDayAssignment, Delivery } from '../models/types.js';
export declare class IngredientRepository extends BaseRepository<Ingredient> {
    constructor();
    findBySource(sourceType: string, sourceRef?: string): Ingredient[];
}
export declare class PlanRepository extends BaseRepository<Plan> {
    constructor();
    findActive(): Plan[];
    findByCode(code: string): Plan | null;
}
export declare class ProfileRepository extends BaseRepository<Profile> {
    constructor();
    create(data: Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>): Profile;
    findByEmail(email: string): Profile | null;
    findByUserId(userId: string): Profile | null;
    findAdmins(): Profile[];
    findStudents(): Profile[];
}
export declare class MealRepository extends BaseRepository<Meal> {
    constructor();
    findActive(): Meal[];
    findByName(name: string): Meal[];
}
export declare class SubscriptionRepository extends BaseRepository<Subscription> {
    constructor();
    findByUser(userId: string): Subscription[];
    findByStatus(status: string): Subscription[];
    findActiveByUser(userId: string): Subscription[];
    findUpcomingDeliveries(): Delivery[];
}
export declare class PaymentRepository extends BaseRepository<Payment> {
    constructor();
    findBySubscription(subscriptionId: string): Payment[];
    findSuccessfulBySubscription(subscriptionId: string): Payment[];
}
export declare class MealIngredientRepository extends BaseRepository<MealIngredient> {
    constructor();
    findByMeal(mealId: string): MealIngredient[];
    findByIngredient(ingredientId: string): MealIngredient[];
    create(mealIngredient: Omit<MealIngredient, 'id'>): MealIngredient;
    deleteByMealAndIngredient(mealId: string, ingredientId: string): boolean;
}
export declare class MealImageRepository extends BaseRepository<MealImage> {
    constructor();
    findByMeal(mealId: string): MealImage[];
    findByMealOrdered(mealId: string): MealImage[];
}
export declare class DiscountRepository extends BaseRepository<Discount> {
    constructor();
    findActive(): Discount[];
    findByPlan(planId: string): Discount[];
    findStudentDiscounts(): Discount[];
}
export declare class MenuCycleRepository extends BaseRepository<MenuCycle> {
    constructor();
    findActive(): MenuCycle[];
}
export declare class MenuCycleDayRepository extends BaseRepository<MenuCycleDay> {
    constructor();
    findByCycle(cycleId: string): MenuCycleDay[];
    findByCycleOrdered(cycleId: string): MenuCycleDay[];
}
export declare class MenuDayAssignmentRepository extends BaseRepository<MenuDayAssignment> {
    constructor();
    findByCycleDay(cycleDayId: string): MenuDayAssignment[];
    findByMeal(mealId: string): MenuDayAssignment[];
    findByPlan(planId: string): MenuDayAssignment[];
}
export declare class DeliveryRepository extends BaseRepository<Delivery> {
    constructor();
    findBySubscription(subscriptionId: string): Delivery[];
    findByDate(date: string): Delivery[];
    findUpcomingDeliveries(limit?: number): Delivery[];
}
export declare const ingredientRepo: IngredientRepository;
export declare const planRepo: PlanRepository;
export declare const profileRepo: ProfileRepository;
export declare const mealRepo: MealRepository;
export declare const subscriptionRepo: SubscriptionRepository;
export declare const paymentRepo: PaymentRepository;
export declare const mealIngredientRepo: MealIngredientRepository;
export declare const mealImageRepo: MealImageRepository;
export declare const discountRepo: DiscountRepository;
export declare const menuCycleRepo: MenuCycleRepository;
export declare const menuCycleDayRepo: MenuCycleDayRepository;
export declare const menuDayAssignmentRepo: MenuDayAssignmentRepository;
export declare const deliveryRepo: DeliveryRepository;
//# sourceMappingURL=repositories.d.ts.map
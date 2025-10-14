"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRepo = exports.menuDayAssignmentRepo = exports.menuCycleDayRepo = exports.menuCycleRepo = exports.discountRepo = exports.mealImageRepo = exports.mealIngredientRepo = exports.paymentRepo = exports.subscriptionRepo = exports.mealRepo = exports.profileRepo = exports.planRepo = exports.ingredientRepo = exports.DeliveryRepository = exports.MenuDayAssignmentRepository = exports.MenuCycleDayRepository = exports.MenuCycleRepository = exports.DiscountRepository = exports.MealImageRepository = exports.MealIngredientRepository = exports.PaymentRepository = exports.SubscriptionRepository = exports.MealRepository = exports.ProfileRepository = exports.PlanRepository = exports.IngredientRepository = void 0;
const base_repository_js_1 = require("./base-repository.js");
class IngredientRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('ingredients');
    }
    findBySource(sourceType, sourceRef) {
        let sql = 'SELECT * FROM ingredients WHERE source_type = ?';
        const params = [sourceType];
        if (sourceRef) {
            sql += ' AND source_ref = ?';
            params.push(sourceRef);
        }
        return this.query(sql, params);
    }
}
exports.IngredientRepository = IngredientRepository;
class PlanRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('plans');
    }
    findActive() {
        return this.findAll('status = ?', ['active']);
    }
    findByCode(code) {
        return this.queryOne('SELECT * FROM plans WHERE code = ?', [code]);
    }
}
exports.PlanRepository = PlanRepository;
class ProfileRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('profiles');
    }
    // Custom create method for profiles table (uses user_id instead of id)
    create(data) {
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
        return this.queryOne('SELECT * FROM profiles WHERE user_id = ?', [user_id]);
    }
    findByEmail(email) {
        return this.queryOne('SELECT * FROM profiles WHERE email = ?', [email]);
    }
    findByUserId(userId) {
        return this.queryOne('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    }
    findAdmins() {
        return this.findAll('is_admin = ?', [1]);
    }
    findStudents() {
        return this.findAll('is_student = ?', [1]);
    }
}
exports.ProfileRepository = ProfileRepository;
class MealRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('meals');
    }
    findActive() {
        return this.findAll('is_active = ?', [1]);
    }
    findByName(name) {
        const sql = 'SELECT * FROM meals WHERE name_en LIKE ? OR name_ar LIKE ?';
        return this.query(sql, [`%${name}%`, `%${name}%`]);
    }
}
exports.MealRepository = MealRepository;
class SubscriptionRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('subscriptions');
    }
    findByUser(userId) {
        return this.findAll('user_id = ?', [userId]);
    }
    findByStatus(status) {
        return this.findAll('status = ?', [status]);
    }
    findActiveByUser(userId) {
        return this.findAll('user_id = ? AND status = ?', [userId, 'active']);
    }
    findUpcomingDeliveries() {
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
exports.SubscriptionRepository = SubscriptionRepository;
class PaymentRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('payments');
    }
    findBySubscription(subscriptionId) {
        return this.findAll('subscription_id = ?', [subscriptionId]);
    }
    findSuccessfulBySubscription(subscriptionId) {
        return this.findAll('subscription_id = ? AND status = ?', [subscriptionId, 'succeeded']);
    }
}
exports.PaymentRepository = PaymentRepository;
class MealIngredientRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('meal_ingredients');
    }
    findByMeal(mealId) {
        return this.findAll('meal_id = ?', [mealId]);
    }
    findByIngredient(ingredientId) {
        return this.findAll('ingredient_id = ?', [ingredientId]);
    }
    create(mealIngredient) {
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
        return this.findByMeal(mealIngredient.meal_id).find(mi => mi.ingredient_id === mealIngredient.ingredient_id);
    }
    deleteByMealAndIngredient(mealId, ingredientId) {
        const sql = 'DELETE FROM meal_ingredients WHERE meal_id = ? AND ingredient_id = ?';
        const result = this.db.execute(sql, [mealId, ingredientId]);
        return result.changes > 0;
    }
}
exports.MealIngredientRepository = MealIngredientRepository;
class MealImageRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('meal_images');
    }
    findByMeal(mealId) {
        return this.findAll('meal_id = ?', [mealId]);
    }
    findByMealOrdered(mealId) {
        return this.query('SELECT * FROM meal_images WHERE meal_id = ? ORDER BY sort_order', [mealId]);
    }
}
exports.MealImageRepository = MealImageRepository;
class DiscountRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('discounts');
    }
    findActive() {
        return this.findAll('active = ? AND (starts_at IS NULL OR starts_at <= datetime("now")) AND (ends_at IS NULL OR ends_at >= datetime("now"))', [1]);
    }
    findByPlan(planId) {
        return this.findAll('plan_id = ? AND active = ?', [planId, 1]);
    }
    findStudentDiscounts() {
        return this.findAll('is_student_only = ? AND active = ?', [1, 1]);
    }
}
exports.DiscountRepository = DiscountRepository;
class MenuCycleRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('menu_cycles');
    }
    findActive() {
        return this.findAll('is_active = ?', [1]);
    }
}
exports.MenuCycleRepository = MenuCycleRepository;
class MenuCycleDayRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('menu_cycle_days');
    }
    findByCycle(cycleId) {
        return this.findAll('cycle_id = ?', [cycleId]);
    }
    findByCycleOrdered(cycleId) {
        return this.query('SELECT * FROM menu_cycle_days WHERE cycle_id = ? ORDER BY day_index', [cycleId]);
    }
}
exports.MenuCycleDayRepository = MenuCycleDayRepository;
class MenuDayAssignmentRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('menu_day_assignments');
    }
    findByCycleDay(cycleDayId) {
        return this.findAll('cycle_day_id = ?', [cycleDayId]);
    }
    findByMeal(mealId) {
        return this.findAll('meal_id = ?', [mealId]);
    }
    findByPlan(planId) {
        return this.findAll('plan_id = ?', [planId]);
    }
}
exports.MenuDayAssignmentRepository = MenuDayAssignmentRepository;
class DeliveryRepository extends base_repository_js_1.BaseRepository {
    constructor() {
        super('deliveries');
    }
    findBySubscription(subscriptionId) {
        return this.findAll('subscription_id = ?', [subscriptionId]);
    }
    findByDate(date) {
        return this.findAll('delivery_date = ?', [date]);
    }
    findUpcomingDeliveries(limit = 10) {
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
exports.DeliveryRepository = DeliveryRepository;
// Export repository instances
exports.ingredientRepo = new IngredientRepository();
exports.planRepo = new PlanRepository();
exports.profileRepo = new ProfileRepository();
exports.mealRepo = new MealRepository();
exports.subscriptionRepo = new SubscriptionRepository();
exports.paymentRepo = new PaymentRepository();
exports.mealIngredientRepo = new MealIngredientRepository();
exports.mealImageRepo = new MealImageRepository();
exports.discountRepo = new DiscountRepository();
exports.menuCycleRepo = new MenuCycleRepository();
exports.menuCycleDayRepo = new MenuCycleDayRepository();
exports.menuDayAssignmentRepo = new MenuDayAssignmentRepository();
exports.deliveryRepo = new DeliveryRepository();
//# sourceMappingURL=repositories.js.map
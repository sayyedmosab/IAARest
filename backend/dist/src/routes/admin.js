"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const repositories_js_1 = require("../services/repositories.js");
// Fix plan configurations as specified in the task
function fixPlanConfigurations() {
    try {
        // Update FOCUS plan to have 2 meals per day
        const focusPlan = repositories_js_1.planRepo.findByCode('FOCUS');
        if (focusPlan && focusPlan.meals_per_day !== 2) {
            repositories_js_1.planRepo.update(focusPlan.id, { meals_per_day: 2 });
            console.log(`[PLAN_FIX] Updated FOCUS plan meals_per_day from ${focusPlan.meals_per_day} to 2`);
        }
        // Update FLEX plan to have 1 meal per day
        const flexPlan = repositories_js_1.planRepo.findByCode('FLEX');
        if (flexPlan && flexPlan.meals_per_day !== 1) {
            repositories_js_1.planRepo.update(flexPlan.id, { meals_per_day: 1 });
            console.log(`[PLAN_FIX] Updated FLEX plan meals_per_day from ${flexPlan.meals_per_day} to 1`);
        }
        console.log('[PLAN_FIX] Plan configuration fixes completed');
    }
    catch (error) {
        console.error('[PLAN_FIX] Error fixing plan configurations:', error);
    }
}
const router = (0, express_1.Router)();
// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin routes working' });
});
// Fix plan configurations route
router.post('/fix-plan-configurations', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        fixPlanConfigurations();
        res.json({ success: true, message: 'Plan configurations fixed successfully' });
    }
    catch (error) {
        console.error('Fix plan configurations error:', error);
        res.status(500).json({ success: false, error: 'Failed to fix plan configurations' });
    }
});
router.get('/db-status', async (req, res) => {
    try {
        const mealCount = repositories_js_1.mealRepo.count();
        const profileCount = repositories_js_1.profileRepo.count();
        res.json({ success: true, data: { meals: mealCount, profiles: profileCount } });
    }
    catch (error) {
        console.error('DB Status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get DB status' });
    }
});
// Get dashboard data (admin only)
router.get('/dashboard', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        console.log('=== ADMIN DASHBOARD CALLED ===');
        // Get all plans for segmentation
        const allPlans = repositories_js_1.planRepo.findAll();
        // Customer Pipeline - Row 1: Main boxes
        const newSubscriptions = repositories_js_1.subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'pending_payment'
      ORDER BY s.created_at DESC
    `);
        const activeSubscriptions = repositories_js_1.subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
        const exitingSubscriptions = repositories_js_1.subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'cancelled' AND s.end_date >= date('now', '-30 days')
      ORDER BY s.end_date DESC
    `);
        // Calculate revenue for each category
        const newRevenue = newSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
        const activeRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
        const exitingRevenue = exitingSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
        // Customer Pipeline - Row 2: Segmentation by plan
        const newByPlan = allPlans.map(plan => {
            const count = newSubscriptions.filter(sub => sub.plan_id === plan.id).length;
            const revenue = newSubscriptions
                .filter(sub => sub.plan_id === plan.id)
                .reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
            return {
                planId: plan.id,
                planCode: plan.code,
                planName: plan.name_en,
                count,
                revenue
            };
        });
        const activeByPlan = allPlans.map(plan => {
            const count = activeSubscriptions.filter(sub => sub.plan_id === plan.id).length;
            const revenue = activeSubscriptions
                .filter(sub => sub.plan_id === plan.id)
                .reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
            return {
                planId: plan.id,
                planCode: plan.code,
                planName: plan.name_en,
                count,
                revenue
            };
        });
        const exitingByPlan = allPlans.map(plan => {
            const count = exitingSubscriptions.filter(sub => sub.plan_id === plan.id).length;
            const revenue = exitingSubscriptions
                .filter(sub => sub.plan_id === plan.id)
                .reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
            return {
                planId: plan.id,
                planCode: plan.code,
                planName: plan.name_en,
                count,
                revenue
            };
        });
        // Calendar data (full month with proper week alignment)
        const calendarData = [];
        const today = new Date();
        // Group subscriptions by plan for accurate meal calculation
        const subscriptionsByPlan = new Map();
        activeSubscriptions.forEach(sub => {
            const plan = allPlans.find(p => p.id === sub.plan_id);
            if (plan) {
                if (!subscriptionsByPlan.has(plan.id)) {
                    subscriptionsByPlan.set(plan.id, {
                        plan: plan,
                        subscribers: []
                    });
                }
                subscriptionsByPlan.get(plan.id).subscribers.push(sub);
            }
        });
        console.log(`[CALENDAR_DEBUG] Subscriptions by plan:`, Array.from(subscriptionsByPlan.entries()).map(([planId, data]) => ({
            planId,
            planCode: data.plan.code,
            mealsPerDay: data.plan.meals_per_day,
            deliveryDays: data.plan.delivery_days,
            subscriberCount: data.subscribers.length
        })));
        // Generate calendar for current month (starting from first day of month)
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
        const firstDayOfWeek = firstDayOfMonth.getDay();
        // Generate empty cells for days before month starts
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDate = new Date(firstDayOfMonth);
            emptyDate.setDate(1 - (firstDayOfWeek - i));
            calendarData.push({
                date: emptyDate.toISOString().split('T')[0],
                dayName: emptyDate.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: emptyDate.getDate(),
                lunchCount: 0,
                dinnerCount: 0,
                totalMeals: 0,
                isCurrentMonth: false
            });
        }
        // Generate days for current month
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfMonth = date.getDate();
            let lunchCount = 0;
            let dinnerCount = 0;
            // Calculate meals for each plan based on delivery schedule
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            subscriptionsByPlan.forEach(({ plan, subscribers }) => {
                // Parse delivery pattern from JSON to determine if today is a delivery day
                let deliveryDays = [1, 2, 3, 4, 5]; // Default: Mon-Fri
                try {
                    if (plan.delivery_pattern) {
                        deliveryDays = JSON.parse(plan.delivery_pattern);
                    }
                }
                catch (error) {
                    console.log(`[CALENDAR_DEBUG] Invalid delivery_pattern for plan ${plan.code}: ${plan.delivery_pattern}`);
                }
                // Check if today is a delivery day (convert Sunday=0 to Monday=1 format)
                const isDeliveryDay = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
                if (isDeliveryDay) {
                    if (plan.meals_per_day === 2) {
                        // 2-meal plans get both lunch and dinner on delivery days
                        lunchCount += subscribers.length;
                        dinnerCount += subscribers.length;
                    }
                    else if (plan.meals_per_day === 1) {
                        // 1-meal plans get either lunch OR dinner
                        // Use deterministic pattern based on day of week and plan ID for consistency
                        const planHash = plan.code.charCodeAt(0) + plan.code.charCodeAt(1) || 0;
                        const dayHash = dayOfWeek + dayOfMonth;
                        const combinedHash = (planHash + dayHash) % 2;
                        if (combinedHash === 0) {
                            lunchCount += subscribers.length;
                        }
                        else {
                            dinnerCount += subscribers.length;
                        }
                    }
                }
            });
            calendarData.push({
                date: dateStr,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: dayOfMonth,
                lunchCount,
                dinnerCount,
                totalMeals: lunchCount + dinnerCount,
                isCurrentMonth: true
            });
        }
        // Generate empty cells for days after month ends to complete the last week
        const totalCells = calendarData.length;
        const remainingCells = 42 - totalCells; // 6 weeks * 7 days = 42 cells
        for (let i = 1; i <= remainingCells; i++) {
            const emptyDate = new Date(lastDayOfMonth);
            emptyDate.setDate(lastDayOfMonth.getDate() + i);
            calendarData.push({
                date: emptyDate.toISOString().split('T')[0],
                dayName: emptyDate.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: emptyDate.getDate(),
                lunchCount: 0,
                dinnerCount: 0,
                totalMeals: 0,
                isCurrentMonth: false
            });
        }
        console.log(`[CALENDAR DEBUG] Generated ${calendarData.length} calendar cells (${lastDayOfMonth.getDate()} actual days)`);
        console.log(`[CALENDAR DEBUG] Today (${today.toISOString().split('T')[0]}) is day ${today.getDate()}, weekday ${today.toLocaleDateString('en-US', { weekday: 'short' })}`);
        console.log(`[CALENDAR DEBUG] Sample current month day: ${JSON.stringify(calendarData.find(d => d.isCurrentMonth))}`);
        res.json({
            success: true,
            data: {
                customerPipeline: {
                    new: {
                        count: newSubscriptions.length,
                        revenue: newRevenue,
                        byPlan: newByPlan
                    },
                    active: {
                        count: activeSubscriptions.length,
                        revenue: activeRevenue,
                        byPlan: activeByPlan
                    },
                    exiting: {
                        count: exitingSubscriptions.length,
                        revenue: exitingRevenue,
                        byPlan: exitingByPlan
                    }
                },
                calendar: calendarData
            }
        });
    }
    catch (error) {
        console.error('Get dashboard data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});
// Get daily orders (admin only)
router.get('/daily-orders', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        console.log('[DEBUG] ADMIN DAILY ORDERS CALLED');
        // Get next 3 days dates
        const dates = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        console.log('[DEBUG] Processing dates:', dates);
        // Get all plans for reference
        const allPlans = repositories_js_1.planRepo.findAll();
        // Get active subscriptions with plan details
        let activeSubscriptions = [];
        try {
            activeSubscriptions = repositories_js_1.subscriptionRepo.query(`
        SELECT s.*, p.meals_per_day, p.base_price_aed, p.delivery_pattern, p.billing_cycle
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status = 'active'
      `);
            console.log('[DEBUG] Active subscriptions found:', activeSubscriptions.length);
            if (activeSubscriptions.length > 0) {
                console.log('[DEBUG] Sample active subscription:', activeSubscriptions[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error getting subscription count:', err);
        }
        console.log('[DEBUG] Final active subscriptions count:', activeSubscriptions.length);
        // DEBUG: Check if we have any menu cycles at all
        let menuCycles = [];
        try {
            menuCycles = repositories_js_1.menuDayAssignmentRepo.query(`SELECT * FROM menu_cycles WHERE is_active = 1`);
            console.log('[DEBUG] Active menu cycles found:', menuCycles.length);
            if (menuCycles.length > 0) {
                console.log('[DEBUG] Active cycle details:', menuCycles[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error checking menu cycles:', err);
        }
        // DEBUG: Check if we have any menu cycle days
        let menuCycleDays = [];
        try {
            menuCycleDays = repositories_js_1.menuDayAssignmentRepo.query(`
        SELECT mcd.*, mc.name as cycle_name
        FROM menu_cycle_days mcd
        JOIN menu_cycles mc ON mcd.cycle_id = mc.id
        WHERE mc.is_active = 1
      `);
            console.log('[DEBUG] Menu cycle days found:', menuCycleDays.length);
            if (menuCycleDays.length > 0) {
                console.log('[DEBUG] Sample cycle day:', menuCycleDays[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error checking menu cycle days:', err);
        }
        // DEBUG: Check if we have any menu assignments
        let menuAssignments = [];
        try {
            menuAssignments = repositories_js_1.menuDayAssignmentRepo.query(`
        SELECT
          mda.*,
          mcd.day_index,
          mc.name as cycle_name
        FROM menu_day_assignments mda
        JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
        JOIN menu_cycles mc ON mcd.cycle_id = mc.id
        WHERE mc.is_active = 1
      `);
            console.log('[DEBUG] Menu assignments found:', menuAssignments.length);
            if (menuAssignments.length > 0) {
                console.log('[DEBUG] Sample assignment:', menuAssignments[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error checking menu assignments:', err);
        }
        // Get all meals with their ingredients
        let meals = [];
        let mealIngredients = [];
        let ingredients = [];
        try {
            meals = repositories_js_1.mealRepo.findAll();
            console.log('[DEBUG] Loaded meals:', meals.length);
            if (meals.length > 0) {
                console.log('[DEBUG] Sample meal:', meals[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error loading meals:', err);
        }
        try {
            mealIngredients = repositories_js_1.mealIngredientRepo.findAll();
            console.log('[DEBUG] Loaded meal ingredients:', mealIngredients.length);
            if (mealIngredients.length > 0) {
                console.log('[DEBUG] Sample meal ingredient:', mealIngredients[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error loading meal ingredients:', err);
        }
        try {
            ingredients = repositories_js_1.ingredientRepo.findAll();
            console.log('[DEBUG] Loaded ingredients:', ingredients.length);
            if (ingredients.length > 0) {
                console.log('[DEBUG] Sample ingredient:', ingredients[0]);
            }
        }
        catch (err) {
            console.log('[DEBUG] Error loading ingredients:', err);
        }
        // Process each date
        const dailyPrepData = dates.map((date, index) => {
            console.log('[DEBUG] Processing date:', date, 'index:', index);
            // For now, let's get assignments by day index (simplified approach)
            const dayIndex = index; // 0 = today, 1 = tomorrow, 2 = day after
            const dayAssignments = menuAssignments.filter(assignment => assignment.day_index === dayIndex);
            console.log('[DEBUG] Day assignments for', date, '(day index', dayIndex, '):', dayAssignments.length);
            const dailyPrep = {
                date,
                mealsToPrepare: [],
                rawMaterials: []
            };
            // If no assignments, return empty prep
            if (dayAssignments.length === 0) {
                console.log('[DEBUG] No assignments for date:', date);
                return dailyPrep;
            }
            // Calculate meal counts and raw materials based on actual subscription data
            const rawMaterialsMap = new Map();
            dayAssignments.forEach(assignment => {
                const meal = meals.find(m => m.id === assignment.meal_id);
                if (!meal) {
                    console.log('[DEBUG] Meal not found for ID:', assignment.meal_id);
                    return;
                }
                console.log('[DEBUG] Found meal:', meal.name_en, 'for slot:', assignment.slot || assignment.meal_type);
                // Calculate how many subscribers get this specific meal
                let mealCount = 0;
                console.log(`[MEAL_CALC_DEBUG] Processing meal: ${meal.name_en} for slot: ${assignment.slot} on date: ${date}`);
                console.log(`[MEAL_CALC_DEBUG] Active subscribers count: ${activeSubscriptions.length}`);
                // Group subscriptions by plan for accurate meal calculation
                const subscriptionsByPlan = new Map();
                activeSubscriptions.forEach(sub => {
                    if (!subscriptionsByPlan.has(sub.plan_id)) {
                        // Get full plan details including delivery_pattern
                        const plan = allPlans.find(p => p.id === sub.plan_id);
                        subscriptionsByPlan.set(sub.plan_id, {
                            plan: plan,
                            subscribers: []
                        });
                    }
                    subscriptionsByPlan.get(sub.plan_id).subscribers.push(sub);
                });
                subscriptionsByPlan.forEach(({ plan, subscribers }) => {
                    const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
                    // Parse delivery pattern from JSON to determine if today is a delivery day
                    let deliveryDays = [1, 2, 3, 4, 5]; // Default: Mon-Fri
                    try {
                        if (plan && plan.delivery_pattern) {
                            deliveryDays = JSON.parse(plan.delivery_pattern);
                        }
                    }
                    catch (error) {
                        console.log(`[DAILY_ORDERS_DEBUG] Invalid delivery_pattern for plan: ${plan?.delivery_pattern}`);
                    }
                    // Check if today is a delivery day
                    const isDeliveryDay = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
                    if (isDeliveryDay) {
                        if (plan && plan.meals_per_day === 2) {
                            // 2-meal plans get both lunch and dinner
                            if (assignment.slot === 'lunch' || assignment.slot === 'dinner') {
                                mealCount += subscribers.length;
                            }
                        }
                        else if (plan && plan.meals_per_day === 1) {
                            // 1-meal plans get either lunch OR dinner
                            const dayOfMonth = new Date(date).getDate();
                            const planHash = plan.code.charCodeAt(0) + plan.code.charCodeAt(1) || 0;
                            const dayHash = dayOfWeek + dayOfMonth;
                            const combinedHash = (planHash + dayHash) % 2;
                            const getsLunch = combinedHash === 0;
                            const getsDinner = !getsLunch;
                            if ((assignment.slot === 'lunch' && getsLunch) ||
                                (assignment.slot === 'dinner' && getsDinner)) {
                                mealCount += subscribers.length;
                            }
                        }
                    }
                });
                console.log(`[MEAL_CALC_DEBUG] Final meal count for ${meal.name_en} (${assignment.slot}): ${mealCount}`);
                console.log('[DEBUG] Meal', meal.name_en, 'will be prepared for', mealCount, 'subscribers');
                // Add to meals to prepare
                if (mealCount > 0) {
                    dailyPrep.mealsToPrepare.push({
                        mealName: meal.name_en || meal.name_ar || 'Unknown Meal',
                        count: mealCount
                    });
                    // Calculate ingredients needed
                    const ingredientsForMeal = mealIngredients.filter((mi) => mi.meal_id === assignment.meal_id);
                    console.log('[DEBUG] Ingredients for meal:', ingredientsForMeal.length);
                    ingredientsForMeal.forEach((mealIng) => {
                        const ingredient = ingredients.find((ing) => ing.id === mealIng.ingredient_id);
                        if (!ingredient) {
                            console.log('[DEBUG] Ingredient not found for ID:', mealIng.ingredient_id);
                            return;
                        }
                        const key = `${ingredient.name_en}-${ingredient.unit_base}`;
                        const existing = rawMaterialsMap.get(key);
                        const totalWeight = mealIng.weight_g * mealCount;
                        if (existing) {
                            existing.quantity += totalWeight;
                        }
                        else {
                            rawMaterialsMap.set(key, {
                                name: ingredient.name_en || ingredient.name_ar || 'Unknown Ingredient',
                                quantity: totalWeight,
                                unit: ingredient.unit_base || 'g'
                            });
                        }
                    });
                }
            });
            dailyPrep.rawMaterials = Array.from(rawMaterialsMap.values());
            console.log('[DEBUG] Final prep data for', date, ':', dailyPrep);
            return dailyPrep;
        });
        // Add diagnostic information to the response
        const diagnosticInfo = {
            hasActiveMenuCycles: menuCycles.length > 0,
            hasMenuCycleDays: menuCycleDays.length > 0,
            hasMenuAssignments: menuAssignments.length > 0,
            hasMeals: meals.length > 0,
            hasMealIngredients: mealIngredients.length > 0,
            hasIngredients: ingredients.length > 0,
            activeSubscriptionsCount: activeSubscriptions.length,
            subscriptionDetails: activeSubscriptions.map(sub => ({
                planId: sub.plan_id,
                mealsPerDay: sub.meals_per_day,
                status: sub.status
            }))
        };
        res.json({
            success: true,
            data: dailyPrepData,
            diagnostic: diagnosticInfo
        });
    }
    catch (error) {
        console.error('Get daily orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily orders',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get all subscriptions (admin only)
router.get('/subscriptions', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        // Get subscriptions with joined user and plan data
        const subscriptionsRaw = repositories_js_1.subscriptionRepo.query(`
      SELECT 
        s.id,
        s.user_id,
        s.plan_id,
        s.status,
        s.start_date,
        s.end_date,
        s.price_charged_aed,
        s.created_at,
        s.updated_at,
        p.first_name,
        p.last_name,
        p.email,
        p.language_pref,
        p.is_admin,
        p.is_student,
        pl.name_en as plan_name_en,
        pl.name_ar as plan_name_ar,
        pl.base_price_aed,
        pay.method as payment_method
      FROM subscriptions s
      JOIN profiles p ON s.user_id = p.user_id
      JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN (SELECT * FROM payments ORDER BY created_at DESC) pay ON s.id = pay.subscription_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
        // Transform to match frontend expectations
        const subscriptions = subscriptionsRaw.map(sub => ({
            id: sub.id,
            userId: sub.user_id,
            user: {
                user_id: sub.user_id,
                email: sub.email,
                first_name: sub.first_name,
                last_name: sub.last_name,
                language_pref: sub.language_pref,
                is_admin: Boolean(sub.is_admin),
                is_student: Boolean(sub.is_student)
            },
            planId: sub.plan_id,
            planName: sub.plan_name_en || sub.plan_name_ar,
            planPrice: sub.price_charged_aed || sub.base_price_aed,
            startDate: sub.start_date,
            endDate: sub.end_date,
            status: sub.status,
            deliveryAddress: {
                street: sub.address || 'Not provided',
                city: 'Sharjah', // City is not in DB, keeping default
                district: sub.district || 'Not provided'
            },
            paymentMethod: sub.payment_method || 'Not available', // Use joined value
            paymentProof: null
        }));
        res.json({
            success: true,
            data: subscriptions
        });
    }
    catch (error) {
        console.error('Get admin subscriptions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admin subscriptions'
        });
    }
});
// Save menu schedule (admin only)
router.post('/menu-schedule', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { schedule } = req.body;
        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid schedule data. Expected array.'
            });
        }
        // Start transaction
        const result = repositories_js_1.menuDayAssignmentRepo.transaction(() => {
            schedule.forEach((item) => {
                const { date, meal_type, meal_id } = item;
                // Validate required fields
                if (!date || !meal_type || !meal_id) {
                    throw new Error('Missing required fields: date, meal_type, meal_id');
                }
                // Validate meal_type
                if (!['lunch', 'dinner'].includes(meal_type)) {
                    throw new Error('Invalid meal_type. Must be lunch or dinner');
                }
                // Delete existing assignment for this date and meal_type
                repositories_js_1.menuDayAssignmentRepo.execute('DELETE FROM menu_day_assignments WHERE date = ? AND meal_type = ?', [date, meal_type]);
                // Insert new assignment
                repositories_js_1.menuDayAssignmentRepo.execute('INSERT INTO menu_day_assignments (date, meal_type, meal_id) VALUES (?, ?, ?)', [date, meal_type, meal_id]);
            });
        });
        res.status(201).json({
            success: true,
            message: 'Menu schedule saved successfully'
        });
    }
    catch (error) {
        console.error('Save menu schedule error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save menu schedule'
        });
    }
});
// Get all users (admin only)
router.get('/users', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const users = repositories_js_1.profileRepo.findAll();
        // Transform raw DB data to match frontend User interface
        const transformedUsers = users.map(user => ({
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone_e164,
            is_admin: user.is_admin,
            address: {
                street: user.address || '',
                city: 'Sharjah', // Default city
                district: user.district || ''
            }
        }));
        res.json({
            success: true,
            data: transformedUsers
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});
// Get user by ID (admin only)
router.get('/users/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = repositories_js_1.profileRepo.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Transform raw DB data to match frontend User interface
        const transformedUser = {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone_e164,
            is_admin: user.is_admin,
            address: {
                street: user.address || '',
                city: 'Sharjah', // Default city
                district: user.district || ''
            }
        };
        res.json({
            success: true,
            data: transformedUser
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});
// Meal CRUD operations
router.post('/meals', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const mealData = req.body;
        console.log('[DEBUG] Creating meal:', mealData);
        // Validate required fields
        if (!mealData.name_en || !mealData.name_ar) {
            return res.status(400).json({
                success: false,
                error: 'Meal name (EN and AR) is required'
            });
        }
        // Create meal
        const meal = repositories_js_1.mealRepo.create({
            name_en: mealData.name_en,
            name_ar: mealData.name_ar,
            description_en: mealData.description_en || '',
            description_ar: mealData.description_ar || '',
            nutritional_facts_en: mealData.nutritional_facts_en || '',
            nutritional_facts_ar: mealData.nutritional_facts_ar || '',
            ingredients_en: mealData.ingredients_en || '',
            ingredients_ar: mealData.ingredients_ar || '',
            image_filename: mealData.image_filename || '/images/placeholder.png',
            is_active: mealData.is_active !== undefined ? mealData.is_active : 1
        });
        // Add ingredients if provided
        if (mealData.ingredients && Array.isArray(mealData.ingredients)) {
            mealData.ingredients.forEach((ing) => {
                repositories_js_1.mealIngredientRepo.create({
                    meal_id: meal.id,
                    ingredient_id: ing.ingredient_id,
                    weight_g: ing.weight_g || 0,
                    notes: ing.notes || ''
                });
            });
        }
        res.status(201).json({
            success: true,
            data: meal
        });
    }
    catch (error) {
        console.error('Create meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create meal'
        });
    }
});
router.put('/meals/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const mealData = req.body;
        console.log('[DEBUG] Updating meal:', id, mealData);
        // Check if meal exists
        const existingMeal = repositories_js_1.mealRepo.findById(id);
        if (!existingMeal) {
            return res.status(404).json({
                success: false,
                error: 'Meal not found'
            });
        }
        // Update meal
        const updatedMeal = repositories_js_1.mealRepo.update(id, {
            name_en: mealData.name_en || existingMeal.name_en,
            name_ar: mealData.name_ar || existingMeal.name_ar,
            description_en: mealData.description_en !== undefined ? mealData.description_en : existingMeal.description_en,
            description_ar: mealData.description_ar !== undefined ? mealData.description_ar : existingMeal.description_ar,
            nutritional_facts_en: mealData.nutritional_facts_en !== undefined ? mealData.nutritional_facts_en : existingMeal.nutritional_facts_en,
            nutritional_facts_ar: mealData.nutritional_facts_ar !== undefined ? mealData.nutritional_facts_ar : existingMeal.nutritional_facts_ar,
            ingredients_en: mealData.ingredients_en !== undefined ? mealData.ingredients_en : existingMeal.ingredients_en,
            ingredients_ar: mealData.ingredients_ar !== undefined ? mealData.ingredients_ar : existingMeal.ingredients_ar,
            image_filename: mealData.image_filename !== undefined ? mealData.image_filename : existingMeal.image_filename,
            is_active: mealData.is_active !== undefined ? mealData.is_active : existingMeal.is_active
        });
        // Handle ingredients update if provided
        if (mealData.ingredients && Array.isArray(mealData.ingredients)) {
            // Remove existing ingredients
            const existingIngredients = repositories_js_1.mealIngredientRepo.findByMeal(id);
            existingIngredients.forEach(ing => {
                repositories_js_1.mealIngredientRepo.deleteByMealAndIngredient(id, ing.ingredient_id);
            });
            // Add new ingredients
            mealData.ingredients.forEach((ing) => {
                repositories_js_1.mealIngredientRepo.create({
                    meal_id: id,
                    ingredient_id: ing.ingredient_id,
                    weight_g: ing.weight_g || 0,
                    notes: ing.notes || ''
                });
            });
        }
        res.json({
            success: true,
            data: updatedMeal
        });
    }
    catch (error) {
        console.error('Update meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update meal'
        });
    }
});
router.delete('/meals/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[DEBUG] Deleting meal:', id);
        // Check if meal exists
        const existingMeal = repositories_js_1.mealRepo.findById(id);
        if (!existingMeal) {
            return res.status(404).json({
                success: false,
                error: 'Meal not found'
            });
        }
        // Delete meal ingredients first
        const mealIngredients = repositories_js_1.mealIngredientRepo.findByMeal(id);
        mealIngredients.forEach(ing => {
            repositories_js_1.mealIngredientRepo.deleteByMealAndIngredient(id, ing.ingredient_id);
        });
        // Delete meal
        repositories_js_1.mealRepo.delete(id);
        res.json({
            success: true,
            message: 'Meal deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete meal'
        });
    }
});
// Plan CRUD operations
router.post('/plans', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const planData = req.body;
        console.log('[DEBUG] Creating plan:', planData);
        // Validate required fields
        if (!planData.name_en || !planData.name_ar || !planData.code) {
            return res.status(400).json({
                success: false,
                error: 'Plan name (EN and AR) and code are required'
            });
        }
        // Generate delivery pattern if not provided
        let deliveryPattern = planData.delivery_pattern;
        if (!deliveryPattern) {
            // Generate default pattern based on delivery_days
            const days = planData.delivery_days || 20;
            if (days <= 4) {
                deliveryPattern = JSON.stringify([1, 2, 3, 4]); // Mon-Thu
            }
            else if (days <= 5) {
                deliveryPattern = JSON.stringify([1, 2, 3, 4, 5]); // Mon-Fri
            }
            else {
                deliveryPattern = JSON.stringify([1, 2, 3, 4, 5, 6]); // Mon-Sat
            }
        }
        // Create plan
        const plan = repositories_js_1.planRepo.create({
            code: planData.code,
            name_en: planData.name_en,
            name_ar: planData.name_ar,
            meals_per_day: planData.meals_per_day || 1,
            delivery_days: planData.delivery_days || 20,
            billing_cycle: planData.billing_cycle || 'monthly',
            delivery_pattern: deliveryPattern,
            base_price_aed: planData.base_price_aed || 0,
            discounted_price_aed: planData.discounted_price_aed,
            position_note_en: planData.position_note_en || '',
            position_note_ar: planData.position_note_ar || '',
            status: planData.status || 'active'
        });
        res.status(201).json({
            success: true,
            data: plan
        });
    }
    catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create plan'
        });
    }
});
router.put('/plans/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const planData = req.body;
        console.log('[DEBUG] Updating plan:', id, planData);
        // Check if plan exists
        const existingPlan = repositories_js_1.planRepo.findById(id);
        if (!existingPlan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        // Generate delivery pattern if delivery_days changed but pattern not provided
        let deliveryPattern = planData.delivery_pattern;
        if (!deliveryPattern && planData.delivery_days !== undefined && planData.delivery_days !== existingPlan.delivery_days) {
            const days = planData.delivery_days;
            if (days <= 4) {
                deliveryPattern = JSON.stringify([1, 2, 3, 4]); // Mon-Thu
            }
            else if (days <= 5) {
                deliveryPattern = JSON.stringify([1, 2, 3, 4, 5]); // Mon-Fri
            }
            else {
                deliveryPattern = JSON.stringify([1, 2, 3, 4, 5, 6]); // Mon-Sat
            }
        }
        // Update plan
        const updatedPlan = repositories_js_1.planRepo.update(id, {
            code: planData.code || existingPlan.code,
            name_en: planData.name_en || existingPlan.name_en,
            name_ar: planData.name_ar || existingPlan.name_ar,
            meals_per_day: planData.meals_per_day !== undefined ? planData.meals_per_day : existingPlan.meals_per_day,
            delivery_days: planData.delivery_days !== undefined ? planData.delivery_days : existingPlan.delivery_days,
            billing_cycle: planData.billing_cycle || existingPlan.billing_cycle,
            delivery_pattern: deliveryPattern || existingPlan.delivery_pattern,
            base_price_aed: planData.base_price_aed !== undefined ? planData.base_price_aed : existingPlan.base_price_aed,
            discounted_price_aed: planData.discounted_price_aed !== undefined ? planData.discounted_price_aed : existingPlan.discounted_price_aed,
            position_note_en: planData.position_note_en !== undefined ? planData.position_note_en : existingPlan.position_note_en,
            position_note_ar: planData.position_note_ar !== undefined ? planData.position_note_ar : existingPlan.position_note_ar,
            status: planData.status || existingPlan.status
        });
        res.json({
            success: true,
            data: updatedPlan
        });
    }
    catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update plan'
        });
    }
});
router.delete('/plans/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[DEBUG] Deleting plan:', id);
        // Check if plan exists
        const existingPlan = repositories_js_1.planRepo.findById(id);
        if (!existingPlan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        // Check if plan has active subscriptions
        const activeSubscriptions = repositories_js_1.subscriptionRepo.count('plan_id = ? AND status = ?', [id, 'active']);
        if (activeSubscriptions > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete plan with active subscriptions'
            });
        }
        // Delete plan
        repositories_js_1.planRepo.delete(id);
        res.json({
            success: true,
            message: 'Plan deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete plan'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map
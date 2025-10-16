import { Router, Request, Response } from 'express';
import { requireAdmin, AuthRequest, authenticateToken } from '../middleware/auth.js';
import { subscriptionRepo, planRepo, profileRepo, mealRepo, menuDayAssignmentRepo, mealIngredientRepo, ingredientRepo } from '../services/repositories.js';

// Fix plan configurations as specified in the task
function fixPlanConfigurations() {
  try {
    // Update FOCUS plan to have 2 meals per day
    const focusPlan = planRepo.findByCode('FOCUS');
    if (focusPlan && focusPlan.meals_per_day !== 2) {
      planRepo.update(focusPlan.id, { meals_per_day: 2 });
      console.log(`[PLAN_FIX] Updated FOCUS plan meals_per_day from ${focusPlan.meals_per_day} to 2`);
    }
    
    // Update FLEX plan to have 1 meal per day
    const flexPlan = planRepo.findByCode('FLEX');
    if (flexPlan && flexPlan.meals_per_day !== 1) {
      planRepo.update(flexPlan.id, { meals_per_day: 1 });
      console.log(`[PLAN_FIX] Updated FLEX plan meals_per_day from ${flexPlan.meals_per_day} to 1`);
    }
    
    console.log('[PLAN_FIX] Plan configuration fixes completed');
  } catch (error) {
    console.error('[PLAN_FIX] Error fixing plan configurations:', error);
  }
}

const router = Router();

// Test route
router.get('/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Admin routes working' });
});

// Public diagnostic route for testing daily orders (no auth required)
router.get('/diagnostic-daily-orders', async (req: Request, res: Response) => {
  try {
    console.log('=== PUBLIC DAILY ORDERS DIAGNOSTIC START ===');
    const today = new Date();
    console.log(`[DIAG] Today's date: ${today.toISOString().split('T')[0]}`);
    console.log(`[DIAG] Today's day of week: ${today.getDay()} (0=Sunday, 1=Monday, etc.)`);
    console.log(`[DIAG] Today's day of month: ${today.getDate()}`);
    
    // Get next 3 days dates
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    console.log('[DIAG] Processing dates:', dates);
    
    // Get all plans for reference
    const allPlans = planRepo.findAll();
    
    // Get active subscriptions with plan details
    let activeSubscriptions = [];
    try {
      activeSubscriptions = subscriptionRepo.query(`
        SELECT s.*, p.meals_per_day, p.base_price_aed, p.delivery_pattern, p.billing_cycle
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status IN ('Active', 'Frozen')
      `);
      console.log('[DIAG] Active and Frozen subscriptions found:', activeSubscriptions.length);
      
      if (activeSubscriptions.length > 0) {
        console.log('[DIAG] Sample active subscription:', activeSubscriptions[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error getting subscription count:', err);
    }
    
    console.log('[DIAG] Final active subscriptions count:', activeSubscriptions.length);
    
    // DEBUG: Check if we have any menu cycles at all
    let menuCycles = [];
    try {
      menuCycles = menuDayAssignmentRepo.query(`SELECT * FROM menu_cycles WHERE is_active = 1`);
      console.log('[DIAG] Active menu cycles found:', menuCycles.length);
      if (menuCycles.length > 0) {
        console.log('[DIAG] Active cycle details:', menuCycles[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error checking menu cycles:', err);
    }
    
    // DEBUG: Check if we have any menu cycle days
    let menuCycleDays = [];
    try {
      menuCycleDays = menuDayAssignmentRepo.query(`
        SELECT mcd.*, mc.name as cycle_name
        FROM menu_cycle_days mcd
        JOIN menu_cycles mc ON mcd.cycle_id = mc.id
        WHERE mc.is_active = 1
      `);
      console.log('[DIAG] Menu cycle days found:', menuCycleDays.length);
      if (menuCycleDays.length > 0) {
        console.log('[DIAG] Sample cycle day:', menuCycleDays[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error checking menu cycle days:', err);
    }
    
    // DEBUG: Check if we have any menu assignments
    let menuAssignments = [];
    try {
      menuAssignments = menuDayAssignmentRepo.query(`
        SELECT
          mda.*,
          mcd.day_index,
          mc.name as cycle_name
        FROM menu_day_assignments mda
        JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
        JOIN menu_cycles mc ON mcd.cycle_id = mc.id
        WHERE mc.is_active = 1
      `);
      console.log('[DIAG] Menu assignments found:', menuAssignments.length);
      if (menuAssignments.length > 0) {
        console.log('[DIAG] Sample assignment:', menuAssignments[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error checking menu assignments:', err);
    }
    
    // Get all meals with their ingredients
    let meals: any[] = [];
    let mealIngredients: any[] = [];
    let ingredients: any[] = [];
    
    try {
      meals = mealRepo.findAll();
      console.log('[DIAG] Loaded meals:', meals.length);
      if (meals.length > 0) {
        console.log('[DIAG] Sample meal:', meals[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error loading meals:', err);
    }
    
    try {
      mealIngredients = mealIngredientRepo.findAll();
      console.log('[DIAG] Loaded meal ingredients:', mealIngredients.length);
      if (mealIngredients.length > 0) {
        console.log('[DIAG] Sample meal ingredient:', mealIngredients[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error loading meal ingredients:', err);
    }
    
    try {
      ingredients = ingredientRepo.findAll();
      console.log('[DIAG] Loaded ingredients:', ingredients.length);
      if (ingredients.length > 0) {
        console.log('[DIAG] Sample ingredient:', ingredients[0]);
      }
    } catch (err) {
      console.log('[DIAG] Error loading ingredients:', err);
    }
    
    // Process each date with detailed logging
    const dailyPrepData = dates.map((date, index) => {
      console.log(`\n=== PROCESSING DATE: ${date} (array index: ${index}) ===`);
      
      // FIXED: Use calendar date logic instead of array index
      const currentDate = new Date(date);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = currentDate.getDate();
      
      console.log(`[DIAG] Date ${date}:`);
      console.log(`[DIAG] - Day of week: ${dayOfWeek} (${currentDate.toLocaleDateString('en-US', { weekday: 'long' })})`);
      console.log(`[DIAG] - Day of month: ${dayOfMonth}`);
      
      // FIXED: Calculate dayIndex based on calendar date, not array position
      const cycleLength = menuCycleDays.length > 0 ? menuCycleDays.length : 7;
      const calendarDayIndex = (dayOfMonth - 1) % cycleLength; // 0-based index from day of month
      console.log(`[DIAG] - FIXED dayIndex calculation: ${calendarDayIndex} (based on dayOfMonth-1 % cycleLength ${cycleLength})`);
      console.log(`[DIAG] - Old incorrect dayIndex would have been: ${index} (array position)`);
      
      const dayAssignments = menuAssignments.filter(assignment => assignment.day_index === calendarDayIndex);
      console.log(`[DIAG] - Day assignments found for calendarDayIndex ${calendarDayIndex}: ${dayAssignments.length}`);
      
      return {
        date,
        oldArrayIndex: index,
        fixedCalendarDayIndex: calendarDayIndex,
        assignmentsFound: dayAssignments.length,
        dayOfWeek,
        dayOfMonth,
        cycleLength
      };
    });
    
    // Add comprehensive diagnostic information to the response
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
      })),
      // Critical diagnostic data
      currentDateIssues: {
        today: today.toISOString().split('T')[0],
        todayDayOfWeek: today.getDay(),
        todayDayOfMonth: today.getDate(),
        dayIndexProblem: 'FIXED: Now using calendar-based calculation instead of array index (0,1,2)',
        cycleLength: menuCycleDays.length > 0 ? menuCycleDays.length : 7,
        menuCycleDays: menuCycleDays.map(mcd => ({
          cycleDayId: mcd.id,
          dayIndex: mcd.day_index,
          label: mcd.label,
          cycleName: mcd.cycle_name
        })),
        menuAssignmentsByDayIndex: menuAssignments.reduce((acc, assignment) => {
          if (!acc[assignment.day_index]) acc[assignment.day_index] = [];
          acc[assignment.day_index].push({
            mealId: assignment.meal_id,
            slot: assignment.slot,
            cycleDayId: assignment.cycle_day_id,
            cycleName: assignment.cycle_name
          });
          return acc;
        }, {} as Record<number, any[]>)
      }
    };

    console.log('\n=== DAILY ORDERS DIAGNOSTIC SUMMARY ===');
    console.log(`[DIAG] Menu cycles: ${menuCycles.length}`);
    console.log(`[DIAG] Menu cycle days: ${menuCycleDays.length}`);
    console.log(`[DIAG] Menu assignments: ${menuAssignments.length}`);
    console.log(`[DIAG] Active subscriptions: ${activeSubscriptions.length}`);
    console.log(`[DIAG] PRIMARY ISSUE FIXED: Day index calculation now uses calendar dates (dayOfMonth-1 % cycleLength) instead of array indices`);
    console.log('=== DAILY ORDERS DIAGNOSTIC END ===\n');

    res.json({
      success: true,
      data: dailyPrepData,
      diagnostic: diagnosticInfo,
      message: 'Diagnostic data retrieved successfully'
    });

  } catch (error) {
    console.error('Public diagnostic error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch diagnostic data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fix plan configurations route
router.post('/fix-plan-configurations', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    fixPlanConfigurations();
    res.json({ success: true, message: 'Plan configurations fixed successfully' });
  } catch (error) {
    console.error('Fix plan configurations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fix plan configurations' });
  }
});

router.get('/db-status', async (req: AuthRequest, res: Response) => {
  try {
    const mealCount = mealRepo.count();
    const profileCount = profileRepo.count();
    res.json({ success: true, data: { meals: mealCount, profiles: profileCount } });
  } catch (error) {
    console.error('DB Status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get DB status' });
  }
});

// Shared calculation function for both calendar and daily orders
function calculateMealDataForDate(targetDate: Date, includeIngredients: boolean = false) {
  console.log(`[SHARED_CALC] Calculating meal data for date: ${targetDate.toISOString().split('T')[0]}, includeIngredients: ${includeIngredients}`);
  
  // Get all plans for reference
  const allPlans = planRepo.findAll();
  
  // Get active subscriptions with plan details (Active + Frozen for consistency)
  const activeSubscriptions = subscriptionRepo.query(`
    SELECT s.*, p.meals_per_day, p.base_price_aed, p.delivery_pattern, p.billing_cycle
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status IN ('Active', 'Frozen')
  `);
  
  // Get menu assignments
  const menuAssignments = menuDayAssignmentRepo.query(`
    SELECT
      mda.*,
      mcd.day_index,
      mc.name as cycle_name
    FROM menu_day_assignments mda
    JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
    JOIN menu_cycles mc ON mcd.cycle_id = mc.id
    WHERE mc.is_active = 1
  `);
  
  // Get menu cycle days for day index calculation
  const menuCycleDays = menuDayAssignmentRepo.query(`
    SELECT mcd.*, mc.name as cycle_name
    FROM menu_cycle_days mcd
    JOIN menu_cycles mc ON mcd.cycle_id = mc.id
    WHERE mc.is_active = 1
  `);
  
  // Calculate day index based on calendar date
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = targetDate.getDate();
  const cycleLength = menuCycleDays.length > 0 ? menuCycleDays.length : 7;
  const calendarDayIndex = (dayOfMonth - 1) % cycleLength;
  
  // Get assignments for this day
  const dayAssignments = menuAssignments.filter(assignment => assignment.day_index === calendarDayIndex);
  
  // Calculate meal counts using same logic as calendar
  let lunchCount = 0;
  let dinnerCount = 0;
  const mealsToPrepare: { mealName: string, count: number }[] = [];
  
  // Group subscriptions by plan
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
  
  // Check if today is a delivery day
  let deliveryDays: number[] = [1, 2, 3, 4, 5]; // Default: Mon-Fri
  const isDeliveryDay = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
  
  if (isDeliveryDay && dayAssignments.length > 0) {
    subscriptionsByPlan.forEach(({ plan, subscribers }) => {
      // Parse delivery pattern from JSON
      try {
        if (plan.delivery_pattern) {
          deliveryDays = JSON.parse(plan.delivery_pattern);
        }
      } catch (error) {
        console.log(`[SHARED_CALC] Invalid delivery_pattern for plan ${plan.code}: ${plan.delivery_pattern}`);
      }
      
      const isDeliveryDayForPlan = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
      
      if (isDeliveryDayForPlan) {
        if (plan.meals_per_day === 2) {
          // 2-meal plans get both lunch and dinner
          const lunchAssignment = dayAssignments.find(a => a.slot === 'lunch');
          const dinnerAssignment = dayAssignments.find(a => a.slot === 'dinner');
          
          if (lunchAssignment) {
            lunchCount += subscribers.length;
            const meal = mealRepo.findById(lunchAssignment.meal_id);
            if (meal) {
              mealsToPrepare.push({
                mealName: meal.name_en || meal.name_ar || 'Unknown Meal',
                count: subscribers.length
              });
            }
          }
          
          if (dinnerAssignment) {
            dinnerCount += subscribers.length;
            const meal = mealRepo.findById(dinnerAssignment.meal_id);
            if (meal) {
              mealsToPrepare.push({
                mealName: meal.name_en || meal.name_ar || 'Unknown Meal',
                count: subscribers.length
              });
            }
          }
        } else if (plan.meals_per_day === 1) {
          // 1-meal plans get either lunch OR dinner
          const planHash = plan.code.charCodeAt(0) + plan.code.charCodeAt(1) || 0;
          const dayHash = dayOfWeek + dayOfMonth;
          const combinedHash = (planHash + dayHash) % 2;
          
          const getsLunch = combinedHash === 0;
          const getsDinner = !getsLunch;
          
          if (getsLunch) {
            const lunchAssignment = dayAssignments.find(a => a.slot === 'lunch');
            if (lunchAssignment) {
              lunchCount += subscribers.length;
              const meal = mealRepo.findById(lunchAssignment.meal_id);
              if (meal) {
                mealsToPrepare.push({
                  mealName: meal.name_en || meal.name_ar || 'Unknown Meal',
                  count: subscribers.length
                });
              }
            }
          } else {
            const dinnerAssignment = dayAssignments.find(a => a.slot === 'dinner');
            if (dinnerAssignment) {
              dinnerCount += subscribers.length;
              const meal = mealRepo.findById(dinnerAssignment.meal_id);
              if (meal) {
                mealsToPrepare.push({
                  mealName: meal.name_en || meal.name_ar || 'Unknown Meal',
                  count: subscribers.length
                });
              }
            }
          }
        }
      }
    });
  }
  
  // Calculate ingredients if requested
  let rawMaterials: { name: string, quantity: number, unit: string }[] = [];
  
  if (includeIngredients && mealsToPrepare.length > 0) {
    const meals = mealRepo.findAll();
    const mealIngredients = mealIngredientRepo.findAll();
    const ingredients = ingredientRepo.findAll();
    
    const rawMaterialsMap = new Map<string, { name: string, quantity: number, unit: string }>();
    
    dayAssignments.forEach(assignment => {
      const meal = meals.find(m => m.id === assignment.meal_id);
      if (!meal) return;
      
      // Calculate how many subscribers get this specific meal
      let mealCount = 0;
      
      subscriptionsByPlan.forEach(({ plan, subscribers }) => {
        try {
          if (plan.delivery_pattern) {
            deliveryDays = JSON.parse(plan.delivery_pattern);
          }
        } catch (error) {
          // Use default
        }
        
        const isDeliveryDayForPlan = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
        
        if (isDeliveryDayForPlan) {
          if (plan.meals_per_day === 2) {
            if (assignment.slot === 'lunch' || assignment.slot === 'dinner') {
              mealCount += subscribers.length;
            }
          } else if (plan.meals_per_day === 1) {
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
      
      if (mealCount > 0) {
        const ingredientsForMeal = mealIngredients.filter((mi: any) => mi.meal_id === assignment.meal_id);
        
        ingredientsForMeal.forEach((mealIng: any) => {
          const ingredient = ingredients.find((ing: any) => ing.id === mealIng.ingredient_id);
          if (!ingredient) return;
          
          const key = `${ingredient.name_en}-${ingredient.unit_base || 'g'}`;
          const existing = rawMaterialsMap.get(key);
          const totalWeight = mealIng.weight_g * mealCount;
          
          if (existing) {
            existing.quantity += totalWeight;
          } else {
            rawMaterialsMap.set(key, {
              name: ingredient.name_en || ingredient.name_ar || 'Unknown Ingredient',
              quantity: totalWeight,
              unit: ingredient.unit_base || 'g'
            });
          }
        });
      }
    });
    
    rawMaterials = Array.from(rawMaterialsMap.values());
  }
  
  return {
    date: targetDate.toISOString().split('T')[0],
    dayName: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: dayOfMonth,
    lunchCount,
    dinnerCount,
    totalMeals: lunchCount + dinnerCount,
    mealsToPrepare,
    rawMaterials
  };
}

// Get dashboard data (admin only)
router.get('/dashboard', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== ADMIN DASHBOARD CALLED ===');
    
    // Get all plans for segmentation
    const allPlans = planRepo.findAll();
    
    // Customer Pipeline - Row 1: Main boxes with enhanced subscription states
    const pendingApprovalSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'Pending_Approval'
      ORDER BY s.created_at DESC
    `);
    
    const newJoinerSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'New_Joiner'
      ORDER BY s.created_at DESC
    `);
    
    const curiousSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'Curious'
      ORDER BY s.created_at DESC
    `);
    
    const activeSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'Active'
    `);
    
    const frozenSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'Frozen'
      ORDER BY s.created_at DESC
    `);
    
    const exitingSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'Exiting'
      ORDER BY s.end_date DESC
    `);
    
    const cancelledSubscriptions = subscriptionRepo.query(`
      SELECT s.*, p.base_price_aed, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'cancelled' AND s.end_date >= date('now', '-30 days')
      ORDER BY s.end_date DESC
    `);

    // Calculate revenue for each category
    const pendingApprovalRevenue = pendingApprovalSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const newJoinerRevenue = newJoinerSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const curiousRevenue = curiousSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const activeRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const frozenRevenue = frozenSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const exitingRevenue = exitingSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);
    const cancelledRevenue = cancelledSubscriptions.reduce((sum, sub) => sum + (sub.price_charged_aed || sub.base_price_aed), 0);

    // Customer Pipeline - Row 2: Segmentation by plan for each state
    const pendingApprovalByPlan = allPlans.map(plan => {
      const count = pendingApprovalSubscriptions.filter(sub => sub.plan_id === plan.id).length;
      const revenue = pendingApprovalSubscriptions
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

    const newJoinerByPlan = allPlans.map(plan => {
      const count = newJoinerSubscriptions.filter(sub => sub.plan_id === plan.id).length;
      const revenue = newJoinerSubscriptions
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

    const curiousByPlan = allPlans.map(plan => {
      const count = curiousSubscriptions.filter(sub => sub.plan_id === plan.id).length;
      const revenue = curiousSubscriptions
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

    const frozenByPlan = allPlans.map(plan => {
      const count = frozenSubscriptions.filter(sub => sub.plan_id === plan.id).length;
      const revenue = frozenSubscriptions
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

    const cancelledByPlan = allPlans.map(plan => {
      const count = cancelledSubscriptions.filter(sub => sub.plan_id === plan.id).length;
      const revenue = cancelledSubscriptions
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

    // Calendar data (full month with proper week alignment) - using shared calculation
    const calendarData = [];
    const today = new Date();
    
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
    
    // Generate days for current month using shared calculation function
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      
      // Use shared calculation function for consistency
      const mealData = calculateMealDataForDate(date, false);
      
      calendarData.push({
        date: mealData.date,
        dayName: mealData.dayName,
        dayNumber: mealData.dayNumber,
        lunchCount: mealData.lunchCount,
        dinnerCount: mealData.dinnerCount,
        totalMeals: mealData.totalMeals,
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
          pendingApproval: {
            count: pendingApprovalSubscriptions.length,
            revenue: pendingApprovalRevenue,
            byPlan: pendingApprovalByPlan
          },
          newJoiner: {
            count: newJoinerSubscriptions.length,
            revenue: newJoinerRevenue,
            byPlan: newJoinerByPlan
          },
          curious: {
            count: curiousSubscriptions.length,
            revenue: curiousRevenue,
            byPlan: curiousByPlan
          },
          active: {
            count: activeSubscriptions.length,
            revenue: activeRevenue,
            byPlan: activeByPlan
          },
          frozen: {
            count: frozenSubscriptions.length,
            revenue: frozenRevenue,
            byPlan: frozenByPlan
          },
          exiting: {
            count: exitingSubscriptions.length,
            revenue: exitingRevenue,
            byPlan: exitingByPlan
          },
          cancelled: {
            count: cancelledSubscriptions.length,
            revenue: cancelledRevenue,
            byPlan: cancelledByPlan
          }
        },
        calendar: calendarData
      }
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Get daily orders (admin only)
router.get('/daily-orders', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('=== DAILY ORDERS DIAGNOSTIC START ===');
    const today = new Date();
    console.log(`[DIAG] Today's date: ${today.toISOString().split('T')[0]}`);
    console.log(`[DIAG] Today's day of week: ${today.getDay()} (0=Sunday, 1=Monday, etc.)`);
    console.log(`[DIAG] Today's day of month: ${today.getDate()}`);
    
    // Get next 3 days dates
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    console.log('[DIAG] Processing dates:', dates);
    
    // Get all plans for reference
    const allPlans = planRepo.findAll();
    
    // Get active subscriptions with plan details
    let activeSubscriptions = [];
    try {
      activeSubscriptions = subscriptionRepo.query(`
        SELECT s.*, p.meals_per_day, p.base_price_aed, p.delivery_pattern, p.billing_cycle
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status IN ('Active', 'Frozen')
      `);
      console.log('[DEBUG] Active and Frozen subscriptions found:', activeSubscriptions.length);
      
      if (activeSubscriptions.length > 0) {
        console.log('[DEBUG] Sample active subscription:', activeSubscriptions[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error getting subscription count:', err);
    }
    
    console.log('[DEBUG] Final active subscriptions count:', activeSubscriptions.length);
    
    // DEBUG: Check if we have any menu cycles at all
    let menuCycles = [];
    try {
      menuCycles = menuDayAssignmentRepo.query(`SELECT * FROM menu_cycles WHERE is_active = 1`);
      console.log('[DEBUG] Active menu cycles found:', menuCycles.length);
      if (menuCycles.length > 0) {
        console.log('[DEBUG] Active cycle details:', menuCycles[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error checking menu cycles:', err);
    }
    
    // DEBUG: Check if we have any menu cycle days
    let menuCycleDays = [];
    try {
      menuCycleDays = menuDayAssignmentRepo.query(`
        SELECT mcd.*, mc.name as cycle_name
        FROM menu_cycle_days mcd
        JOIN menu_cycles mc ON mcd.cycle_id = mc.id
        WHERE mc.is_active = 1
      `);
      console.log('[DEBUG] Menu cycle days found:', menuCycleDays.length);
      if (menuCycleDays.length > 0) {
        console.log('[DEBUG] Sample cycle day:', menuCycleDays[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error checking menu cycle days:', err);
    }
    
    // DEBUG: Check if we have any menu assignments
    let menuAssignments = [];
    try {
      menuAssignments = menuDayAssignmentRepo.query(`
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
    } catch (err) {
      console.log('[DEBUG] Error checking menu assignments:', err);
    }
    
    // Get all meals with their ingredients
    let meals: any[] = [];
    let mealIngredients: any[] = [];
    let ingredients: any[] = [];
    
    try {
      meals = mealRepo.findAll();
      console.log('[DEBUG] Loaded meals:', meals.length);
      if (meals.length > 0) {
        console.log('[DEBUG] Sample meal:', meals[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error loading meals:', err);
    }
    
    try {
      mealIngredients = mealIngredientRepo.findAll();
      console.log('[DEBUG] Loaded meal ingredients:', mealIngredients.length);
      if (mealIngredients.length > 0) {
        console.log('[DEBUG] Sample meal ingredient:', mealIngredients[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error loading meal ingredients:', err);
    }
    
    try {
      ingredients = ingredientRepo.findAll();
      console.log('[DEBUG] Loaded ingredients:', ingredients.length);
      if (ingredients.length > 0) {
        console.log('[DEBUG] Sample ingredient:', ingredients[0]);
      }
    } catch (err) {
      console.log('[DEBUG] Error loading ingredients:', err);
    }
    
    // Process each date using shared calculation function
    const dailyPrepData = dates.map((date, index) => {
      console.log(`\n=== PROCESSING DATE: ${date} (array index: ${index}) ===`);
      
      // Use shared calculation function for consistency
      const currentDate = new Date(date);
      const mealData = calculateMealDataForDate(currentDate, true);
      
      console.log('[DEBUG] Final prep data for', date, ':', {
        date: mealData.date,
        mealsToPrepare: mealData.mealsToPrepare,
        rawMaterialsCount: mealData.rawMaterials.length
      });
      
      return {
        date: mealData.date,
        mealsToPrepare: mealData.mealsToPrepare,
        rawMaterials: mealData.rawMaterials
      };
    });

    // Add comprehensive diagnostic information to the response
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
      })),
      // Critical diagnostic data
      currentDateIssues: {
        today: today.toISOString().split('T')[0],
        todayDayOfWeek: today.getDay(),
        todayDayOfMonth: today.getDate(),
        dayIndexProblem: 'FIXED: Now using calendar-based calculation instead of array index (0,1,2)',
        cycleLength: menuCycleDays.length > 0 ? menuCycleDays.length : 7,
        menuCycleDays: menuCycleDays.map(mcd => ({
          cycleDayId: mcd.id,
          dayIndex: mcd.day_index,
          label: mcd.label,
          cycleName: mcd.cycle_name
        })),
        menuAssignmentsByDayIndex: menuAssignments.reduce((acc, assignment) => {
          if (!acc[assignment.day_index]) acc[assignment.day_index] = [];
          acc[assignment.day_index].push({
            mealId: assignment.meal_id,
            slot: assignment.slot,
            cycleDayId: assignment.cycle_day_id,
            cycleName: assignment.cycle_name
          });
          return acc;
        }, {} as Record<number, any[]>)
      }
    };

    console.log('\n=== DAILY ORDERS DIAGNOSTIC SUMMARY ===');
    console.log(`[DIAG] Menu cycles: ${menuCycles.length}`);
    console.log(`[DIAG] Menu cycle days: ${menuCycleDays.length}`);
    console.log(`[DIAG] Menu assignments: ${menuAssignments.length}`);
    console.log(`[DIAG] Active subscriptions: ${activeSubscriptions.length}`);
    console.log(`[DIAG] PRIMARY ISSUE FIXED: Day index calculation now uses calendar dates (dayOfMonth-1 % cycleLength) instead of array indices`);
    console.log('=== DAILY ORDERS DIAGNOSTIC END ===\n');

    res.json({
      success: true,
      data: dailyPrepData,
      diagnostic: diagnosticInfo
    });

  } catch (error) {
    console.error('Get daily orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all subscriptions (admin only)
router.get('/subscriptions', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get subscriptions with joined user and plan data
    const subscriptionsRaw = subscriptionRepo.query(`
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

  } catch (error) {
    console.error('Get admin subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin subscriptions'
    });
  }
});

// Save menu schedule (admin only)
router.post('/menu-schedule', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule data. Expected array.'
      });
    }

    // Pre-validate all meal IDs exist in the database
    const allMealIds = schedule.map(item => item.meal_id).filter(Boolean);
    const uniqueMealIds = [...new Set(allMealIds)];
    
    if (uniqueMealIds.length > 0) {
      const existingMeals = mealRepo.query(
        "SELECT id FROM meals WHERE id IN (" + uniqueMealIds.map(() => "?").join(",") + ")",
        uniqueMealIds
      );
      const existingMealIds = new Set(existingMeals.map(meal => meal.id));
      
      const invalidMealIds = uniqueMealIds.filter(mealId => !existingMealIds.has(mealId));
      if (invalidMealIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid meal IDs provided. These meals do not exist in the database.",
          details: {
            invalidMealIds,
            message: "Please ensure all meal IDs reference existing meals before saving the schedule."
          }
        });
      }
    }

    // Start transaction
    const result = menuDayAssignmentRepo.transaction(() => {
      schedule.forEach((item: any) => {
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
        menuDayAssignmentRepo.execute(
          'DELETE FROM menu_day_assignments WHERE date = ? AND meal_type = ?',
          [date, meal_type]
        );

        // Double-check meal exists (additional safety check)
        const mealExists = mealRepo.findById(meal_id);
        if (!mealExists) {
          throw new Error(`Meal with ID ${meal_id} does not exist in the database`);
        }

        // Insert new assignment
        menuDayAssignmentRepo.execute(
          'INSERT INTO menu_day_assignments (date, meal_type, meal_id) VALUES (?, ?, ?)',
          [date, meal_type, meal_id]
        );
      });
    });

    res.status(201).json({
      success: true,
      message: 'Menu schedule saved successfully'
    });

  } catch (error) {
    console.error('Save menu schedule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save menu schedule'
    });
  }
});

// Get users with pagination and filtering (admin only) - MUST come before /users/:id
router.get('/users/paginated', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('=== INSIDE PAGINATED ENDPOINT ===');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const role = req.query.role as string;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '1 = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Status field doesn't exist in the profiles table, so we'll skip this filter for now
    // In a real implementation, you might want to add a status field to the profiles table
    // or derive status from other fields (e.g., subscription status)
    if (status && status !== 'all') {
      // whereClause += ' AND status = ?';
      // params.push(status);
    }

    if (role && role !== 'all') {
      if (role === 'admin') {
        whereClause += ' AND is_admin = 1';
      } else if (role === 'student') {
        whereClause += ' AND is_student = 1';
      } else if (role === 'user') {
        whereClause += ' AND is_admin = 0 AND is_student = 0';
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM profiles WHERE ${whereClause}`;
    console.log('[DEBUG] Count query:', countQuery);
    console.log('[DEBUG] Count params:', params);
    const countResult = profileRepo.query(countQuery, params);
    console.log('[DEBUG] Count result:', countResult);
    const total = countResult[0].total;

    // Get users with pagination
    const usersQuery = `
      SELECT * FROM profiles
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    console.log('[DEBUG] Users query:', usersQuery);
    console.log('[DEBUG] Users params:', [...params, limit, offset]);
    const users = profileRepo.query(usersQuery, [...params, limit, offset]);
    console.log('[DEBUG] Users result count:', users.length);

    // Transform to match frontend User interface
    const transformedUsers = users.map(user => ({
      id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone_e164,
      is_admin: Boolean(user.is_admin),
      is_student: Boolean(user.is_student),
      status: user.status || 'active',
      language_pref: user.language_pref || 'en',
      created_at: user.created_at,
      updated_at: user.updated_at,
      address: {
        street: user.address || '',
        city: 'Sharjah', // Default city
        district: user.district || ''
      }
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('Get paginated users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = profileRepo.findByUserId(id);
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

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = profileRepo.findAll();

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

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Create user (admin only)
router.post('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    console.log('[DEBUG] Creating user:', userData);
    
    // Validate required fields
    if (!userData.name || !userData.email || !userData.phone || !userData.password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, phone, and password are required'
      });
    }

    // Check if email already exists
    const existingUser = profileRepo.findByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Hash password (in a real implementation, you'd use bcrypt)
    const hashedPassword = userData.password; // In production: await bcrypt.hash(userData.password, 10);

    // Create user
    const newUser = profileRepo.create({
      email: userData.email,
      first_name: userData.name.split(' ')[0] || userData.name,
      last_name: userData.name.split(' ').slice(1).join(' ') || '',
      phone_e164: userData.phone,
      password: hashedPassword, // In production: hashedPassword
      is_admin: Boolean(userData.is_admin),
      is_student: Boolean(userData.is_student),
      language_pref: userData.language_pref || 'en',
      address: userData.address?.street || '',
      district: userData.address?.district || '',
      university_email: userData.university_email || '',
      student_id_expiry: userData.student_id_expiry || ''
    });

    // Transform to match frontend User interface
    const transformedUser = {
      id: newUser.user_id,
      name: `${newUser.first_name} ${newUser.last_name}`,
      email: newUser.email,
      phone: newUser.phone_e164,
      is_admin: Boolean(newUser.is_admin),
      is_student: Boolean(newUser.is_student),
      status: 'active', // Default status for new users
      language_pref: newUser.language_pref,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      address: {
        street: newUser.address || '',
        city: userData.address?.city || 'Sharjah',
        district: newUser.district || ''
      }
    };

    res.status(201).json({
      success: true,
      data: transformedUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Bulk update users (admin only) - MUST come before /users/:id
router.put('/users/bulk', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('=== ADMIN REQUEST: PUT /users/bulk ===');
    const { userIds, updates } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }

    console.log('[DEBUG] Bulk updating users:', userIds, updates);

    const updatedUsers: any[] = [];
    const notFoundUsers: string[] = [];

    for (const userId of userIds) {
      console.log(`[DEBUG] Processing user: ${userId}`);
      
      // Check if user exists
      const existingUser = profileRepo.findByUserId(userId);
      console.log(`[DEBUG] User ${userId} exists:`, !!existingUser);
      
      if (!existingUser) {
        console.log(`[DEBUG] User ${userId} not found, adding to notFoundUsers`);
        notFoundUsers.push(userId);
        continue;
      }

      // Prevent bulk update of the current admin user
      if (req.user && req.user.user_id === userId) {
        console.log(`[DEBUG] Skipping current admin user: ${userId}`);
        continue;
      }

      // Prepare update data
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.is_admin !== undefined) updateData.is_admin = updates.is_admin ? 1 : 0;
      if (updates.is_student !== undefined) updateData.is_student = updates.is_student ? 1 : 0;
      if (updates.language_pref !== undefined) updateData.language_pref = updates.language_pref;
      
      console.log(`[DEBUG] Update data for user ${userId}:`, updateData);

      // Update user - need to use custom update since base repo uses 'id' field
      const updateFields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      if (updateFields.length > 0) {
        const setClause = updateFields.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`;
        console.log(`[DEBUG] Executing SQL: ${sql}`);
        console.log(`[DEBUG] SQL params:`, [...values, new Date().toISOString(), userId]);
        
        profileRepo.execute(sql, [...values, new Date().toISOString(), userId]);
        console.log(`[DEBUG] Update executed for user ${userId}`);
      }
      
      const updatedUser = profileRepo.findByUserId(userId);
      console.log(`[DEBUG] Updated user ${userId} found:`, !!updatedUser);

      if (updatedUser) {
        // Transform to match frontend User interface
        const transformedUser = {
          id: updatedUser.user_id,
          name: `${updatedUser.first_name} ${updatedUser.last_name}`,
          email: updatedUser.email,
          phone: updatedUser.phone_e164,
          is_admin: Boolean(updatedUser.is_admin),
          is_student: Boolean(updatedUser.is_student),
          status: 'active', // Default status as it's not in the Profile model
          language_pref: updatedUser.language_pref,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          address: {
            street: updatedUser.address || '',
            city: 'Sharjah',
            district: updatedUser.district || ''
          }
        };
        
        console.log(`[DEBUG] Adding transformed user to results:`, transformedUser.id);
        updatedUsers.push(transformedUser);
      }
    }

    console.log(`[DEBUG] Bulk update complete. Updated: ${updatedUsers.length}, Not found: ${notFoundUsers.length}`);
    
    if (notFoundUsers.length > 0) {
      console.log(`[DEBUG] Users not found:`, notFoundUsers);
    }

    // If no users were updated and some weren't found, return an error
    if (updatedUsers.length === 0 && notFoundUsers.length > 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        details: `Users not found: ${notFoundUsers.join(', ')}`
      });
    }

    res.json({
      success: true,
      data: updatedUsers,
      message: `${updatedUsers.length} users updated successfully`
    });

  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update users'
    });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    console.log('[DEBUG] Updating user:', id, userData);
    
    // Check if user exists
    const existingUser = profileRepo.findByUserId(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if email already exists (if changing email)
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = profileRepo.findByEmail(userData.email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (userData.name !== undefined) {
      updateData.first_name = userData.name.split(' ')[0] || userData.name;
      updateData.last_name = userData.name.split(' ').slice(1).join(' ') || '';
    }
    
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.phone !== undefined) updateData.phone_e164 = userData.phone;
    if (userData.is_admin !== undefined) updateData.is_admin = Boolean(userData.is_admin);
    if (userData.is_student !== undefined) updateData.is_student = Boolean(userData.is_student);
    if (userData.language_pref !== undefined) updateData.language_pref = userData.language_pref;
    
    if (userData.address) {
      if (userData.address.street !== undefined) updateData.address = userData.address.street;
      if (userData.address.district !== undefined) updateData.district = userData.address.district;
    }
    
    // Hash password if provided
    if (userData.password) {
      updateData.password = userData.password; // In production: await bcrypt.hash(userData.password, 10);
    }
    
    updateData.updated_at = new Date().toISOString();

    // Update user - need to use custom update since base repo uses 'id' field
    const updateFields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    if (updateFields.length > 0) {
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const sql = `UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`;
      profileRepo.execute(sql, [...values, new Date().toISOString(), id]);
    }
    
    const updatedUser = profileRepo.findByUserId(id);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found after update'
      });
    }

    // Transform to match frontend User interface
    const transformedUser = {
      id: updatedUser.user_id,
      name: `${updatedUser.first_name} ${updatedUser.last_name}`,
      email: updatedUser.email,
      phone: updatedUser.phone_e164,
      is_admin: Boolean(updatedUser.is_admin),
      is_student: Boolean(updatedUser.is_student),
      status: 'active', // Default status as it's not in the Profile model
      language_pref: updatedUser.language_pref,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
      address: {
        street: updatedUser.address || '',
        city: userData.address?.city || 'Sharjah',
        district: updatedUser.district || ''
      }
    };

    res.json({
      success: true,
      data: transformedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[DEBUG] Deleting user:', id);
    
    // Check if user exists
    const existingUser = profileRepo.findByUserId(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of the current admin user
    if (req.user && req.user.user_id === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Check if user has active or frozen subscriptions
    const activeSubscriptions = subscriptionRepo.count('user_id = ? AND status IN ?', [id, ['Active', 'Frozen']]);
    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete user with active or frozen subscriptions'
      });
    }

    // Delete user - need to use custom delete since base repo uses 'id' field
    profileRepo.execute('DELETE FROM profiles WHERE user_id = ?', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});



// Bulk delete users (admin only)
router.post('/users/bulk-delete', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    console.log('[DEBUG] Bulk deleting users:', userIds);

    let deletedCount = 0;

    for (const userId of userIds) {
      // Check if user exists
      const existingUser = profileRepo.findByUserId(userId);
      if (!existingUser) continue;

      // Prevent deletion of the current admin user
      if (req.user && req.user.user_id === userId) continue;

      // Check if user has active or frozen subscriptions
      const activeSubscriptions = subscriptionRepo.count('user_id = ? AND status IN ?', [userId, ['Active', 'Frozen']]);
      if (activeSubscriptions > 0) continue;

      // Delete user - need to use custom delete since base repo uses 'id' field
      profileRepo.execute('DELETE FROM profiles WHERE user_id = ?', [userId]);
      deletedCount++;
    }

    res.json({
      success: true,
      message: `${deletedCount} users deleted successfully`
    });

  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete users'
    });
  }
});

// Meal CRUD operations
router.post('/meals', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
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
    const meal = mealRepo.create({
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
      mealData.ingredients.forEach((ing: any) => {
        mealIngredientRepo.create({
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
    
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meal'
    });
  }
});

router.put('/meals/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const mealData = req.body;
    console.log('[DEBUG] Updating meal:', id, mealData);
    
    // Check if meal exists
    const existingMeal = mealRepo.findById(id);
    if (!existingMeal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    // Update meal
    const updatedMeal = mealRepo.update(id, {
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
      const existingIngredients = mealIngredientRepo.findByMeal(id);
      existingIngredients.forEach(ing => {
        mealIngredientRepo.deleteByMealAndIngredient(id, ing.ingredient_id);
      });
      
      // Add new ingredients
      mealData.ingredients.forEach((ing: any) => {
        mealIngredientRepo.create({
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
    
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meal'
    });
  }
});

router.delete('/meals/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[DEBUG] Deleting meal:', id);
    
    // Check if meal exists
    const existingMeal = mealRepo.findById(id);
    if (!existingMeal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    // Delete meal ingredients first
    const mealIngredients = mealIngredientRepo.findByMeal(id);
    mealIngredients.forEach(ing => {
      mealIngredientRepo.deleteByMealAndIngredient(id, ing.ingredient_id);
    });
    
    // Delete meal
    mealRepo.delete(id);
    
    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meal'
    });
  }
});

// Plan CRUD operations
router.post('/plans', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
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
      } else if (days <= 5) {
        deliveryPattern = JSON.stringify([1, 2, 3, 4, 5]); // Mon-Fri
      } else {
        deliveryPattern = JSON.stringify([1, 2, 3, 4, 5, 6]); // Mon-Sat
      }
    }
    
    // Create plan
    const plan = planRepo.create({
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
    
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create plan'
    });
  }
});

router.put('/plans/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const planData = req.body;
    console.log('[DEBUG] Updating plan:', id, planData);
    
    // Check if plan exists
    const existingPlan = planRepo.findById(id);
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
      } else if (days <= 5) {
        deliveryPattern = JSON.stringify([1, 2, 3, 4, 5]); // Mon-Fri
      } else {
        deliveryPattern = JSON.stringify([1, 2, 3, 4, 5, 6]); // Mon-Sat
      }
    }
    
    // Update plan
    const updatedPlan = planRepo.update(id, {
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
    
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan'
    });
  }
});

router.delete('/plans/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[DEBUG] Deleting plan:', id);
    
    // Check if plan exists
    const existingPlan = planRepo.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Check if plan has active or frozen subscriptions
    const activeSubscriptions = subscriptionRepo.count('plan_id = ? AND status IN ?', [id, ['Active', 'Frozen']]);
    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete plan with active or frozen subscriptions'
      });
    }
    
    // Delete plan
    planRepo.delete(id);
    
    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plan'
    });
  }
});

// Bulk state transition endpoints for dashboard quick actions
router.put('/subscriptions/bulk-state', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { subscriptionIds, newState, reason } = req.body;
    
    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subscription IDs array is required'
      });
    }
    
    if (!newState) {
      return res.status(400).json({
        success: false,
        error: 'New state is required'
      });
    }
    
    console.log(`[BULK_STATE] Transitioning ${subscriptionIds.length} subscriptions to ${newState}`);
    
    const updatedSubscriptions: any[] = [];
    const errors: any[] = [];
    
    for (const subscriptionId of subscriptionIds) {
      try {
        // Check if subscription exists
        const existingSubscription = subscriptionRepo.findById(subscriptionId);
        if (!existingSubscription) {
          errors.push({ subscriptionId, error: 'Subscription not found' });
          continue;
        }
        
        // Validate state transition (basic validation)
        const validStates = ['Pending_Approval', 'New_Joiner', 'Curious', 'Active', 'Frozen', 'Exiting', 'Cancelled'];
        if (!validStates.includes(newState)) {
          errors.push({ subscriptionId, error: `Invalid state: ${newState}` });
          continue;
        }
        
        // Update subscription state
        const updatedSubscription = subscriptionRepo.update(subscriptionId, {
          status: newState,
          updated_at: new Date().toISOString()
        });
        
        updatedSubscriptions.push(updatedSubscription);
        
      } catch (error) {
        console.error(`[BULK_STATE] Error updating subscription ${subscriptionId}:`, error);
        errors.push({ subscriptionId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    console.log(`[BULK_STATE] Successfully updated ${updatedSubscriptions.length} subscriptions, ${errors.length} errors`);
    
    res.json({
      success: true,
      data: {
        updatedSubscriptions,
        errors
      },
      message: `${updatedSubscriptions.length} subscriptions updated successfully`
    });
    
  } catch (error) {
    console.error('Bulk state transition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk state transition'
    });
  }
});

// Individual state transition endpoint for dashboard quick actions
router.put('/subscriptions/:id/state', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newState, reason } = req.body;
    
    if (!newState) {
      return res.status(400).json({
        success: false,
        error: 'New state is required'
      });
    }
    
    // Check if subscription exists
    const existingSubscription = subscriptionRepo.findById(id);
    if (!existingSubscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Validate state transition
    const validStates = ['Pending_Approval', 'New_Joiner', 'Curious', 'Active', 'Frozen', 'Exiting', 'Cancelled'];
    if (!validStates.includes(newState)) {
      return res.status(400).json({
        success: false,
        error: `Invalid state: ${newState}`
      });
    }
    
    console.log(`[STATE_TRANSITION] Transitioning subscription ${id} from ${existingSubscription.status} to ${newState}`);
    
    // Update subscription state
    const updatedSubscription = subscriptionRepo.update(id, {
      status: newState,
      updated_at: new Date().toISOString()
    });
    
    // Log state transition history (if we had a history table)
    console.log(`[STATE_TRANSITION] Subscription ${id} transitioned to ${newState}. Reason: ${reason || 'No reason provided'}`);
    
    res.json({
      success: true,
      data: updatedSubscription,
      message: `Subscription state updated to ${newState} successfully`
    });
    
  } catch (error) {
    console.error('State transition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription state'
    });
  }
});

export default router;

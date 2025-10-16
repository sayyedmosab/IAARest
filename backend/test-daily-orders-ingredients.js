const Database = require('better-sqlite3');

// Connect to the database
const db = new Database('./data/ibnexp.db');

// Simulate the daily orders calculation
function testDailyOrdersIngredients() {
  console.log('=== TESTING DAILY ORDERS INGREDIENTS ===');
  
  // Get the same data as the daily orders endpoint
  const menuAssignments = db.prepare(`
    SELECT
      mda.*,
      mcd.day_index,
      mc.name as cycle_name
    FROM menu_day_assignments mda
    JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
    JOIN menu_cycles mc ON mcd.cycle_id = mc.id
    WHERE mc.is_active = 1
  `).all();
  
  console.log(`[TEST] Menu assignments found: ${menuAssignments.length}`);
  
  const meals = db.prepare('SELECT * FROM meals').all();
  console.log(`[TEST] Meals found: ${meals.length}`);
  
  const mealIngredients = db.prepare('SELECT * FROM meal_ingredients').all();
  console.log(`[TEST] Meal ingredients found: ${mealIngredients.length}`);
  
  const ingredients = db.prepare('SELECT * FROM ingredients').all();
  console.log(`[TEST] Ingredients found: ${ingredients.length}`);
  
  // Get today's assignments
  const today = new Date();
  const dayOfMonth = today.getDate();
  const cycleLength = 7; // From diagnostic
  const calendarDayIndex = (dayOfMonth - 1) % cycleLength;
  
  console.log(`[TEST] Today: ${today.toISOString().split('T')[0]}, dayOfMonth: ${dayOfMonth}, calendarDayIndex: ${calendarDayIndex}`);
  
  const dayAssignments = menuAssignments.filter(assignment => assignment.day_index === calendarDayIndex);
  console.log(`[TEST] Today's assignments: ${dayAssignments.length}`);
  
  // Process ingredients like the daily orders endpoint
  const rawMaterialsMap = new Map();
  
  dayAssignments.forEach(assignment => {
    const meal = meals.find(m => m.id === assignment.meal_id);
    if (!meal) {
      console.log(`[TEST] Meal not found for assignment: ${assignment.meal_id}`);
      return;
    }
    
    console.log(`[TEST] Processing meal: ${meal.name_en} (${assignment.slot})`);
    
    // Get ingredients for this meal
    const ingredientsForMeal = mealIngredients.filter(mi => mi.meal_id === assignment.meal_id);
    console.log(`[TEST] - Ingredients for ${meal.name_en}: ${ingredientsForMeal.length} types`);
    
    ingredientsForMeal.forEach(mealIng => {
      const ingredient = ingredients.find(ing => ing.id === mealIng.ingredient_id);
      if (!ingredient) {
        console.log(`[TEST] - Ingredient not found: ${mealIng.ingredient_id}`);
        return;
      }
      
      const key = `${ingredient.name_en}-${ingredient.unit_base || 'g'}`;
      const existing = rawMaterialsMap.get(key);
      
      if (existing) {
        existing.quantity += mealIng.weight_g;
        console.log(`[TEST] - Updated ${ingredient.name_en}: ${existing.quantity}g (total)`);
      } else {
        rawMaterialsMap.set(key, {
          name: ingredient.name_en || ingredient.name_ar || 'Unknown Ingredient',
          quantity: mealIng.weight_g,
          unit: ingredient.unit_base || 'g'
        });
        console.log(`[TEST] - Added ${ingredient.name_en}: ${mealIng.weight_g}g`);
      }
    });
  });
  
  const finalIngredients = Array.from(rawMaterialsMap.values());
  console.log(`\n[TEST] Final ingredients list: ${finalIngredients.length} items`);
  finalIngredients.forEach((ing, index) => {
    console.log(`[TEST] ${index + 1}. ${ing.name}: ${ing.quantity} ${ing.unit}`);
  });
  
  console.log('\n=== TEST COMPLETE ===');
  
  // Close database
  db.close();
}

testDailyOrdersIngredients();
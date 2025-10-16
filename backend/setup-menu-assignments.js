const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, 'data', 'ibnexp.db'));

console.log('Setting up menu assignments for daily orders calculation...');

try {
  // Get active menu cycle
  const activeCycle = db.prepare('SELECT * FROM menu_cycles WHERE is_active = 1 LIMIT 1').get();
  if (!activeCycle) {
    console.error('No active menu cycle found');
    process.exit(1);
  }
  console.log(`Found active menu cycle: ${activeCycle.name} (ID: ${activeCycle.id})`);

  // Get menu cycle days
  const cycleDays = db.prepare('SELECT * FROM menu_cycle_days WHERE cycle_id = ? ORDER BY day_index').all(activeCycle.id);
  console.log(`Found ${cycleDays.length} cycle days`);

  // Get meals
  const meals = db.prepare('SELECT * FROM meals WHERE is_active = 1').all();
  console.log(`Found ${meals.length} active meals`);

  // Clear existing menu assignments
  db.prepare('DELETE FROM menu_day_assignments').run();
  console.log('Cleared existing menu assignments');

  // Create menu assignments for each cycle day
  cycleDays.forEach((cycleDay, dayIndex) => {
    // Assign lunch and dinner for each day using different meals
    const lunchMeal = meals[dayIndex % meals.length];
    const dinnerMeal = meals[(dayIndex + 1) % meals.length];

    // Create lunch assignment
    const lunchAssignmentId = `lunch_${cycleDay.id}_${Date.now()}`;
    db.prepare(`
      INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(lunchAssignmentId, cycleDay.id, lunchMeal.id, 'lunch');

    // Create dinner assignment
    const dinnerAssignmentId = `dinner_${cycleDay.id}_${Date.now()}`;
    db.prepare(`
      INSERT INTO menu_day_assignments (id, cycle_day_id, meal_id, slot, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(dinnerAssignmentId, cycleDay.id, dinnerMeal.id, 'dinner');

    console.log(`Day ${cycleDay.day_index} (${cycleDay.label}): Lunch=${lunchMeal.name_en}, Dinner=${dinnerMeal.name_en}`);
  });

  // Verify the assignments
  const assignmentCount = db.prepare('SELECT COUNT(*) as count FROM menu_day_assignments').get();
  console.log(`\nCreated ${assignmentCount.count} menu assignments`);

  console.log('\nMenu assignments setup completed successfully!');
  
} catch (error) {
  console.error('Error setting up menu assignments:', error);
  process.exit(1);
} finally {
  db.close();
}
const Database = require('better-sqlite3');
const path = require('path');

// Initialize database connection
const dbPath = path.join(__dirname, 'data', 'ibnexp.db');
console.log('Connecting to database:', dbPath);

const db = new Database(dbPath);

try {
  console.log('=== CLEANING UP ORPHANED MENU ASSIGNMENTS ===\n');

  // Start a transaction for safe cleanup
  const transaction = db.transaction(() => {
    // Step 1: Get all orphaned assignments before deletion
    const orphanedAssignments = db.prepare(`
      SELECT 
        mda.id,
        mda.meal_id,
        mda.cycle_day_id,
        mda.slot,
        mda.plan_id,
        mcd.day_index,
        mc.name as cycle_name
      FROM menu_day_assignments mda
      JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
      JOIN menu_cycles mc ON mcd.cycle_id = mc.id
      WHERE mc.is_active = 1
      AND mda.meal_id NOT IN (SELECT id FROM meals)
      ORDER BY mc.name, mcd.day_index, mda.slot
    `).all();

    console.log(`Found ${orphanedAssignments.length} orphaned assignments to delete:`);
    
    if (orphanedAssignments.length > 0) {
      orphanedAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.cycle_name} (Day ${assignment.day_index}) - ${assignment.slot} - Meal ID: ${assignment.meal_id}`);
      });

      // Step 2: Delete orphaned assignments
      const deleteResult = db.prepare(`
        DELETE FROM menu_day_assignments 
        WHERE meal_id NOT IN (SELECT id FROM meals)
      `).run();

      console.log(`\n✅ Deleted ${deleteResult.changes} orphaned assignments`);
    } else {
      console.log('No orphaned assignments found to delete.');
    }

    // Step 3: Verify cleanup
    const remainingAssignments = db.prepare(`
      SELECT COUNT(*) as count
      FROM menu_day_assignments mda
      JOIN menu_cycle_days mcd ON mda.cycle_day_id = mcd.id
      JOIN menu_cycles mc ON mcd.cycle_id = mc.id
      WHERE mc.is_active = 1
    `).get();

    const remainingOrphaned = db.prepare(`
      SELECT COUNT(*) as count
      FROM menu_day_assignments 
      WHERE meal_id NOT IN (SELECT id FROM meals)
    `).get();

    console.log(`\n=== VERIFICATION ===`);
    console.log(`Remaining menu assignments: ${remainingAssignments.count}`);
    console.log(`Remaining orphaned assignments: ${remainingOrphaned.count}`);

    if (remainingOrphaned.count === 0) {
      console.log('✅ All orphaned assignments successfully cleaned up!');
    } else {
      console.log('⚠️  Some orphaned assignments still remain. Manual investigation may be needed.');
    }

    return {
      deletedCount: orphanedAssignments.length,
      remainingAssignments: remainingAssignments.count,
      remainingOrphaned: remainingOrphaned.count
    };
  });

  // Execute the transaction
  const result = transaction();
  
  console.log('\n=== CLEANUP SUMMARY ===');
  console.log(`Orphaned assignments deleted: ${result.deletedCount}`);
  console.log(`Total remaining assignments: ${result.remainingAssignments}`);
  console.log(`Remaining orphaned assignments: ${result.remainingOrphaned}`);

} catch (error) {
  console.error('Error during cleanup:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('\nDatabase connection closed.');
}

/**
 * Create Test Subscriptions Directly via SQL
 * 
 * This script will create test subscriptions using direct SQL to bypass
 * any repository issues and verify the daily orders system works correctly.
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

console.log('=== CREATE TEST SUBSCRIPTIONS (DIRECT SQL) ===');

const db = new sqlite3(path.join(__dirname, 'data', 'ibnexp.db'));

try {
  // Get available plans
  const plans = db.prepare('SELECT * FROM plans').all();
  console.log(`Found ${plans.length} plans:`);
  plans.forEach(plan => {
    console.log(`  - ${plan.code}: ${plan.name_en} (${plan.meals_per_day} meals/day, ${plan.delivery_days} days/month)`);
  });

  // Get non-admin profiles
  const profiles = db.prepare('SELECT * FROM profiles WHERE is_admin = 0 LIMIT 5').all();
  console.log(`\nFound ${profiles.length} non-admin profiles for testing`);

  // Create test subscriptions using direct SQL
  const testSubscriptions = [];
  
  profiles.forEach((profile, index) => {
    const plan = plans[index % plans.length]; // Rotate through plans
    
    const subscriptionId = `sub_test_${Date.now()}_${index}`;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
    
    const insertStmt = db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, plan_id, status, start_date, end_date, 
        price_charged_aed, currency, created_at, updated_at,
        student_discount_applied, renewal_type, has_successful_payment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
      const result = insertStmt.run(
        subscriptionId,
        profile.user_id,
        plan.id,
        'Active',
        startDate,
        endDate,
        plan.base_price_aed,
        'AED',
        new Date().toISOString(),
        new Date().toISOString(),
        0,
        'manual',
        1
      );
      
      testSubscriptions.push({
        id: subscriptionId,
        userId: profile.user_id,
        planId: plan.id,
        planCode: plan.code,
        mealsPerDay: plan.meals_per_day
      });
      
      console.log(`✅ Created subscription for ${profile.first_name} ${profile.last_name} - Plan: ${plan.code}`);
    } catch (error) {
      console.log(`❌ Failed to create subscription for ${profile.first_name}: ${error.message}`);
    }
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Created ${testSubscriptions.length} test subscriptions`);
  
  // Verify active subscriptions
  const activeSubscriptions = db.prepare(`
    SELECT s.*, p.code as plan_code, p.meals_per_day, pr.first_name, pr.last_name
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN profiles pr ON s.user_id = pr.user_id
    WHERE s.status = 'Active'
  `).all();
  
  console.log(`\nActive subscriptions in database: ${activeSubscriptions.length}`);
  activeSubscriptions.forEach(sub => {
    console.log(`  - ${sub.first_name} ${sub.last_name}: ${sub.plan_code} (${sub.meals_per_day} meals/day)`);
  });

} catch (error) {
  console.error('Error creating test subscriptions:', error);
} finally {
  db.close();
}

console.log('\n=== TEST SUBSCRIPTIONS CREATION COMPLETE ===');
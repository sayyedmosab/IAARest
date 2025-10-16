/**
 * Create Test Subscriptions for Daily Orders Testing
 * 
 * This script will create test subscriptions to verify the daily orders
 * system works correctly with actual subscriber data.
 */

const { DatabaseConnection } = require('./dist/src/database/database.js');
const { subscriptionRepo, planRepo, profileRepo } = require('./dist/src/services/repositories.js');

console.log('=== CREATE TEST SUBSCRIPTIONS ===');

// Initialize database connection
const db = new DatabaseConnection();

try {
  // Get available plans
  const plans = planRepo.findAll();
  console.log(`Found ${plans.length} plans:`);
  plans.forEach(plan => {
    console.log(`  - ${plan.code}: ${plan.name_en} (${plan.meals_per_day} meals/day, ${plan.delivery_days} days/month)`);
  });

  // Get non-admin profiles
  const profiles = profileRepo.query('SELECT * FROM profiles WHERE is_admin = 0 LIMIT 5');
  console.log(`\nFound ${profiles.length} non-admin profiles for testing`);

  // Create test subscriptions
  const testSubscriptions = [];
  
  profiles.forEach((profile, index) => {
    const plan = plans[index % plans.length]; // Rotate through plans
    
    const subscriptionData = {
      user_id: profile.user_id,
      plan_id: plan.id,
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      price_charged_aed: plan.base_price_aed
    };
    
    try {
      const subscription = subscriptionRepo.create(subscriptionData);
      testSubscriptions.push(subscription);
      console.log(`✅ Created subscription for ${profile.first_name} ${profile.last_name} - Plan: ${plan.code}`);
    } catch (error) {
      console.log(`❌ Failed to create subscription for ${profile.first_name}: ${error.message}`);
    }
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Created ${testSubscriptions.length} test subscriptions`);
  
  // Verify active subscriptions
  const activeSubscriptions = subscriptionRepo.query(`
    SELECT s.*, p.code as plan_code, p.meals_per_day, pr.first_name, pr.last_name
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN profiles pr ON s.user_id = pr.user_id
    WHERE s.status = 'Active'
  `);
  
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
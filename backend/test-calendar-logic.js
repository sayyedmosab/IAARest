// Test script to verify calendar logic fixes
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data', 'ibnexp.db'));

// Get active subscriptions with plan details
const query = `
  SELECT s.id, s.plan_id, p.code as plan_code, p.meals_per_day, p.delivery_days, p.delivery_pattern
  FROM subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.status = 'active'
  ORDER BY p.code
`;

db.all(query, (err, subscriptions) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('=== ACTIVE SUBSCRIPTIONS ===');
  subscriptions.forEach(sub => {
    console.log(`${sub.plan_code}: ${sub.meals_per_day} meals/day, delivery pattern: ${sub.delivery_pattern}`);
  });

  console.log('\n=== TESTING MEAL CALCULATION FOR THIS WEEK ===');
  
  // Test for each day of this week
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() - currentDay + dayOffset); // Start from Sunday
    
    const dayOfWeek = testDate.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const dayOfMonth = testDate.getDate();
    
    console.log(`\n--- ${dayName} (${dayOfMonth}) ---`);
    
    let lunchCount = 0;
    let dinnerCount = 0;
    
    // Calculate meals for each plan based on delivery schedule
    const subscriptionsByPlan = new Map();
    subscriptions.forEach(sub => {
      if (!subscriptionsByPlan.has(sub.plan_id)) {
        subscriptionsByPlan.set(sub.plan_id, {
          plan: sub,
          subscribers: []
        });
      }
      subscriptionsByPlan.get(sub.plan_id).subscribers.push(sub);
    });
    
    subscriptionsByPlan.forEach(({ plan, subscribers }) => {
      // Parse delivery pattern from JSON to determine if today is a delivery day
      let deliveryDays = [1, 2, 3, 4, 5]; // Default: Mon-Fri
      try {
        if (plan.delivery_pattern) {
          deliveryDays = JSON.parse(plan.delivery_pattern);
        }
      } catch (error) {
        console.log(`Invalid delivery_pattern for plan ${plan.plan_code}: ${plan.delivery_pattern}`);
      }
      
      // Check if today is a delivery day (convert Sunday=0 to Monday=1 format)
      const isDeliveryDay = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
      
      console.log(`${plan.plan_code}: Delivery day? ${isDeliveryDay} (pattern: [${deliveryDays.join(',')}], today: ${dayOfWeek})`);
      
      if (isDeliveryDay) {
        if (plan.meals_per_day === 2) {
          // 2-meal plans get both lunch and dinner on delivery days
          lunchCount += subscribers.length;
          dinnerCount += subscribers.length;
          console.log(`  ${plan.plan_code}: +${subscribers.length} lunch, +${subscribers.length} dinner (2-meal plan)`);
        } else if (plan.meals_per_day === 1) {
          // 1-meal plans get either lunch OR dinner
          // Use deterministic pattern based on day of week and plan ID for consistency
          const planHash = plan.plan_code.charCodeAt(0) + plan.plan_code.charCodeAt(1) || 0;
          const dayHash = dayOfWeek + dayOfMonth;
          const combinedHash = (planHash + dayHash) % 2;
          
          if (combinedHash === 0) {
            lunchCount += subscribers.length;
            console.log(`  ${plan.plan_code}: +${subscribers.length} lunch (1-meal plan)`);
          } else {
            dinnerCount += subscribers.length;
            console.log(`  ${plan.plan_code}: +${subscribers.length} dinner (1-meal plan)`);
          }
        }
      }
    });
    
    console.log(`  Daily totals: ${lunchCount} lunch + ${dinnerCount} dinner = ${lunchCount + dinnerCount} total meals`);
  }

  db.close();
});
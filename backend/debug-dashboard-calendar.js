// Debug script to test the exact calendar logic from admin dashboard
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data', 'ibnexp.db'));

// Copy the exact logic from admin.ts dashboard route
function generateCalendarData() {
  return new Promise((resolve, reject) => {
    // Get active subscriptions with plan details
    const subscriptionsQuery = `
      SELECT s.*, p.meals_per_day, p.base_price_aed, p.code as plan_code, p.delivery_pattern
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `;

    db.all(subscriptionsQuery, (err, activeSubscriptions) => {
      if (err) {
        reject(err);
        return;
      }

      // Get all plans for segmentation
      const plansQuery = `SELECT * FROM plans WHERE status = 'active'`;
      
      db.all(plansQuery, (err, allPlans) => {
        if (err) {
          reject(err);
          return;
        }

        console.log('=== DASHBOARD CALENDAR DEBUG ===');
        console.log('Active subscriptions:', activeSubscriptions.length);
        console.log('Plans:', allPlans.length);

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
        
        console.log(`Subscriptions by plan:`, Array.from(subscriptionsByPlan.entries()).map(([planId, data]) => ({
          planId,
          planCode: data.plan.code,
          mealsPerDay: data.plan.meals_per_day,
          deliveryDays: data.plan.delivery_days,
          subscriberCount: data.subscribers.length
        })));
        
        // Generate calendar for today
        const calendarData = [];
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dayOfMonth = today.getDate();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        let lunchCount = 0;
        let dinnerCount = 0;
        
        console.log(`\n=== CALCULATING FOR TODAY (${dateStr}) ===`);
        console.log(`Day of week: ${dayOfWeek} (0=Sunday, 1=Monday, etc.)`);
        console.log(`Day of month: ${dayOfMonth}`);
        
        // Calculate meals for each plan based on delivery schedule
        subscriptionsByPlan.forEach(({ plan, subscribers }) => {
          console.log(`\nProcessing plan: ${plan.code}`);
          console.log(`  Meals per day: ${plan.meals_per_day}`);
          console.log(`  Delivery pattern: ${plan.delivery_pattern}`);
          console.log(`  Subscribers: ${subscribers.length}`);
          
          // Parse delivery pattern from JSON to determine if today is a delivery day
          let deliveryDays = [1, 2, 3, 4, 5]; // Default: Mon-Fri
          try {
            if (plan.delivery_pattern) {
              deliveryDays = JSON.parse(plan.delivery_pattern);
            }
          } catch (error) {
            console.log(`[CALENDAR_DEBUG] Invalid delivery_pattern for plan ${plan.code}: ${plan.delivery_pattern}`);
          }
          
          // Check if today is a delivery day (convert Sunday=0 to Monday=1 format)
          const isDeliveryDay = dayOfWeek !== 0 && deliveryDays.includes(dayOfWeek);
          
          console.log(`  Is delivery day? ${isDeliveryDay} (dayOfWeek=${dayOfWeek}, pattern=[${deliveryDays.join(',')}])`);
          
          if (isDeliveryDay) {
            if (plan.meals_per_day === 2) {
              // 2-meal plans get both lunch and dinner on delivery days
              lunchCount += subscribers.length;
              dinnerCount += subscribers.length;
              console.log(`  +${subscribers.length} lunch, +${subscribers.length} dinner (2-meal plan)`);
            } else if (plan.meals_per_day === 1) {
              // 1-meal plans get either lunch OR dinner
              // Use deterministic pattern based on day of week and plan ID for consistency
              const planHash = plan.code.charCodeAt(0) + plan.code.charCodeAt(1) || 0;
              const dayHash = dayOfWeek + dayOfMonth;
              const combinedHash = (planHash + dayHash) % 2;
              
              console.log(`  Hash calculation: planHash=${planHash}, dayHash=${dayHash}, combinedHash=${combinedHash}`);
              
              if (combinedHash === 0) {
                lunchCount += subscribers.length;
                console.log(`  +${subscribers.length} lunch (1-meal plan)`);
              } else {
                dinnerCount += subscribers.length;
                console.log(`  +${subscribers.length} dinner (1-meal plan)`);
              }
            }
          } else {
            console.log(`  No meals (not a delivery day)`);
          }
        });
        
        const totalMeals = lunchCount + dinnerCount;
        
        console.log(`\n=== FINAL RESULTS ===`);
        console.log(`Lunch: ${lunchCount}`);
        console.log(`Dinner: ${dinnerCount}`);
        console.log(`Total: ${totalMeals}`);
        
        const dayData = {
          date: dateStr,
          dayName: today.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: dayOfMonth,
          lunchCount,
          dinnerCount,
          totalMeals,
          isCurrentMonth: true
        };
        
        resolve(dayData);
      });
    });
  });
}

// Run the test
generateCalendarData()
  .then(result => {
    console.log('\n=== CALENDAR DATA STRUCTURE ===');
    console.log(JSON.stringify(result, null, 2));
    db.close();
  })
  .catch(err => {
    console.error('Error:', err);
    db.close();
  });
const { profileRepo, subscriptionRepo, planRepo } = require('../dist/src/services/repositories.js');

// Simple UUID generator function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Plan IDs from the database
const PLAN_IDS = {
  FUEL: '958037f4-d183-4b5a-b286-82e56ddeec0a',
  FOCUS: '72bd8f87-39bd-46bf-92fc-21443baa75cb', 
  FLEX: '0b7e5d02-d10f-4563-8f37-140c4c2e1ea2'
};

// Sample user data
const sampleUsers = [
  { first_name: 'Ahmed', last_name: 'Al Mansouri', email: 'ahmed.m@university.ae', phone: '+971501234567', is_student: true },
  { first_name: 'Fatima', last_name: 'Al Hashimi', email: 'fatima.h@gmail.com', phone: '+971502345678', is_student: false },
  { first_name: 'Mohammed', last_name: 'Al Shamsi', email: 'mohammed.s@university.ae', phone: '+971503456789', is_student: true },
  { first_name: 'Mariam', last_name: 'Al Qassimi', email: 'mariam.q@gmail.com', phone: '+971504567890', is_student: false },
  { first_name: 'Abdullah', last_name: 'Al Nahyan', email: 'abdullah.n@university.ae', phone: '+971505678901', is_student: true },
  { first_name: 'Aisha', last_name: 'Al Muhairi', email: 'aisha.m@gmail.com', phone: '+971506789012', is_student: false },
  { first_name: 'Khalid', last_name: 'Al Suwaidi', email: 'khalid.s@university.ae', phone: '+971507890123', is_student: true },
  { first_name: 'Noura', last_name: 'Al Marri', email: 'noura.m@gmail.com', phone: '+971508901234', is_student: false },
  { first_name: 'Saeed', last_name: 'Al Balooshi', email: 'saeed.b@university.ae', phone: '+971509012345', is_student: true },
  { first_name: 'Latifa', last_name: 'Al Dhaheri', email: 'latifa.d@gmail.com', phone: '+971510123456', is_student: false },
  { first_name: 'Omar', last_name: 'Al Kaabi', email: 'omar.k@university.ae', phone: '+971511234567', is_student: true },
  { first_name: 'Shamma', last_name: 'Al Mehairi', email: 'shamma.m@gmail.com', phone: '+971512345678', is_student: false },
  { first_name: 'Hamdan', last_name: 'Al Ali', email: 'hamdan.a@university.ae', phone: '+971513456789', is_student: true },
  { first_name: 'Amna', last_name: 'Al Hammadi', email: 'amna.h@gmail.com', phone: '+971514567890', is_student: false },
  { first_name: 'Mansour', last_name: 'Al Zaabi', email: 'mansour.z@university.ae', phone: '+971515678901', is_student: true },
  { first_name: 'Rashid', last_name: 'Al Rumaithi', email: 'rashid.r@gmail.com', phone: '+971516789012', is_student: false },
  { first_name: 'Hessa', last_name: 'Al Muhairi', email: 'hessa.m@university.ae', phone: '+971517890123', is_student: true },
  { first_name: 'Sultan', last_name: 'Al Shamsi', email: 'sultan.s@gmail.com', phone: '+971518901234', is_student: false },
  { first_name: 'Maryam', last_name: 'Al Qamzi', email: 'maryam.q@university.ae', phone: '+971519012345', is_student: true },
  { first_name: 'Yousef', last_name: 'Al Dhaheri', email: 'yousef.d@gmail.com', phone: '+971520123456', is_student: false }
];

// Sharjah districts for variety
const sharjahDistricts = [
  'Al Majaz', 'Al Qasba', 'Al Khan', 'Al Nahda', 'Al Taawun',
  'Al Yarmook', 'Al Wahat', 'Al Layyah', 'Al Sharq', 'Al Gharb',
  'Al Buheirah', 'Al Mamzar', 'Al Rahmaniya', 'Al Sajaah'
];

function getRandomDate(daysAgoStart, daysAgoEnd) {
  const daysAgo = Math.floor(Math.random() * (daysAgoEnd - daysAgoStart + 1)) + daysAgoStart;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getRandomPlan() {
  const plans = Object.values(PLAN_IDS);
  return plans[Math.floor(Math.random() * plans.length)];
}

function calculateEndDate(startDate, planId) {
  const plan = planRepo.findById(planId);
  const days = plan?.delivery_days || 20;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate.toISOString().split('T')[0];
}

function createUsersAndSubscriptions() {
  console.log('Creating realistic subscribers...');
  
  // Clear existing test data
  console.log('Clearing existing test data...');
  const existingSubscriptions = subscriptionRepo.findAll();
  existingSubscriptions.forEach(sub => {
    subscriptionRepo.delete(sub.id);
  });
  
  const existingProfiles = profileRepo.findAll().filter(p => p.email.includes('@university.ae') || p.email.includes('@gmail.com'));
  existingProfiles.forEach(profile => {
    profileRepo.delete(profile.user_id);
  });
  
  const results = {
    active: 0,
    cancelled: 0,
    pending_payment: 0,
    total: 0
  };
  
  // Create 20 subscribers with required distribution:
  // - 12 active (majority)
  // - 4 cancelled (in exit period)
  // - 4 pending payment (new but not approved)
  
  sampleUsers.forEach((user, index) => {
    try {
      // Create user profile
      const profile = profileRepo.create({
        email: user.email,
        password: 'hashed_password_' + Math.random().toString(36),
        first_name: user.first_name,
        last_name: user.last_name,
        phone_e164: user.phone,
        language_pref: Math.random() > 0.5 ? 'en' : 'ar',
        is_admin: 0,
        is_student: user.is_student ? 1 : 0,
        university_email: user.is_student ? user.email : null,
        student_id_expiry: user.is_student ? getRandomDate(30, 365) : null,
        address: `Building ${Math.floor(Math.random() * 200) + 1}, Street ${Math.floor(Math.random() * 50) + 1}`,
        district: sharjahDistricts[Math.floor(Math.random() * sharjahDistricts.length)]
      });
      
      // Determine subscription status based on requirements
      let status, startDate, endDate;
      
      if (index < 12) {
        // 12 active subscribers
        status = 'active';
        startDate = getRandomDate(1, 60); // Started recently to long ago
        endDate = calculateEndDate(startDate, getRandomPlan());
      } else if (index < 16) {
        // 4 cancelled subscribers (in exit period)
        status = 'cancelled';
        startDate = getRandomDate(10, 30); // Started 10-30 days ago
        endDate = getRandomDate(1, 10); // Ending soon (already cancelled)
      } else {
        // 4 pending payment subscribers
        status = 'pending_payment';
        startDate = getRandomDate(1, 5); // Very recent
        endDate = calculateEndDate(startDate, getRandomPlan());
      }
      
      const planId = getRandomPlan();
      const plan = planRepo.findById(planId);
      
      // Create subscription
      const subscription = subscriptionRepo.create({
        id: generateUUID(),
        user_id: profile.user_id,
        plan_id: planId,
        status: status,
        start_date: startDate,
        end_date: endDate,
        student_discount_applied: user.is_student ? 1 : 0,
        price_charged_aed: user.is_student ? plan.base_price_aed * 0.8 : plan.base_price_aed,
        currency: 'AED',
        renewal_type: 'manual',
        has_successful_payment: status === 'active' ? 1 : 0
      });
      
      console.log(`Created ${status} subscription: ${user.first_name} ${user.last_name} (${plan.code} - ${plan.meals_per_day} meals/day)`);
      
      results[status]++;
      results.total++;
      
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  });
  
  console.log('\n=== SUBSCRIBER CREATION SUMMARY ===');
  console.log(`Total subscribers created: ${results.total}`);
  console.log(`Active: ${results.active}`);
  console.log(`Cancelled: ${results.cancelled}`);
  console.log(`Pending payment: ${results.pending_payment}`);
  
  // Verify plan distribution
  const planDistribution = {};
  Object.keys(PLAN_IDS).forEach(planCode => {
    const count = subscriptionRepo.count('plan_id = ?', [PLAN_IDS[planCode]]);
    planDistribution[planCode] = count;
  });
  
  console.log('\n=== PLAN DISTRIBUTION ===');
  Object.entries(planDistribution).forEach(([code, count]) => {
    console.log(`${code}: ${count} subscribers`);
  });
  
  return results;
}

// Run the script
createUsersAndSubscriptions();
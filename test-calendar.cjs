// Test script to verify calendar generation logic
const { generateCalendar } = require('./backend/dist/src/routes/admin');

console.log('Testing calendar generation for October 2025...');

// Test for October 2025 (current month)
const calendarData = generateCalendar(2025, 9); // Month is 0-indexed, so September = 9

console.log('Calendar Data:');
console.log(`Year: ${calendarData.year}`);
console.log(`Month: ${calendarData.month}`);
console.log(`First Day of Week: ${calendarData.firstDayOfWeek}`);
console.log(`Total Days: ${calendarData.days.length}`);

// Find October 14 (today)
const oct14 = calendarData.days.find(day => day.dayNumber === 14 && day.isCurrentMonth);
if (oct14) {
  console.log('\nOctober 14 found:');
  console.log(`Date: ${oct14.date}`);
  console.log(`Day of Week: ${oct14.dayOfWeek} (0=Sunday, 1=Monday, ...)`);
  console.log(`Is Current Month: ${oct14.isCurrentMonth}`);
  console.log(`Lunch Count: ${oct14.lunchCount}`);
  console.log(`Dinner Count: ${oct14.dinnerCount}`);
  console.log(`Total Meals: ${oct14.totalMeals}`);
  
  // Check if it's Tuesday (dayOfWeek = 2)
  if (oct14.dayOfWeek === 2) {
    console.log('✅ CORRECT: October 14 is correctly identified as Tuesday');
  } else {
    console.log(`❌ ERROR: October 14 is identified as day ${oct14.dayOfWeek} (should be 2 for Tuesday)`);
  }
} else {
  console.log('❌ ERROR: October 14 not found in calendar data');
}

// Show first week to verify alignment
console.log('\nFirst week of October 2025:');
const firstWeek = calendarData.days.slice(0, 7);
firstWeek.forEach((day, index) => {
  console.log(`Day ${index}: ${day.dayNumber} (${day.isCurrentMonth ? 'current' : 'padding'}) - Day of week: ${day.dayOfWeek}`);
});
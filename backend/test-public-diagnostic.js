/**
 * Public Diagnostic Test
 * 
 * This script will call the public diagnostic endpoint to validate
 * the day index calculation and menu cycle synchronization issues.
 */

const http = require('http');

console.log('=== PUBLIC DAILY ORDERS DIAGNOSTIC TEST ===');
console.log('Making call to public diagnostic endpoint...');
console.log('This will trigger the enhanced diagnostic logs.');
console.log('');

// Make a request to the public diagnostic endpoint
const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/diagnostic-daily-orders',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(body);
            console.log('\n=== RESPONSE SUMMARY ===');
            console.log(`Success: ${response.success}`);
            
            if (response.success) {
                console.log(`Days processed: ${response.data.length}`);
                
                response.data.forEach((day, index) => {
                    console.log(`\nDay ${index + 1}: ${day.date}`);
                    console.log(`  - Array index: ${day.oldArrayIndex}`);
                    console.log(`  - Fixed calendar day index: ${day.fixedCalendarDayIndex}`);
                    console.log(`  - Assignments found: ${day.assignmentsFound}`);
                    console.log(`  - Day of week: ${day.dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.dayOfWeek]})`);
                    console.log(`  - Day of month: ${day.dayOfMonth}`);
                    console.log(`  - Cycle length: ${day.cycleLength}`);
                    
                    if (day.assignmentsFound === 0) {
                        console.log(`  ⚠️  No assignments found for this day!`);
                    }
                });
                
                if (response.diagnostic) {
                    console.log('\n=== SYSTEM STATUS ===');
                    console.log(`Menu cycles: ${response.diagnostic.hasActiveMenuCycles ? '✅' : '❌'}`);
                    console.log(`Menu cycle days: ${response.diagnostic.hasMenuCycleDays ? '✅' : '❌'}`);
                    console.log(`Menu assignments: ${response.diagnostic.hasMenuAssignments ? '✅' : '❌'}`);
                    console.log(`Meals: ${response.diagnostic.hasMeals ? '✅' : '❌'}`);
                    console.log(`Meal ingredients: ${response.diagnostic.hasMealIngredients ? '✅' : '❌'}`);
                    console.log(`Ingredients: ${response.diagnostic.hasIngredients ? '✅' : '❌'}`);
                    console.log(`Active subscriptions: ${response.diagnostic.activeSubscriptionsCount}`);
                    
                    if (response.diagnostic.currentDateIssues) {
                        console.log('\n=== CRITICAL ISSUES IDENTIFIED ===');
                        console.log(`Today: ${response.diagnostic.currentDateIssues.today}`);
                        console.log(`Day of week: ${response.diagnostic.currentDateIssues.todayDayOfWeek}`);
                        console.log(`Day of month: ${response.diagnostic.currentDateIssues.todayDayOfMonth}`);
                        console.log(`🚨 PROBLEM: ${response.diagnostic.currentDateIssues.dayIndexProblem}`);
                        
                        console.log('\nMenu cycle days structure:');
                        response.diagnostic.currentDateIssues.menuCycleDays.forEach(mcd => {
                            console.log(`  - ${mcd.cycleDayId}: day_index=${mcd.dayIndex}, label=${mcd.label}`);
                        });
                        
                        console.log('\nMenu assignments by day index:');
                        Object.entries(response.diagnostic.currentDateIssues.menuAssignmentsByDayIndex).forEach(([dayIndex, assignments]) => {
                            console.log(`  - Day index ${dayIndex}: ${assignments.length} assignments`);
                            assignments.forEach(assignment => {
                                console.log(`    * Meal ${assignment.mealId} (${assignment.slot})`);
                            });
                        });
                    }
                }
            } else {
                console.log(`Error: ${response.error}`);
                if (response.details) {
                    console.log(`Details: ${response.details}`);
                }
            }
        } catch (e) {
            console.log('Failed to parse response as JSON');
            console.log('Raw response:', body.substring(0, 500));
        }
        
        console.log('\n=== CHECK SERVER LOGS FOR DETAILED DIAGNOSTIC OUTPUT ===');
        console.log('The enhanced logging should show the specific calculation issues.');
    });
});

req.on('error', (error) => {
    console.error('Request error:', error.message);
});

req.end();
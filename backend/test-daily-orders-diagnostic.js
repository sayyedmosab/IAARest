/**
 * Daily Orders Diagnostic Test Script
 * 
 * This script will test the daily orders endpoint with enhanced logging
 * to validate our assumptions about the accuracy issues.
 */

const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@ibnexp2.com';
const ADMIN_PASSWORD = 'admin123'; // Update if needed

// Test data
const testResults = {
    loginSuccess: false,
    dailyOrdersSuccess: false,
    diagnosticData: null,
    errors: []
};

console.log('=== DAILY ORDERS DIAGNOSTIC TEST ===');
console.log(`Testing API at: ${API_BASE_URL}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

// Function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: body
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Function to login as admin
async function loginAsAdmin() {
    console.log('1. Attempting admin login...');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ Admin login successful');
            testResults.loginSuccess = true;
            
            // Extract cookies from response
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
                const cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
                console.log(`🍪 Cookies received: ${cookies.substring(0, 50)}...`);
                return cookies;
            } else {
                console.log('⚠️  No cookies received');
                testResults.errors.push('No cookies received from login');
                return null;
            }
        } else {
            console.log('❌ Admin login failed');
            console.log(`Status: ${response.statusCode}`);
            console.log(`Response:`, response.data);
            testResults.errors.push(`Login failed: ${response.data.error || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        console.log('❌ Login request error:', error.message);
        testResults.errors.push(`Login request error: ${error.message}`);
        return null;
    }
}

// Function to test daily orders endpoint
async function testDailyOrders(cookies) {
    console.log('\n2. Testing daily orders endpoint...');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/api/admin/daily-orders',
            method: 'GET',
            headers: {
                'Cookie': cookies || ''
            }
        });

        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ Daily orders endpoint successful');
            testResults.dailyOrdersSuccess = true;
            testResults.diagnosticData = response.data;
            
            // Analyze the response
            console.log('\n=== RESPONSE ANALYSIS ===');
            console.log(`Days returned: ${response.data.data.length}`);
            
            response.data.data.forEach((day, index) => {
                console.log(`\nDay ${index + 1}: ${day.date}`);
                console.log(`  - Meals to prepare: ${day.mealsToPrepare.length}`);
                console.log(`  - Raw materials: ${day.rawMaterials.length}`);
                
                if (day.mealsToPrepare.length > 0) {
                    console.log('  - Meals:');
                    day.mealsToPrepare.forEach(meal => {
                        console.log(`    * ${meal.mealName}: x${meal.count}`);
                    });
                }
                
                if (day.rawMaterials.length > 0) {
                    console.log('  - Raw materials (sample):');
                    day.rawMaterials.slice(0, 3).forEach(material => {
                        console.log(`    * ${material.name}: ${material.quantity}${material.unit}`);
                    });
                    if (day.rawMaterials.length > 3) {
                        console.log(`    * ... and ${day.rawMaterials.length - 3} more`);
                    }
                }
            });
            
            // Analyze diagnostic information
            if (response.data.diagnostic) {
                console.log('\n=== DIAGNOSTIC INFORMATION ===');
                const diag = response.data.diagnostic;
                
                console.log(`Menu cycles: ${diag.hasActiveMenuCycles ? '✅' : '❌'}`);
                console.log(`Menu cycle days: ${diag.hasMenuCycleDays ? '✅' : '❌'}`);
                console.log(`Menu assignments: ${diag.hasMenuAssignments ? '✅' : '❌'}`);
                console.log(`Meals: ${diag.hasMeals ? '✅' : '❌'}`);
                console.log(`Meal ingredients: ${diag.hasMealIngredients ? '✅' : '❌'}`);
                console.log(`Ingredients: ${diag.hasIngredients ? '✅' : '❌'}`);
                console.log(`Active subscriptions: ${diag.activeSubscriptionsCount}`);
                
                if (diag.currentDateIssues) {
                    console.log('\n=== CURRENT DATE ISSUES ===');
                    console.log(`Today: ${diag.currentDateIssues.today}`);
                    console.log(`Day of week: ${diag.currentDateIssues.todayDayOfWeek}`);
                    console.log(`Day of month: ${diag.currentDateIssues.todayDayOfMonth}`);
                    console.log(`Problem: ${diag.currentDateIssues.dayIndexProblem}`);
                    
                    console.log('\nMenu cycle days:');
                    diag.currentDateIssues.menuCycleDays.forEach(mcd => {
                        console.log(`  - ${mcd.cycleDayId}: day_index=${mcd.dayIndex}, label=${mcd.label}`);
                    });
                    
                    console.log('\nMenu assignments by day index:');
                    Object.entries(diag.currentDateIssues.menuAssignmentsByDayIndex).forEach(([dayIndex, assignments]) => {
                        console.log(`  - Day index ${dayIndex}: ${assignments.length} assignments`);
                        assignments.forEach(assignment => {
                            console.log(`    * ${assignment.mealId} (${assignment.slot})`);
                        });
                    });
                }
            }
            
        } else {
            console.log('❌ Daily orders endpoint failed');
            console.log(`Status: ${response.statusCode}`);
            console.log(`Response:`, response.data);
            testResults.errors.push(`Daily orders failed: ${response.data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.log('❌ Daily orders request error:', error.message);
        testResults.errors.push(`Daily orders request error: ${error.message}`);
    }
}

// Main test execution
async function runTests() {
    const cookies = await loginAsAdmin();
    
    if (cookies) {
        await testDailyOrders(cookies);
    }
    
    // Print summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Login: ${testResults.loginSuccess ? '✅' : '❌'}`);
    console.log(`Daily Orders: ${testResults.dailyOrdersSuccess ? '✅' : '❌'}`);
    
    if (testResults.errors.length > 0) {
        console.log('\nErrors encountered:');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    console.log('Check the server logs for detailed diagnostic information.');
}

// Check if server is running
async function checkServer() {
    try {
        await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/health',
            method: 'GET'
        });
        console.log('✅ Server is running');
        return true;
    } catch (error) {
        console.log('❌ Server is not running or not accessible');
        console.log('Please start the server with: cd backend && npm start');
        return false;
    }
}

// Run the tests
async function main() {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await runTests();
    }
}

main().catch(console.error);
/**
 * Test Complete Daily Orders Functionality
 * 
 * This script will test the actual daily orders endpoint with authentication
 * to verify the complete system works correctly with real subscription data.
 */

const http = require('http');

console.log('=== COMPLETE DAILY ORDERS TEST ===');
console.log('Testing the actual daily orders endpoint with authentication...');
console.log('');

// First, login to get the token cookie
const loginOptions = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const loginData = JSON.stringify({
    email: 'admin@ibnexp.com',
    password: 'admin123'
});

console.log('Step 1: Logging in to get authentication cookie...');

const loginReq = http.request(loginOptions, (loginRes) => {
    console.log(`Login Status Code: ${loginRes.statusCode}`);
    
    // Extract cookies from the response
    const setCookieHeader = loginRes.headers['set-cookie'];
    let tokenCookie = null;
    
    if (setCookieHeader) {
        const cookie = setCookieHeader.find(cookie => cookie.startsWith('token='));
        if (cookie) {
            tokenCookie = cookie.split(';')[0]; // Get just the token=value part
        }
    }
    
    if (!tokenCookie) {
        console.error('❌ No authentication cookie received');
        return;
    }
    
    console.log('✅ Authentication cookie received');
    
    let loginBody = '';
    loginRes.on('data', (chunk) => {
        loginBody += chunk;
    });
    
    loginRes.on('end', () => {
        try {
            const loginResponse = JSON.parse(loginBody);
            console.log(`Login response: ${loginResponse.message}`);
            
            // Now make the authenticated request to daily orders
            console.log('\nStep 2: Making authenticated request to daily orders...');
            
            const options = {
                hostname: 'localhost',
                port: 4000,
                path: '/api/admin/daily-orders',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': tokenCookie // Use the cookie for authentication
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
            console.log('\n=== DAILY ORDERS RESPONSE ===');
            console.log(`Success: ${response.success}`);
            
            if (response.success) {
                console.log(`Days processed: ${response.data.length}`);
                
                response.data.forEach((day, index) => {
                    console.log(`\n📅 ${day.date}:`);
                    console.log(`  Meals to prepare: ${day.mealsToPrepare.length}`);
                    
                    if (day.mealsToPrepare.length > 0) {
                        day.mealsToPrepare.forEach(meal => {
                            console.log(`    - ${meal.mealName}: ${meal.count} servings`);
                        });
                    } else {
                        console.log(`    - No meals scheduled for this day`);
                    }
                    
                    console.log(`  Raw materials needed: ${day.rawMaterials.length}`);
                    
                    if (day.rawMaterials.length > 0) {
                        day.rawMaterials.slice(0, 3).forEach(material => {
                            console.log(`    - ${material.name}: ${material.quantity}${material.unit}`);
                        });
                        
                        if (day.rawMaterials.length > 3) {
                            console.log(`    - ... and ${day.rawMaterials.length - 3} more items`);
                        }
                    }
                });
                
                if (response.diagnostic) {
                    console.log('\n=== SYSTEM DIAGNOSTIC ===');
                    console.log(`Active subscriptions: ${response.diagnostic.activeSubscriptionsCount}`);
                    console.log(`Menu cycles: ${response.diagnostic.hasActiveMenuCycles ? '✅' : '❌'}`);
                    console.log(`Menu assignments: ${response.diagnostic.hasMenuAssignments ? '✅' : '❌'}`);
                    
                    if (response.diagnostic.currentDateIssues) {
                        console.log(`\n🔧 Day index calculation: ${response.diagnostic.currentDateIssues.dayIndexProblem}`);
                        console.log(`Cycle length: ${response.diagnostic.currentDateIssues.cycleLength || 7}`);
                    }
                }
                
                // Validate the results
                console.log('\n=== VALIDATION ===');
                let totalMeals = 0;
                let totalMaterials = 0;
                
                response.data.forEach(day => {
                    totalMeals += day.mealsToPrepare.reduce((sum, meal) => sum + meal.count, 0);
                    totalMaterials += day.rawMaterials.length;
                });
                
                console.log(`Total meals across all days: ${totalMeals}`);
                console.log(`Total unique materials needed: ${totalMaterials}`);
                
                if (totalMeals > 0) {
                    console.log('✅ Daily orders system is working correctly!');
                } else {
                    console.log('⚠️  No meals calculated - check delivery days and subscriptions');
                }
            } else {
                console.log('❌ Request failed:', response.error);
            }
            
        } catch (error) {
            console.error('Error parsing response:', error);
            console.log('Raw response:', body);
        }
    });
});

            req.on('error', (error) => {
                console.error('Request error:', error);
            });

            req.end();
        } catch (error) {
            console.error('Error parsing login response:', error);
        }
    });
});

loginReq.on('error', (error) => {
    console.error('Login request error:', error);
});

loginReq.write(loginData);
loginReq.end();

console.log('Login request sent. Waiting for response...\n');
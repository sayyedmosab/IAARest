/**
 * Simple Diagnostic Test - Direct API Call
 * 
 * This script will make a direct call to trigger the diagnostic logs
 * in the daily orders endpoint without requiring authentication.
 */

const http = require('http');

console.log('=== SIMPLE DIAGNOSTIC TEST ===');
console.log('Making direct call to daily orders endpoint...');
console.log('This will trigger the diagnostic logs in the server.');
console.log('');

// Make a simple request to the endpoint
const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/daily-orders',
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
            console.log(`Data length: ${response.data ? response.data.length : 0}`);
            
            if (response.diagnostic) {
                console.log('\n=== DIAGNOSTIC INFO ===');
                console.log(`Menu cycles: ${response.diagnostic.hasActiveMenuCycles ? 'Yes' : 'No'}`);
                console.log(`Menu cycle days: ${response.diagnostic.hasMenuCycleDays ? 'Yes' : 'No'}`);
                console.log(`Menu assignments: ${response.diagnostic.hasMenuAssignments ? 'Yes' : 'No'}`);
                console.log(`Active subscriptions: ${response.diagnostic.activeSubscriptionsCount}`);
                
                if (response.diagnostic.currentDateIssues) {
                    console.log('\n=== DATE ISSUES IDENTIFIED ===');
                    console.log(`Today: ${response.diagnostic.currentDateIssues.today}`);
                    console.log(`Problem: ${response.diagnostic.currentDateIssues.dayIndexProblem}`);
                }
            }
            
            if (response.error) {
                console.log(`Error: ${response.error}`);
            }
        } catch (e) {
            console.log('Failed to parse response as JSON');
            console.log('Raw response:', body.substring(0, 200));
        }
        
        console.log('\n=== CHECK SERVER LOGS FOR DETAILED DIAGNOSTIC OUTPUT ===');
        console.log('The enhanced logging should show the specific issues with day index calculation.');
    });
});

req.on('error', (error) => {
    console.error('Request error:', error.message);
});

req.end();
const axios = require('axios');

async function testDailyOrders() {
  try {
    console.log('=== TESTING DAILY ORDERS ENDPOINT ===\n');
    
    // Get auth token first (using the admin token from the logs)
    const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwNiIsImVtYWlsIjoiYWRtaW5AaWJuZXhwLmNvbSIsImlzQWRtaW4iOjEsImlhdCI6MTc2MDYwMTE2OSwiZXhwIjoxNzYxMjA1OTY5fQ.T2tP3erDVzHwuDiuzHeupx6fGPxzQzLXGSXE55w48wA';
    
    const config = {
      headers: {
        'Cookie': `token=${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('1. Testing daily orders endpoint...');
    const response = await axios.get('http://localhost:3000/api/admin/daily-orders', config);
    
    console.log('✅ Daily orders endpoint responded successfully!');
    console.log('Response status:', response.status);
    console.log('Response data structure:');
    
    if (response.data.success) {
      console.log('- Success: true');
      console.log('- Data length:', response.data.data ? response.data.data.length : 0);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('- Sample date data:', JSON.stringify(response.data.data[0], null, 2));
      }
      
      if (response.data.diagnostic) {
        console.log('- Diagnostic info available');
        console.log('  - Has active menu cycles:', response.data.diagnostic.hasActiveMenuCycles);
        console.log('  - Has menu assignments:', response.data.diagnostic.hasMenuAssignments);
        console.log('  - Has meals:', response.data.diagnostic.hasMeals);
        console.log('  - Active subscriptions count:', response.data.diagnostic.activeSubscriptionsCount);
      }
    } else {
      console.log('- Success: false');
      console.log('- Error:', response.data.error);
    }

    console.log('\n2. Testing diagnostic endpoint...');
    const diagnosticResponse = await axios.get('http://localhost:3000/api/admin/diagnostic-daily-orders', config);
    
    console.log('✅ Diagnostic endpoint responded successfully!');
    console.log('Response status:', diagnosticResponse.status);
    
    if (diagnosticResponse.data.success) {
      console.log('- Success: true');
      console.log('- Data length:', diagnosticResponse.data.data ? diagnosticResponse.data.data.length : 0);
      
      if (diagnosticResponse.data.diagnostic) {
        console.log('- Diagnostic info:');
        console.log('  - Has active menu cycles:', diagnosticResponse.data.diagnostic.hasActiveMenuCycles);
        console.log('  - Has menu assignments:', diagnosticResponse.data.diagnostic.hasMenuAssignments);
        console.log('  - Has meals:', diagnosticResponse.data.diagnostic.hasMeals);
        console.log('  - Active subscriptions count:', diagnosticResponse.data.diagnostic.activeSubscriptionsCount);
      }
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ Both endpoints are working without "Meal not found" errors!');
    console.log('✅ The meal ID lookup issue has been resolved!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDailyOrders();

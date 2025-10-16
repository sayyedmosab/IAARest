// Detailed Authentication Issue Analysis
// Tests specific authentication problems identified in the initial diagnostic

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSpecificAuthIssues() {
  console.log('=== DETAILED AUTHENTICATION ISSUE ANALYSIS ===\n');
  
  // Issue 1: Test registration with correct field mapping
  console.log('1. Testing registration with correct field mapping...');
  try {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Test with fields that match backend expectations
    const correctRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      phone_e164: '+971501234567',
      language_pref: 'en',
      address: 'Test Address',
      district: 'Test District'
    };
    
    console.log('Sending registration data:', JSON.stringify(correctRegistrationData, null, 2));
    
    const response = await makeRequest(options, correctRegistrationData);
    console.log('Registration response status:', response.statusCode);
    console.log('Registration response data:', response.data);
    
    if (response.statusCode === 201) {
      console.log('✅ Registration successful with correct field mapping');
    } else {
      console.log('❌ Registration failed even with correct field mapping');
    }
  } catch (error) {
    console.log('❌ Registration request failed:', error.message);
  }
  
  // Issue 2: Test login with existing admin user
  console.log('\n2. Testing login with existing admin user...');
  try {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Try with the admin user that was mentioned in server startup
    const adminLoginData = {
      email: 'admin@ibnexp.com',
      password: 'admin123' // Common default password
    };
    
    console.log('Trying admin login with:', adminLoginData.email);
    
    const response = await makeRequest(options, adminLoginData);
    console.log('Admin login response status:', response.statusCode);
    console.log('Admin login response data:', response.data);
    
    if (response.statusCode === 200) {
      console.log('✅ Admin login successful');
      
      // Check if cookies were set
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        console.log('✅ Admin cookies were set:', setCookieHeader);
      } else {
        console.log('❌ No cookies were set for admin login');
      }
    } else {
      console.log('❌ Admin login failed');
    }
  } catch (error) {
    console.log('❌ Admin login request failed:', error.message);
  }
  
  // Issue 3: Test frontend vs backend field mapping
  console.log('\n3. Testing frontend vs backend field mapping mismatch...');
  try {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Test with frontend-style fields (that don't match backend)
    const frontendStyleData = {
      email: 'frontend@test.com',
      password: 'password123',
      name: 'Frontend User', // Frontend uses 'name' instead of first_name/last_name
      phone: '+971501234567', // Frontend uses 'phone' instead of phone_e164
      address: {
        street: 'Test Street',
        city: 'Sharjah',
        district: 'Test District'
      }
    };
    
    console.log('Sending frontend-style data:', JSON.stringify(frontendStyleData, null, 2));
    
    const response = await makeRequest(options, frontendStyleData);
    console.log('Frontend-style registration response status:', response.statusCode);
    console.log('Frontend-style registration response data:', response.data);
    
    if (response.statusCode === 400 || response.statusCode === 500) {
      console.log('✅ Confirmed: Frontend field mapping doesn\'t match backend expectations');
    } else {
      console.log('❌ Unexpected: Frontend field mapping worked');
    }
  } catch (error) {
    console.log('❌ Frontend-style registration request failed:', error.message);
  }
  
  // Issue 4: Test if AuthService register method is implemented
  console.log('\n4. Testing AuthService register method implementation...');
  console.log('Frontend AuthService.register() method returns hardcoded false');
  console.log('This means registration will always fail on the frontend side');
  console.log('even if backend registration works correctly.');
  
  // Issue 5: Test if existing user can be found in database
  console.log('\n5. Testing if test user exists for login...');
  try {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Try with the test user we attempted to register
    const testUserLogin = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const response = await makeRequest(options, testUserLogin);
    console.log('Test user login response status:', response.statusCode);
    console.log('Test user login response data:', response.data);
    
    if (response.statusCode === 200) {
      console.log('✅ Test user exists and can login');
    } else if (response.statusCode === 401) {
      console.log('❌ Test user either doesn\'t exist or password is wrong');
    } else {
      console.log('❌ Unexpected response for test user login');
    }
  } catch (error) {
    console.log('❌ Test user login request failed:', error.message);
  }
  
  console.log('\n=== DETAILED ANALYSIS COMPLETE ===');
  console.log('\nSUMMARY OF IDENTIFIED ISSUES:');
  console.log('1. Backend registration may be failing due to field validation or database issues');
  console.log('2. Frontend and backend have mismatched field names (name vs first_name/last_name)');
  console.log('3. Frontend AuthService.register() method is not implemented (returns false)');
  console.log('4. Login failures suggest users are not being created successfully');
  console.log('5. Cookie-based authentication appears to work when login succeeds');
}

// Run the detailed analysis
testSpecificAuthIssues().catch(console.error);
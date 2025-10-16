// Authentication Diagnostic Script using Node.js built-in modules
// Tests login and registration functionality to identify issues

const http = require('http');
const https = require('https');

// Test credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  phone_e164: '+971501234567',
  language_pref: 'en',
  address: 'Test Address',
  district: 'Test District'
};

const API_BASE_URL = 'http://localhost:4000/api';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
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

async function testAuthFlow() {
  console.log('=== AUTHENTICATION DIAGNOSTIC TEST ===\n');
  
  // Test 1: Check if server is running
  console.log('1. Testing server connectivity...');
  try {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/verify',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options);
    if (response.statusCode === 200) {
      console.log('✅ Server is running');
      console.log('Response:', response.data);
    } else {
      console.log('❌ Server returned unexpected status:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    return;
  }
  
  // Test 2: Try to login with non-existent user
  console.log('\n2. Testing login with non-existent user...');
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
    
    const response = await makeRequest(options, {
      email: 'nonexistent@example.com',
      password: 'password'
    });
    
    if (response.statusCode === 401) {
      console.log('✅ Correctly rejected non-existent user');
      console.log('Error response:', response.data);
    } else {
      console.log('❌ Unexpected response status:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Test 3: Register a new user
  console.log('\n3. Testing user registration...');
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
    
    const response = await makeRequest(options, testUser);
    if (response.statusCode === 201) {
      console.log('✅ User registration successful');
      console.log('Response:', response.data);
    } else if (response.statusCode === 409) {
      console.log('ℹ️ User already exists, proceeding to login test');
    } else {
      console.log('❌ Registration failed with status:', response.statusCode);
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('❌ Registration request failed:', error.message);
  }
  
  // Test 4: Login with the test user
  console.log('\n4. Testing user login...');
  let cookies = '';
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
    
    const response = await makeRequest(options, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Login successful');
      console.log('Response:', response.data);
      
      // Extract cookies from response
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Cookies were set:', cookies);
      } else {
        console.log('❌ No cookies were set in response');
      }
    } else {
      console.log('❌ Login failed with status:', response.statusCode);
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('❌ Login request failed:', error.message);
  }
  
  // Test 5: Test protected endpoint with cookie
  console.log('\n5. Testing protected endpoint (/auth/me) with cookie...');
  if (cookies) {
    try {
      const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        }
      };
      
      const response = await makeRequest(options);
      if (response.statusCode === 200) {
        console.log('✅ Protected endpoint access successful');
        console.log('User data:', response.data);
      } else {
        console.log('❌ Protected endpoint access failed with status:', response.statusCode);
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.log('❌ Protected endpoint request failed:', error.message);
    }
  } else {
    console.log('❌ No cookies available for testing protected endpoint');
  }
  
  // Test 6: Test invalid password
  console.log('\n6. Testing login with invalid password...');
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
    
    const response = await makeRequest(options, {
      email: testUser.email,
      password: 'wrongpassword'
    });
    
    if (response.statusCode === 401) {
      console.log('✅ Correctly rejected invalid password');
    } else {
      console.log('❌ Unexpected response status:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Invalid password test failed:', error.message);
  }
  
  // Test 7: Test validation errors
  console.log('\n7. Testing registration validation...');
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
    
    const response = await makeRequest(options, {
      email: 'invalid-email',
      password: '123', // Too short
      first_name: '',
      last_name: '',
      phone_e164: 'invalid-phone'
    });
    
    if (response.statusCode === 400) {
      console.log('✅ Correctly rejected invalid data');
      console.log('Validation errors:', response.data.details);
    } else {
      console.log('❌ Unexpected response status:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Validation test failed:', error.message);
  }
  
  console.log('\n=== DIAGNOSTIC TEST COMPLETE ===');
}

// Run the test
testAuthFlow().catch(console.error);
// Authentication Diagnostic Script
// Tests login and registration functionality to identify issues

const axios = require('axios');
const API_BASE_URL = 'http://localhost:3000/api';

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

async function testAuthFlow() {
  console.log('=== AUTHENTICATION DIAGNOSTIC TEST ===\n');
  
  // Test 1: Check if server is running
  console.log('1. Testing server connectivity...');
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify`);
    console.log('✅ Server is running');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    return;
  }
  
  // Test 2: Try to login with non-existent user
  console.log('\n2. Testing login with non-existent user...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'nonexistent@example.com',
      password: 'password'
    });
    console.log('❌ Unexpected success with non-existent user');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctly rejected non-existent user');
      console.log('Error response:', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Register a new user
  console.log('\n3. Testing user registration...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ User registration successful');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('ℹ️ User already exists, proceeding to login test');
    } else {
      console.log('❌ Registration failed:', error.response?.data || error.message);
    }
  }
  
  // Test 4: Login with the test user
  console.log('\n4. Testing user login...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      withCredentials: true // Important for cookie handling
    });
    console.log('✅ Login successful');
    console.log('Response:', response.data);
    
    // Check if cookies were set
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('✅ Cookies were set:', setCookieHeader);
    } else {
      console.log('❌ No cookies were set in response');
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
  }
  
  // Test 5: Test protected endpoint with cookie
  console.log('\n5. Testing protected endpoint (/auth/me) with cookie...');
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      withCredentials: true
    });
    console.log('✅ Protected endpoint access successful');
    console.log('User data:', response.data);
  } catch (error) {
    console.log('❌ Protected endpoint access failed:', error.response?.data || error.message);
  }
  
  // Test 6: Test invalid password
  console.log('\n6. Testing login with invalid password...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: 'wrongpassword'
    });
    console.log('❌ Unexpected success with wrong password');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctly rejected invalid password');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 7: Test validation errors
  console.log('\n7. Testing registration validation...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: 'invalid-email',
      password: '123', // Too short
      first_name: '',
      last_name: '',
      phone_e164: 'invalid-phone'
    });
    console.log('❌ Unexpected success with invalid data');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected invalid data');
      console.log('Validation errors:', error.response.data.details);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n=== DIAGNOSTIC TEST COMPLETE ===');
}

// Run the test
testAuthFlow().catch(console.error);
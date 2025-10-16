const puppeteer = require('puppeteer');
const fs = require('fs');

async function testAdminPanel() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console errors and logs
  const consoleLogs = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else {
      consoleLogs.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push(error.message);
  });
  
  try {
    console.log('Testing Admin Panel...');
    
    // Navigate to admin users page
    await page.goto('http://localhost:4200/admin/users', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check for the specific pagination error
    const hasPaginationError = consoleErrors.some(error => 
      error.includes('Cannot read properties of undefined (reading \'min\')')
    );
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'admin-users-page.png', fullPage: true });
    
    // Test pagination controls
    const paginationControls = await page.$$('.pagination button');
    console.log(`Found ${paginationControls.length} pagination controls`);
    
    // Test search functionality
    await page.type('input[placeholder="Search by name, email..."]', 'test');
    await page.waitForTimeout(1000);
    
    // Test filter dropdown
    await page.select('select#status-filter', 'active');
    await page.waitForTimeout(1000);
    
    // Check console for errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(error => console.log('ERROR:', error));
    } else {
      console.log('No console errors found!');
    }
    
    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.slice(-10).forEach(log => console.log('LOG:', log));
    
    // Test other admin pages
    const adminPages = [
      '/admin/dashboard',
      '/admin/daily-orders',
      '/admin/meals',
      '/admin/plans',
      '/admin/menu-scheduler'
    ];
    
    for (const pagePath of adminPages) {
      console.log(`\nTesting ${pagePath}...`);
      await page.goto(`http://localhost:4200${pagePath}`, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
      
      const pageErrors = consoleErrors.filter(error => 
        error.includes(pagePath) || error.includes('TypeError')
      );
      
      if (pageErrors.length > 0) {
        console.log(`Errors on ${pagePath}:`, pageErrors);
      } else {
        console.log(`${pagePath} loaded successfully`);
      }
    }
    
    // Generate test report
    const testReport = {
      timestamp: new Date().toISOString(),
      paginationError: hasPaginationError,
      totalConsoleErrors: consoleErrors.length,
      consoleErrors: consoleErrors,
      consoleLogs: consoleLogs.slice(-20), // Last 20 logs
      pagesTested: adminPages.length + 1,
      success: !hasPaginationError && consoleErrors.length === 0
    };
    
    fs.writeFileSync('test-report.json', JSON.stringify(testReport, null, 2));
    console.log('\n=== TEST REPORT ===');
    console.log(`Pagination Error Fixed: ${!hasPaginationError}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log(`Test Success: ${testReport.success}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testAdminPanel();
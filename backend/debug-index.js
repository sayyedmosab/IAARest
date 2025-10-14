console.log('🚀 Starting debug version of backend...');

try {
  console.log('Loading dependencies...');

  // Test each import individually
  console.log('1. Loading express...');
  const express = await import('express');
  console.log('✅ Express loaded');

  console.log('2. Loading cors...');
  const cors = await import('cors');
  console.log('✅ CORS loaded');

  console.log('3. Loading database...');
  const { DatabaseConnection } = await import('./src/database/database.ts');
  console.log('✅ Database loaded');

  console.log('4. Loading routes...');
  const mealRoutes = await import('./src/routes/meals.ts');
  const planRoutes = await import('./src/routes/plans.ts');
  console.log('✅ Routes loaded');

  console.log('5. Creating server...');
  const app = express.default();

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Debug server is working!',
      timestamp: new Date().toISOString()
    });
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`✅ Debug server running on port ${PORT}`);
  });

  console.log('🎉 Backend started successfully!');

} catch (error) {
  console.error('❌ Error starting backend:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
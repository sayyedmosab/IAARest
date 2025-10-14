console.log('Testing backend startup...');

try {
  console.log('Loading database...');
  const { DatabaseConnection } = require('./src/database/database');
  console.log('Database loaded successfully');

  console.log('Loading routes...');
  const mealRoutes = require('./src/routes/meals');
  const planRoutes = require('./src/routes/plans');
  console.log('Routes loaded successfully');

  console.log('Starting server...');
  const express = require('express');
  const app = express();

  app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Backend is working!' });
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
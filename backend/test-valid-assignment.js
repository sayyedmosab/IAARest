const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'ibnexp.db');

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

async function testValidAssignment() {
  return new Promise((resolve, reject) => {
    // First, get a valid meal ID
    db.get('SELECT id FROM meals WHERE is_active = 1 LIMIT 1', [], (err, meal) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!meal) {
        reject(new Error('No active meals found'));
        return;
      }
      
      console.log('Using meal ID:', meal.id);
      
      // Get the active cycle day
      db.get('SELECT id FROM menu_cycle_days WHERE day_index = 1 LIMIT 1', [], (err, cycleDay) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!cycleDay) {
          reject(new Error('No cycle day found'));
          return;
        }
        
        console.log('Using cycle day ID:', cycleDay.id);
        
        // Insert a valid menu assignment
        const assignmentId = 'assignment_' + Date.now();
        db.run(
          'INSERT INTO menu_assignments (id, cycle_day_id, meal_id, meal_type, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
          [assignmentId, cycleDay.id, meal.id, 'lunch'],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('Created valid menu assignment:', assignmentId);
            resolve({ assignmentId, mealId: meal.id, cycleDayId: cycleDay.id });
          }
        );
      });
    });
  });
}

// Run the test
testValidAssignment()
  .then(result => {
    console.log('Success:', result);
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  })
  .catch(err => {
    console.error('Error:', err.message);
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
    process.exit(1);
  });
const { DatabaseConnection } = require('./src/database/database');

const db = DatabaseConnection.getInstance();

console.log('=== DATABASE INSPECTION ===');

// Get all tables
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name != 'migrations'");
console.log('Found tables:', tables.map(t => t.name));

if (tables.length === 0) {
  console.log('\n❌ No tables found in database!');
  console.log('Database needs schema initialization.');
} else {
  tables.forEach(table => {
    const tableName = table.name;
    console.log(`\n=== ${tableName.toUpperCase()} TABLE ===`);

    try {
      // Get schema
      const schema = db.query(`PRAGMA table_info(${tableName})`);
      console.log('Schema:', schema.map(col => `${col.name} ${col.type}`).join(', '));

      // Get row count
      const countResult = db.queryOne(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log('Row count:', countResult.count);

      // Get sample data if table has rows
      if (countResult.count > 0 && countResult.count <= 10) {
        const sampleData = db.query(`SELECT * FROM ${tableName} LIMIT 3`);
        console.log('Sample data:', JSON.stringify(sampleData, null, 2));
      }
    } catch (error) {
      console.log('Error inspecting table:', error.message);
    }
  });
}

db.close();
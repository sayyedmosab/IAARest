import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'backend/data/ibnexp.db');
const db = new Database(dbPath);

console.log('=== DATABASE INSPECTION ===');
console.log('Database path:', dbPath);

// Get all tables
const tablesQuery = db.pragma("table_info(sqlite_master)");
const tables = tablesQuery
  .filter(table => table.type === 'table')
  .map(table => table.name)
  .filter(name => name !== 'migrations');

console.log('\n=== TABLES ===');
console.log('Found tables:', tables);

if (tables.length === 0) {
  console.log('\n❌ No tables found in database!');
  console.log('Database needs schema initialization.');
} else {
  tables.forEach(table => {
    console.log(`\n=== ${table.toUpperCase()} TABLE ===`);

    try {
      // Get schema
      const schema = db.pragma(`table_info(${table})`);
      console.log('Schema:', schema.map(col => `${col.name} ${col.type}`).join(', '));

      // Get row count
      const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log('Row count:', countResult.count);

      // Get sample data if table has rows
      if (countResult.count > 0 && countResult.count <= 10) {
        const sampleData = db.prepare(`SELECT * FROM ${table} LIMIT 3`).all();
        console.log('Sample data:', JSON.stringify(sampleData, null, 2));
      }
    } catch (error) {
      console.log('Error inspecting table:', error.message);
    }
  });
}

db.close();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '../../data/ibnexp.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Connected to database:', dbPath);

// Check if migrations table exists
const migrationsExist = db.pragma('table_info(migrations)');
let migrationTableExists = migrationsExist.length > 0;

if (!migrationTableExists) {
  console.log('Creating migrations table...');
  db.exec(`
    CREATE TABLE migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  migrationTableExists = true;
}

// Check if core tables exist
const tablesQuery = db.pragma('table_info(sqlite_master)');
const existingTables = tablesQuery
  .filter(table => table.type === 'table' && table.name !== 'migrations')
  .map(table => table.name);

console.log('Existing tables:', existingTables);

if (existingTables.length > 0) {
  console.log('✅ Database already has tables, skipping migration');
  db.close();
  process.exit(0);
}

// Read and execute migration file
const migrationPath = path.join(__dirname, 'migrations/001_initial_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Executing migration for new database...');

// Split by semicolon and execute each statement
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  if (statement.trim()) {
    try {
      db.exec(statement);
      successCount++;
      console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Statement ${i + 1} failed:`, error.message.substring(0, 100));
    }
  }
}

console.log(`\n📊 Migration Summary:`);
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);
console.log(`📈 Success Rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);

db.close();

if (errorCount === 0) {
  console.log('🎉 Migration completed successfully!');
  process.exit(0);
} else {
  console.log('⚠️  Migration completed with some errors');
  process.exit(1);
}

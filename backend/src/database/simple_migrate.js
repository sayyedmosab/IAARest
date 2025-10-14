const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '../../data/ibnexp.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Connected to database:', dbPath);

// Read and execute migration file
const migrationPath = path.join(__dirname, 'migrations/001_initial_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Executing migration...');

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
      console.error(`❌ Statement ${i + 1} failed:`, error.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
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
  console.log('⚠️  Migration completed with errors');
  process.exit(1);
}

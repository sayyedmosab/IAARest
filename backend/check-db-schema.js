const Database = require('better-sqlite3');

try {
  const db = new Database('./data/ibnexp.db');
  
  console.log('=== DATABASE SCHEMA CHECK ===\n');
  
  // List all tables
  console.log('All tables in database:');
  const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\"table\"').all();
  tables.forEach(table => console.log(`- ${table.name}`));
  
  console.log('\nProfiles table schema:');
  const profileSchema = db.prepare('PRAGMA table_info(profiles)').all();
  profileSchema.forEach(col => {
    console.log(`- ${col.name}: ${col.type} (nullable: ${!col.notnull}, default: ${col.dflt_value})`);
  });
  
  console.log('\nSample profiles data:');
  const sampleProfiles = db.prepare('SELECT * FROM profiles LIMIT 3').all();
  console.log(JSON.stringify(sampleProfiles, null, 2));
  
  db.close();
} catch (error) {
  console.error('Database error:', error.message);
}
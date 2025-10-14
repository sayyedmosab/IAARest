import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from './database.js';

async function runMigrations() {
  const db = DatabaseConnection.getInstance();
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    // Create migrations table if it doesn't exist
    db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('Found migration files:', migrationFiles);

    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.sql');

      // Check if migration already executed
      const existing = db.queryOne(
        'SELECT name FROM migrations WHERE name = ?',
        [migrationName]
      );

      if (existing) {
        console.log(`Migration ${migrationName} already executed, skipping...`);
        continue;
      }

      console.log(`Executing migration: ${migrationName}`);

      // Read and execute migration file
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          db.execute(statement);
        }
      }

      // Record migration as executed
      db.execute(
        'INSERT INTO migrations (name) VALUES (?)',
        [migrationName]
      );

      console.log(`✅ Migration ${migrationName} completed`);
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'ibnexp.db');
console.log('Inspecting database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('\n=== TABLES ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables found:', tables.map(t => t.name));

  if (tables.length === 0) {
    console.log('Database is empty - no tables found');
    db.close();
    process.exit(0);
  }

  tables.forEach(table => {
    console.log(`\n=== TABLE: ${table.name} ===`);
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`Row count: ${count.count}`);

      if (count.count > 0) {
        const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        console.log('Sample data:', JSON.stringify(sample, null, 2));
      }
    } catch (err) {
      console.log(`Error querying table ${table.name}:`, err.message);
    }
  });

  db.close();
} catch (err) {
  console.error('Error opening database:', err.message);
}
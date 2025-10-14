"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_js_1 = require("./database.js");
async function runMigrations() {
    const db = database_js_1.DatabaseConnection.getInstance();
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
            const existing = db.queryOne('SELECT name FROM migrations WHERE name = ?', [migrationName]);
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
            db.execute('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
            console.log(`✅ Migration ${migrationName} completed`);
        }
        console.log('🎉 All migrations completed successfully!');
    }
    catch (error) {
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
//# sourceMappingURL=migrate.js.map
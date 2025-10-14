import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ibnexp.db');

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    console.log(`Database connected: ${dbPath}`);
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }

  // Execute a query with optional parameters
  public query(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.all(params) as any[];
    }
    return stmt.all() as any[];
  }

  // Execute a single row query
  public queryOne(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.get(params) as any;
    }
    return stmt.get() as any;
  }

  // Execute insert/update/delete
  public execute(sql: string, params?: any[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.run(params);
    }
    return stmt.run();
  }

  // Begin transaction
  public beginTransaction(): Database.Transaction {
    return this.db.transaction(() => {
      // Transaction functions will be passed here
    });
  }
}

// Helper function to generate UUIDs (SQLite compatible)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to format date for SQLite
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to parse SQLite datetime
export function parseDateTime(dateString: string): Date {
  return new Date(dateString);
}
import Database from 'better-sqlite3';
import { DatabaseConnection } from '../database/database.js';

export abstract class BaseRepository<T> {
  protected db: DatabaseConnection;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = DatabaseConnection.getInstance();
    this.tableName = tableName;
  }

  // Find by ID
  findById(id: string): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return this.db.queryOne(sql, [id]);
  }

  // Find all records
  findAll(whereClause?: string, params?: any[]): T[] {
    let sql = `SELECT * FROM ${this.tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    // Only add ORDER BY created_at if the table has this column
    // Tables without created_at: meal_ingredients, meal_images (has sort_order)
    if (!['meal_ingredients'].includes(this.tableName)) {
      sql += ` ORDER BY created_at DESC`;
    } else if (this.tableName === 'meal_images') {
      sql += ` ORDER BY sort_order ASC`;
    }

    if (params) {
      return this.db.query(sql, params);
    }
    return this.db.query(sql);
  }

  // Find with pagination
  findWithPagination(page: number = 1, limit: number = 10, whereClause?: string, params?: any[]): { data: T[], total: number } {
    const offset = (page - 1) * limit;

    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    let dataSql = `SELECT * FROM ${this.tableName}`;

    if (whereClause) {
      countSql += ` WHERE ${whereClause}`;
      dataSql += ` WHERE ${whereClause}`;
    }

    // Only add ORDER BY created_at if the table has this column
    if (!['meal_ingredients'].includes(this.tableName)) {
      dataSql += ` ORDER BY created_at DESC`;
    } else if (this.tableName === 'meal_images') {
      dataSql += ` ORDER BY sort_order ASC`;
    }
    
    dataSql += ` LIMIT ? OFFSET ?`;

    const total = this.db.queryOne(countSql, params)?.total || 0;
    const dataParams = params ? [...params, limit, offset] : [limit, offset];
    const data = this.db.query(dataSql, dataParams);

    return { data, total };
  }

  // Create new record
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): T {
    const id = this.generateId();
    const now = new Date().toISOString();

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (id, ${columns.join(', ')}, created_at, updated_at)
      VALUES (?, ${placeholders}, ?, ?)
    `;

    this.db.execute(sql, [id, ...values, now, now]);

    // Return the created record
    return this.findById(id) as T;
  }

  // Update record
  update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): T | null {
    const updateFields = Object.keys(data);
    const values = Object.values(data);

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = ? WHERE id = ?`;

    this.db.execute(sql, [...values, new Date().toISOString(), id]);

    return this.findById(id);
  }

  // Delete record
  delete(id: string): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  // Count records
  count(whereClause?: string, params?: any[]): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    const result = this.db.queryOne(sql, params);
    return result?.count || 0;
  }

  // Execute custom query
  query(sql: string, params?: any[]): any[] {
    return this.db.query(sql, params);
  }

  // Execute custom single query
  queryOne(sql: string, params?: any[]): any {
    return this.db.queryOne(sql, params);
  }

  // Execute custom insert/update/delete query
  execute(sql: string, params?: any[]): Database.RunResult {
    return this.db.execute(sql, params);
  }

  // Generate unique ID (can be overridden for specific formats)
  protected generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Begin transaction
  transaction<T>(callback: () => T): T {
    return this.db.getDatabase().transaction(callback)();
  }
}
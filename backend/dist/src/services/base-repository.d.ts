import Database from 'better-sqlite3';
import { DatabaseConnection } from '../database/database.js';
export declare abstract class BaseRepository<T> {
    protected db: DatabaseConnection;
    protected tableName: string;
    constructor(tableName: string);
    findById(id: string): T | null;
    findAll(whereClause?: string, params?: any[]): T[];
    findWithPagination(page?: number, limit?: number, whereClause?: string, params?: any[]): {
        data: T[];
        total: number;
    };
    create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): T;
    update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): T | null;
    delete(id: string): boolean;
    count(whereClause?: string, params?: any[]): number;
    query(sql: string, params?: any[]): any[];
    queryOne(sql: string, params?: any[]): any;
    execute(sql: string, params?: any[]): Database.RunResult;
    protected generateId(): string;
    transaction<T>(callback: () => T): T;
}
//# sourceMappingURL=base-repository.d.ts.map
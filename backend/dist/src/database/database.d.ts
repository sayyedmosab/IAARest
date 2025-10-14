import Database from 'better-sqlite3';
export declare class DatabaseConnection {
    private static instance;
    private db;
    private constructor();
    static getInstance(): DatabaseConnection;
    getDatabase(): Database.Database;
    close(): void;
    query(sql: string, params?: any[]): any[];
    queryOne(sql: string, params?: any[]): any;
    execute(sql: string, params?: any[]): Database.RunResult;
    beginTransaction(): Database.Transaction;
}
export declare function generateUUID(): string;
export declare function formatDate(date: Date): string;
export declare function parseDateTime(dateString: string): Date;
//# sourceMappingURL=database.d.ts.map
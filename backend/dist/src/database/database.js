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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
exports.generateUUID = generateUUID;
exports.formatDate = formatDate;
exports.parseDateTime = parseDateTime;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class DatabaseConnection {
    static instance;
    db;
    constructor() {
        const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ibnexp.db');
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        console.log(`Database connected: ${dbPath}`);
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    getDatabase() {
        return this.db;
    }
    close() {
        this.db.close();
    }
    // Execute a query with optional parameters
    query(sql, params) {
        const stmt = this.db.prepare(sql);
        if (params) {
            return stmt.all(params);
        }
        return stmt.all();
    }
    // Execute a single row query
    queryOne(sql, params) {
        const stmt = this.db.prepare(sql);
        if (params) {
            return stmt.get(params);
        }
        return stmt.get();
    }
    // Execute insert/update/delete
    execute(sql, params) {
        const stmt = this.db.prepare(sql);
        if (params) {
            return stmt.run(params);
        }
        return stmt.run();
    }
    // Begin transaction
    beginTransaction() {
        return this.db.transaction(() => {
            // Transaction functions will be passed here
        });
    }
}
exports.DatabaseConnection = DatabaseConnection;
// Helper function to generate UUIDs (SQLite compatible)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Helper function to format date for SQLite
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
// Helper function to parse SQLite datetime
function parseDateTime(dateString) {
    return new Date(dateString);
}
//# sourceMappingURL=database.js.map
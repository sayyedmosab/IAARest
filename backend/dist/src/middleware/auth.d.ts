import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models/types.js';
declare global {
    namespace Express {
        interface Request {
            user?: Profile;
        }
    }
}
export interface AuthRequest extends Request {
    user?: Profile;
}
export declare function generateToken(user: Profile): string;
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map
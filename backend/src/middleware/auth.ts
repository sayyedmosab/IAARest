import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { profileRepo } from '../services/repositories.js';
import { Profile } from '../models/types.js';

// Extend Express Request type to include user
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

// JWT payload interface
interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export function generateToken(user: Profile): string {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // SECURITY: Validate JWT secret is set
  if (!jwtSecret || jwtSecret === 'your-secret-key') {
    throw new Error('JWT_SECRET environment variable must be set with a secure value');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  const payload: JwtPayload = {
    userId: user.user_id,
    email: user.email,
    isAdmin: user.is_admin
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as any);
}

// Verify JWT token middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  // Fallback to cookie token if present
  if (!token && (req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
    console.log('authenticateToken: token found in cookie');
  } else if (token) {
    console.log('authenticateToken: token found in Authorization header');
  } else {
    console.log('authenticateToken: no token found');
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  // SECURITY: Removed dummy token acceptance for production security
  // Dummy tokens should never be accepted in production environments

  const jwtSecret = process.env.JWT_SECRET;
  
  // SECURITY: Validate JWT secret is set and secure
  if (!jwtSecret || jwtSecret === 'your-secret-key') {
    console.error('SECURITY ERROR: JWT_SECRET environment variable is not properly configured');
    res.status(500).json({
      success: false,
      error: 'Server configuration error - JWT secret not properly set'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    console.log('authenticateToken: decoded token userId=', decoded.userId);

    // Get user from database to ensure they still exist (use user_id, not id)
    const user = profileRepo.findByUserId(decoded.userId);
    console.log('authenticateToken: user lookup result=', !!user);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Token verification failed'
      });
    }
  }
}
// Admin-only middleware
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  console.log('[DEBUG] requireAdmin called');
  // Prefer authenticated user (token/cookie). If present, check is_admin flag.
  if (req.user) {
    console.log('[DEBUG] req.user exists:', req.user.user_id, 'is_admin:', req.user.is_admin);
    if (!req.user.is_admin) {
      console.log('[DEBUG] User is not admin');
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }
    console.log('[DEBUG] User is admin, calling next()');
    return next();
  }
  console.log('[DEBUG] No req.user found');
  // No authenticated user on request: reject. Legacy email/password fallback removed.
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
  return;
}

// Optional authentication middleware (doesn't fail if no token)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && (req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    next();
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  
  // SECURITY: Validate JWT secret is set and secure
  if (!jwtSecret || jwtSecret === 'your-secret-key') {
    console.error('SECURITY ERROR: JWT_SECRET environment variable is not properly configured');
    res.status(500).json({
      success: false,
      error: 'Server configuration error - JWT secret not properly set'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    const user = profileRepo.findByUserId(decoded.userId);

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
}

// Password hashing utilities

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
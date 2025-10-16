"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.authenticateToken = authenticateToken;
exports.requireAdmin = requireAdmin;
exports.optionalAuth = optionalAuth;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const repositories_js_1 = require("../services/repositories.js");
// Generate JWT token
function generateToken(user) {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    // SECURITY: Validate JWT secret is set
    if (!jwtSecret || jwtSecret === 'your-secret-key') {
        throw new Error('JWT_SECRET environment variable must be set with a secure value');
    }
    if (jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    const payload = {
        userId: user.user_id,
        email: user.email,
        isAdmin: user.is_admin
    };
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}
// Verify JWT token middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    // Fallback to cookie token if present
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('authenticateToken: token found in cookie');
    }
    else if (token) {
        console.log('authenticateToken: token found in Authorization header');
    }
    else {
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
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        console.log('authenticateToken: decoded token userId=', decoded.userId);
        // Get user from database to ensure they still exist (use user_id, not id)
        const user = repositories_js_1.profileRepo.findByUserId(decoded.userId);
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Token verification failed'
            });
        }
    }
}
// Admin-only middleware
async function requireAdmin(req, res, next) {
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
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
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
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = repositories_js_1.profileRepo.findByUserId(decoded.userId);
        if (user) {
            req.user = user;
        }
    }
    catch (error) {
        // Ignore token errors for optional auth
    }
    next();
}
// Password hashing utilities
async function hashPassword(password) {
    const saltRounds = 12;
    return bcryptjs_1.default.hash(password, saltRounds);
}
async function verifyPassword(password, hashedPassword) {
    return bcryptjs_1.default.compare(password, hashedPassword);
}
//# sourceMappingURL=auth.js.map
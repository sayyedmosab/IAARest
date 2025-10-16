import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { profileRepo } from '../services/repositories.js';
import { generateToken, hashPassword, verifyPassword, AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth.js';
import { Profile } from '../models/types.js';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().isLength({ min: 1 }),
  body('last_name').trim().isLength({ min: 1 }),
  body('phone_e164').matches(/^\+[1-9]\d{1,14}$/),
  body('language_pref').optional().isIn(['en', 'ar']),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Register new user
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, first_name, last_name, phone_e164, language_pref, address, district, is_student, university_email, student_id_expiry } = req.body;

    // Check if user already exists
    const existingUser = profileRepo.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user profile (omit user_id - let the repository handle primary key)
    // NOTE: is_admin must NOT be automatically granted based on email. If the caller
    // attempts to set is_admin=true during registration, require an authenticated admin token.
    let isAdminFlag = false;
    if (req.body.is_admin) {
      // Require admin privileges to create admin accounts
      // If there's no authenticated admin, reject the request
      if (!req.headers['authorization'] && !(req as any).cookies?.token) {
        return res.status(403).json({ success: false, error: 'Admin privileges required to set is_admin' });
      }
      // Attempt to authenticate the token and check admin status
      try {
        // Reuse authenticateToken middleware logic by invoking profile lookup directly
        // But since we're in a route handler, check req.user if authenticateToken ran earlier.
        // For registration with is_admin, prefer that the client calls the protected admin endpoint
        return res.status(403).json({ success: false, error: 'Cannot set is_admin during public registration' });
      } catch (err) {
        return res.status(403).json({ success: false, error: 'Admin privileges required to set is_admin' });
      }
    }

    const newProfile: Omit<Profile, 'user_id' | 'created_at' | 'updated_at'> = {
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone_e164,
      language_pref: language_pref || 'ar',
      is_admin: isAdminFlag,
      is_student: is_student || false,
      address: address || 'Not provided',
      district: district || 'Not provided', 
      university_email,
      student_id_expiry: student_id_expiry || '2025-12-31'
    };

    const createdProfile = profileRepo.create(newProfile);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          user_id: createdProfile.user_id,
          email: createdProfile.email,
          first_name: createdProfile.first_name,
          last_name: createdProfile.last_name,
          language_pref: createdProfile.language_pref,
          is_admin: Boolean(createdProfile.is_admin),
          is_student: Boolean(createdProfile.is_student)
        }
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = profileRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password against stored hash
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT and set as HttpOnly cookie (safer than exposing token to JS)
    const token = generateToken(user);
    // Set cookie options - use path '/' so it's available across the API
    res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    });

    // Return profile only (frontend will call /auth/me to get current user)
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          language_pref: user.language_pref,
          is_admin: Boolean(user.is_admin),
          is_student: Boolean(user.is_student)
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get current user profile (requires authentication)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Logout (client-side should remove token)
router.post('/logout', (req: Request, res: Response) => {
  // Clear cookie (ensure same path when clearing)
  res.clearCookie('token', { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Verify token validity (no token required)
router.get('/verify', async (req: AuthRequest, res: Response) => {
  try {
    // No authentication required - just return success
    res.json({
      success: true,
      data: {
        valid: true,
        user: null // No user since no authentication
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

export default router;
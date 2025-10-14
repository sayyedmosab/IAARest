import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { planRepo } from '../services/repositories.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Plan } from '../models/types.js';

const router = Router();

// Validation rules
const createPlanValidation = [
  body('code').trim().isLength({ min: 1 }),
  body('name_en').trim().isLength({ min: 1 }),
  body('name_ar').trim().isLength({ min: 1 }),
  body('meals_per_day').isInt({ min: 1, max: 6 }),
  body('delivery_days').isInt({ min: 1, max: 31 }),
  body('base_price_aed').isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'archived']),
];

const updatePlanValidation = [
  body('code').optional().trim().isLength({ min: 1 }),
  body('name_en').optional().trim().isLength({ min: 1 }),
  body('name_ar').optional().trim().isLength({ min: 1 }),
  body('meals_per_day').optional().isInt({ min: 1, max: 6 }),
  body('delivery_days').optional().isInt({ min: 1, max: 31 }),
  body('base_price_aed').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'archived']),
];

// Public routes
// Get all active plans
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] GET /plans - Fetching active plans');
    const plans = planRepo.findActive();
    console.log('[DEBUG] Found plans from DB:', plans?.length || 0, 'items');
    console.log('[DEBUG] First plan ID:', plans?.[0]?.id, 'type:', typeof plans?.[0]?.id);
    // Return all DB fields for each plan
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
});

// Get plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = planRepo.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan'
    });
  }
});

// Get plan by code
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const plan = planRepo.findByCode(code);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Get plan by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan'
    });
  }
});

// Admin routes (require authentication and admin role)
// Get all plans (including archived)
router.get('/admin/all', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const plans = planRepo.findAll();

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
});

// Create new plan
router.post('/', authenticateToken, requireAdmin, createPlanValidation, async (req: AuthRequest, res: Response) => {
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

    const planData = req.body;

    // Check if plan code already exists
    const existingPlan = planRepo.findByCode(planData.code);
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        error: 'Plan code already exists'
      });
    }

    // Create plan
    const newPlan = planRepo.create({
      ...planData,
      status: planData.status || 'active'
    } as Omit<Plan, 'id' | 'created_at' | 'updated_at'>);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan
    });

  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create plan'
    });
  }
});

// Update plan
router.put('/:id', authenticateToken, requireAdmin, updatePlanValidation, async (req: AuthRequest, res: Response) => {
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

    const { id } = req.params;
    const planData = req.body;

    // Check if plan exists
    const existingPlan = planRepo.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // If updating code, check if new code already exists
    if (planData.code && planData.code !== existingPlan.code) {
      const codeExists = planRepo.findByCode(planData.code);
      if (codeExists) {
        return res.status(409).json({
          success: false,
          error: 'Plan code already exists'
        });
      }
    }

    // Update plan
    const updatedPlan = planRepo.update(id, planData);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });

  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan'
    });
  }
});

// Delete plan
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if plan exists
    const existingPlan = planRepo.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // TODO: Check if plan has active subscriptions before deleting
    // For now, we'll allow deletion but this should be restricted in production

    // Delete plan
    const deleted = planRepo.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete plan'
      });
    }

  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plan'
    });
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { ingredientRepo } from '../services/repositories.js';

const router = Router();

// Get all ingredients
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] GET /ingredients - Fetching all ingredients');
    const ingredients = ingredientRepo.findAll();
    console.log('[DEBUG] Found ingredients from DB:', ingredients?.length || 0, 'items');
    
    res.json({
      success: true,
      data: ingredients
    });

  } catch (error) {
    console.error('Get ingredients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients'
    });
  }
});

// Get ingredient by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] GET /ingredients/${id} - Fetching ingredient by ID`);
    
    const ingredient = ingredientRepo.findById(id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }

    res.json({
      success: true,
      data: ingredient
    });

  } catch (error) {
    console.error('Get ingredient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient'
    });
  }
});

export default router;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const repositories_js_1 = require("../services/repositories.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Helper: build image URL without producing double slashes
const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
function buildImageUrl(filename) {
    if (!filename)
        return 'placeholder.png';
    // remove any leading slashes from filename to avoid double-slash when joining
    const clean = String(filename).replace(/^\/+/, '');
    const url = frontendBase ? `${frontendBase}/images/${clean}` : `images/${clean}`;
    // Debug: log constructed image url for tracing (will not be returned in response)
    try {
        console.debug(`[MEALS DEBUG] buildImageUrl: filename='${filename}' -> '${url}'`);
    }
    catch (e) {
        // ignore logging errors
    }
    return url;
}
// Validation rules
const createMealValidation = [
    (0, express_validator_1.body)('name_en').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('name_ar').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('description_en').optional().trim(),
    (0, express_validator_1.body)('description_ar').optional().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
];
const updateMealValidation = [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('name_en').optional().trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('name_ar').optional().trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('description_en').optional().trim(),
    (0, express_validator_1.body)('description_ar').optional().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
];
// Public routes
// Get all active meals
router.get('/', async (req, res) => {
    try {
        console.log('[DEBUG] GET /meals - Fetching active meals');
        const meals = repositories_js_1.mealRepo.findActive();
        console.log('[DEBUG] Found meals from DB:', meals?.length || 0, 'items');
        // Determine requested language (query param ?lang=ar or Accept-Language header)
        const requestedLang = (req.query.lang === 'ar' || String(req.headers['accept-language'] || '').includes('ar')) ? 'ar' : 'en';
        // Add meal_images to each meal and normalize response shape
        const mealsWithDbFields = meals.map(meal => {
            const meal_images = repositories_js_1.mealImageRepo.findByMealOrdered(meal.id);
            const meal_ingredients = repositories_js_1.mealIngredientRepo.findByMeal(meal.id);
            // Debug: log image_filename -> url mapping for this meal
            try {
                console.debug(`[MEALS DEBUG] meal.id=${meal.id} image_filename='${meal.image_filename}' -> imageUrl='${buildImageUrl(meal.image_filename)}' ingredientsCount=${meal_ingredients?.length || 0} mealImages=${meal_images?.length || 0}`);
            }
            catch (e) {
                // swallow
            }
            // Provide a fallback so 'name' is never null: prefer requested language, fall back to the other
            const name = requestedLang === 'ar' ? (meal.name_ar || meal.name_en) : (meal.name_en || meal.name_ar);
            const description = requestedLang === 'ar' ? (meal.description_ar || meal.description_en || '') : (meal.description_en || meal.description_ar || '');
            return {
                id: meal.id,
                name_en: meal.name_en,
                name_ar: meal.name_ar,
                name,
                description_en: meal.description_en || '',
                description_ar: meal.description_ar || '',
                description,
                image_filename: meal.image_filename,
                created_at: meal.created_at,
                updated_at: meal.updated_at,
                nutritional_facts_en: meal.nutritional_facts_en || '',
                nutritional_facts_ar: meal.nutritional_facts_ar || '',
                ingredients_en: meal.ingredients_en || '',
                ingredients_ar: meal.ingredients_ar || '',
                is_active: meal.is_active,
                ingredients: meal_ingredients,
                meal_images,
                // Add any additional DB fields here as needed
            };
        });
        console.log('[DEBUG] Returning meals response with structure:', {
            success: true,
            dataLength: mealsWithDbFields?.length || 0,
            firstItemId: mealsWithDbFields?.[0]?.id,
            firstItemIdType: typeof mealsWithDbFields?.[0]?.id
        });
        res.json({
            success: true,
            data: mealsWithDbFields
        });
    }
    catch (error) {
        console.error('Get meals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch meals'
        });
    }
});
// Get meal by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const meal = repositories_js_1.mealRepo.findById(id);
        if (!meal) {
            return res.status(404).json({
                success: false,
                error: 'Meal not found'
            });
        }
        // Determine requested language (query param ?lang=ar or Accept-Language header)
        const requestedLang = (req.query.lang === 'ar' || String(req.headers['accept-language'] || '').includes('ar')) ? 'ar' : 'en';
        // Get meal ingredients
        const ingredients = repositories_js_1.mealIngredientRepo.findByMeal(id);
        // Get meal images
        const images = repositories_js_1.mealImageRepo.findByMealOrdered(id);
        // Debug: single-meal trace
        try {
            console.debug(`[MEALS DEBUG] get /:id id=${id} image_filename='${meal.image_filename}' -> '${buildImageUrl(meal.image_filename)}' ingredientsCount=${ingredients?.length || 0} imagesCount=${images?.length || 0}`);
        }
        catch (e) {
            // ignore
        }
        // Build normalized response matching list endpoint
        const name = requestedLang === 'ar' ? (meal.name_ar || meal.name_en) : (meal.name_en || meal.name_ar);
        const description = requestedLang === 'ar' ? (meal.description_ar || meal.description_en || '') : (meal.description_en || meal.description_ar || '');
        res.json({
            success: true,
            data: {
                id: meal.id,
                name_en: meal.name_en,
                name_ar: meal.name_ar,
                name,
                description_en: meal.description_en || '',
                description_ar: meal.description_ar || '',
                description,
                image_filename: meal.image_filename,
                created_at: meal.created_at,
                updated_at: meal.updated_at,
                nutritional_facts_en: meal.nutritional_facts_en || '',
                nutritional_facts_ar: meal.nutritional_facts_ar || '',
                ingredients_en: meal.ingredients_en || '',
                ingredients_ar: meal.ingredients_ar || '',
                is_active: meal.is_active,
                ingredients,
                meal_images: images
            }
        });
    }
    catch (error) {
        console.error('Get meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch meal'
        });
    }
});
// Admin routes (require authentication and admin role)
// Get all meals (including inactive)
router.get('/admin/all', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const meals = repositories_js_1.mealRepo.findAll();
        res.json({
            success: true,
            data: meals
        });
    }
    catch (error) {
        console.error('Get all meals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch meals'
        });
    }
});
// Create new meal
router.post('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, createMealValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const mealData = req.body;
        // Create meal
        const newMeal = repositories_js_1.mealRepo.create({
            ...mealData,
            is_active: mealData.is_active ?? true
        });
        res.status(201).json({
            success: true,
            message: 'Meal created successfully',
            data: newMeal
        });
    }
    catch (error) {
        console.error('Create meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create meal'
        });
    }
});
// Update meal
router.put('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, updateMealValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { id } = req.params;
        const mealData = req.body;
        // Check if meal exists
        const existingMeal = repositories_js_1.mealRepo.findById(id);
        if (!existingMeal) {
            return res.status(404).json({
                success: false,
                error: 'Meal not found'
            });
        }
        // Update meal
        const updatedMeal = repositories_js_1.mealRepo.update(id, mealData);
        res.json({
            success: true,
            message: 'Meal updated successfully',
            data: updatedMeal
        });
    }
    catch (error) {
        console.error('Update meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update meal'
        });
    }
});
// Delete meal
router.delete('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if meal exists
        const existingMeal = repositories_js_1.mealRepo.findById(id);
        if (!existingMeal) {
            return res.status(404).json({
                success: false,
                error: 'Meal not found'
            });
        }
        // Delete meal (ingredients and images will be cascade deleted)
        const deleted = repositories_js_1.mealRepo.delete(id);
        if (deleted) {
            res.json({
                success: true,
                message: 'Meal deleted successfully'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete meal'
            });
        }
    }
    catch (error) {
        console.error('Delete meal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete meal'
        });
    }
});
exports.default = router;
//# sourceMappingURL=meals.js.map
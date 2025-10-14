"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repositories_js_1 = require("../services/repositories.js");
const router = (0, express_1.Router)();
// Get all ingredients
router.get('/', async (req, res) => {
    try {
        console.log('[DEBUG] GET /ingredients - Fetching all ingredients');
        const ingredients = repositories_js_1.ingredientRepo.findAll();
        console.log('[DEBUG] Found ingredients from DB:', ingredients?.length || 0, 'items');
        res.json({
            success: true,
            data: ingredients
        });
    }
    catch (error) {
        console.error('Get ingredients error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ingredients'
        });
    }
});
// Get ingredient by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] GET /ingredients/${id} - Fetching ingredient by ID`);
        const ingredient = repositories_js_1.ingredientRepo.findById(id);
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
    }
    catch (error) {
        console.error('Get ingredient error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ingredient'
        });
    }
});
exports.default = router;
//# sourceMappingURL=ingredients.js.map
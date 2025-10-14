"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repositories_js_1 = require("../services/repositories.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Get all subscriptions (admin only)
router.get('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const subscriptions = repositories_js_1.subscriptionRepo.findAll();
        // Return all DB fields for each subscription
        res.json({
            success: true,
            data: subscriptions
        });
    }
    catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscriptions'
        });
    }
});
// Get subscription by ID (admin only)
router.get('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = repositories_js_1.subscriptionRepo.findById(id);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                error: 'Subscription not found'
            });
        }
        res.json({
            success: true,
            data: subscription
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscription'
        });
    }
});
// Get current user's subscriptions
router.get('/my/subscriptions', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const subscriptions = repositories_js_1.subscriptionRepo.findByUser(req.user.user_id);
        res.json({
            success: true,
            data: subscriptions
        });
    }
    catch (error) {
        console.error('Get user subscriptions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscriptions'
        });
    }
});
// Create new subscription
router.post('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { plan_id, start_date, end_date, student_discount_applied, price_charged_aed } = req.body;
        // Validate required fields
        if (!plan_id || !start_date || !end_date || !price_charged_aed) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: plan_id, start_date, end_date, price_charged_aed'
            });
        }
        // Verify plan exists
        const plan = repositories_js_1.planRepo.findById(plan_id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        // Create subscription
        const newSubscription = repositories_js_1.subscriptionRepo.create({
            user_id: req.user.user_id,
            plan_id,
            status: 'pending_payment',
            start_date,
            end_date,
            student_discount_applied: student_discount_applied || false,
            price_charged_aed,
            currency: 'AED',
            renewal_type: 'manual',
            has_successful_payment: false
        });
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: newSubscription
        });
    }
    catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create subscription'
        });
    }
    // Update subscription status (admin only)
    router.put('/:id/status', auth_js_1.authenticateToken, auth_js_1.requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            // Validate status
            const validStatuses = ['active', 'rejected', 'paused'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status. Must be one of: active, rejected, paused'
                });
            }
            // Find subscription
            const subscription = repositories_js_1.subscriptionRepo.findById(id);
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    error: 'Subscription not found'
                });
            }
            // Update subscription status
            const updatedSubscription = repositories_js_1.subscriptionRepo.update(id, { status });
            res.json({
                success: true,
                message: 'Subscription status updated successfully',
                data: updatedSubscription
            });
        }
        catch (error) {
            console.error('Update subscription status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update subscription status'
            });
        }
    });
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map
/**
 * @openapi
 * tags:
 *  - name: Summary
 *    description: Analytics and Summary Management
 */
import express from 'express';
import {
    getMonthlySummary,
    getRecentAverage,
    getTop5Expenses
} from '../controllers/Summary.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all summary routes
router.use(authenticateToken);

// Summary routes
router.get('/monthly', getMonthlySummary);
router.get('/recent-average', getRecentAverage);
router.get('/top5', getTop5Expenses);

export default router;
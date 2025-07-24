/**
 * @openapi
 * tags:
 *  - name: Summary
 *    description: Analytics and Summary Management
 */
import express from 'express';
import {
    getMonthlySummary,
    getRecentAverage
} from '../controllers/Summary.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply mock authentication to all summary routes
router.use(authenticateToken);

// Summary routes
router.get('/monthly', getMonthlySummary);
router.get('/recent-average', getRecentAverage);

export default router;
/**
 * @openapi
 * tags:
 *  - name: Category
 *    description: Category Management
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js'; //use this for main branch
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/Category.controller.js';

const router = express.Router();

// Apply mock authentication to all category routes
router.use(authenticateToken);

router.get('/', getAllCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
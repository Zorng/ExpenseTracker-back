/**
 * @openapi
 * tags:
 *  - name: Category
 *    description: Category Management
 */
import express from 'express';
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/Category.controller.js';

const router = express.Router();

router.get('/', getAllCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
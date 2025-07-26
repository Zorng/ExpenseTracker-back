/**
 * @openapi
 * tags:
 *  - name: Category
 *    description: Category Management
 */
import db from '../models/index.js';

const Category = db.Category;

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - mockAuth: []
 *     responses:
 *       200:
 *         description: List of all categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
export const getAllCategories = async (req, res) => {
    try {
        const userId = req.user.id; // Get authenticated user ID
        const categories = await Category.findAll({
            where: { userId } // Only get user's categories
        });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - mockAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Category already exists
 */
export const createCategory = async (req, res) => {
    try {
        const userId = req.user.id; // Get authenticated user ID
        const { name, color } = req.body;

        if (!name || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ error: 'Invalid category data. Expect name and hex color.' });
        }

        // Check if category exists for this user only
        const existing = await db.Category.findOne({ 
            where: { 
                name,
                userId // Check within user's categories only
            } 
        });
        if (existing) return res.status(409).json({ error: 'Category already exists' });

        const category = await db.Category.create({ 
            name, 
            color,
            userId // Auto-assign to authenticated user
        });
        res.status(201).json(category);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - mockAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       403:
 *         description: Forbidden - You don't have permission to update this category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Get authenticated user ID
        const { name, color } = req.body;

        // First check if the category exists at all
        const categoryExists = await db.Category.findByPk(id);
        
        if (!categoryExists) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        // Then check if the user has permission to access this category
        if (categoryExists.userId !== userId) {
            return res.status(403).json({ error: 'You don\'t have permission to update this category' });
        }
        
        const category = categoryExists; // Use the already found category

        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ error: 'Invalid hex color format' });
        }

        category.name = name ?? category.name;
        category.color = color ?? category.color;
        await category.save();

        res.json(category);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update category' });
    }
};

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - mockAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden - You don't have permission to delete this category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Get authenticated user ID

        // First check if the category exists at all
        const categoryExists = await db.Category.findByPk(id);
        
        if (!categoryExists) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        // Then check if the user has permission to access this category
        if (categoryExists.userId !== userId) {
            return res.status(403).json({ error: 'You don\'t have permission to delete this category' });
        }
        
        // Delete the category
        await categoryExists.destroy();

        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
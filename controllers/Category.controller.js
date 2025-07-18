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
        const categories = await Category.findAll();
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
        const { name, color } = req.body;

        if (!name || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ error: 'Invalid category data. Expect name and hex color.' });
        }

        const existing = await db.Category.findOne({ where: { name } });
        if (existing) return res.status(409).json({ error: 'Category already exists' });

        const category = await db.Category.create({ name, color });
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
 *       404:
 *         description: Category not found
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        const category = await db.Category.findByPk(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Category.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ error: 'Category not found' });

        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
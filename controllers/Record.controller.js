import db from "../models/index.js";
import { Op } from 'sequelize';

// Currency conversion rates
const EXCHANGE_RATES = {
    USD_TO_KHR: 4000, // 1 USD = 4000 KHR
    KHR_TO_USD: 0.00025 // 1 KHR = 0.00025 USD
};

// Helper function to convert amounts to a base currency (USD) for comparison
const convertToBaseCurrency = (amount, currency) => {
    if (currency === 'USD') return parseFloat(amount);
    if (currency === 'KHR') return parseFloat(amount) * EXCHANGE_RATES.KHR_TO_USD;
    return parseFloat(amount);
};

/**
 * @openapi
 * tags:
 *  - name: Record
 *    description: Record Management
 */

/**
 * @openapi
 * /api/records:
 *   get:
 *     tags: [Record]
 *     summary: Get all records with pagination and advanced filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, amount, date, title]
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID (more efficient for large datasets)
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter (automatically converts between currencies)
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter (automatically converts between currencies)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *       - in: query
 *         name: amountCurrency
 *         schema:
 *           type: string
 *           enum: [USD, KHR]
 *           default: USD
 *         description: |
 *           Currency unit for amount filters (default: USD).
 *           System automatically includes equivalent amounts in both currencies.
 *           Example: minAmount=100&amountCurrency=USD will include records ≥100 USD OR ≥400,000 KHR
 *     responses:
 *       200:
 *         description: List of records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Record'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const getAllRecords = async (req,res) => {
    const userId = req.user.id; // Get authenticated user ID
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const sort = req.query.sort === 'desc' ? 'DESC' : 'ASC';
    const sortBy = req.query.sortBy || 'id';
    
    // Filter parameters
    const categoryId = req.query.categoryId;
    const minAmount = req.query.minAmount;
    const maxAmount = req.query.maxAmount;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const amountCurrency = req.query.amountCurrency;

    try{
        let whereConditions = {
            userId: userId // Only get records belonging to authenticated user
        };
        
        // Apply category filter by ID (optimized for performance)
        if (categoryId) {
            // Direct category ID filtering - much faster than name lookup
            whereConditions.categoryId = parseInt(categoryId);
        }
        
        // Apply amount range filter with currency conversion
        if (minAmount || maxAmount) {
            // Convert filter amounts to base currency (USD) for comparison
            const minAmountUSD = minAmount ? convertToBaseCurrency(minAmount, amountCurrency || 'USD') : null;
            const maxAmountUSD = maxAmount ? convertToBaseCurrency(maxAmount, amountCurrency || 'USD') : null;
            
            // Create complex where condition that handles both currencies
            const amountConditions = [];
            
            if (minAmountUSD !== null && maxAmountUSD !== null) {
                // Both min and max specified
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'USD' },
                        { amount: { [Op.gte]: minAmountUSD, [Op.lte]: maxAmountUSD } }
                    ]
                });
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'KHR' },
                        { amount: { [Op.gte]: minAmountUSD * EXCHANGE_RATES.USD_TO_KHR, [Op.lte]: maxAmountUSD * EXCHANGE_RATES.USD_TO_KHR } }
                    ]
                });
            } else if (minAmountUSD !== null) {
                // Only min specified
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'USD' },
                        { amount: { [Op.gte]: minAmountUSD } }
                    ]
                });
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'KHR' },
                        { amount: { [Op.gte]: minAmountUSD * EXCHANGE_RATES.USD_TO_KHR } }
                    ]
                });
            } else if (maxAmountUSD !== null) {
                // Only max specified
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'USD' },
                        { amount: { [Op.lte]: maxAmountUSD } }
                    ]
                });
                amountConditions.push({
                    [Op.and]: [
                        { currency: 'KHR' },
                        { amount: { [Op.lte]: maxAmountUSD * EXCHANGE_RATES.USD_TO_KHR } }
                    ]
                });
            }
            
            if (amountConditions.length > 0) {
                whereConditions[Op.and] = whereConditions[Op.and] || [];
                whereConditions[Op.and].push({ [Op.or]: amountConditions });
            }
        }
        
        // Note: Currency filtering is now handled in the amount range filter above
        // No separate currency filter needed
        
        // Apply date range filter
        if (startDate || endDate) {
            whereConditions.date = {};
            if (startDate) {
                whereConditions.date[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                // Add time to end date to include the entire day
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                whereConditions.date[Op.lte] = endDateTime;
            }
        }
        
        // Validate sortBy field
        const validSortFields = ['id', 'amount', 'date', 'title'];
        const orderField = validSortFields.includes(sortBy) ? sortBy : 'id';
        const orderBy = [[orderField, sort]];

        const total = await db.Record.count({ where: whereConditions });
        const records = await db.Record.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color']
                }
            ],
            limit: pageSize,
            offset: (page - 1) * pageSize,
            order: orderBy
        });
        
        res.json({
            meta: {
                totalItems: total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
                filters: {
                    categoryId: categoryId ? parseInt(categoryId) : null,
                    minAmount: minAmount ? parseFloat(minAmount) : null,
                    maxAmount: maxAmount ? parseFloat(maxAmount) : null,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    amountCurrency: amountCurrency || null,
                    sortBy: orderField,
                    sort: sort
                }
            },
            data: records,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @openapi
 * /api/records:
 *   post:
 *     tags: [Record]
 *     summary: Create a new record with optional category
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new expense record. For category field:
 *       - Use category names like "Food", "Gas", "Services"
 *       - Or any category name you've created
 *       - Leave empty for no category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, date, currency, amount]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Grocery Shopping"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-21"
 *               currency:
 *                 type: string
 *                 enum: [USD, KHR]
 *                 example: "USD"
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 25.50
 *               note:
 *                 type: string
 *                 example: "Weekly groceries"
 *               category:
 *                 type: string
 *                 enum: [Food, Gas, Services]
 *                 example: "Food"
 *                 description: Category name (optional dropdown selection)
 *     responses:
 *       201:
 *         description: Record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       400:
 *         description: Bad request - missing required fields or invalid category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

export const createRecord = async (req, res) => {
    try{
        const userId = req.user.id; //to get userId
         const { title, date, currency, amount, category } = req.body;
        
        if (!title || !date || !currency || !amount) {
            return res.status(400).json({ 
                error: "Missing required fields: title, date, currency, amount" 
            });
        }
        
        let categoryId = null;
        if (category) {
            const foundCategory = await db.Category.findOne({ 
                where: { 
                    name: category,
                    userId: userId // Only search within user's categories
                } 
            });
            if (!foundCategory) {
                return res.status(400).json({ 
                    error: `Category "${category}" not found. Please create it first or use existing categories like "Food", "Gas", "Services"` 
                });
            }
            categoryId = foundCategory.id;
        }
        
        const recordData = {
            title,
            date,
            currency,
            amount,
            note: req.body.note,
            categoryId: categoryId,
            userId: userId
        };
        
        const record = await db.Record.create(recordData);
        

        const recordWithCategory = await db.Record.findByPk(record.id, {
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color']
                }
            ]
        });
        
        res.status(201).json(recordWithCategory);
    } catch (err) {
        res.status(400).json({ error: "Error creating record: " + err.message });
    }
};

/**
 * @openapi
 * /api/records/{id}:
 *   put:
 *     tags: [Record]
 *     summary: Update a record
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update an existing expense record. All fields are optional:
 *       - For category field: Use category names like "Food", "Gas", "Services"
 *       - Set category to null or empty string to remove category
 *       - Leave category undefined to keep existing category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Grocery Shopping"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-21"
 *               currency:
 *                 type: string
 *                 enum: [USD, KHR]
 *                 example: "USD"
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 30.00
 *               note:
 *                 type: string
 *                 example: "Updated note"
 *               category:
 *                 type: string
 *                 enum: [Food, Gas, Services]
 *                 example: "Food"
 *                 description: Category name (optional dropdown selection, or null to remove category)
 *     responses:
 *       200:
 *         description: Record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       400:
 *         description: Bad request - invalid category or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: Forbidden - You don't have permission to update this record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

export const updateRecord = async (req,res) => {
    try{
        const userId = req.user.id; // Get authenticated user ID
        const { title, date, currency, amount, note, category } = req.body;
        
        // First check if the record exists at all
        const recordExists = await db.Record.findByPk(req.params.id);
        
        if (!recordExists) {
            return res.status(404).json({error: "Record not found"});
        }
        
        // Then check if the user has permission to access this record
        if (recordExists.userId !== userId) {
            return res.status(403).json({error: "You don't have permission to update this record"});
        }
        
        const record = recordExists; // Use the already found record

        // Handle category update if provided
        let categoryId = record.categoryId; // Keep existing category by default
        
        if (category !== undefined) {
            if (category === null || category === '') {
                // User wants to remove category
                categoryId = null;
            } else {
                // User wants to update to a specific category
                const foundCategory = await db.Category.findOne({ 
                    where: { 
                        name: category,
                        userId: userId // Only search within user's categories
                    } 
                });
                if (!foundCategory) {
                    return res.status(400).json({ 
                        error: `Category "${category}" not found. Please create it first or use existing categories.` 
                    });
                }
                categoryId = foundCategory.id;
            }
        }

        // Prepare update data
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (date !== undefined) updateData.date = date;
        if (currency !== undefined) updateData.currency = currency;
        if (amount !== undefined) updateData.amount = amount;
        if (note !== undefined) updateData.note = note;
        if (category !== undefined) updateData.categoryId = categoryId;

        // Update the record
        await record.update(updateData);

        // Return updated record with category information
        const updatedRecord = await db.Record.findByPk(record.id, {
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color']
                }
            ]
        });

        res.json(updatedRecord);
    }catch(err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     tags: [Record]
 *     summary: Delete a record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Record ID
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden - You don't have permission to delete this record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

export const deleteRecord = async (req,res) => {
    try {
        const userId = req.user.id; // Get authenticated user ID
        
        // First check if the record exists at all
        const recordExists = await db.Record.findByPk(req.params.id);
        
        if (!recordExists) {
            return res.status(404).json({error: "Record not found"});
        }
        
        // Then check if the user has permission to access this record
        if (recordExists.userId !== userId) {
            return res.status(403).json({error: "You don't have permission to delete this record"});
        }
        
        const record = recordExists; // Use the already found record
        
        await record.destroy();
        res.json({message: "Record deleted."});        
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Record]
 *     summary: Get a single record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Record ID
 *     responses:
 *       200:
 *         description: Record found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       403:
 *         description: Forbidden - You don't have permission to access this record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const findRecordById = async (req,res) => {
    try{
        const userId = req.user.id;

        const recordExists = await db.Record.findByPk(req.params.id);

        if(!recordExists) {
            return res.status(404).json({error: "Record not found"});
        }
        if(recordExists.userId !== userId) {
            return res.status(403).json({error: "You don't have permission to access this record"});
        }
        
        // Get record with category information for consistency with other endpoints
        const record = await db.Record.findByPk(req.params.id, {
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color']
                }
            ]
        });
        
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

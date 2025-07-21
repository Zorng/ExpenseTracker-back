import db from "../models/index.js";
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
 *     summary: Get all records with pagination and filtering
 *     security:
 *       - mockAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, amount, currency, date, category]
 *           default: all
 *         description: |
 *           Filter type:
 *           - all: Show all records
 *           - amount: Sort by amount (use sort parameter)
 *           - currency: Filter by currency type
 *           - date: Sort by date (use sort parameter)
 *           - category: Filter by category name
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: |
 *           Filter value:
 *           - For currency: USD, KHR
 *           - For category: Food, Gas, Services (or any category name)
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
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort === 'desc' ? 'DESC' : 'ASC';
    
    // Filter parameters
    const filter = req.query.filter || 'all';
    const value = req.query.value;

    try{
        // Build where conditions and order
        let whereConditions = {
            userId: userId // Only get records belonging to authenticated user
        };
        let orderBy = [['id', sort]]; // Default order by id
        
        // Apply filters
        switch(filter) {
            case 'amount':
                // Sort by amount instead of id
                orderBy = [['amount', sort]];
                break;
                
            case 'date':
                // Sort by date instead of id
                orderBy = [['date', sort]];
                break;
                
            case 'currency':
                if (value && (value === 'USD' || value === 'KHR')) {
                    whereConditions.currency = value;
                }
                break;
                
            case 'category':
                if (value) {
                    // Find category by name and filter records
                    const category = await db.Category.findOne({ 
                        where: { 
                            name: value,
                            userId: userId // Filter by user's categories
                        } 
                    });
                    if (category) {
                        whereConditions.categoryId = category.id;
                    }
                    // If category not found, no records will match (empty result)
                }
                break;
                
            case 'all':
            default:
                // No filtering, use default ordering
                break;
        }

        const total = await db.Record.count({ where: whereConditions });
        const records = await db.Record.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color']
                }
            ],
            limit,
            offset: (page - 1) * limit,
            order: orderBy
        });
        
        res.json({
            meta: {
                totalItems: total,
                page,
                totalPages: Math.ceil(total / limit),
                filters: {
                    filter: filter,
                    value: value || null
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
 *       - mockAuth: []
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
 *                 example: "Food"
 *                 description: |
 *                   Category name (optional):
 *                   - Use category names like "Food", "Gas", "Services"
 *                   - Or any category name you've created via POST /api/categories
 *                   - Leave empty for no category
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
 *       - mockAuth: []
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
 *                 example: "Food"
 *                 description: |
 *                   Category name (optional):
 *                   - Use category names you own like "Food", "Gas", "Services"
 *                   - Set to null or empty string to remove category
 *                   - Leave undefined to keep existing category
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
 *       - mockAuth: []
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



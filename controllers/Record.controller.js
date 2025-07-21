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
 *           enum: [all, amount, currency, date]
 *           default: all
 *         description: |
 *           Filter type:
 *           - all: Show all records
 *           - amount: Sort by amount (use sort parameter)
 *           - currency: Filter by currency type
 *           - date: Sort by date (use sort parameter)
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: |
 *           Filter value (only needed for currency):
 *           - For currency: USD, KHR
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
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort === 'desc' ? 'DESC' : 'ASC';
    
    // Filter parameters
    const filter = req.query.filter || 'all';
    const value = req.query.value;

    try{
        // Build where conditions and order
        let whereConditions = {};
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
        // const userId = req.user.id; //to get userId
         const { title, date, currency, amount, category } = req.body;
        
        if (!title || !date || !currency || !amount) {
            return res.status(400).json({ 
                error: "Missing required fields: title, date, currency, amount" 
            });
        }
        
        let categoryId = null;
        if (category) {
            const foundCategory = await db.Category.findOne({ 
                where: { name: category } 
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
            categoryId: categoryId
            //userId:userId //to store in database
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
 *             $ref: '#/components/schemas/RecordInput'
 *     responses:
 *       200:
 *         description: Record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
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
        const record = await db.Record.findByPk(req.params.id);
        if(!record) {
            return res.status(404).json({error: "Record not found"});
        }
        await record.update(req.body);
        res.json(record);
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
        const record = await db.Record.findByPk(req.params.id);
        if(!record) return res.status(404).json({error: "Record not found"});
        await record.destroy();
        res.json({message: "Record deleted."});        
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};



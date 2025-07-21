/**
 * @openapi
 * tags:
 *  - name: Record
 *    description: Record Management
 */
import express from 'express';
// import mockAuth from '../middleware/mockAuth.js'; //just for testing
import { authenticateToken } from '../middleware/auth.js'; //use this for main branch
import {
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord
} from '../controllers/Record.controller.js';

const router = express.Router();

// Apply mock authentication to all record routes
// router.use(mockAuth);
router.use(auth.js);


router.get('/', getAllRecords);
router.post('/', createRecord);
router.put('/:id', updateRecord);
router.delete('/:id', deleteRecord);

export default router;

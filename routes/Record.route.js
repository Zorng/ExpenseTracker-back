/**
 * @openapi
 * tags:
 *  - name: Record
 *    description: Record Management
 */
import express from 'express';
import {
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord
} from '../controllers/Record.controller.js';

const router = express.Router();

router.get('/', getAllRecords);
router.post('/', createRecord);
router.put('/:id', updateRecord);
router.delete('/:id', deleteRecord);

export default router;

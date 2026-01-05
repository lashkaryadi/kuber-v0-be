import express from 'express';
import * as soldController from '../controllers/soldController.js';

const router = express.Router();

router.get('/', soldController.getAllSold);
router.get('/:id', soldController.getSoldById);
router.post('/', soldController.recordSale);

export default router;

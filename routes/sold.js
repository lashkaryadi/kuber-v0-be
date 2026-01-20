import express from 'express';
import * as saleController from '../controllers/saleController.js';

const router = express.Router();

router.get('/', saleController.getAllSales);
router.get('/:id', saleController.getSaleById);
router.post('/', saleController.createSale);
router.delete('/:id', saleController.cancelSale);

export default router;

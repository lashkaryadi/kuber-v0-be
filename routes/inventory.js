import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);
router.post('/', inventoryController.createItem);
router.put('/:id', inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);

export default router;

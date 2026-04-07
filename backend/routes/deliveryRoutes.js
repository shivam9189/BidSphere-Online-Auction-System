import express from 'express';
const router = express.Router();
import {
  createDelivery,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  updateUserAddress
} from '../controllers/deliveryController.js';
import { restrictToLoggedinUserOnly as auth } from '../middleware/authMiddleware.js';

router.post('/create', auth, createDelivery);
router.get('/my-deliveries', auth, getMyDeliveries);
router.get('/all', getAllDeliveries);
router.put('/:deliveryId/status', auth, updateDeliveryStatus);
router.put('/update-address', auth, updateUserAddress);

export default router;

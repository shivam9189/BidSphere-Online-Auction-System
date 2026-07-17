import express from 'express';
import { rateSeller, getSellerRatings, updateRating, deleteRating } from '../controllers/ratingController.js';
import { restrictToLoggedinUserOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: fetch seller ratings
router.get('/seller/:sellerId', getSellerRatings);

// Protected: only logged-in users can create/update/delete ratings
router.post('/', restrictToLoggedinUserOnly, rateSeller);
router.put('/:id', restrictToLoggedinUserOnly, updateRating);
router.delete('/:id', restrictToLoggedinUserOnly, deleteRating);

export default router;
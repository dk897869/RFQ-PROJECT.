const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

const {
  getAllRFQs,
  createRFQ,
  getRFQById,
  updateRFQ,
  deleteRFQ,
  getVendors,
  getDepartments,
} = require('../controllers/Rfq.controller');

// Public routes (if any)
router.get('/departments', getDepartments); // Make public if needed
router.get('/vendors', getVendors); // Make public if needed

// Protected routes
router.get('/', verifyToken, getAllRFQs);
router.post('/', verifyToken, createRFQ);
router.get('/:id', verifyToken, getRFQById);
router.put('/:id', verifyToken, updateRFQ);
router.delete('/:id', verifyToken, deleteRFQ);

module.exports = router;
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// Import all controller functions
const {
  createPaymentNpp,
  listPaymentNpp,
  getPaymentNpp,
  updatePaymentNpp,
  deletePaymentNpp,
  approvePaymentNpp,
  rejectPaymentNpp
} = require('../controllers/paymentNpp.controller');

// Apply authentication to all routes
router.use(verifyToken);

// CRUD Routes
router.post('/', createPaymentNpp);
router.get('/', listPaymentNpp);
router.get('/:id', getPaymentNpp);
router.put('/:id', updatePaymentNpp);
router.delete('/:id', deletePaymentNpp);

// Approval Routes
router.patch('/:id/approve', approvePaymentNpp);
router.patch('/:id/reject', rejectPaymentNpp);

module.exports = router;
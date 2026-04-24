const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const {
  createPaymentNpp,
  listPaymentNpp,
  getPaymentNpp,
  updatePaymentNpp,
  deletePaymentNpp,
  approvePaymentNpp,
  rejectPaymentNpp
} = require('../controllers/paymentNpp.controller');

router.use(verifyToken);

router.post('/', createPaymentNpp);
router.get('/', listPaymentNpp);
router.get('/:id', getPaymentNpp);
router.put('/:id', updatePaymentNpp);
router.delete('/:id', deletePaymentNpp);
router.patch('/:id/approve', approvePaymentNpp);
router.patch('/:id/reject', rejectPaymentNpp);

module.exports = router;
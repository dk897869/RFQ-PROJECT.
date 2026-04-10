const express = require('express');
const router = express.Router();

const {
  getAllRFQs,
  createRFQ,
  getRFQById,
  getVendors,
  getDepartments
} = require('../controllers/Rfq.controller');

// RFQ Routes
router.get('/', getAllRFQs);
router.post('/', createRFQ);
router.get('/:id', getRFQById);
router.get('/vendors', getVendors);

module.exports = router;
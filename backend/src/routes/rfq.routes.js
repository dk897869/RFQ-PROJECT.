const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

const {
  getAllRFQs,
  createRFQ,
  getRFQById,
  getVendors,
  getDepartments,
} = require('../controllers/Rfq.controller');

router.get('/vendors', verifyToken, getVendors);
router.get('/departments', verifyToken, getDepartments);
router.get('/', verifyToken, getAllRFQs);
router.post('/', verifyToken, createRFQ);
router.get('/:id', verifyToken, getRFQById);

module.exports = router;

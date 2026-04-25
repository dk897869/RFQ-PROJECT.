const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// Import all controller functions - MAKE SURE THEY EXIST
const {
  createPrNpp,
  listPrNpp,
  getPrNpp,
  updatePrNpp,
  deletePrNpp,
  approvePrNpp,
  rejectPrNpp
} = require('../controllers/prNpp.controller');

// Apply authentication to all routes
router.use(verifyToken);

// CRUD Routes
router.post('/', createPrNpp);
router.get('/', listPrNpp);
router.get('/:id', getPrNpp);
router.put('/:id', updatePrNpp);
router.delete('/:id', deletePrNpp);

// Approval Routes
router.patch('/:id/approve', approvePrNpp);
router.patch('/:id/reject', rejectPrNpp);

module.exports = router;
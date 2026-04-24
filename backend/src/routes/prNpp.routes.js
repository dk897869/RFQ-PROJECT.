const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const {
  createPrNpp,
  listPrNpp,
  getPrNpp,
  updatePrNpp,
  deletePrNpp,
  approvePrNpp,
  rejectPrNpp
} = require('../controllers/prNpp.controller');

router.use(verifyToken);

router.post('/', createPrNpp);
router.get('/', listPrNpp);
router.get('/:id', getPrNpp);
router.put('/:id', updatePrNpp);
router.delete('/:id', deletePrNpp);
router.patch('/:id/approve', approvePrNpp);
router.patch('/:id/reject', rejectPrNpp);

module.exports = router;
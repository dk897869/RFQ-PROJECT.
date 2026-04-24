const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const {
  createPoNpp,
  listPoNpp,
  getPoNpp,
  updatePoNpp,
  deletePoNpp,
  approvePoNpp,
  rejectPoNpp
} = require('../controllers/poNpp.controller');

router.use(verifyToken);

router.post('/', createPoNpp);
router.get('/', listPoNpp);
router.get('/:id', getPoNpp);
router.put('/:id', updatePoNpp);
router.delete('/:id', deletePoNpp);
router.patch('/:id/approve', approvePoNpp);
router.patch('/:id/reject', rejectPoNpp);

module.exports = router;
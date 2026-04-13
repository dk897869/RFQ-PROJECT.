const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const c = require('../controllers/prNpp.controller');

router.post('/', verifyToken, c.createPrNpp);
router.get('/', verifyToken, c.listPrNpp);
router.get('/:id', verifyToken, c.getPrNpp);
router.patch('/:id/approve', verifyToken, c.approvePrNpp);
router.patch('/:id/reject', verifyToken, c.rejectPrNpp);

module.exports = router;

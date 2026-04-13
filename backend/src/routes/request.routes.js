const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', requestController.getRequests);
router.get('/stats/dashboard', requestController.getDashboardStats);
router.get('/my-pending', requestController.getMyPendingRequests);
router.get('/status/:status', requestController.getRequestsByStatus);
router.get('/department/:department', requestController.getRequestsByDepartment);
router.get('/departments', requestController.getDepartments);

router.get('/:id', requestController.getRequestById);

router.post('/', requestController.createRequest);
router.put('/:id', requestController.updateRequest);
router.patch('/:id/approve', requestController.approveRequest);
router.patch('/:id/reject', requestController.rejectRequest);
router.delete('/:id', requestController.deleteRequest);

module.exports = router;

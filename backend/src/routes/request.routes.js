const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');

// Simple auth middleware (replace with real auth later)
const auth = (req, res, next) => {
  req.user = { 
    id: 'test_user', 
    email: 'test@example.com', 
    name: 'Test User' 
  };
  next();
};

// Apply auth to all routes
router.use(auth);

// ==================== ROUTES ====================

router.get('/', requestController.getRequests);
router.get('/stats/dashboard', requestController.getDashboardStats);
router.get('/my-pending', requestController.getMyPendingRequests);
router.get('/status/:status', requestController.getRequestsByStatus);

// Fixed Routes - Correct function names
router.get('/department/:department', requestController.getRequestsByDepartment);   // Correct function
router.get('/departments', requestController.getDepartments);                       // ← This was missing

router.get('/:id', requestController.getRequestById);

router.post('/', requestController.createRequest);
router.put('/:id', requestController.updateRequest);
router.patch('/:id/approve', requestController.approveRequest);
router.patch('/:id/reject', requestController.rejectRequest);
router.delete('/:id', requestController.deleteRequest);

module.exports = router;
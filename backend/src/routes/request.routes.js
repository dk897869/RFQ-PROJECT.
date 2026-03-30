const express = require("express");
const router = express.Router();

const requestController = require("../controllers/request.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== REQUEST ROUTES ======================

// GET All Requests
router.get("/", verifyToken, requestController.getRequests);

// GET Dashboard Stats
router.get("/stats/dashboard", verifyToken, requestController.getDashboardStats);

// GET My Pending Requests
router.get("/my-pending", verifyToken, requestController.getMyPendingRequests);

// GET Requests by Status
router.get("/status/:status", verifyToken, requestController.getRequestsByStatus);

// TEST Endpoint for CC Emails (MUST be before the /:id route)
router.post("/test-email", verifyToken, requestController.testEmail);

// GET Single Request by ID (must be after specific routes)
router.get("/:id", verifyToken, requestController.getRequestById);

// CREATE New Request
router.post("/", verifyToken, requestController.createRequest);

// UPDATE Request
router.put("/:id", verifyToken, requestController.updateRequest);

// Approve Request
router.patch("/:id/approve", verifyToken, requestController.approveRequest);

// Reject Request
router.patch("/:id/reject", verifyToken, requestController.rejectRequest);

// DELETE Request
router.delete("/:id", verifyToken, requestController.deleteRequest);

// Add Attachment to Request
router.post("/:id/attachments", verifyToken, requestController.addAttachment);

// Get Approval Workflow Status
router.get("/:id/workflow", verifyToken, requestController.getApprovalWorkflow);

// Get Requests by Department
router.get("/department/:department", verifyToken, requestController.getRequestsByDepartment);

module.exports = router;
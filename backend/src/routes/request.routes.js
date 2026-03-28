const express = require("express");
const router = express.Router();

const requestController = require("../controllers/request.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== FULL CRUD ======================

// GET All EP Requests
router.get("/", verifyToken, requestController.getRequests);

// CREATE New EP Request
router.post("/", verifyToken, requestController.createRequest);

// GET Single Request by ID
router.get("/:id", verifyToken, requestController.getRequestById);

// UPDATE Request
router.put("/:id", verifyToken, requestController.updateRequest);

// DELETE Request
router.delete("/:id", verifyToken, requestController.deleteRequest);

module.exports = router;
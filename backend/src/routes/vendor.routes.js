const express = require("express");
const router = express.Router();

const vendorController = require("../controllers/vendor.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== FULL CRUD ======================

// GET All Vendors
router.get("/", verifyToken, vendorController.getVendors);

// CREATE New Vendor
router.post("/", verifyToken, vendorController.addVendor);

// UPDATE Vendor
router.put("/:id", verifyToken, vendorController.updateVendor);

// DELETE Vendor
router.delete("/:id", verifyToken, vendorController.deleteVendor);

module.exports = router;
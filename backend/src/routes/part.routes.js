const express = require("express");
const router = express.Router();

const partController = require("../controllers/part.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== FULL CRUD ======================

// GET All Parts
router.get("/", verifyToken, partController.getParts);

// CREATE New Part
router.post("/", verifyToken, partController.addPart);

// UPDATE Part
router.put("/:id", verifyToken, partController.updatePart);

// DELETE Part
router.delete("/:id", verifyToken, partController.deletePart);

module.exports = router;
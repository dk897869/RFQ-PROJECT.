const router = require("express").Router();
const ctrl = require("../controllers/request.controller");
const {verifyToken} = require("../middlewares/auth");

router.get("/",verifyToken,ctrl.getAll);
router.post("/",verifyToken,ctrl.create);
router.put("/:id",verifyToken,ctrl.update);

module.exports = router;
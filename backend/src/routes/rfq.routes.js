const router = require("express").Router();
const ctrl = require("../controllers/rfq.controller");
const auth = require("../middlewares/auth");

router.post("/",auth,ctrl.create);
router.get("/",auth,ctrl.getAll);
router.put("/:id",auth,ctrl.updateStatus);

module.exports = router;
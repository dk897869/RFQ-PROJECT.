const router = require("express").Router();
const ctrl = require("../controllers/vendor.controller");
const auth = require("../middlewares/auth");

router.post("/", auth, ctrl.create);
router.get("/", auth, ctrl.getAll);
router.delete("/:id", auth, ctrl.delete);

module.exports = router;
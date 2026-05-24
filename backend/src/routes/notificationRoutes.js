const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/", notificationController.list);
router.patch("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.delete);

module.exports = router;

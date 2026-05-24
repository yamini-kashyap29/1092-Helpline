const express = require("express");
const router = express.Router();
const caseRoutes = require("./caseRoutes");
const telephonyRoutes = require("./telephonyRoutes");
const callRoutes = require("./callRoutes"); // 1. Import the new call routes
const analyticsRoutes = require("./analyticsRoutes");
const notificationRoutes = require("./notificationRoutes");

router.use("/cases", caseRoutes);
router.use("/telephony", telephonyRoutes);
router.use("/calls", callRoutes); // 2. Mount under /api/v1/calls
router.use("/notifications", notificationRoutes); // Mount notifications
router.use("/analytics", analyticsRoutes);

module.exports = router;

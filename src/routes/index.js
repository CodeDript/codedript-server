const express = require("express");
const router = express.Router();

// Import route modules
const testUserRoutes = require("./testUserRoutes");

// Mount route modules
router.use("/test-users", testUserRoutes);

// Add other routes here as needed
// router.use("/users", userRoutes);
// router.use("/gigs", gigRoutes);
// router.use("/agreements", agreementRoutes);

module.exports = router;

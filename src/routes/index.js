const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const gigRoutes = require("./gigRoutes");

// Mount route modules
router.use("/auth", authRoutes);
router.use("/gigs", gigRoutes);

// Add other routes here as needed
// router.use("/agreements", agreementRoutes);

module.exports = router;

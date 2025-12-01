const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const gigRoutes = require("./gigRoutes");
const agreementRoutes = require("./agreementRoutes");

// Mount route modules
router.use("/auth", authRoutes);
router.use("/gigs", gigRoutes);
router.use("/agreements", agreementRoutes);

// Add other routes here as needed

module.exports = router;

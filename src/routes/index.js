const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const gigRoutes = require("./gigRoutes");
const agreementRoutes = require("./agreementRoutes");
const requestChangeRoutes = require("./requestChangeRoutes");

// Mount route modules
router.use("/auth", authRoutes);
router.use("/gigs", gigRoutes);
router.use("/agreements", agreementRoutes);
router.use("/changes", requestChangeRoutes);

// Add other routes here as needed

module.exports = router;

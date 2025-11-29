const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");


// Mount route modules
router.use("/auth", authRoutes);


// Add other routes here as needed
// router.use("/gigs", gigRoutes);
// router.use("/agreements", agreementRoutes);

module.exports = router;

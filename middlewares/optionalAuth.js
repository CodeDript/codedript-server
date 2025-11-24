// Optional authentication middleware - allows both authenticated and unauthenticated requests
const optionalAuth = async (req, res, next) => {
  const { authenticate } = require('./auth');
  
  try {
    // Try to authenticate, but don't fail if no token
    await authenticate(req, res, (err) => {
      // If error is just missing token, continue without user
      if (err && err.message && err.message.includes('No token')) {
        req.user = null;
        return next();
      }
      // For other errors, pass them through
      if (err) return next(err);
      next();
    });
  } catch (error) {
    // On any error, just continue without user
    req.user = null;
    next();
  }
};

module.exports = { optionalAuth };

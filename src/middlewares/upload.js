const multer = require("multer");
const { ValidationError } = require("../utils/errorHandler");

/**
 * Multer Configuration for File Uploads
 * Handles image uploads with validation
 */

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware for single avatar upload
 */
const uploadAvatar = upload.single("avatar");

/**
 * Middleware for multiple gig images upload (up to 5 images)
 */
const uploadGigImages = upload.array("images", 5);

/**
 * Error handling wrapper for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ValidationError("File size too large. Maximum size is 5MB.")
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ValidationError("Unexpected field in upload."));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ValidationError("Too many files. Maximum is 5 images."));
    }
    return next(new ValidationError(`Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = {
  uploadAvatar,
  uploadGigImages,
  handleUploadError,
};

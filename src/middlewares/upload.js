const multer = require("multer");
const { ValidationError } = require("../utils/errorHandler");

/**
 * Multer Configuration for File Uploads
 * Handles image uploads with validation
 */

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
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

// File filter to accept documents and images
const documentFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        "Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT, ZIP"
      ),
      false
    );
  }
};

// Multer configuration for images
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Multer configuration for documents
const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // 10MB limit for documents
  },
});

/**
 * Middleware for single avatar upload
 */
const uploadAvatar = uploadImage.single("avatar");

/**
 * Middleware for multiple gig images upload (up to 5 images)
 */
const uploadGigImages = uploadImage.array("images", 5);

/**
 * Middleware for agreement documents upload (up to 10 files)
 */
const uploadAgreementDocuments = uploadDocument.array("documents", 10);

/**
 * Middleware for deliverables upload (up to 20 files)
 */
const uploadDeliverables = uploadDocument.array("deliverables", 20);

/**
 * Middleware for milestone preview upload (up to 10 files)
 */
const uploadMilestonePreviews = uploadDocument.array("previews", 10);

/**
 * Middleware for request change files upload (up to 5 files)
 *
 * Note: field name is `files` to match the RequestChange model and controller expectations.
 */
const uploadRequestChangeFiles = uploadDocument.array("files", 5);

/**
 * Error handling wrapper for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ValidationError("File size too large. Maximum size is 10MB.")
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      // Multer uses LIMIT_UNEXPECTED_FILE for too many files or unexpected field names
      return next(new ValidationError("Too many files uploaded or unexpected field in upload."));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ValidationError("Too many files uploaded."));
    }
    return next(new ValidationError(`Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = {
  uploadAvatar,
  uploadGigImages,
  uploadAgreementDocuments,
  uploadDeliverables,
  uploadMilestonePreviews,
  uploadRequestChangeFiles,
  handleUploadError,
};

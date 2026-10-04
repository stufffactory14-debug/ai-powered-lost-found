const multer = require("multer");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only image files are allowed.");
      error.code = "UNSUPPORTED_FILE_TYPE";
      return callback(error);
    }

    return callback(null, true);
  },
});

module.exports = upload;

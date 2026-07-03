const multer = require("multer");
const { httpError } = require("../helpers/errors");

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function isAllowedUpload(file) {
  const name = String(file.originalname || "").toLowerCase();
  const allowedExt = /\.(pdf|docx|txt|png|jpe?g|webp)$/i.test(name);
  const allowedMime = ALLOWED_MIMES.includes(file.mimetype);
  return allowedExt || allowedMime;
}

const knowledgeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!isAllowedUpload(file)) {
      return cb(
        httpError(
          400,
          "Unsupported file type. Upload PDF, DOCX, TXT, or an image (PNG, JPG, WEBP)."
        )
      );
    }
    cb(null, true);
  },
}).single("file");

function handleUploadError(err, _req, _res, next) {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return next(httpError(400, "File too large. Maximum upload size is 10 MB."));
  }
  return next(err);
}

module.exports = { knowledgeUpload, handleUploadError, MAX_FILE_BYTES, isAllowedUpload };

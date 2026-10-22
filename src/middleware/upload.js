const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Support Railway volume mount for persistent uploads
// Netlify Functions don't support persistent file system - will use /tmp for temporary storage
const uploadDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "public", "uploads")
  : process.env.NETLIFY
    ? path.join("/tmp", "uploads")
    : path.join(__dirname, "..", "..", "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
      return;
    }
    cb(new Error("File referensi harus JPG atau PNG."));
  },
});

function referenceUpload(req, res, next) {
  upload.single("referenceImage")(req, res, (error) => {
    if (!error) {
      return next();
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file maksimal 2MB."
        : error.message;
    req.uploadError = message;
    next();
  });
}

function optionalImage(fieldName) {
  return function uploadImage(req, res, next) {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        return next();
      }
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Ukuran file maksimal 2MB."
          : error.message;
      req.uploadError = message;
      next();
    });
  };
}

function identityUpload(req, res, next) {
  const uploadSingle = upload.single("idDocumentImage");
  uploadSingle(req, res, (error) => {
    if (!error) {
      return next();
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file maksimal 2MB."
        : error.message;
    req.uploadError = message;
    next();
  });
}

function combinedUpload(req, res, next) {
  const uploadFields = upload.fields([
    { name: "referenceImage", maxCount: 1 },
    { name: "idDocumentImage", maxCount: 1 }
  ]);
  uploadFields(req, res, (error) => {
    if (!error) {
      return next();
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file maksimal 2MB."
        : error.message;
    req.uploadError = message;
    next();
  });
}

function staffUpload(req, res, next) {
  const uploadFields = upload.fields([
    { name: "identityPhoto", maxCount: 1 },
    { name: "carConditionPhotos", maxCount: 10 }
  ]);
  uploadFields(req, res, (error) => {
    if (!error) {
      return next();
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file maksimal 2MB per foto."
        : error.message;
    req.uploadError = message;
    next();
  });
}

module.exports = { referenceUpload, optionalImage, identityUpload, combinedUpload, staffUpload };

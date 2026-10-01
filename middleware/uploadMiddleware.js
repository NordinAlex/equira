const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/images/uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure horse upload directory exists
const horseUploadDir = path.join(__dirname, '../public/images/uploads/horses');
if (!fs.existsSync(horseUploadDir)) {
  fs.mkdirSync(horseUploadDir, { recursive: true });
}

// Ensure arena upload directory exists
const arenaUploadDir = path.join(__dirname, '../public/images/uploads/arenas');
if (!fs.existsSync(arenaUploadDir)) {
  fs.mkdirSync(arenaUploadDir, { recursive: true });
}

// Configure disk storage for avatars
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 20);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

// Configure disk storage for horses
const horseStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, horseUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 20);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `horse-${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter: image files only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Endast bildfiler (JPG, PNG, WebP, GIF) är tillåtna.'), false);
  }
};

// Multer upload instances
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max limit
  },
});

const uploadHorse = multer({
  storage: horseStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max limit
  },
});

// Configure disk storage for arenas / ridbanor
const arenaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, arenaUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 20);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `arena-${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

const uploadArena = multer({
  storage: arenaStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max limit
  },
});

module.exports = {
  uploadAvatar: upload,
  uploadHorse,
  uploadArena,
  uploadDir,
  horseUploadDir,
  arenaUploadDir,
};

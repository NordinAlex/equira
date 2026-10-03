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

/**
 * Safely removes a previously uploaded file from the disk if it exists
 * and is within one of our managed upload directories.
 * 
 * @param {string} fileUrlOrPath - URL or path of the file to remove (e.g. "/images/uploads/horses/horse-123.jpg")
 * @param {string} [expectedDir] - optional specific directory to restrict to
 * @returns {Promise<boolean>} - true if a file was deleted, false otherwise
 */
async function removeUploadedFile(fileUrlOrPath, expectedDir = null) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;

  const lower = fileUrlOrPath.toLowerCase();
  // Never delete default placeholder images
  if (lower.includes('default') || lower.includes('arena-preview') || lower.includes('arena-outdoor')) {
    return false;
  }

  const filename = path.basename(fileUrlOrPath);
  if (!filename) return false;

  let targetDir = expectedDir;
  if (!targetDir) {
    if (fileUrlOrPath.includes('/uploads/horses/') || fileUrlOrPath.includes('\\uploads\\horses\\')) {
      targetDir = horseUploadDir;
    } else if (fileUrlOrPath.includes('/uploads/arenas/') || fileUrlOrPath.includes('\\uploads\\arenas\\')) {
      targetDir = arenaUploadDir;
    } else if (fileUrlOrPath.includes('/uploads/avatars/') || fileUrlOrPath.includes('\\uploads\\avatars\\')) {
      targetDir = uploadDir;
    }
  }

  if (!targetDir) return false;

  const fullPath = path.isAbsolute(fileUrlOrPath) && fs.existsSync(fileUrlOrPath)
    ? fileUrlOrPath
    : path.join(targetDir, filename);

  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log(`Deleted old uploaded file: ${fullPath}`);
      return true;
    }
  } catch (err) {
    console.warn(`Could not delete uploaded file (${fullPath}):`, err.message);
  }
  return false;
}

module.exports = {
  uploadAvatar: upload,
  uploadHorse,
  uploadArena,
  uploadDir,
  horseUploadDir,
  arenaUploadDir,
  removeUploadedFile,
};

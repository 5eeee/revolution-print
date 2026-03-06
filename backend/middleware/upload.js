const multer = require('multer');
const path = require('path');
const { generateUniqueFileName } = require('../utils/fileHandler');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '78000000');
const maxFiles = parseInt(process.env.MAX_FILES || '20');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFileName(file.originalname);
    cb(null, uniqueName);
  },
});

const allowedExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.rtf', '.odt', '.ods',
  '.zip', '.rar', '.7z',
  '.ai', '.psd', '.eps', '.cdr', '.tiff', '.tif',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла: ' + ext), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize, // 75 MB
  },
});

module.exports = uploadMiddleware;

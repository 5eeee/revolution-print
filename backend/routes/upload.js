const express = require('express');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/files',
  uploadMiddleware.single('file'),
  uploadController.uploadFile
);

router.delete('/:type/:id', uploadController.deleteUpload);

module.exports = router;

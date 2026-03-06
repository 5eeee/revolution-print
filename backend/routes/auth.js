const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { validate, required, isEmail, minLength } = require('../middleware/validate');

const router = express.Router();

router.post('/login',
  validate(
    required('email', 'Email'),
    isEmail('email'),
    required('password', 'Пароль'),
    minLength('password', 4, 'Пароль')
  ),
  authController.login
);
router.get('/me', authMiddleware, authController.getMe);
router.post('/change-password', authMiddleware, authController.changePassword);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/avatar', authMiddleware, uploadMiddleware.single('avatar'), authController.updateAvatar);
router.put('/status', authMiddleware, authController.updateStatus);
router.get('/users/online', authMiddleware, authController.getOnlineUsers);

module.exports = router;

const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
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

module.exports = router;

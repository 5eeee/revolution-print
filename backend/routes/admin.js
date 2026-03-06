const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const roleCheckMiddleware = require('../middleware/roleCheck');
const { validate, required, isEmail, minLength, maxLength, sanitizeString, isIn } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

// Настройки компании
router.get('/settings', adminController.getSettings);
router.put('/settings', roleCheckMiddleware(['admin', 'owner']), adminController.updateSettings);

// Управление пользователями — только admin
router.get('/users', roleCheckMiddleware(['admin']), adminController.getUsers);
router.post('/users',
  roleCheckMiddleware(['admin']),
  validate(
    sanitizeString('fullName'),
    required('fullName', 'ФИО'),
    maxLength('fullName', 255, 'ФИО'),
    sanitizeString('email'),
    required('email', 'Email'),
    isEmail('email'),
    required('password', 'Пароль'),
    minLength('password', 6, 'Пароль'),
    isIn('role', ['admin', 'manager', 'production', 'owner'], 'Роль')
  ),
  adminController.createUser
);
router.put('/users/:id',
  roleCheckMiddleware(['admin']),
  validate(
    sanitizeString('fullName'),
    maxLength('fullName', 255, 'ФИО'),
    isIn('role', ['admin', 'manager', 'production', 'owner'], 'Роль')
  ),
  adminController.updateUser
);
router.delete('/users/:id', roleCheckMiddleware(['admin']), adminController.deleteUser);

module.exports = router;

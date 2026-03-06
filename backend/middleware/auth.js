const { verifyToken } = require('../utils/token');
const { User } = require('../models');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Токен не найден или неверный формат',
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Токен истек или недействителен',
    });
  }

  // Проверить что пользователь существует и активен
  const user = await User.findByPk(decoded.userId, {
    attributes: ['id', 'role', 'active'],
  });

  if (!user || !user.active) {
    return res.status(401).json({
      success: false,
      error: 'Аккаунт не найден или отключен',
    });
  }

  req.user = {
    userId: user.id,
    role: user.role,
  };

  next();
}

module.exports = authMiddleware;

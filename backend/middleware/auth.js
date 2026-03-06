const { verifyToken } = require('../utils/token');

function authMiddleware(req, res, next) {
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

  req.user = {
    userId: decoded.userId,
    role: decoded.role,
  };

  next();
}

module.exports = authMiddleware;

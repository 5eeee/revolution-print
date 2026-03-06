const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('WARNING: JWT_SECRET не установлен, используется ключ по умолчанию. Установите JWT_SECRET для продакшна!');
    return 'revolution_print_dev_secret_key';
  }
  return secret;
}

function generateToken(userId, role) {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(
    payload,
    getSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

  return token;
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      getSecret()
    );
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
};

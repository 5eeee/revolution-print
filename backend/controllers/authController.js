const { User } = require('../models');
const { hashPassword, validatePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email и пароль обязательны',
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    const isValidPassword = await validatePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Аккаунт отключен',
      });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Ошибка при входе:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе',
    });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении профиля:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении профиля',
    });
  }
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Все поля обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Пароль должен быть не менее 6 символов' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const isValid = await validatePassword(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Неверный текущий пароль' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при смене пароля' });
  }
}

module.exports = {
  login,
  getMe,
  changePassword,
};

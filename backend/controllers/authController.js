const { User } = require('../models');
const { hashPassword, validatePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');
const path = require('path');
const fs = require('fs');

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

    // Update status to online on login
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
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
        avatar: user.avatar,
        status: user.status,
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

async function updateProfile(req, res) {
  try {
    const { fullName } = req.body;
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'ФИО обязательно' });
    }
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    user.fullName = fullName.trim();
    await user.save();
    res.json({ success: true, data: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, avatar: user.avatar, status: user.status } });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении профиля' });
  }
}

async function updateAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

    // Delete old avatar file
    if (user.avatar) {
      const oldPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatar = '/uploads/' + req.file.filename;
    await user.save();
    res.json({ success: true, data: { avatar: user.avatar } });
  } catch (error) {
    console.error('Ошибка при загрузке аватара:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке аватара' });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ['online', 'away', 'offline'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Недопустимый статус' });
    }
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    user.status = status;
    user.lastSeen = new Date();
    await user.save();
    res.json({ success: true, data: { status: user.status } });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении статуса' });
  }
}

async function getOnlineUsers(req, res) {
  try {
    const users = await User.findAll({
      where: { active: true },
      attributes: ['id', 'fullName', 'avatar', 'status', 'lastSeen', 'role'],
      order: [['fullName', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
}

module.exports = {
  login,
  getMe,
  changePassword,
  updateProfile,
  updateAvatar,
  updateStatus,
  getOnlineUsers,
};

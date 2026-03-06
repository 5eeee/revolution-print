const { User, CompanySetting } = require('../models');
const { hashPassword } = require('../utils/hash');

async function getUsers(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Нет прав доступа',
      });
    }

    const users = await User.findAll({
      attributes: ['id', 'fullName', 'email', 'role', 'active', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении пользователей',
    });
  }
}

async function createUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Нет прав доступа',
      });
    }

    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Все поля обязательны',
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email уже зарегистрирован',
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: role || 'manager',
    });

    res.status(201).json({
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
    console.error('Ошибка при создании пользователя:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании пользователя',
    });
  }
}

async function updateUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Нет прав доступа',
      });
    }

    const { id } = req.params;
    const { fullName, role, active } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;

    await user.save();

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
    console.error('Ошибка при обновлении пользователя:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении пользователя',
    });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Нет прав доступа',
      });
    }

    const { id } = req.params;

    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'Нельзя удалить собственный аккаунт',
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Пользователь удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении пользователя',
    });
  }
}

async function getSettings(req, res) {
  try {
    let settings = await CompanySetting.findOne({ where: { userId: req.user.userId } });
    if (!settings) {
      settings = await CompanySetting.create({ userId: req.user.userId });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Ошибка настроек:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении настроек' });
  }
}

async function updateSettings(req, res) {
  try {
    let settings = await CompanySetting.findOne({ where: { userId: req.user.userId } });
    if (!settings) {
      settings = await CompanySetting.create({ userId: req.user.userId });
    }
    const { companyName, inn, kpp, address, phone, email, website, bankDetails,
      bankName, bik, corrAccount, accountNumber, signerName, signerTitle, legalForm } = req.body;
    if (companyName !== undefined) settings.companyName = companyName;
    if (inn !== undefined) settings.inn = inn;
    if (kpp !== undefined) settings.kpp = kpp;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (bankDetails !== undefined) settings.bankDetails = bankDetails;
    if (bankName !== undefined) settings.bankName = bankName;
    if (bik !== undefined) settings.bik = bik;
    if (corrAccount !== undefined) settings.corrAccount = corrAccount;
    if (accountNumber !== undefined) settings.accountNumber = accountNumber;
    if (signerName !== undefined) settings.signerName = signerName;
    if (signerTitle !== undefined) settings.signerTitle = signerTitle;
    if (legalForm !== undefined) settings.legalForm = legalForm;
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении настроек' });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getSettings,
  updateSettings,
};

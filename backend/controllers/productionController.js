const { ProductionCompany, ProductionBreakdown, Order, Client } = require('../models');

async function getCompanies(req, res) {
  try {
    const companies = await ProductionCompany.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error('Ошибка при получении компаний:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении компаний',
    });
  }
}

async function createCompany(req, res) {
  try {
    const { name, info, cooperation, contactPerson, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Название компании обязательно',
      });
    }

    const company = await ProductionCompany.create({
      userId: req.user.userId,
      name,
      info: info || '',
      cooperation: cooperation || '',
      contactPerson: contactPerson || null,
      phone: phone || null,
      email: email || null,
    });

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Ошибка при создании компании:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании компании',
    });
  }
}

async function getCompany(req, res) {
  try {
    const { id } = req.params;
    const company = await ProductionCompany.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Компания не найдена',
      });
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Ошибка при получении компании:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении компании',
    });
  }
}

async function updateCompany(req, res) {
  try {
    const { id } = req.params;
    const { name, info, cooperation, contactPerson, phone, email } = req.body;

    const company = await ProductionCompany.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Компания не найдена',
      });
    }

    if (name !== undefined) company.name = name;
    if (info !== undefined) company.info = info;
    if (cooperation !== undefined) company.cooperation = cooperation;
    if (contactPerson !== undefined) company.contactPerson = contactPerson;
    if (phone !== undefined) company.phone = phone;
    if (email !== undefined) company.email = email;

    await company.save();

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Ошибка при обновлении компании:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении компании',
    });
  }
}

async function deleteCompany(req, res) {
  try {
    const { id } = req.params;

    const company = await ProductionCompany.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Компания не найдена',
      });
    }

    await company.destroy();

    res.json({
      success: true,
      message: 'Компания удалена',
    });
  } catch (error) {
    console.error('Ошибка при удалении компании:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении компании',
    });
  }
}

// Получить заказы привязанные к производству
async function getCompanyOrders(req, res) {
  try {
    const { id } = req.params;

    const company = await ProductionCompany.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!company) {
      return res.status(404).json({ success: false, error: 'Компания не найдена' });
    }

    const breakdowns = await ProductionBreakdown.findAll({
      where: { productionId: id },
      include: [{
        model: Order,
        where: { userId: req.user.userId },
        include: [{ model: Client, attributes: ['id', 'name'] }],
      }],
      order: [['createdAt', 'DESC']],
    });

    const orders = breakdowns.map(b => ({
      breakdownId: b.id,
      amount: b.amount,
      techTask: b.techTask,
      order: b.Order ? {
        id: b.Order.id,
        title: b.Order.title,
        status: b.Order.status,
        deadline: b.Order.deadline,
        client: b.Order.Client?.name || '—',
      } : null,
    }));

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Ошибка при получении заказов производства:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении заказов' });
  }
}

module.exports = {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyOrders,
};

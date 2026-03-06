const { Document, Order, Client, OrderCalculator, ProductionBreakdown, ProductionCompany, CompanySetting } = require('../models');

async function getDocuments(req, res) {
  try {
    const { orderId, clientId } = req.query;

    const where = { userId: req.user.userId };
    if (orderId) where.orderId = orderId;
    if (clientId) where.clientId = clientId;

    const documents = await Document.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Ошибка при получении документов:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении документов',
    });
  }
}

async function createDocument(req, res) {
  try {
    const { type, title, content, clientId, orderId, items } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Тип и название документа обязательны',
      });
    }

    const document = await Document.create({
      userId: req.user.userId,
      type,
      title,
      content: content || '',
      clientId: clientId || null,
      orderId: orderId || null,
      items: items || [],
    });

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Ошибка при создании документа:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании документа',
    });
  }
}

async function getDocument(req, res) {
  try {
    const { id } = req.params;
    const document = await Document.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Документ не найден',
      });
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Ошибка при получении документа:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении документа',
    });
  }
}

async function updateDocument(req, res) {
  try {
    const { id } = req.params;
    const { title, content, items } = req.body;

    const document = await Document.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Документ не найден',
      });
    }

    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;
    if (items !== undefined) document.items = items;

    await document.save();

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Ошибка при обновлении документа:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении документа',
    });
  }
}

async function deleteDocument(req, res) {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Документ не найден',
      });
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Документ удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении документа:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении документа',
    });
  }
}

// Получить данные для генерации документа из заказа
async function getOrderData(req, res) {
  try {
    const { orderId } = req.params;
    const { Op } = require('sequelize');
    const ownerCheck = req.user.role === 'admin'
      ? { id: orderId }
      : { id: orderId, [Op.or]: [{ userId: req.user.userId }, { assignedTo: req.user.userId }] };

    const order = await Order.findOne({
      where: ownerCheck,
      include: [
        { model: Client },
        { model: OrderCalculator },
        {
          model: ProductionBreakdown,
          include: [{ model: ProductionCompany }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    let settings = await CompanySetting.findOne({ where: { userId: req.user.userId } });
    if (!settings) {
      settings = await CompanySetting.create({ userId: req.user.userId });
    }

    // Сформировать позиции из калькуляторов
    const calcNames = {
      sublimation: 'Сублимация', badges: 'Значки', patches: 'Нашивки',
      stationery: 'Канцелярия', silkscreen: 'Шелкография',
    };

    const items = (order.OrderCalculators || []).map((calc, idx) => {
      const p = calc.params || {};
      const qty = parseFloat(p.quantity) || 1;
      const price = parseFloat(p.pricePerUnit || p.pricePerSqm) || 0;
      const total = qty * price;
      const margin = order.marginPercent || 20;
      const clientTotal = total * (1 + margin / 100);

      let name = calcNames[calc.type] || calc.type;
      if (p.product) name += ` (${p.product})`;
      if (p.material) name += ` (${p.material})`;
      if (p.description) name += ` — ${p.description}`;

      return {
        num: idx + 1,
        name,
        unit: 'шт',
        quantity: qty,
        price: Math.round(clientTotal / qty * 100) / 100,
        total: Math.round(clientTotal * 100) / 100,
      };
    });

    // Себестоимость из разбивки
    const costPrice = (order.ProductionBreakdowns || []).reduce(
      (sum, b) => sum + (parseFloat(b.amount) || 0), 0
    );

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          title: order.title,
          status: order.status,
          deadline: order.deadline,
          paymentStatus: order.paymentStatus,
          marginPercent: order.marginPercent,
          notes: order.notes,
        },
        client: order.Client ? {
          id: order.Client.id,
          name: order.Client.name,
          owner: order.Client.owner,
        } : null,
        company: {
          companyName: settings.companyName,
          inn: settings.inn,
          kpp: settings.kpp,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          bankDetails: settings.bankDetails,
          bankName: settings.bankName,
          bik: settings.bik,
          corrAccount: settings.corrAccount,
          accountNumber: settings.accountNumber,
          signerName: settings.signerName,
          signerTitle: settings.signerTitle,
          legalForm: settings.legalForm,
        },
        items,
        costPrice,
        totalWithMargin: items.reduce((s, i) => s + i.total, 0),
      },
    });
  } catch (error) {
    console.error('Ошибка при получении данных заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении данных заказа' });
  }
}

module.exports = {
  getDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getOrderData,
};

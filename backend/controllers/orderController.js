const { Order, Client, OrderCalculator, Design, CostEstimate, ProductionBreakdown, ProductionCompany, Message, User } = require('../models');
const { deleteFile } = require('../utils/fileHandler');
const { Op } = require('sequelize');

// Хелпер: проверить доступ пользователя к заказу
async function checkOrderAccess(orderId, user) {
  const whereClause = user.role === 'admin'
    ? { id: orderId }
    : { id: orderId, [Op.or]: [{ userId: user.userId }, { assignedTo: user.userId }] };
  return Order.findOne({ where: whereClause });
}

async function getOrders(req, res) {
  try {
    const whereClause = req.user.role === 'admin'
      ? {}
      : { [Op.or]: [{ userId: req.user.userId }, { assignedTo: req.user.userId }] };

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: Client, attributes: ['id', 'name'] },
        { model: User, as: 'Creator', attributes: ['id', 'fullName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Ошибка при получении заказов:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении заказов' });
  }
}

async function takeOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    if (order.assignedTo && order.assignedTo !== req.user.userId) {
      return res.status(409).json({ success: false, error: `Заказ уже взят: ${order.assignedName}` });
    }

    const user = await User.findByPk(req.user.userId);
    order.assignedTo = req.user.userId;
    order.assignedName = user?.fullName || 'Неизвестный';
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Ошибка при взятии заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при взятии заказа' });
  }
}

async function releaseOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    if (order.assignedTo !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Вы не можете снять чужой заказ' });
    }

    order.assignedTo = null;
    order.assignedName = null;
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Ошибка при освобождении заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при освобождении заказа' });
  }
}

async function createOrder(req, res) {
  try {
    const { clientId, title, status, notes, deadline } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ success: false, error: 'Клиент и название обязательны' });
    }

    const client = await Client.findOne({
      where: { id: clientId, userId: req.user.userId },
    });

    if (!client) {
      return res.status(400).json({ success: false, error: 'Клиент не найден' });
    }

    const order = await Order.create({
      userId: req.user.userId,
      clientId,
      title,
      status: status || 'Обработка',
      notes: notes || '',
      deadline: deadline || null,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Ошибка при создании заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при создании заказа' });
  }
}

async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    const fullOrder = await Order.findByPk(id, {
      include: [
        { model: Client, attributes: ['id', 'name'] },
        { model: OrderCalculator },
        { model: Design },
        { model: CostEstimate },
        {
          model: ProductionBreakdown,
          include: [{ model: ProductionCompany }],
        },
      ],
    });

    res.json({ success: true, data: fullOrder });
  } catch (error) {
    console.error('Ошибка при получении заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении заказа' });
  }
}

async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { title, status, notes, deadline, paymentStatus, marginPercent } = req.body;
    const order = await checkOrderAccess(id, req.user);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    if (title !== undefined) order.title = title;
    if (status !== undefined) order.status = status;
    if (notes !== undefined) order.notes = notes;
    if (deadline !== undefined) order.deadline = deadline;
    if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;
    if (marginPercent !== undefined) order.marginPercent = Math.max(0, parseInt(marginPercent) || 0);

    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Ошибка при обновлении заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении заказа' });
  }
}

async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    // Удалить файлы с диска перед удалением записей
    const designs = await Design.findAll({ where: { orderId: id } });
    const estimates = await CostEstimate.findAll({ where: { orderId: id } });
    for (const d of designs) { await deleteFile(d.fileName).catch(() => {}); }
    for (const e of estimates) { await deleteFile(e.fileName).catch(() => {}); }

    await order.destroy();

    res.json({ success: true, message: 'Заказ удален' });
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при удалении заказа' });
  }
}

// ==================== КАЛЬКУЛЯТОРЫ ====================

async function getCalculators(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const calculators = await OrderCalculator.findAll({
      where: { orderId: id },
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: calculators });
  } catch (error) {
    console.error('Ошибка при получении калькуляторов:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении калькуляторов' });
  }
}

async function saveCalculator(req, res) {
  try {
    const { id } = req.params;
    const { type, params } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, error: 'Тип калькулятора обязателен' });
    }

    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    let calculator = await OrderCalculator.findOne({ where: { orderId: id, type } });

    if (calculator) {
      calculator.params = params || {};
      await calculator.save();
    } else {
      calculator = await OrderCalculator.create({
        orderId: id,
        type,
        params: params || {},
      });
    }

    res.json({ success: true, data: calculator });
  } catch (error) {
    console.error('Ошибка при сохранении калькулятора:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при сохранении калькулятора' });
  }
}

async function deleteCalculator(req, res) {
  try {
    const { id, calcId } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const calc = await OrderCalculator.findOne({ where: { id: calcId, orderId: id } });
    if (!calc) return res.status(404).json({ success: false, error: 'Калькулятор не найден' });

    await calc.destroy();
    res.json({ success: true, message: 'Калькулятор удалён' });
  } catch (error) {
    console.error('Ошибка при удалении калькулятора:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при удалении калькулятора' });
  }
}

// ==================== РАЗБИВКА ПО ПРОИЗВОДСТВАМ ====================

async function getBreakdown(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const breakdown = await ProductionBreakdown.findAll({
      where: { orderId: id },
      include: [{ model: ProductionCompany, attributes: ['id', 'name', 'info', 'cooperation'] }],
    });
    res.json({ success: true, data: breakdown });
  } catch (error) {
    console.error('Ошибка при получении разбивки:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении разбивки' });
  }
}

async function addBreakdown(req, res) {
  try {
    const { id } = req.params;
    const { productionId, amount, techTask } = req.body;

    if (!productionId) {
      return res.status(400).json({ success: false, error: 'Производство обязательно' });
    }

    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const item = await ProductionBreakdown.create({
      orderId: id,
      productionId,
      amount: amount || 0,
      techTask: techTask || '',
    });

    const itemWithCompany = await ProductionBreakdown.findByPk(item.id, {
      include: [{ model: ProductionCompany, attributes: ['id', 'name', 'info', 'cooperation'] }],
    });

    res.status(201).json({ success: true, data: itemWithCompany });
  } catch (error) {
    console.error('Ошибка при добавлении разбивки:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при добавлении разбивки' });
  }
}

async function updateBreakdown(req, res) {
  try {
    const { id, breakdownId } = req.params;
    const { amount, techTask } = req.body;

    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const item = await ProductionBreakdown.findOne({ where: { id: breakdownId, orderId: id } });
    if (!item) return res.status(404).json({ success: false, error: 'Запись не найдена' });

    if (amount !== undefined) item.amount = amount;
    if (techTask !== undefined) item.techTask = techTask;
    await item.save();

    const updated = await ProductionBreakdown.findByPk(item.id, {
      include: [{ model: ProductionCompany, attributes: ['id', 'name', 'info', 'cooperation'] }],
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Ошибка при обновлении разбивки:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении разбивки' });
  }
}

async function deleteBreakdown(req, res) {
  try {
    const { id, breakdownId } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const item = await ProductionBreakdown.findOne({ where: { id: breakdownId, orderId: id } });
    if (!item) return res.status(404).json({ success: false, error: 'Запись не найдена' });

    await item.destroy();
    res.json({ success: true, message: 'Запись удалена' });
  } catch (error) {
    console.error('Ошибка при удалении разбивки:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при удалении разбивки' });
  }
}

// ==================== МАКЕТЫ (DESIGNS) ====================

async function getDesigns(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const designs = await Design.findAll({
      where: { orderId: id },
      order: [['uploadedAt', 'DESC']],
    });
    res.json({ success: true, data: designs });
  } catch (error) {
    console.error('Ошибка при получении макетов:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении макетов' });
  }
}

async function deleteDesign(req, res) {
  try {
    const { id, designId } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const design = await Design.findOne({ where: { id: designId, orderId: id } });
    if (!design) return res.status(404).json({ success: false, error: 'Макет не найден' });

    await deleteFile(design.fileName).catch(() => {});
    await design.destroy();
    res.json({ success: true, message: 'Макет удалён' });
  } catch (error) {
    console.error('Ошибка при удалении макета:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при удалении макета' });
  }
}

// ==================== СМЕТЫ ТРАТ ====================

async function getEstimates(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const estimates = await CostEstimate.findAll({
      where: { orderId: id },
      order: [['uploadedAt', 'DESC']],
    });
    res.json({ success: true, data: estimates });
  } catch (error) {
    console.error('Ошибка при получении смет:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении смет' });
  }
}

async function updateEstimate(req, res) {
  try {
    const { id, estimateId } = req.params;
    const { extractedAmount } = req.body;

    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const estimate = await CostEstimate.findOne({ where: { id: estimateId, orderId: id } });
    if (!estimate) return res.status(404).json({ success: false, error: 'Смета не найдена' });

    if (extractedAmount !== undefined) estimate.extractedAmount = extractedAmount;
    await estimate.save();

    res.json({ success: true, data: estimate });
  } catch (error) {
    console.error('Ошибка при обновлении сметы:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении сметы' });
  }
}

async function deleteEstimate(req, res) {
  try {
    const { id, estimateId } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const estimate = await CostEstimate.findOne({ where: { id: estimateId, orderId: id } });
    if (!estimate) return res.status(404).json({ success: false, error: 'Смета не найдена' });

    await deleteFile(estimate.fileName).catch(() => {});
    await estimate.destroy();
    res.json({ success: true, message: 'Смета удалена' });
  } catch (error) {
    console.error('Ошибка при удалении сметы:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при удалении сметы' });
  }
}

// ==================== СООБЩЕНИЯ ЗАКАЗА ====================

async function getOrderMessages(req, res) {
  try {
    const { id } = req.params;
    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const messages = await Message.findAll({
      where: { orderId: id },
      include: [{ model: User, attributes: ['id', 'fullName'] }],
      order: [['createdAt', 'ASC']],
      limit: 100,
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при получении сообщений' });
  }
}

async function addOrderMessage(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Текст сообщения обязателен' });
    }

    const order = await checkOrderAccess(id, req.user);
    if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });

    const message = await Message.create({
      orderId: id,
      userId: req.user.userId,
      text,
      files: [],
    });

    const full = await Message.findByPk(message.id, {
      include: [{ model: User, attributes: ['id', 'fullName'] }],
    });

    res.status(201).json({ success: true, data: full });
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка при отправке сообщения' });
  }
}

module.exports = {
  getOrders,
  createOrder,
  getOrder,
  updateOrder,
  deleteOrder,
  takeOrder,
  releaseOrder,
  getCalculators,
  saveCalculator,
  deleteCalculator,
  getBreakdown,
  addBreakdown,
  updateBreakdown,
  deleteBreakdown,
  getDesigns,
  deleteDesign,
  getEstimates,
  updateEstimate,
  deleteEstimate,
  getOrderMessages,
  addOrderMessage,
};

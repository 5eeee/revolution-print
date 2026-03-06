const { Message, User, Order, Client } = require('../models');
const { Op } = require('sequelize');

async function getMessages(req, res) {
  try {
    const orderId = req.query.orderId ? parseInt(req.query.orderId) : null;
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    if (req.query.orderId && (isNaN(orderId) || orderId <= 0)) {
      return res.status(400).json({ success: false, error: 'Некорректный orderId' });
    }
    if (req.query.clientId && (isNaN(clientId) || clientId <= 0)) {
      return res.status(400).json({ success: false, error: 'Некорректный clientId' });
    }

    // Проверка доступа к заказу/клиенту
    if (orderId && req.user.role !== 'admin') {
      const order = await Order.findOne({
        where: { id: orderId, [Op.or]: [{ userId: req.user.userId }, { assignedTo: req.user.userId }] },
      });
      if (!order) return res.status(403).json({ success: false, error: 'Нет доступа' });
    }
    if (clientId && req.user.role !== 'admin') {
      const client = await Client.findOne({ where: { id: clientId, userId: req.user.userId } });
      if (!client) return res.status(403).json({ success: false, error: 'Нет доступа' });
    }

    const where = {};
    if (orderId) where.orderId = orderId;
    if (clientId) where.clientId = clientId;

    const messages = await Message.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'fullName', 'avatar', 'status'] }],
      order: [['createdAt', 'ASC']],
      limit,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении сообщений',
    });
  }
}

async function createMessage(req, res) {
  try {
    const { text, orderId, clientId, files } = req.body;

    if (!text && (!files || files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение или файлы обязательны',
      });
    }

    // Validate text length
    if (text && typeof text === 'string' && text.length > 5000) {
      return res.status(400).json({ success: false, error: 'Сообщение слишком длинное (максимум 5000 символов)' });
    }

    // Validate orderId/clientId as integers
    const safeOrderId = orderId ? parseInt(orderId) : null;
    const safeClientId = clientId ? parseInt(clientId) : null;
    if (orderId && (isNaN(safeOrderId) || safeOrderId <= 0)) {
      return res.status(400).json({ success: false, error: 'Некорректный orderId' });
    }
    if (clientId && (isNaN(safeClientId) || safeClientId <= 0)) {
      return res.status(400).json({ success: false, error: 'Некорректный clientId' });
    }

    // Validate and sanitize files array
    let safeFiles = [];
    if (Array.isArray(files)) {
      safeFiles = files.slice(0, 20).map(f => {
        if (!f || typeof f !== 'object') return null;
        const url = typeof f.url === 'string' ? f.url : '';
        // Only allow relative /uploads/ paths
        if (!url.startsWith('/uploads/')) return null;
        return {
          name: typeof f.name === 'string' ? f.name.slice(0, 255) : 'file',
          url: url,
          size: typeof f.size === 'number' ? f.size : 0,
        };
      }).filter(Boolean);
    }

    const message = await Message.create({
      userId: req.user.userId,
      text: typeof text === 'string' ? text.slice(0, 5000) : '',
      orderId: safeOrderId,
      clientId: safeClientId,
      files: safeFiles,
    });

    const messageWithUser = await Message.findByPk(message.id, {
      include: [{ model: User, attributes: ['id', 'fullName', 'avatar', 'status'] }],
    });

    res.status(201).json({
      success: true,
      data: messageWithUser,
    });
  } catch (error) {
    console.error('Ошибка при создании сообщения:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании сообщения',
    });
  }
}

async function deleteMessage(req, res) {
  try {
    const { id } = req.params;

    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Сообщение не найдено',
      });
    }

    if (message.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Нет прав удалить это сообщение',
      });
    }

    await message.destroy();

    res.json({
      success: true,
      message: 'Сообщение удалено',
    });
  } catch (error) {
    console.error('Ошибка при удалении сообщения:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении сообщения',
    });
  }
}

module.exports = {
  getMessages,
  createMessage,
  deleteMessage,
};

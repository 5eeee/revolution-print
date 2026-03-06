const { Message, User, Order, Client } = require('../models');
const { Op } = require('sequelize');

async function getMessages(req, res) {
  try {
    const { orderId, clientId } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

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

    const message = await Message.create({
      userId: req.user.userId,
      text: text || '',
      orderId: orderId || null,
      clientId: clientId || null,
      files: files || [],
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

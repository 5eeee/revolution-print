const { Client } = require('../models');

async function getClients(req, res) {
  try {
    const clients = await Client.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error('Ошибка при получении клиентов:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении клиентов',
    });
  }
}

async function createClient(req, res) {
  try {
    const { name, status, comment } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Имя клиента обязательно',
      });
    }

    const client = await Client.create({
      userId: req.user.userId,
      name,
      status: status || 'Новый',
      comment: comment || '',
    });

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Ошибка при создании клиента:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании клиента',
    });
  }
}

async function getClient(req, res) {
  try {
    const { id } = req.params;
    const client = await Client.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден',
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Ошибка при получении клиента:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении клиента',
    });
  }
}

async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { name, status, owner, firstCall, lastCall, comment } = req.body;

    const client = await Client.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден',
      });
    }

    if (name !== undefined) client.name = name;
    if (status !== undefined) client.status = status;
    if (owner !== undefined) client.owner = owner;
    if (firstCall !== undefined) client.firstCall = firstCall;
    if (lastCall !== undefined) client.lastCall = lastCall;
    if (comment !== undefined) client.comment = comment;

    await client.save();

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Ошибка при обновлении клиента:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении клиента',
    });
  }
}

async function deleteClient(req, res) {
  try {
    const { id } = req.params;

    const client = await Client.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден',
      });
    }

    await client.destroy();

    res.json({
      success: true,
      message: 'Клиент удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении клиента:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении клиента',
    });
  }
}

async function takeClient(req, res) {
  try {
    const { id } = req.params;
    const { owner } = req.body;

    const client = await Client.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден',
      });
    }

    if (client.owner) {
      return res.status(400).json({
        success: false,
        error: 'Клиент уже занят другим менеджером',
      });
    }

    client.owner = owner;
    client.status = 'В работе';
    await client.save();

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Ошибка при взятии клиента:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при взятии клиента',
    });
  }
}

module.exports = {
  getClients,
  createClient,
  getClient,
  updateClient,
  deleteClient,
  takeClient,
};

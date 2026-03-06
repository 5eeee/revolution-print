const { Design, CostEstimate } = require('../models');

async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не загружен',
      });
    }

    const { orderId, type } = req.body;

    // Chat files don't require orderId
    if (!orderId && type !== 'chat') {
      return res.status(400).json({
        success: false,
        error: 'ID заказа обязателен',
      });
    }

    const fileData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
    };

    if (type === 'design') {
      const design = await Design.create({
        orderId,
        fileName: req.file.filename,
        filePath: req.file.path,
        uploadedBy: req.user.userId,
      });
      return res.status(201).json({
        success: true,
        data: {
          ...fileData,
          designId: design.id,
        },
      });
    }

    if (type === 'estimate') {
      const estimate = await CostEstimate.create({
        orderId,
        fileName: req.file.filename,
        filePath: req.file.path,
      });
      return res.status(201).json({
        success: true,
        data: {
          ...fileData,
          estimateId: estimate.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: fileData,
    });
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке файла',
    });
  }
}

async function deleteUpload(req, res) {
  try {
    const { id, type } = req.params;

    if (type === 'design') {
      const design = await Design.findByPk(id);
      if (!design) {
        return res.status(404).json({
          success: false,
          error: 'Макет не найден',
        });
      }
      // Проверка доступа: uploadedBy должен совпадать
      if (design.uploadedBy !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Нет прав удалить этот макет' });
      }
      await design.destroy();
    } else if (type === 'estimate') {
      const estimate = await CostEstimate.findByPk(id);
      if (!estimate) {
        return res.status(404).json({
          success: false,
          error: 'Смета не найдена',
        });
      }
      await estimate.destroy();
    }

    res.json({
      success: true,
      message: 'Файл удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении файла:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении файла',
    });
  }
}

module.exports = {
  uploadFile,
  deleteUpload,
};

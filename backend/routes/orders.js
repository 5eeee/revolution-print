const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { validate, required, isInt, isNumber, isIn, sanitizeString, maxLength } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

// Основные CRUD
router.get('/', orderController.getOrders);
router.post('/',
  validate(
    required('clientId', 'Клиент'),
    isInt('clientId', 'Клиент'),
    sanitizeString('title'),
    required('title', 'Название'),
    maxLength('title', 255, 'Название')
  ),
  orderController.createOrder
);
router.get('/:id', orderController.getOrder);
router.put('/:id',
  validate(
    sanitizeString('title'),
    maxLength('title', 255, 'Название'),
    isIn('status', ['Обработка', 'В работе', 'Готов', 'Отменен', 'В ожидании'], 'Статус'),
    isIn('paymentStatus', ['postpaid', '50%', 'paid'], 'Статус оплаты'),
    isNumber('marginPercent', 'Маржа')
  ),
  orderController.updateOrder
);
router.delete('/:id', orderController.deleteOrder);

// Взять / отпустить заказ
router.post('/:id/take', orderController.takeOrder);
router.post('/:id/release', orderController.releaseOrder);

// Калькуляторы заказа
router.get('/:id/calculators', orderController.getCalculators);
router.post('/:id/calculators',
  validate(
    sanitizeString('type'),
    required('type', 'Тип калькулятора')
  ),
  orderController.saveCalculator
);
router.delete('/:id/calculators/:calcId', orderController.deleteCalculator);

// Разбивка по производствам
router.get('/:id/breakdown', orderController.getBreakdown);
router.post('/:id/breakdown',
  validate(
    required('productionId', 'Производство'),
    isInt('productionId', 'Производство'),
    isNumber('amount', 'Сумма')
  ),
  orderController.addBreakdown
);
router.put('/:id/breakdown/:breakdownId',
  validate(isNumber('amount', 'Сумма')),
  orderController.updateBreakdown
);
router.delete('/:id/breakdown/:breakdownId', orderController.deleteBreakdown);

// Макеты
router.get('/:id/designs', orderController.getDesigns);
router.delete('/:id/designs/:designId', orderController.deleteDesign);

// Сметы трат
router.get('/:id/estimates', orderController.getEstimates);
router.put('/:id/estimates/:estimateId',
  validate(isNumber('extractedAmount', 'Сумма')),
  orderController.updateEstimate
);
router.delete('/:id/estimates/:estimateId', orderController.deleteEstimate);

// Сообщения (чат по заказу)
router.get('/:id/messages', orderController.getOrderMessages);
router.post('/:id/messages',
  validate(required('text', 'Текст сообщения')),
  orderController.addOrderMessage
);

module.exports = router;

const express = require('express');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');
const { validate, required, sanitizeString, maxLength } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get('/generate/:orderId', documentController.getOrderData);

router.get('/', documentController.getDocuments);
router.post('/',
  validate(
    sanitizeString('type'),
    required('type', 'Тип документа'),
    sanitizeString('title'),
    required('title', 'Название'),
    maxLength('title', 500, 'Название')
  ),
  documentController.createDocument
);
router.get('/:id', documentController.getDocument);
router.put('/:id',
  validate(
    sanitizeString('title'),
    maxLength('title', 500, 'Название')
  ),
  documentController.updateDocument
);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;

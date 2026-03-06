const express = require('express');
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/auth');
const { validate, required, maxLength, isIn, sanitizeString } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get('/', clientController.getClients);
router.post('/',
  validate(
    sanitizeString('name'),
    required('name', 'Имя клиента'),
    maxLength('name', 255, 'Имя клиента')
  ),
  clientController.createClient
);
router.get('/:id', clientController.getClient);
router.put('/:id',
  validate(
    sanitizeString('name'),
    maxLength('name', 255, 'Имя клиента')
  ),
  clientController.updateClient
);
router.delete('/:id', clientController.deleteClient);
router.post('/:id/take', clientController.takeClient);

module.exports = router;

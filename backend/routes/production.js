const express = require('express');
const productionController = require('../controllers/productionController');
const authMiddleware = require('../middleware/auth');
const { validate, required, sanitizeString, maxLength } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get('/', productionController.getCompanies);
router.post('/',
  validate(
    sanitizeString('name'),
    required('name', 'Название компании'),
    maxLength('name', 255, 'Название')
  ),
  productionController.createCompany
);
router.get('/:id', productionController.getCompany);
router.get('/:id/orders', productionController.getCompanyOrders);
router.put('/:id',
  validate(
    sanitizeString('name'),
    maxLength('name', 255, 'Название')
  ),
  productionController.updateCompany
);
router.delete('/:id', productionController.deleteCompany);

module.exports = router;

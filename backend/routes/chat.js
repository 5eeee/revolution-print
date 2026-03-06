const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const { validate, required, sanitizeString } = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get('/', chatController.getMessages);
router.post('/',
  validate(sanitizeString('text')),
  chatController.createMessage
);
router.delete('/:id', chatController.deleteMessage);

module.exports = router;

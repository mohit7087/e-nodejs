const express = require('express');
const {
  createAttribute,
  getAttributeById,
  getAttributes,
  deleteAttribute,
  updateAttribute,
} = require('../controllers/attributeController');

const router = express.Router();

router.post('/attributes', createAttribute);
router.get('/attributes', getAttributes);
router.get('/attributes/:id', getAttributeById);
router.put('/attributes/:id', updateAttribute);
router.delete('/attributes/:id', deleteAttribute);

module.exports = router;

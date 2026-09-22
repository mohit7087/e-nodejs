const express = require('express');
const {
  createProductVariant,
  getProductVariants,
  getProductVariantById,
} = require('../controllers/productVariantController');

const router = express.Router();

router.post('/products/:productId/variants', createProductVariant);
router.get('/products/:productId/variants', getProductVariants);
router.get('/products/:productId/variants/:variantId', getProductVariantById);

module.exports = router;

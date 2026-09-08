const express = require('express');
const {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

router.get('/products/category/:categoryId', getProductsByCategory);
router.get('/products/:id', getProductById);
router.get('/products', getProducts);
router.post('/create/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;

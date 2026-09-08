const express = require('express');
const {
  getMenu,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} = require('../controllers/menuController');

const router = express.Router();

router.get('/menu', getMenu);
router.post('/create/category', createMenuCategory);
router.put('/updateMenuCategory/:id', updateMenuCategory);
router.delete('/deleteMenuCategory/:id', deleteMenuCategory);

module.exports = router;

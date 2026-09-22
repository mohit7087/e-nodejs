const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');

const createProductVariant = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { sku, price, stock = 0, image, status = 'active' } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required',
      });
    }

    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a number greater than or equal to 0',
      });
    }

    if (typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a number greater than or equal to 0',
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be active or inactive',
      });
    }

    if (image !== undefined && typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image must be a string',
      });
    }

    const product = await Product.findOne({ _id: productId, status: 'active' });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Active product not found',
      });
    }

    const normalizedSku = sku.trim();
    const existingVariant = await ProductVariant.findOne({ sku: normalizedSku });

    if (existingVariant) {
      return res.status(409).json({
        success: false,
        message: 'Variant SKU already exists',
      });
    }

    const productVariant = await ProductVariant.create({
      productId: product._id,
      sku: normalizedSku,
      price,
      stock,
      image,
      status,
    });

    return res.status(201).json({
      success: true,
      productVariant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Variant SKU already exists',
      });
    }

    return next(error);
  }
};

const getProductVariants = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findById(productId).select('_id').lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const productVariants = await ProductVariant.find({
      productId: product._id,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      productVariants,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductVariantById = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    if (!mongoose.isValidObjectId(variantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variant ID',
      });
    }

    const product = await Product.findById(productId).select('_id').lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const productVariant = await ProductVariant.findOne({
      _id: variantId,
      productId: product._id,
    }).lean();

    if (!productVariant) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found',
      });
    }

    return res.status(200).json({
      success: true,
      productVariant,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProductVariant,
  getProductVariants,
  getProductVariantById,
};

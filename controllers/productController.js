const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductAttribute = require('../models/ProductAttribute');
const ProductCategory = require('../models/ProductCategory');
const Category = require('../models/Category');

const getPagination = (query) => {
  const page = Number(query.page);
  const limit = Number(query.limit);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10,
  };
};

const addProductDetails = async (products) => {
  const productIds = products.map((product) => product._id);

  if (!productIds.length) {
    return [];
  }

  const [attributes, productCategories] = await Promise.all([
    ProductAttribute.find({ productId: { $in: productIds } }).lean(),
    ProductCategory.find({ productId: { $in: productIds } })
      .populate('categoryId')
      .lean(),
  ]);

  const attributesByProductId = new Map();
  const categoriesByProductId = new Map();

  attributes.forEach((attribute) => {
    const productId = attribute.productId.toString();
    const productAttributes = attributesByProductId.get(productId) || [];
    productAttributes.push(attribute);
    attributesByProductId.set(productId, productAttributes);
  });

  productCategories.forEach((productCategory) => {
    if (!productCategory.categoryId) {
      return;
    }

    const productId = productCategory.productId.toString();
    const categories = categoriesByProductId.get(productId) || [];
    categories.push(productCategory.categoryId);
    categoriesByProductId.set(productId, categories);
  });

  return products.map((product) => ({
    ...product,
    attributes: attributesByProductId.get(product._id.toString()) || [],
    categories: categoriesByProductId.get(product._id.toString()) || [],
  }));
};

const getProducts = async (req, res, next) => {
  try {
    const { search, categoryId, minPrice, maxPrice, inStock, status } = req.query;
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ success: false, message: 'page must be an integer greater than or equal to 1' });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: 'limit must be an integer between 1 and 100' });
    }

    const allowedSortFields = ['name', 'price', 'createdAt'];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ success: false, message: 'sortBy must be one of name, price, or createdAt' });
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({ success: false, message: 'sortOrder must be asc or desc' });
    }

    if (categoryId !== undefined && !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const parsePrice = (value, field) => {
      if (value === undefined || value === '' || !Number.isFinite(Number(value))) {
        return { error: `${field} must be a valid number` };
      }
      return { value: Number(value) };
    };

    let parsedMinPrice;
    let parsedMaxPrice;
    if (minPrice !== undefined) {
      const parsed = parsePrice(minPrice, 'minPrice');
      if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
      parsedMinPrice = parsed.value;
    }
    if (maxPrice !== undefined) {
      const parsed = parsePrice(maxPrice, 'maxPrice');
      if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
      parsedMaxPrice = parsed.value;
    }
    if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
      return res.status(400).json({ success: false, message: 'minPrice cannot be greater than maxPrice' });
    }

    if (inStock !== undefined && !['true', 'false'].includes(inStock)) {
      return res.status(400).json({ success: false, message: 'inStock must be true or false' });
    }

    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }

    const filter = { status: status || 'active' };
    if (search !== undefined) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { sku: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
      filter.price = {};
      if (parsedMinPrice !== undefined) filter.price.$gte = parsedMinPrice;
      if (parsedMaxPrice !== undefined) filter.price.$lte = parsedMaxPrice;
    }
    if (inStock !== undefined) {
      filter.stock = inStock === 'true' ? { $gt: 0 } : 0;
    }

    const relationFilters = [];
    if (categoryId !== undefined) {
      relationFilters.push(
        ProductCategory.find({ categoryId }).distinct('productId')
      );
    }
    if (req.query.attributeCode !== undefined || req.query.attributeValue !== undefined) {
      if (!req.query.attributeCode || !req.query.attributeValue) {
        return res.status(400).json({ success: false, message: 'attributeCode and attributeValue must be provided together' });
      }
      relationFilters.push(
        ProductAttribute.find({
          attributeCode: req.query.attributeCode,
          attributeValue: req.query.attributeValue,
        }).distinct('productId')
      );
    }
    if (relationFilters.length) {
      const relationResults = await Promise.all(relationFilters);
      const matchingIds = relationResults.reduce((ids, result) => {
        if (ids === null) return new Set(result.map((id) => id.toString()));
        const resultIds = new Set(result.map((id) => id.toString()));
        return new Set([...ids].filter((id) => resultIds.has(id)));
      }, null);
      filter._id = { $in: [...matchingIds] };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      products: await addProductDetails(products),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const [productWithDetails] = await addProductDetails([product]);

    return res.status(200).json({
      success: true,
      product: productWithDetails,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    const { page, limit } = getPagination(req.query);
    const mappings = await ProductCategory.find({ categoryId }).select('productId');
    const productIds = mappings.map((mapping) => mapping.productId);
    const filter = {
      _id: { $in: productIds },
      status: 'active',
    };
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      products: await addProductDetails(products),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  let session;

  try {
    const {
      name,
      sku,
      description,
      price,
      stock = 0,
      image,
      attributes,
      categoryIds,
    } = req.body;

    if (!name || !sku || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, and price are required',
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

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({
        success: false,
        message: 'categoryIds must be an array',
      });
    }

    if (
      categoryIds.some(
        (categoryId) =>
          typeof categoryId !== 'string' || !mongoose.isValidObjectId(categoryId)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Each categoryId must be a valid MongoDB ObjectId',
      });
    }

    if (attributes !== undefined && !Array.isArray(attributes)) {
      return res.status(400).json({
        success: false,
        message: 'Attributes must be an array',
      });
    }

    const productAttributes = attributes || [];
    const attributeCodes = new Set();

    for (const attribute of productAttributes) {
      if (
        !attribute ||
        typeof attribute.attributeCode !== 'string' ||
        !attribute.attributeCode.trim() ||
        typeof attribute.attributeValue !== 'string' ||
        !attribute.attributeValue.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each attribute requires attributeCode and attributeValue',
        });
      }

      const attributeCode = attribute.attributeCode.trim();

      if (attributeCodes.has(attributeCode)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate attributeCode values are not allowed',
        });
      }

      attributeCodes.add(attributeCode);
    }

    const uniqueCategoryIds = [...new Set(categoryIds)];
    let product;
    let createdAttributes = [];
    let categories = [];

    const createProductRecords = async (activeSession) => {
      const categoryQuery = Category.find({
        _id: { $in: uniqueCategoryIds },
        status: 'active',
      });

      if (activeSession) {
        categoryQuery.session(activeSession);
      }

      categories = await categoryQuery;

      if (categories.length !== uniqueCategoryIds.length) {
        const error = new Error(
          'One or more categories do not exist or are inactive'
        );
        error.statusCode = 400;
        throw error;
      }

      [product] = await Product.create(
        [
          {
            name,
            sku,
            description,
            price,
            stock,
            image,
          },
        ],
        activeSession ? { session: activeSession } : {}
      );

      if (productAttributes.length) {
        createdAttributes = await ProductAttribute.insertMany(
          productAttributes.map((attribute) => ({
            productId: product._id,
            attributeCode: attribute.attributeCode.trim(),
            attributeValue: attribute.attributeValue.trim(),
          })),
          activeSession ? { session: activeSession } : {}
        );
      }

      if (uniqueCategoryIds.length) {
        await ProductCategory.insertMany(
          uniqueCategoryIds.map((categoryId) => ({
            productId: product._id,
            categoryId,
          })),
          activeSession ? { session: activeSession } : {}
        );
      }
    };

    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    const supportsTransactions = Boolean(
      serverInfo.setName || serverInfo.msg === 'isdbgrid'
    );

    if (supportsTransactions) {
      session = await mongoose.startSession();
      await session.withTransaction(() => createProductRecords(session));
    } else {
      try {
        await createProductRecords();
      } catch (error) {
        if (product) {
          await ProductAttribute.deleteMany({ productId: product._id });
          await ProductCategory.deleteMany({ productId: product._id });
          await Product.deleteOne({ _id: product._id });
        }

        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      product,
      attributes: createdAttributes,
      categories,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'SKU already exists',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const updateProduct = async (req, res, next) => {
  let session;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const hasField = (field) =>
      Object.prototype.hasOwnProperty.call(req.body, field);
    const productFields = [
      'name',
      'sku',
      'description',
      'price',
      'stock',
      'image',
      'status',
    ];
    const updates = {};

    for (const field of productFields) {
      if (hasField(field)) {
        updates[field] = req.body[field];
      }
    }

    if (hasField('sku') && typeof updates.sku === 'string') {
      updates.sku = updates.sku.trim();
    }

    if (
      hasField('price') &&
      (typeof updates.price !== 'number' ||
        !Number.isFinite(updates.price) ||
        updates.price < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a number greater than or equal to 0',
      });
    }

    if (
      hasField('stock') &&
      (typeof updates.stock !== 'number' ||
        !Number.isFinite(updates.stock) ||
        updates.stock < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a number greater than or equal to 0',
      });
    }

    let productAttributes;
    if (hasField('attributes')) {
      if (!Array.isArray(req.body.attributes)) {
        return res.status(400).json({
          success: false,
          message: 'Attributes must be an array',
        });
      }

      const attributeCodes = new Set();
      productAttributes = [];

      for (const attribute of req.body.attributes) {
        if (
          !attribute ||
          typeof attribute.attributeCode !== 'string' ||
          !attribute.attributeCode.trim() ||
          typeof attribute.attributeValue !== 'string' ||
          !attribute.attributeValue.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Each attribute requires attributeCode and attributeValue',
          });
        }

        const attributeCode = attribute.attributeCode.trim();
        if (attributeCodes.has(attributeCode)) {
          return res.status(400).json({
            success: false,
            message: 'Duplicate attributeCode values are not allowed',
          });
        }

        attributeCodes.add(attributeCode);
        productAttributes.push({
          attributeCode,
          attributeValue: attribute.attributeValue.trim(),
        });
      }
    }

    let uniqueCategoryIds;
    if (hasField('categoryIds')) {
      if (!Array.isArray(req.body.categoryIds)) {
        return res.status(400).json({
          success: false,
          message: 'categoryIds must be an array',
        });
      }

      if (
        req.body.categoryIds.some(
          (categoryId) =>
            typeof categoryId !== 'string' || !mongoose.isValidObjectId(categoryId)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each categoryId must be a valid MongoDB ObjectId',
        });
      }

      uniqueCategoryIds = [
        ...new Set(req.body.categoryIds.map((categoryId) => categoryId.toString())),
      ];
    }

    let updatedProduct;
    let updatedAttributes;
    let updatedCategories;

    const updateProductRecords = async (activeSession) => {
      const productQuery = Product.findById(id);
      if (activeSession) productQuery.session(activeSession);
      const product = await productQuery;

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      if (hasField('sku')) {
        const existingProductQuery = Product.findOne({
          sku: updates.sku,
          _id: { $ne: product._id },
        });
        if (activeSession) existingProductQuery.session(activeSession);
        const existingProduct = await existingProductQuery;

        if (existingProduct) {
          const error = new Error('SKU already exists');
          error.statusCode = 409;
          throw error;
        }
      }

      if (uniqueCategoryIds !== undefined) {
        const categories = await Category.find({
          _id: { $in: uniqueCategoryIds },
          status: 'active',
        }).session(activeSession);

        if (categories.length !== uniqueCategoryIds.length) {
          const error = new Error(
            'One or more categories do not exist or are inactive'
          );
          error.statusCode = 400;
          throw error;
        }

        const categoryIdsToKeep = new Set(uniqueCategoryIds);
        const existingMappings = await ProductCategory.find({ productId: product._id })
          .session(activeSession)
          .lean();
        const existingCategoryIds = new Set(
          existingMappings.map((mapping) => mapping.categoryId.toString())
        );
        const categoryIdsToAdd = uniqueCategoryIds.filter(
          (categoryId) => !existingCategoryIds.has(categoryId)
        );
        const categoryIdsToRemove = existingMappings
          .filter((mapping) => !categoryIdsToKeep.has(mapping.categoryId.toString()))
          .map((mapping) => mapping.categoryId);

        if (categoryIdsToRemove.length) {
          await ProductCategory.deleteMany({
            productId: product._id,
            categoryId: { $in: categoryIdsToRemove },
          }).session(activeSession);
        }

        if (categoryIdsToAdd.length) {
          await ProductCategory.insertMany(
            categoryIdsToAdd.map((categoryId) => ({
              productId: product._id,
              categoryId,
            })),
            { session: activeSession }
          );
        }

        updatedCategories = categories;
      }

      if (productAttributes !== undefined) {
        const requestedCodes = new Set(
          productAttributes.map((attribute) => attribute.attributeCode)
        );
        await ProductAttribute.deleteMany({
          productId: product._id,
          attributeCode: { $nin: [...requestedCodes] },
        }).session(activeSession);

        for (const attribute of productAttributes) {
          await ProductAttribute.findOneAndUpdate(
            { productId: product._id, attributeCode: attribute.attributeCode },
            { $set: { attributeValue: attribute.attributeValue } },
            {
              upsert: true,
              returnDocument: 'after',
              runValidators: true,
              session: activeSession,
            }
          );
        }

        updatedAttributes = await ProductAttribute.find({ productId: product._id })
          .session(activeSession)
          .lean();
      }

      Object.assign(product, updates);
      await product.save({ session: activeSession });
      updatedProduct = product.toObject();

      if (updatedAttributes === undefined) {
        updatedAttributes = await ProductAttribute.find({ productId: product._id })
          .session(activeSession)
          .lean();
      }

      if (updatedCategories === undefined) {
        const mappings = await ProductCategory.find({ productId: product._id })
          .populate('categoryId')
          .session(activeSession)
          .lean();
        updatedCategories = mappings
          .map((mapping) => mapping.categoryId)
          .filter(Boolean);
      }
    };

    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    const supportsTransactions = Boolean(
      serverInfo.setName || serverInfo.msg === 'isdbgrid'
    );

    if (supportsTransactions) {
      session = await mongoose.startSession();
      await session.withTransaction(() => updateProductRecords(session));
    } else {
      // Standalone MongoDB servers do not support transaction numbers.
      // Run the same synchronization without session options in that mode.
      await updateProductRecords(null);
    }

    return res.status(200).json({
      success: true,
      product: updatedProduct,
      attributes: updatedAttributes,
      categories: updatedCategories,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'SKU already exists',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product.status === 'inactive') {
      return res.status(200).json({
        success: true,
        message: 'Product is already inactive',
        product: {
          id: product._id,
          name: product.name,
          status: product.status,
        },
      });
    }

    product.status = 'inactive';
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product deactivated successfully',
      product: {
        id: product._id,
        name: product.name,
        status: product.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};

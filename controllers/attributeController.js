const mongoose = require('mongoose');
const Attribute = require('../models/Attribute');

const getAttributes = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'page must be an integer greater than or equal to 1',
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'limit must be an integer between 1 and 100',
      });
    }

    if (!['name', 'createdAt'].includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: 'sortBy must be name or createdAt',
      });
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'sortOrder must be asc or desc',
      });
    }

    const filter = { status: 'active' };
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'search must be a string',
        });
      }

      const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { code: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (req.query.type !== undefined) {
      filter.type = req.query.type;
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const total = await Attribute.countDocuments(filter);
    const data = await Attribute.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

const createAttribute = async (req, res, next) => {
  try {
    const { name, code, type, values } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Code is required',
      });
    }

    const normalizedType = typeof type === 'string' ? type.trim() : type;
    const supportedTypes = ['text', 'number', 'select', 'multiselect', 'boolean'];
    if (!supportedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be one of text, number, select, multiselect, or boolean',
      });
    }

    if (values !== undefined) {
      if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
        return res.status(400).json({
          success: false,
          message: 'Values must be an array of strings',
        });
      }
    }

    if (
      (normalizedType === 'select' || normalizedType === 'multiselect') &&
      (!Array.isArray(values) || values.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Values are required for select and multiselect attributes',
      });
    }

    const attribute = await Attribute.create({
      name: name.trim(),
      code: code.trim().toLowerCase(),
      type: normalizedType,
      values: values || [],
    });

    return res.status(201).json({
      success: true,
      attribute,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attribute code already exists',
      });
    }

    return next(error);
  }
};

const getAttributeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attribute ID',
      });
    }

    const attribute = await Attribute.findById(id)
      .select('_id name code type values status createdAt updatedAt')
      .lean();

    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Attribute not found',
      });
    }

    return res.status(200).json({
      success: true,
      attribute,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAttribute = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attribute ID',
      });
    }

    const attribute = await Attribute.findById(id);

    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Attribute not found',
      });
    }

    const { name, code, type, values, status } = req.body;
    const hasField = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    const updatedName = hasField('name') ? name : attribute.name;
    const updatedCode = hasField('code') ? code : attribute.code;
    const updatedType = hasField('type') ? type : attribute.type;
    const updatedValues = hasField('values') ? values : attribute.values;

    if (!hasField('name') || typeof updatedName !== 'string' || !updatedName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!hasField('code') || typeof updatedCode !== 'string' || !updatedCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Code is required',
      });
    }

    const normalizedType = typeof updatedType === 'string' ? updatedType.trim() : updatedType;
    const supportedTypes = ['text', 'number', 'select', 'multiselect', 'boolean'];
    if (!supportedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be one of text, number, select, multiselect, or boolean',
      });
    }

    if (hasField('values') && (!Array.isArray(updatedValues) || updatedValues.some((value) => typeof value !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'Values must be an array of strings',
      });
    }

    if (
      (normalizedType === 'select' || normalizedType === 'multiselect') &&
      (!Array.isArray(updatedValues) || updatedValues.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Values are required for select and multiselect attributes',
      });
    }

    const normalizedCode = updatedCode.trim().toLowerCase();
    const duplicate = await Attribute.findOne({
      code: normalizedCode,
      _id: { $ne: attribute._id },
    }).select('_id').lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Attribute code already exists',
      });
    }

    attribute.name = updatedName.trim();
    attribute.code = normalizedCode;
    attribute.type = normalizedType;
    if (hasField('values')) {
      attribute.values = updatedValues;
    }
    if (hasField('status')) {
      attribute.status = status;
    }

    await attribute.save();

    return res.status(200).json({
      success: true,
      attribute,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attribute code already exists',
      });
    }

    return next(error);
  }
};

const deleteAttribute = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attribute ID',
      });
    }

    const attribute = await Attribute.findById(id);

    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Attribute not found',
      });
    }

    const attributeSummary = {
      attributeId: attribute._id,
      name: attribute.name,
      code: attribute.code,
      status: attribute.status,
    };

    if (attribute.status === 'inactive') {
      return res.status(200).json({
        success: true,
        message: 'Attribute is already inactive',
        attribute: attributeSummary,
      });
    }

    attribute.status = 'inactive';
    await attribute.save();

    return res.status(200).json({
      success: true,
      message: 'Attribute deactivated successfully',
      attribute: {
        ...attributeSummary,
        status: attribute.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAttribute,
  getAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
};

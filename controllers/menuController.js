const Category = require('../models/Category');
const mongoose = require('mongoose');

const getMenu = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: 'active' })
      .sort({ level: 1, name: 1 })
      .lean();

    const categoriesById = new Map();

    categories.forEach((category) => {
      category.children = [];
      categoriesById.set(category._id.toString(), category);
    });

    const menu = [];

    categories.forEach((category) => {
      if (category.level === 1 && category.parentId === null) {
        menu.push(category);
        return;
      }

      if (category.parentId) {
        const parent = categoriesById.get(category.parentId.toString());

        if (parent && category.level === parent.level + 1) {
          parent.children.push(category);
        }
      }
    });

    res.status(200).json({
      success: true,
      data: menu,
    });
  } catch (error) {
    next(error);
  }
};

const createMenuCategory = async (req, res, next) => {
  try {
    const { name, slug, parentId, level, status } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required',
      });
    }

    if (!Number.isInteger(level) || ![1, 2, 3].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Level is required and must be 1, 2, or 3',
      });
    }

    if (level === 1 && parentId !== null) {
      return res.status(400).json({
        success: false,
        message: 'Level 1 categories must have parentId set to null',
      });
    }

    if (level > 1) {
      if (!parentId || !mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid parentId is required for this category level',
        });
      }

      const parent = await Category.findOne({
        _id: parentId,
        status: 'active',
      });

      if (!parent || parent.level !== level - 1) {
        return res.status(400).json({
          success: false,
          message: `Level ${level} categories require an active Level ${level - 1} parent`,
        });
      }
    }

    const category = await Category.create({
      name,
      slug,
      parentId: level === 1 ? null : parentId,
      level,
      status,
    });

    return res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Slug already exists',
      });
    }

    return next(error);
  }
};

const updateMenuCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId, level, status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required',
      });
    }

    if (!Number.isInteger(level) || ![1, 2, 3].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Level is required and must be 1, 2, or 3',
      });
    }

    if (level === 1 && parentId !== null) {
      return res.status(400).json({
        success: false,
        message: 'Level 1 categories must have parentId set to null',
      });
    }

    if (level > 1) {
      if (!parentId || !mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid parentId is required for this category level',
        });
      }

      const parent = await Category.findOne({
        _id: parentId,
        status: 'active',
      });

      if (!parent || parent.level !== level - 1) {
        return res.status(400).json({
          success: false,
          message: `Level ${level} categories require an active Level ${level - 1} parent`,
        });
      }
    }

    category.name = name;
    category.slug = slug;
    category.parentId = level === 1 ? null : parentId;
    category.level = level;

    if (status !== undefined) {
      category.status = status;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Slug already exists',
      });
    }

    return next(error);
  }
};

const deleteMenuCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const hasActiveChildren = await Category.exists({
      parentId: category._id,
      status: 'active',
    });

    if (hasActiveChildren) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be deactivated because active child categories exist',
      });
    }

    category.status = 'inactive';
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category deactivated successfully',
      data: category,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMenu,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
};

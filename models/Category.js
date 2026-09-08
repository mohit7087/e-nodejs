const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    status: {
      type: String,
      default: 'active',
    },
  }
);

module.exports = mongoose.model('Category', categorySchema);

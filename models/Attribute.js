const mongoose = require('mongoose');

const supportedTypes = ['text', 'number', 'select', 'multiselect', 'boolean'];

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      required: true,
      enum: supportedTypes,
      trim: true,
    },
    values: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attribute', attributeSchema);

const mongoose = require('mongoose');

const productAttributeSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    attributeCode: {
      type: String,
      required: true,
      trim: true,
    },
    attributeValue: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

productAttributeSchema.index({ productId: 1, attributeCode: 1 });

module.exports = mongoose.model('ProductAttribute', productAttributeSchema);

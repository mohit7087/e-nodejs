const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

productImageSchema.index({ productId: 1 });

module.exports = mongoose.model('ProductImage', productImageSchema);

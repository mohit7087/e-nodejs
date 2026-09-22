require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');

const productImageData = [
  {
    productSku: 'DUMMY-NIKE-AIR-MAX-001',
    imageUrl: 'https://placehold.co/1200x1200/png?text=Nike+Air+Max+Primary',
    altText: 'Nike Air Max primary product image',
    isPrimary: true,
    sortOrder: 0,
    status: 'active',
  },
  {
    productSku: 'DUMMY-NIKE-AIR-MAX-001',
    imageUrl: 'https://placehold.co/1200x1200/png?text=Nike+Air+Max+Side',
    altText: 'Nike Air Max side view',
    isPrimary: false,
    sortOrder: 1,
    status: 'active',
  },
  {
    productSku: 'DUMMY-ADIDAS-RUN-001',
    imageUrl: 'https://placehold.co/1200x1200/png?text=Adidas+Running+Primary',
    altText: 'Adidas running shoe primary product image',
    isPrimary: true,
    sortOrder: 0,
    status: 'active',
  },
];

const seedProductImages = async () => {
  try {
    await connectDB();

    const productSkus = [...new Set(productImageData.map((image) => image.productSku))];
    const imageUrls = productImageData.map((image) => image.imageUrl);
    const products = await Product.find({ sku: { $in: productSkus } }).select('_id sku name');
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    const existingImages = await ProductImage.find({ imageUrl: { $in: imageUrls } })
      .select('productId imageUrl')
      .lean();
    const existingImageKeys = new Set(
      existingImages.map((image) => `${image.productId.toString()}:${image.imageUrl}`)
    );

    let createdCount = 0;

    for (const imageInfo of productImageData) {
      const product = productsBySku.get(imageInfo.productSku);

      if (!product) {
        console.warn(
          `Warning: product with SKU "${imageInfo.productSku}" was not found; skipping image.`
        );
        continue;
      }

      const imageKey = `${product._id.toString()}:${imageInfo.imageUrl}`;
      if (existingImageKeys.has(imageKey)) {
        console.log(`Image "${imageInfo.imageUrl}" already exists for ${product.name}; skipping.`);
        continue;
      }

      await ProductImage.create({
        productId: product._id,
        imageUrl: imageInfo.imageUrl,
        altText: imageInfo.altText,
        isPrimary: imageInfo.isPrimary,
        sortOrder: imageInfo.sortOrder,
        status: imageInfo.status,
      });

      existingImageKeys.add(imageKey);
      createdCount += 1;
      console.log(`Seeded image for ${product.name}`);
    }

    console.log(`ProductImage seed complete: ${createdCount} images created.`);
  } catch (error) {
    console.error(`ProductImage seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedProductImages();

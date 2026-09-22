require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');

const productVariantData = [
  {
    productSku: 'DUMMY-NIKE-AIR-MAX-001',
    sku: 'DUMMY-NIKE-AIR-MAX-BLACK-10',
    price: 12999,
    stock: 12,
    image: 'https://example.com/images/nike-air-max-black-10.jpg',
    status: 'active',
  },
  {
    productSku: 'DUMMY-NIKE-AIR-MAX-001',
    sku: 'DUMMY-NIKE-AIR-MAX-WHITE-9',
    price: 12999,
    stock: 8,
    image: 'https://example.com/images/nike-air-max-white-9.jpg',
    status: 'active',
  },
  {
    productSku: 'DUMMY-ADIDAS-RUN-001',
    sku: 'DUMMY-ADIDAS-RUN-BLUE-9',
    price: 8999,
    stock: 15,
    image: 'https://example.com/images/adidas-running-blue-9.jpg',
    status: 'active',
  },
];

const seedProductVariants = async () => {
  try {
    await connectDB();

    const productSkus = [...new Set(productVariantData.map((variant) => variant.productSku))];
    const variantSkus = productVariantData.map((variant) => variant.sku);
    const [products, existingVariants] = await Promise.all([
      Product.find({ sku: { $in: productSkus } }).select('_id sku name'),
      ProductVariant.find({ sku: { $in: variantSkus } }).select('sku'),
    ]);
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    const existingVariantSkus = new Set(
      existingVariants.map((variant) => variant.sku)
    );

    let createdCount = 0;

    for (const variantInfo of productVariantData) {
      const product = productsBySku.get(variantInfo.productSku);

      if (!product) {
        console.warn(
          `Warning: product with SKU "${variantInfo.productSku}" was not found; skipping variant.`
        );
        continue;
      }

      if (existingVariantSkus.has(variantInfo.sku)) {
        console.log(`Variant with SKU "${variantInfo.sku}" already exists; skipping.`);
        continue;
      }

      await ProductVariant.create({
        productId: product._id,
        sku: variantInfo.sku,
        price: variantInfo.price,
        stock: variantInfo.stock,
        image: variantInfo.image,
        status: variantInfo.status,
      });

      createdCount += 1;
      console.log(`Seeded variant ${variantInfo.sku} for ${product.name}`);
    }

    console.log(`ProductVariant seed complete: ${createdCount} variants created.`);
  } catch (error) {
    console.error(`ProductVariant seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedProductVariants();

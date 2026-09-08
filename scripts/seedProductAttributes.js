require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const ProductAttribute = require('../models/ProductAttribute');

const productAttributes = [
  {
    sku: 'DUMMY-NIKE-AIR-MAX-001',
    attributes: { color: 'Black', size: '10', material: 'Mesh', gender: 'Men' },
  },
  {
    sku: 'DUMMY-ADIDAS-RUN-001',
    attributes: { color: 'Blue', size: '9', material: 'Mesh', gender: 'Men' },
  },
  {
    sku: 'DUMMY-LEVIS-SLIM-001',
    attributes: { color: 'Blue', size: '32', material: 'Denim', fit: 'Slim' },
  },
  {
    sku: 'DUMMY-MENS-SHIRT-001',
    attributes: { color: 'White', size: 'L', material: 'Cotton', fit: 'Regular' },
  },
  {
    sku: 'DUMMY-WOMENS-DRESS-001',
    attributes: { color: 'Red', size: 'M', material: 'Cotton', fit: 'Regular' },
  },
  {
    sku: 'DUMMY-WOMENS-SNEAKERS-001',
    attributes: { color: 'White', size: '7', material: 'Mesh', gender: 'Women' },
  },
  {
    sku: 'DUMMY-SAMSUNG-GALAXY-001',
    attributes: {
      color: 'Black',
      ram: '8GB',
      storage: '256GB',
      screen_size: '6.7 inch',
    },
  },
  {
    sku: 'DUMMY-MACBOOK-AIR-001',
    attributes: {
      color: 'Silver',
      ram: '16GB',
      storage: '512GB',
      screen_size: '13.6 inch',
    },
  },
  {
    sku: 'DUMMY-SONY-HEADPHONES-001',
    attributes: {
      color: 'Black',
      connectivity: 'Bluetooth',
      type: 'Wireless',
      battery_life: '30 hours',
    },
  },
  {
    sku: 'DUMMY-KIDS-TSHIRT-001',
    attributes: { color: 'Blue', size: '8-10Y', material: 'Cotton', gender: 'Boys' },
  },
];

const seedProductAttributes = async () => {
  try {
    await connectDB();

    const skus = productAttributes.map((product) => product.sku);
    const products = await Product.find({ sku: { $in: skus } }).select('_id sku name');
    const productsBySku = new Map(products.map((product) => [product.sku, product]));

    let createdAttributeCount = 0;
    let updatedProductCount = 0;

    for (const productInfo of productAttributes) {
      const product = productsBySku.get(productInfo.sku);

      if (!product) {
        console.warn(
          `Warning: product with SKU "${productInfo.sku}" was not found; skipping attributes.`
        );
        continue;
      }

      // Replace only this product's attributes, leaving products, categories,
      // and ProductCategory mappings untouched.
      await ProductAttribute.deleteMany({ productId: product._id });

      const records = Object.entries(productInfo.attributes).map(
        ([attributeCode, attributeValue]) => ({
          productId: product._id,
          attributeCode,
          attributeValue,
        })
      );

      await ProductAttribute.insertMany(records);
      createdAttributeCount += records.length;
      updatedProductCount += 1;
      console.log(`Seeded ${records.length} attributes for ${product.name} (${product.sku})`);
    }

    console.log(
      `ProductAttribute seed complete: ${createdAttributeCount} attributes created for ${updatedProductCount} products.`
    );
  } catch (error) {
    console.error(`ProductAttribute seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedProductAttributes();

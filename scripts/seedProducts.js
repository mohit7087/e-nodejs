require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const ProductAttribute = require('../models/ProductAttribute');
const Category = require('../models/Category');
const ProductCategory = require('../models/ProductCategory');

const productData = [
  {
    name: 'Nike Air Max',
    sku: 'DUMMY-NIKE-AIR-MAX-001',
    description: 'Comfortable everyday running shoes with responsive cushioning.',
    categorySlug: 'men-shoes-sneakers',
    price: 12999,
    stock: 25,
    image: 'https://example.com/images/nike-air-max.jpg',
    status: 'active',
    attributes: {
      color: 'Black',
      size: '10',
      material: 'Mesh',
      gender: 'Men',
    },
  },
  {
    name: 'Adidas Running Shoes',
    sku: 'DUMMY-ADIDAS-RUN-001',
    description: 'Lightweight running shoes designed for daily training.',
    categorySlug: 'men-shoes-sneakers',
    price: 8999,
    stock: 30,
    image: 'https://example.com/images/adidas-running-shoes.jpg',
    status: 'active',
    attributes: {
      color: 'White',
      size: '9',
      material: 'Synthetic',
      gender: 'Men',
    },
  },
  {
    name: "Levi's Slim Fit Jeans",
    sku: 'DUMMY-LEVIS-SLIM-001',
    description: 'Classic slim fit jeans with a modern tapered silhouette.',
    categorySlug: 'men-clothing-jeans',
    price: 3499,
    stock: 40,
    image: 'https://example.com/images/levis-slim-fit-jeans.jpg',
    status: 'active',
    attributes: {
      color: 'Blue',
      size: '32',
      material: 'Denim',
      fit: 'Slim',
    },
  },
  {
    name: "Men's Casual Shirt",
    sku: 'DUMMY-MENS-SHIRT-001',
    description: 'Soft cotton casual shirt for everyday wear.',
    categorySlug: 'men-clothing-shirts',
    price: 1999,
    stock: 35,
    image: 'https://example.com/images/mens-casual-shirt.jpg',
    status: 'active',
    attributes: {
      color: 'Navy Blue',
      size: 'L',
      material: 'Cotton',
      sleeve: 'Full',
    },
  },
  {
    name: "Women's Summer Dress",
    sku: 'DUMMY-WOMENS-DRESS-001',
    description: 'Lightweight floral dress for warm-weather occasions.',
    categorySlug: 'women-clothing-dresses',
    price: 2999,
    stock: 28,
    image: 'https://example.com/images/womens-summer-dress.jpg',
    status: 'active',
    attributes: {
      color: 'Yellow',
      size: 'M',
      material: 'Rayon',
      pattern: 'Floral',
    },
  },
  {
    name: "Women's Sneakers",
    sku: 'DUMMY-WOMENS-SNEAKERS-001',
    description: 'Versatile sneakers with cushioned support for daily use.',
    categorySlug: 'women-shoes-sneakers',
    price: 6499,
    stock: 22,
    image: 'https://example.com/images/womens-sneakers.jpg',
    status: 'active',
    attributes: {
      color: 'Pink',
      size: '7',
      material: 'Canvas',
      gender: 'Women',
    },
  },
  {
    name: 'Samsung Galaxy Phone',
    sku: 'DUMMY-SAMSUNG-GALAXY-001',
    description: 'High-performance smartphone with a large immersive display.',
    categorySlug: 'men-accessories-watches',
    price: 74999,
    stock: 15,
    image: 'https://example.com/images/samsung-galaxy-phone.jpg',
    status: 'active',
    attributes: {
      color: 'Black',
      ram: '8GB',
      storage: '256GB',
      screen_size: '6.7 inch',
    },
  },
  {
    name: 'Apple MacBook Air',
    sku: 'DUMMY-MACBOOK-AIR-001',
    description: 'Thin and lightweight laptop for work, study, and travel.',
    categorySlug: 'men-accessories-watches',
    price: 99999,
    stock: 12,
    image: 'https://example.com/images/apple-macbook-air.jpg',
    status: 'active',
    attributes: {
      color: 'Space Gray',
      ram: '16GB',
      storage: '512GB',
      display: '13 inch',
    },
  },
  {
    name: 'Sony Headphones',
    sku: 'DUMMY-SONY-HEADPHONES-001',
    description: 'Wireless over-ear headphones with active noise cancellation.',
    categorySlug: 'women-accessories-watches',
    price: 24999,
    stock: 18,
    image: 'https://example.com/images/sony-headphones.jpg',
    status: 'active',
    attributes: {
      color: 'Black',
      connectivity: 'Bluetooth',
      battery_life: '30 hours',
      noise_cancellation: 'Active',
    },
  },
  {
    name: "Kids T-Shirt",
    sku: 'DUMMY-KIDS-TSHIRT-001',
    description: 'Comfortable graphic cotton t-shirt for everyday play.',
    categorySlug: 'kids-boys-t-shirts',
    price: 799,
    stock: 50,
    image: 'https://example.com/images/kids-t-shirt.jpg',
    status: 'active',
    attributes: {
      color: 'Red',
      size: '8-9 Years',
      material: 'Cotton',
      gender: 'Boys',
    },
  },
];

const seedProducts = async () => {
  try {
    await connectDB();

    const categorySlugs = [...new Set(productData.map((product) => product.categorySlug))];
    const categories = await Category.find({
      slug: { $in: categorySlugs },
      status: 'active',
    });
    const categoriesBySlug = new Map(
      categories.map((category) => [category.slug, category])
    );
    const missingCategories = categorySlugs.filter(
      (slug) => !categoriesBySlug.has(slug)
    );

    if (missingCategories.length) {
      throw new Error(`Active categories not found: ${missingCategories.join(', ')}`);
    }

    const existingProducts = await Product.find({ sku: /^DUMMY-/ }).select('_id');
    const existingProductIds = existingProducts.map((product) => product._id);

    await ProductAttribute.deleteMany({ productId: { $in: existingProductIds } });
    await ProductCategory.deleteMany({ productId: { $in: existingProductIds } });
    await Product.deleteMany({ sku: /^DUMMY-/ });

    for (const productInfo of productData) {
      const product = await Product.create({
        name: productInfo.name,
        sku: productInfo.sku,
        description: productInfo.description,
        price: productInfo.price,
        stock: productInfo.stock,
        image: productInfo.image,
        status: productInfo.status,
      });

      await ProductCategory.create({
        productId: product._id,
        categoryId: categoriesBySlug.get(productInfo.categorySlug)._id,
      });

      const attributes = Object.entries(productInfo.attributes).map(
        ([attributeCode, attributeValue]) => ({
          productId: product._id,
          attributeCode,
          attributeValue,
        })
      );

      await ProductAttribute.insertMany(attributes);
    }

    console.log(`${productData.length} dummy products seeded successfully`);
  } catch (error) {
    console.error(`Product seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedProducts();

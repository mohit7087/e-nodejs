require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ProductCategory = require('../models/ProductCategory');

const productCategoryData = [
  {
    sku: 'DUMMY-NIKE-AIR-MAX-001',
    categorySlugs: ['men', 'men-shoes-sneakers'],
  },
  {
    sku: 'DUMMY-ADIDAS-RUN-001',
    categorySlugs: ['men', 'men-shoes-sneakers'],
  },
  {
    sku: 'DUMMY-LEVIS-SLIM-001',
    categorySlugs: ['men', 'men-clothing-jeans'],
  },
  {
    sku: 'DUMMY-MENS-SHIRT-001',
    categorySlugs: ['men', 'men-clothing-shirts'],
  },
  {
    sku: 'DUMMY-WOMENS-DRESS-001',
    categorySlugs: ['women', 'women-clothing-dresses'],
  },
  {
    sku: 'DUMMY-WOMENS-SNEAKERS-001',
    categorySlugs: ['women', 'women-shoes-sneakers'],
  },
  {
    sku: 'DUMMY-SAMSUNG-GALAXY-001',
    categorySlugs: ['electronics', 'electronics-smartphones'],
  },
  {
    sku: 'DUMMY-MACBOOK-AIR-001',
    categorySlugs: ['electronics', 'electronics-laptops'],
  },
  {
    sku: 'DUMMY-SONY-HEADPHONES-001',
    categorySlugs: ['electronics', 'electronics-headphones'],
  },
  {
    sku: 'DUMMY-KIDS-TSHIRT-001',
    categorySlugs: ['kids', 'kids-boys', 'kids-boys-t-shirts'],
  },
];

const ensureElectronicsCategories = async () => {
  const electronics = await Category.findOneAndUpdate(
    { slug: 'electronics' },
    {
      $setOnInsert: {
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        level: 1,
        status: 'active',
      },
    },
    { returnDocument: 'after', upsert: true }
  );

  const electronicsChildren = [
    ['Smartphones', 'electronics-smartphones'],
    ['Laptops', 'electronics-laptops'],
    ['Headphones', 'electronics-headphones'],
  ];

  for (const [name, slug] of electronicsChildren) {
    await Category.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          parentId: electronics._id,
          level: 2,
          status: 'active',
        },
      },
      { returnDocument: 'after', upsert: true }
    );
  }
};

const seedProductCategories = async () => {
  try {
    await connectDB();
    await ensureElectronicsCategories();

    const productSkus = productCategoryData.map((item) => item.sku);
    const categorySlugs = [
      ...new Set(productCategoryData.flatMap((item) => item.categorySlugs)),
    ];
    const [products, categories] = await Promise.all([
      Product.find({ sku: { $in: productSkus } }),
      Category.find({ slug: { $in: categorySlugs } }),
    ]);
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    const categoriesBySlug = new Map(
      categories.map((category) => [category.slug, category])
    );
    const mappings = [];

    productCategoryData.forEach(({ sku, categorySlugs: mappedCategorySlugs }) => {
      const product = productsBySku.get(sku);

      if (!product) {
        console.warn(`Warning: Product not found for SKU: ${sku}`);
        return;
      }

      mappedCategorySlugs.forEach((slug) => {
        const category = categoriesBySlug.get(slug);

        if (!category) {
          console.warn(
            `Warning: Category not found for product SKU ${sku}: ${slug}`
          );
          return;
        }

        mappings.push({
          productId: product._id,
          categoryId: category._id,
        });
      });
    });

    if (!mappings.length) {
      console.log('No product-category mappings were created');
      return;
    }

    await ProductCategory.deleteMany({
      $or: mappings.map((mapping) => ({
        productId: mapping.productId,
        categoryId: mapping.categoryId,
      })),
    });

    await ProductCategory.insertMany(mappings);

    console.log(`${mappings.length} product-category mappings seeded successfully`);
  } catch (error) {
    console.error(`Product-category seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedProductCategories();

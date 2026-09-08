require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

const categoryData = [
  {
    name: 'Men',
    slug: 'men',
    children: [
      {
        name: 'Clothing',
        slug: 'men-clothing',
        children: [
          ['T-Shirts', 'men-clothing-t-shirts'],
          ['Shirts', 'men-clothing-shirts'],
          ['Jeans', 'men-clothing-jeans'],
        ],
      },
      {
        name: 'Shoes',
        slug: 'men-shoes',
        children: [
          ['Sneakers', 'men-shoes-sneakers'],
          ['Formal Shoes', 'men-shoes-formal-shoes'],
          ['Sandals', 'men-shoes-sandals'],
        ],
      },
      {
        name: 'Accessories',
        slug: 'men-accessories',
        children: [
          ['Watches', 'men-accessories-watches'],
          ['Belts', 'men-accessories-belts'],
          ['Wallets', 'men-accessories-wallets'],
        ],
      },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    children: [
      {
        name: 'Clothing',
        slug: 'women-clothing',
        children: [
          ['Dresses', 'women-clothing-dresses'],
          ['Tops', 'women-clothing-tops'],
          ['Jeans', 'women-clothing-jeans'],
        ],
      },
      {
        name: 'Shoes',
        slug: 'women-shoes',
        children: [
          ['Heels', 'women-shoes-heels'],
          ['Flats', 'women-shoes-flats'],
          ['Sneakers', 'women-shoes-sneakers'],
        ],
      },
      {
        name: 'Accessories',
        slug: 'women-accessories',
        children: [
          ['Handbags', 'women-accessories-handbags'],
          ['Watches', 'women-accessories-watches'],
          ['Jewellery', 'women-accessories-jewellery'],
        ],
      },
    ],
  },
  {
    name: 'Kids',
    slug: 'kids',
    children: [
      {
        name: 'Boys',
        slug: 'kids-boys',
        children: [
          ['T-Shirts', 'kids-boys-t-shirts'],
          ['Shirts', 'kids-boys-shirts'],
          ['Jeans', 'kids-boys-jeans'],
        ],
      },
      {
        name: 'Girls',
        slug: 'kids-girls',
        children: [
          ['Dresses', 'kids-girls-dresses'],
          ['Tops', 'kids-girls-tops'],
          ['Skirts', 'kids-girls-skirts'],
        ],
      },
    ],
  },
];

const createCategory = (name, slug, parentId, level) =>
  Category.create({
    name,
    slug,
    parentId,
    level,
    status: 'active',
  });

const seedCategories = async () => {
  try {
    await connectDB();
    await Category.deleteMany({});

    for (const topLevel of categoryData) {
      const levelOne = await createCategory(topLevel.name, topLevel.slug, null, 1);

      for (const secondLevel of topLevel.children) {
        const levelTwo = await createCategory(
          secondLevel.name,
          secondLevel.slug,
          levelOne._id,
          2
        );

        for (const [name, slug] of secondLevel.children) {
          await createCategory(name, slug, levelTwo._id, 3);
        }
      }
    }

    console.log('Category seed data inserted successfully');
  } catch (error) {
    console.error(`Category seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedCategories();

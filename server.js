require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const menuRoutes = require('./routes/menuRoutes');
const productRoutes = require('./routes/productRoutes');
const attributeRoutes = require('./routes/attributeRoutes');
const productVariantRoutes = require('./routes/productVariantRoutes');

const app = express();

app.use(express.json());
app.use('/api/', menuRoutes);
app.use('/api/', productRoutes);
app.use('/api/', attributeRoutes);
app.use('/api/', productVariantRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

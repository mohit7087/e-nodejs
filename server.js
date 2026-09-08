require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const menuRoutes = require('./routes/menuRoutes');
const productRoutes = require('./routes/productRoutes');
const attributeRoutes = require('./routes/attributeRoutes');

const app = express();

app.use(express.json());
app.use('/api/', menuRoutes);
app.use('/api/', productRoutes);
app.use('/api/', attributeRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

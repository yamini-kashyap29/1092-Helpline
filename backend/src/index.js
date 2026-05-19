const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');

const { sequelize, connectDB } = require('../Database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.json({ message: '1092 Helpline Node.js Backend is running' });
});

connectDB({ sync: true })
  .then(() => {
    app.listen(config.PORT, () => {
      console.log(`Backend server running on port ${config.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database error:', err);
  });
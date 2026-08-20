const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const userRoutes = require('./user/userRoutes');
const promotionRoutes = require('./promotion/promotionRoutes');
const applicationRoutes = require('./application/applicationRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', userRoutes);
app.use('/api/promotions', authenticate, promotionRoutes);
app.use('/api/promotions/:promotionId/applications', authenticate, applicationRoutes);

app.use(errorHandler);

module.exports = app;

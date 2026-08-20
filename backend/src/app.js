const path = require('node:path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
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

if (process.env.NODE_ENV !== 'production') {
  const swaggerDocument = require(path.join(__dirname, '../../docs/swagger.json'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use('/api/auth', userRoutes);
app.use('/api/promotions', authenticate, promotionRoutes);
app.use('/api/promotions/:promotionId/applications', authenticate, applicationRoutes);

app.use(errorHandler);

module.exports = app;

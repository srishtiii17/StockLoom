const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const suppliersRouter = require('./routes/suppliers');
const materialsRouter = require('./routes/materials');
const productsRouter = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const batchesRouter = require('./routes/batches');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const dispatchesRouter = require('./routes/dispatches');
const stockLogsRouter = require('./routes/stockLogs');
const reportsRouter = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/suppliers', suppliersRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dispatches', dispatchesRouter);
app.use('/api/stock-logs', stockLogsRouter);
app.use('/api/reports', reportsRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

module.exports = { app };

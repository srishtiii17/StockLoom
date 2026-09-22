// Backend API tests. Runs the real Express app against the real dev
// PostgreSQL database (via backend/.env) -- no mocks, per AGENT_RULES.md
// "no fake/mock database responses to hide backend failures". These tests
// do create some rows (a test product, orders, a batch); rerun
// `database/schema.sql` + `seed.sql` afterward if a pristine demo dataset
// is needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../../src/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /health returns ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('GET /api/products returns seeded products', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length >= 3);
});

test('GET /api/suppliers, /api/materials, /api/customers return arrays', async () => {
  for (const path of ['/api/suppliers', '/api/materials', '/api/customers']) {
    const res = await fetch(`${baseUrl}${path}`);
    assert.equal(res.status, 200, `${path} should return 200`);
    const body = await res.json();
    assert.ok(Array.isArray(body.data), `${path} should return an array under data`);
  }
});

test('POST /api/products creates a product', async () => {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'API Test Product', unit_price: 5.5, category: 'Test', current_stock: 10 }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.data.name, 'API Test Product');
  assert.equal(Number(body.data.current_stock), 10);
});

test('POST /api/products with missing fields returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Test' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/orders succeeds and deducts Product.current_stock', async () => {
  const productsRes = await fetch(`${baseUrl}/api/products`);
  const { data: products } = await productsRes.json();
  const product = products.find((p) => p.name === 'Widget A - Standard');
  const before = Number(product.current_stock);

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: 1,
      items: [{ product_id: product.product_id, quantity: 3, unit_price: product.unit_price }],
    }),
  });
  assert.equal(res.status, 201);

  const afterRes = await fetch(`${baseUrl}/api/products`);
  const { data: afterProducts } = await afterRes.json();
  const afterProduct = afterProducts.find((p) => p.product_id === product.product_id);
  assert.equal(Number(afterProduct.current_stock), before - 3);
});

test('POST /api/orders with insufficient stock returns structured 409 and rolls back', async () => {
  const productsRes = await fetch(`${baseUrl}/api/products`);
  const { data: products } = await productsRes.json();
  const product = products.find((p) => p.name === 'Widget A - Standard');
  const before = Number(product.current_stock);

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: 1,
      items: [{ product_id: product.product_id, quantity: 999999, unit_price: product.unit_price }],
    }),
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error.code, 'INSUFFICIENT_STOCK');

  const afterRes = await fetch(`${baseUrl}/api/products`);
  const { data: afterProducts } = await afterRes.json();
  const afterProduct = afterProducts.find((p) => p.product_id === product.product_id);
  assert.equal(Number(afterProduct.current_stock), before, 'stock must be unchanged after a rejected order');
});

test('GET /api/reports/low-stock and /api/reports/material-consumption return arrays', async () => {
  const lowStockRes = await fetch(`${baseUrl}/api/reports/low-stock`);
  assert.equal(lowStockRes.status, 200);
  assert.ok(Array.isArray((await lowStockRes.json()).data));

  const consumptionRes = await fetch(`${baseUrl}/api/reports/material-consumption`);
  assert.equal(consumptionRes.status, 200);
  const consumptionBody = await consumptionRes.json();
  assert.ok(Array.isArray(consumptionBody.data));
  assert.ok(consumptionBody.data.length >= 4, 'seeded batches 1 and 2 should produce 4 consumption rows');
});

test('POST /api/batches then /complete increments Product.current_stock', async () => {
  const productsRes = await fetch(`${baseUrl}/api/products`);
  const { data: products } = await productsRes.json();
  const product = products.find((p) => p.name === 'Bracket C - Universal');
  const before = Number(product.current_stock);

  const materialsRes = await fetch(`${baseUrl}/api/materials`);
  const { data: materials } = await materialsRes.json();
  const material = materials[0];

  const createRes = await fetch(`${baseUrl}/api/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: product.product_id,
      materials: [{ material_id: material.material_id, quantity_used: 5 }],
    }),
  });
  assert.equal(createRes.status, 201);
  const { data: batch } = await createRes.json();
  assert.equal(batch.status, 'PLANNED');

  const completeRes = await fetch(`${baseUrl}/api/batches/${batch.batch_id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity_produced: 20 }),
  });
  assert.equal(completeRes.status, 200);
  const { data: completed } = await completeRes.json();
  assert.equal(completed.status, 'COMPLETED');

  const afterRes = await fetch(`${baseUrl}/api/products`);
  const { data: afterProducts } = await afterRes.json();
  const afterProduct = afterProducts.find((p) => p.product_id === product.product_id);
  assert.equal(Number(afterProduct.current_stock), before + 20);

  const secondCompleteRes = await fetch(`${baseUrl}/api/batches/${batch.batch_id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity_produced: 20 }),
  });
  assert.equal(secondCompleteRes.status, 409, 'double completion must be rejected');
  const secondBody = await secondCompleteRes.json();
  assert.equal(secondBody.error.code, 'BATCH_ALREADY_COMPLETED');
});

test('GET /api/dispatches returns an array, POST creates one and updates order status', async () => {
  const ordersRes = await fetch(`${baseUrl}/api/orders`);
  const { data: orders } = await ordersRes.json();
  const pendingOrder = orders.find((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  assert.ok(pendingOrder, 'expected at least one dispatchable order from earlier tests');

  const dispatchRes = await fetch(`${baseUrl}/api/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: pendingOrder.order_id, carrier: 'TestCarrier', tracking_ref: 'TT-1' }),
  });
  assert.equal(dispatchRes.status, 201);

  const orderRes = await fetch(`${baseUrl}/api/orders/${pendingOrder.order_id}`);
  const orderBody = await orderRes.json();
  assert.equal(orderBody.data.status, 'DISPATCHED');
});

test('GET /api/stock-logs returns an array reflecting prior test mutations', async () => {
  const res = await fetch(`${baseUrl}/api/stock-logs`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length > 0);
});

test('unknown route returns structured 404', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, 'NOT_FOUND');
});

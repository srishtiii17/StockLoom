# STOCKLOOM — ARCHITECTURE

## 1. System Overview

StockLoom follows a simple three-layer architecture:

```text
┌───────────────────────────────┐
│          React UI             │
│       + Tailwind CSS          │
└───────────────┬───────────────┘
                │ HTTP / JSON
                ▼
┌───────────────────────────────┐
│       Node.js + Express       │
│                               │
│ Routes → Services → DB Layer  │
└───────────────┬───────────────┘
                │ Parameterized SQL
                ▼
┌───────────────────────────────┐
│          PostgreSQL           │
│                               │
│ Tables / Constraints          │
│ Transactions / Locks          │
│ Triggers / Functions          │
│ Views / Indexes               │
└───────────────────────────────┘
```

The PostgreSQL database is the authoritative source for inventory integrity.

---

## 2. Database Layer

Recommended organization:

```text
database/
├── schema.sql
├── seed.sql
├── functions.sql
├── triggers.sql
├── views.sql
├── indexes.sql
└── benchmarks/
```

### schema.sql
Core tables, keys and constraints.

### seed.sql
Development/test data.

### functions.sql
Stored functions/procedures.

### triggers.sql
Database triggers.

### views.sql
Reporting views.

### indexes.sql
Performance indexes.

### benchmarks/
Large-data generation and EXPLAIN ANALYZE experiments.

---

## 3. Backend Layer

Recommended structure:

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── db/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── utils/
└── tests/
```

The exact structure may change if there is a clear reason, but avoid unnecessary abstraction.

---

## 4. Transaction Boundary

Order creation/fulfillment must be treated as an atomic operation.

Per ADR-006, the row locked and updated during order fulfillment is
**`Product.current_stock`** (finished-goods inventory), not
`RawMaterial.current_stock`. Raw-material stock is only touched during
production (`ProductionBatch` completion, via `BatchMaterialUsage`).

Conceptually:

```text
BEGIN
  │
  ├─ Validate request
  │
  ├─ Lock Product stock row
  │      SELECT ... FOR UPDATE  (Product.current_stock)
  │
  ├─ Check available quantity
  │
  ├─ Create order/order items
  │
  ├─ Update Product.current_stock
  │
  ├─ Record stock change (StockLog, product_id set)
  │
  └─ COMMIT
```

Failure:

```text
BEGIN
  ↓
operation fails
  ↓
ROLLBACK
  ↓
no partial order/inventory state
```

The exact SQL should be determined from the final schema.

---

## 5. Concurrency Model

The **`Product.current_stock`** row is the critical shared resource for order
placement (ADR-006). The **`RawMaterial.current_stock`** row plays the same
role for production-batch completion, but that is a separate operation with
its own transaction, not the order-placement path.

For a stock-consuming operation:

```text
Transaction A
      │
      ├── SELECT ... FOR UPDATE
      │
      ├── check stock
      │
      ├── update stock
      │
      └── COMMIT
                 │
                 ▼
          Transaction B
          waits for lock
                 │
                 ▼
          reads updated stock
                 │
          accepts/rejects safely
```

A concurrency test must use real concurrent PostgreSQL connections.

---

## 6. Frontend Architecture

Recommended structure:

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── App.*
└── tests/
```

The frontend should not be responsible for enforcing database-level inventory consistency.

It should:

- collect user input
- display current data
- call APIs
- show loading states
- show validation/server errors
- display successful results

---

## 7. API Contract

Suggested resources:

```text
/api/suppliers
/api/materials
/api/products
/api/batches
/api/customers
/api/orders
/api/dispatches
/api/reports
/api/stock-logs
```

Before implementation, inspect the existing code and establish exact request/response shapes.

Document finalized contracts rather than relying on implicit assumptions.

---

## 8. Reporting

Reporting should use database views/functions where they demonstrate useful DBMS functionality.

Example:

```text
v_batch_material_consumption
```

Potential output:

```text
batch_id
product
material
quantity_used
unit
batch_status
```

---

## 9. Indexing

Indexes should be justified by actual query patterns.

For every benchmark:

1. establish baseline
2. run EXPLAIN ANALYZE
3. create index
4. run identical query
5. compare actual output
6. document result

Never change the query between baseline and indexed runs unless the purpose of the experiment requires it.

---

## 10. Agent Ownership

### Claude Code
Primary owner of:

- database
- SQL
- backend
- transaction logic
- concurrency
- performance tests
- DBMS documentation

### Antigravity / browser agent
Optional owner of:

- frontend
- UI integration
- browser workflows
- visual QA
- end-to-end verification

### Human project owner
Final authority over:

- architecture decisions
- requirement interpretation
- merging changes
- grading strategy
- final acceptance

---

## 11. Change Control

Before a significant architecture change:

```text
Problem
↓
Options
↓
Chosen approach
↓
Reason
↓
Impact
↓
Implementation
↓
Testing
```

Record meaningful decisions in:

`ARCHITECTURE_DECISIONS.md`

---

## 12. Definition of Done

A feature is done only when:

```text
CODE
+
TEST
+
VERIFICATION
+
DOCUMENTATION
+
GIT COMMIT
```

All five are required for major features.

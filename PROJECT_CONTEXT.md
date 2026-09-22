# STOCKLOOM — PROJECT CONTEXT

## 1. Project Overview

StockLoom is a Manufacturing Inventory & Order Management System developed as a university DBMS project.

The project is not intended to be a simple CRUD application. The database must visibly demonstrate core DBMS concepts such as:

- normalization / 3NF
- primary and foreign keys
- constraints
- many-to-many relationships
- ACID transactions
- rollback
- row-level locking
- `SELECT ... FOR UPDATE`
- triggers
- stored procedures/functions
- audit logging
- database views
- indexing
- `EXPLAIN ANALYZE`
- performance benchmarking
- concurrent transaction testing
- prevention of inventory overselling

The main business lifecycle is:

Supplier
→ Raw Material
→ Production Batch
→ Product
→ Customer Order
→ Dispatch

Inventory consistency is a central requirement.

---

## 2. Technology Stack

### Frontend
- React
- Tailwind CSS

### Backend
- Node.js
- Express

### Database
- PostgreSQL

### Database access
Use parameterized raw SQL for important DBMS demonstrations.

Do not introduce an ORM for core database logic unless explicitly approved.

---

## 3. Core Entities

The initial logical model contains the following entities:

### Supplier
- supplier_id
- name
- contact_info
- lead_time_days

### RawMaterial
- material_id
- name
- unit
- reorder_threshold
- current_stock

### SupplierMaterial
Junction table representing the supplier ↔ raw-material relationship.

Suggested attributes:
- supplier_id
- material_id
- unit_price

### Product
- product_id
- name
- unit_price
- category

### ProductionBatch
- batch_id
- product_id
- start_date
- end_date
- quantity_produced
- status

### BatchMaterialUsage
Junction table representing material consumption by a production batch.

Suggested attributes:
- batch_id
- material_id
- quantity_used

### Customer
- customer_id
- name
- contact_info
- address

### CustomerOrder
- order_id
- customer_id
- order_date
- status

### OrderItem
Junction/detail table representing products in a customer order.

Suggested attributes:
- order_id
- product_id
- quantity
- unit_price

### Dispatch
- dispatch_id
- order_id
- dispatch_date
- carrier
- tracking_ref

### StockLog
Audit trail for inventory changes.

Suggested attributes:
- log_id
- material_id
- change_qty
- change_type
- timestamp
- triggered_by

Before finalizing the schema, verify keys, cardinalities, constraints, and normalization rather than blindly copying this list.

---

## 4. Critical Business Rule — Inventory Safety

Inventory must never become negative.

A concurrent order scenario must be handled safely.

Example:

Initial stock = 100

Transaction A requests 70.
Transaction B requests 60.

The system must not allow both transactions to consume 130 units.

The database transaction should:

1. begin a transaction
2. lock the relevant inventory row(s)
3. check current stock
4. reject insufficient stock
5. update inventory
6. create the necessary order records
7. create the relevant stock/audit records
8. commit on success
9. roll back on failure

Use PostgreSQL row-level locking such as:

`SELECT ... FOR UPDATE`

The database transaction, not a frontend check, must be the source of truth.

---

## 5. Required Database Features

### Normalization
The schema should be normalized to 3NF where appropriate.

Document:
- entities
- functional dependencies
- candidate keys
- decomposition decisions
- why junction tables are necessary

### Constraints
Use appropriate:
- PRIMARY KEY
- FOREIGN KEY
- NOT NULL
- UNIQUE
- CHECK
- sensible defaults

### Transactions
Demonstrate:
- COMMIT
- ROLLBACK
- atomic order/inventory operations
- row locking

### Triggers
Use triggers where they provide meaningful database-level guarantees.

At minimum, implement an auditable inventory-change mechanism such as StockLog generation.

Also support low-stock detection in an explainable way.

### Stored Procedure / Function
Implement a PostgreSQL function/procedure that identifies materials whose current stock is at or below their reorder threshold.

### View
Create a reporting view for production-batch material consumption using:
- ProductionBatch
- BatchMaterialUsage
- RawMaterial
- Product

### Indexing
Demonstrate appropriate indexing and query-plan analysis.

At minimum, benchmark a date-range order query with a B-tree index.

If comparing a hash index, verify the actual PostgreSQL behavior and document the result instead of inventing a conclusion.

Use:

`EXPLAIN ANALYZE`

Never fabricate performance numbers.

---

## 6. Benchmark Data

Maintain two levels of data:

### Development data
Small enough for rapid local development and manual testing.

### Benchmark data
Large enough to make indexing experiments meaningful.

The project specification targets approximately 50,000 order rows for benchmarking.

Benchmark results must come from actual PostgreSQL execution.

---

## 7. Backend Expectations

Create clean REST APIs around the actual database.

Suggested resource groups:

- `/api/suppliers`
- `/api/materials`
- `/api/products`
- `/api/batches`
- `/api/customers`
- `/api/orders`
- `/api/dispatches`
- `/api/reports`
- `/api/stock-logs`

Use:
- parameterized SQL
- input validation
- meaningful HTTP status codes
- safe error handling
- environment variables for credentials
- transaction boundaries at the correct service/database layer

Do not duplicate database integrity rules unnecessarily in the frontend.

---

## 8. Frontend Expectations

Create a professional but explainable university-project interface.

Suggested pages:

1. Dashboard
2. Inventory
3. Suppliers
4. Products
5. Production Batches
6. Customers
7. Orders
8. Dispatch
9. Reports
10. Stock Audit / Logs

The UI should consume real backend APIs.

Do not leave mock data in place once the corresponding API exists.

---

## 9. Testing Expectations

Every important DBMS feature must have a reproducible demonstration.

Minimum testing areas:

- schema creation
- constraint violations
- seed data integrity
- successful order
- insufficient stock
- rollback
- trigger-generated stock log
- low-stock detection
- stored function
- reporting view
- index benchmark
- concurrent order simulation
- API validation
- end-to-end browser workflow

A feature is not complete merely because code was written.

It is complete when it has been executed and verified.

---

## 10. Documentation Expectations

Maintain:

- ER diagram
- schema explanation
- normalization explanation
- transaction explanation
- concurrency explanation
- trigger explanation
- function/procedure explanation
- view explanation
- indexing/benchmark report
- testing evidence
- setup instructions
- viva notes

The documentation should explain why the implementation exists, not merely describe filenames.

---

## 11. Development Philosophy

Priorities:

1. Correctness
2. Database integrity
3. Reproducible tests
4. Explainability
5. Maintainability
6. UI polish

Do not sacrifice database correctness for a visually impressive frontend.

Do not add unnecessary enterprise architecture.

The final system should be sophisticated enough to demonstrate DBMS concepts but simple enough for the student team to explain during a viva.

---

## 12. Completion Criteria

The project is complete only when:

- PostgreSQL database works
- schema is validated
- normalization is documented
- seed data exists
- backend works
- frontend works
- inventory workflow works
- production workflow works
- order workflow works
- dispatch workflow works
- transaction behavior is verified
- rollback is verified
- row locking is verified
- overselling is prevented
- stock audit logging works
- low-stock detection works
- stored function/procedure works
- reporting view works
- indexes exist
- EXPLAIN ANALYZE evidence exists
- benchmark data exists
- concurrency test exists
- major API workflows are tested
- end-to-end workflow is tested
- README/setup documentation exists
- ER diagram exists
- viva documentation exists

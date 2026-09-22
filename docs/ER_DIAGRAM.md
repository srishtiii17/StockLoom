# StockLoom — ER Diagram

Derived directly from `database/schema.sql`. Renders as a diagram on
GitHub/GitLab (Mermaid) or any Mermaid-compatible viewer.

```mermaid
erDiagram
    SUPPLIER ||--o{ SUPPLIER_MATERIAL : "supplies"
    RAW_MATERIAL ||--o{ SUPPLIER_MATERIAL : "supplied by"
    RAW_MATERIAL ||--o{ BATCH_MATERIAL_USAGE : "consumed as"
    PRODUCTION_BATCH ||--o{ BATCH_MATERIAL_USAGE : "consumes"
    PRODUCT ||--o{ PRODUCTION_BATCH : "produced by"
    PRODUCT ||--o{ ORDER_ITEM : "ordered as"
    CUSTOMER_ORDER ||--o{ ORDER_ITEM : "contains"
    CUSTOMER ||--o{ CUSTOMER_ORDER : "places"
    CUSTOMER_ORDER ||--o| DISPATCH : "fulfilled by"
    RAW_MATERIAL ||--o{ STOCK_LOG : "logged (material side)"
    PRODUCT ||--o{ STOCK_LOG : "logged (product side)"
    RAW_MATERIAL ||--o{ LOW_STOCK_ALERT : "alerts"

    SUPPLIER {
        int supplier_id PK
        varchar name
        varchar contact_info
        int lead_time_days
    }
    RAW_MATERIAL {
        int material_id PK
        varchar name
        varchar unit
        numeric reorder_threshold
        numeric current_stock
    }
    SUPPLIER_MATERIAL {
        int supplier_id FK
        int material_id FK
        numeric unit_price
    }
    PRODUCT {
        int product_id PK
        varchar name
        numeric unit_price
        varchar category
        numeric current_stock "ADR-006: finished goods, not in original doc"
    }
    PRODUCTION_BATCH {
        int batch_id PK
        int product_id FK
        date start_date
        date end_date
        numeric quantity_produced
        varchar status "PLANNED/IN_PROGRESS/COMPLETED/CANCELLED"
    }
    BATCH_MATERIAL_USAGE {
        int batch_id FK
        int material_id FK
        numeric quantity_used
    }
    CUSTOMER {
        int customer_id PK
        varchar name
        varchar contact_info
        varchar address
    }
    CUSTOMER_ORDER {
        int order_id PK
        int customer_id FK
        timestamptz order_date
        varchar status "PENDING/CONFIRMED/FULFILLED/DISPATCHED/CANCELLED"
    }
    ORDER_ITEM {
        int order_id FK
        int product_id FK
        numeric quantity
        numeric unit_price
    }
    DISPATCH {
        int dispatch_id PK
        int order_id FK "UNIQUE (1:1)"
        timestamptz dispatch_date
        varchar carrier
        varchar tracking_ref
    }
    STOCK_LOG {
        int log_id PK
        int material_id FK "nullable, ADR-007"
        int product_id FK "nullable, ADR-007"
        numeric change_qty
        varchar change_type
        timestamptz timestamp
        varchar triggered_by
    }
    LOW_STOCK_ALERT {
        int alert_id PK
        int material_id FK
        numeric current_stock_at_alert
        numeric reorder_threshold_at_alert
        timestamptz triggered_at
    }
```

## Notes for the viva

- `SUPPLIER_MATERIAL` and `BATCH_MATERIAL_USAGE` are the two junction
  tables resolving the documented M:N relationships (Supplier↔RawMaterial,
  ProductionBatch↔RawMaterial). `ORDER_ITEM` resolves CustomerOrder↔Product.
- `STOCK_LOG` has **two** optional FKs (`material_id`, `product_id`) with a
  `CHECK` enforcing exactly one is set per row — see
  `ARCHITECTURE_DECISIONS.md` ADR-007 for why, and
  `docs/ER_MODEL_PROPOSAL.md` for the full reconciliation against the
  original project documentation, which only documented a `material_id`
  column.
- `PRODUCT.current_stock` and `LOW_STOCK_ALERT` were **not** in the original
  project documentation's entity table — both are explicit, documented
  clarifications (ADR-006, ADR-008) of a genuine gap in that documentation,
  not literal transcriptions of it. See `docs/ER_MODEL_PROPOSAL.md`.

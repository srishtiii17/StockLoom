# STOCKLOOM — AGENT RULES

These rules apply to Claude Code and any other coding agent working on the repository.

---

## 1. Source of Truth

Before making substantial changes, read:

1. `PROJECT_CONTEXT.md`
2. `AGENT_RULES.md`
3. `ARCHITECTURE.md`
4. `docs/HANDOFF.md` if it exists

The repository is the source of truth for implementation state.

Do not rely on memory of earlier conversations.

---

## 2. Work Incrementally

Never attempt to build the entire project in one uncontrolled operation.

For every major phase:

1. inspect
2. plan
3. implement
4. test
5. verify
6. document
7. commit

Do not silently continue into unrelated phases.

---

## 3. Never Fabricate Evidence

Never claim:

- a test passed unless it was actually run
- a benchmark improved unless it was actually measured
- concurrency is safe unless it was actually tested
- an API works unless it was actually exercised
- a browser workflow works unless it was actually verified

Never invent benchmark numbers, screenshots, logs, SQL output, or test results.

---

## 4. Database Integrity Comes First

Do not move important database integrity rules into React merely because frontend implementation is easier.

Database constraints and transactions are authoritative.

Do not bypass:

- foreign keys
- CHECK constraints
- transaction boundaries
- row locking
- database triggers
- database functions

---

## 5. Raw SQL

Use parameterized SQL for important DBMS demonstrations.

Do not introduce an ORM that hides:

- transactions
- locking
- triggers
- views
- index behavior
- important joins

If an abstraction is proposed, explain why before adding it.

---

## 6. Schema Changes

Do not casually modify the database schema.

Before a schema change:

1. identify the reason
2. inspect all dependent queries/API routes/tests
3. explain the impact
4. update schema/migration files
5. update seed data if necessary
6. run regression tests
7. update architecture documentation

---

## 7. No Destructive Shortcuts

Never:

- delete working tests just to make CI pass
- weaken constraints to make inserts succeed
- remove foreign keys to solve an application bug
- disable transactions to simplify debugging
- use fake/mock database responses to hide backend failures

Fix the root cause.

---

## 8. Ownership Boundaries

### Database/backend focus
Claude Code should primarily own:

- PostgreSQL schema
- SQL
- constraints
- transactions
- locking
- triggers
- functions/procedures
- views
- indexes
- benchmark scripts
- backend services
- API correctness

### Frontend/integration focus
Frontend work should primarily cover:

- React
- Tailwind
- pages
- components
- API integration
- browser workflows
- UI states

Shared files require extra care.

Never overwrite another agent's work without inspecting the current Git state.

---

## 9. API Contract Discipline

Once an API contract is established, do not casually change:

- endpoint
- HTTP method
- request body
- response shape
- status codes

If a change is necessary:

1. document it
2. update backend
3. update frontend consumers
4. update tests
5. update HANDOFF.md

---

## 10. Testing Rule

Each major DBMS concept should have a reproducible test.

Examples:

### Transaction
Demonstrate COMMIT and ROLLBACK.

### Locking
Demonstrate concurrent transactions using actual PostgreSQL connections.

### Trigger
Demonstrate the expected audit/logging effect.

### Function
Execute the function against known test data.

### Index
Run the query with EXPLAIN ANALYZE before and after the index.

---

## 11. Concurrency Rule

Never describe an application-level stock check as sufficient concurrency protection.

The critical inventory operation must be protected at the database transaction level.

For concurrent order testing, use actual concurrent database connections.

---

## 12. Git Discipline

Before beginning work:

`git status`

After completing work:

1. run tests
2. inspect the diff
3. remove accidental changes
4. update documentation
5. commit with a meaningful message

Example:

`feat(db): add transaction-safe order fulfillment`

Do not create enormous commits containing unrelated changes.

---

## 13. Handoff Discipline

When finishing a meaningful feature, update:

`docs/HANDOFF.md`

Include:

- what changed
- files changed
- architectural decisions
- tests executed
- actual results
- known issues
- next recommended step

---

## 14. Ask Before Guessing

If a requirement is ambiguous and guessing could affect:

- schema
- transaction behavior
- API contract
- data model
- security
- grading requirements

stop and ask the project owner.

Do not silently invent architecture.

---

## 15. Final Review Rule

Before calling the project complete, perform a requirement-by-requirement audit against `PROJECT_CONTEXT.md`.

For each requirement report:

- PASS
- FAIL
- PARTIAL
- NOT TESTED

Include evidence.


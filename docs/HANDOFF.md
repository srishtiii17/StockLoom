# STOCKLOOM — AGENT HANDOFF

Use this file to communicate completed work between Claude Code, optional Antigravity agents, and the human project owner.

---

## Current Phase

`SETUP`

## Current Owner

`Claude Code`

## Last Updated

`YYYY-MM-DD`

---

## Completed Work

- [ ] Repository structure
- [ ] PostgreSQL schema
- [ ] Seed data
- [ ] Functions/procedures
- [ ] Triggers
- [ ] Views
- [ ] Indexes
- [ ] Transaction-safe order flow
- [ ] Concurrency tests
- [ ] Backend APIs
- [ ] Frontend
- [ ] End-to-end testing
- [ ] Benchmarking
- [ ] Documentation
- [ ] Viva preparation

---

## Latest Change

### Feature

`Example: PostgreSQL schema`

### Files Changed

```text
database/schema.sql
database/seed.sql
```

### What Was Implemented

Describe the actual implementation.

### Tests Executed

```text
Example:
npm test
psql ... -f database/schema.sql
```

### Actual Results

Record real results only.

### Known Issues

- None

### Architectural Decisions

Record any decisions that another agent needs to know.

### Next Recommended Task

Describe the next task in one or two sentences.

### Git Commit

```text
commit-hash
```

---

## Handoff Rules

The receiving agent must:

1. Read PROJECT_CONTEXT.md
2. Read AGENT_RULES.md
3. Read ARCHITECTURE.md
4. Read this file
5. Inspect Git status
6. Inspect the relevant code
7. Confirm assumptions before modifying shared architecture

Never assume that a feature is complete merely because this file says so. Verify important behavior locally.

# Backend Tests

Tests run against an in-memory MongoDB (`mongodb-memory-server`) — no external DB needed.

## Run

```bash
npm test                # all suites
npm test -- tests/unit  # unit only
npm test -- --coverage  # with coverage
```

## Layout

```
tests/
├── auth.test.js              # integration: register + login happy path
├── auth.edge.test.js         # integration: validation, 401, 409, /health
├── contacts.test.js          # integration: create/list + dup phone
├── contacts.e2e.test.js      # e2e: full CRUD + cross-tenant isolation
└── unit/
    ├── token.service.test.js     # JWT sign/verify, tampering, expiry
    ├── auth.service.test.js      # bcrypt hashing, dup email, login flow
    ├── contact.service.test.js   # phone normalization, owner scoping, unique index
    ├── auth.middleware.test.js   # Bearer scheme, valid/invalid token paths
    ├── error.middleware.test.js  # 500 generic body, no internal leak
    └── validation.test.js        # Joi schemas (register/login/contact)
```

## Test types covered

| Type           | Suite(s)                                                    | What it verifies                                       |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Unit (pure)    | `validation.test.js`, `token.service.test.js`               | Pure functions, schema rules, JWT crypto               |
| Unit (DB)      | `auth.service.test.js`, `contact.service.test.js`           | Service-layer logic against in-memory Mongo            |
| Unit (HTTP)    | `auth.middleware.test.js`, `error.middleware.test.js`       | Express middleware with mocked req/res/next            |
| Integration    | `auth.test.js`, `auth.edge.test.js`, `contacts.test.js`     | Routes end-to-end through `supertest` + real handlers  |
| E2E + security | `contacts.e2e.test.js`                                      | Full lifecycle + cross-tenant isolation                |

## Conventions

- ESM mode → `import { jest } from '@jest/globals'` whenever you need `jest.fn()`.
- Each integration suite calls `connect()` / `disconnect()` to manage the in-memory Mongo lifecycle.
- DB-touching unit suites clean collections in `afterEach`.
- Use `--runInBand` (already in `npm test`) — Mongoose model registration conflicts with parallel workers.

## Adding a test

1. Pure logic → `tests/unit/<file>.test.js`.
2. Route or middleware composition → `tests/<feature>.test.js` with `supertest`.
3. Cross-feature flow → `tests/<feature>.e2e.test.js`.

## CI signal

`npm test` exits non-zero on any failure → wired into the Jenkins backend pipeline at the `Test` stage.

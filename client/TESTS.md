# Frontend Tests

Stack: **Vitest 2 + React Testing Library + jsdom + user-event**.

## Run

```bash
npm test                # one-shot run (CI mode)
npm run test:watch      # watch mode
npm run test:coverage   # v8 coverage to ./coverage
```

## Layout

```
src/
├── test/setup.js                  # jest-dom + cleanup + localStorage reset
├── components/
│   ├── Navbar.test.jsx            # auth-aware navigation
│   └── ui/
│       ├── Button.test.jsx        # variants, size, click
│       ├── Input.test.jsx         # passthrough props, controlled value
│       └── Toast.test.jsx         # provider error path, push, auto-dismiss
├── context/AuthContext.test.jsx   # localStorage hydration, login, logout, guard
├── lib/api.test.js                # axios interceptors (token injection, 401 hook)
└── pages/
    ├── Login.test.jsx             # form submit, success token store, error surfacing
    └── Contacts.test.jsx          # CRUD, search filter, empty state, error
```

## Test types covered

| Type            | Suite(s)                                         | What it verifies                                         |
| --------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Unit (pure UI)  | `Button`, `Input`                                | Class wiring, prop passthrough, click handlers           |
| Unit (hook/ctx) | `Toast`, `AuthContext`                           | Provider state, error guards, lifecycle effects          |
| Unit (lib)      | `api.test.js`                                    | Axios request/response interceptors with mocked token fn |
| Integration     | `Navbar`, `Login`, `Contacts`                    | Pages composed with router + context, `api` mocked       |

## Conventions

- Mock `../lib/api.js` with `vi.mock(...)` instead of MSW — pages only need request/response shape.
- `@testing-library/jest-dom` matchers loaded in `src/test/setup.js`.
- `localStorage.clear()` runs after every test to keep auth state isolated.
- For text that appears in both the form *and* a toast, use `findAllByText` and assert length, not `findByText`.

## Adding a test

1. Co-locate `<Component>.test.jsx` next to the component.
2. Wrap with `<MemoryRouter>` if the tree uses `react-router` hooks (`useNavigate`, `Link`).
3. Wrap with `<AuthProvider>` and/or `<ToastProvider>` if it uses those hooks.
4. Mock `../lib/api.js` rather than calling a real backend.

## CI signal

`npm test` exits non-zero on any failure → wired into the Jenkins frontend pipeline `Test` stage.

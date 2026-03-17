# Architecture

## Overview

```
product-template/
├── client/                    # React (Vite) SPA
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       └── app/
│           ├── api/@system/   # API call wrappers
│           ├── components/    # UI components (shadcn/ui + custom)
│           │   ├── @system/   # Template components — do not modify
│           │   │   ├── ui/    # shadcn/ui primitives
│           │   │   ├── layout/
│           │   │   ├── Header/
│           │   │   └── ...
│           │   └── @custom/   # Your product components
│           ├── hooks/         # React hooks
│           ├── lib/@system/   # Shared utilities (cn, api client)
│           ├── pages/
│           │   ├── app/       # Authenticated pages
│           │   └── static/    # Marketing / public pages
│           ├── routes/        # React Router route definitions
│           ├── store/         # Global state (extend with Zustand/Jotai)
│           └── config/        # Product config / branding
└── server/                    # Node.js / Express API
    └── src/
        ├── app.js             # Express app factory
        ├── index.js           # Server entry point
        ├── api/               # Route handlers
        │   ├── @system/       # Core endpoints (auth, stripe, admin)
        │   └── @custom/       # Your product endpoints
        ├── config/@system/    # Server config
        ├── db/
        │   ├── repos/@system/ # Data access (pg-promise)
        │   ├── schemas/@system/ # SQL schema files
        │   └── migrations/    # Migration scripts
        ├── lib/@system/       # Integrations (PostgreSQL, Stripe, SES…)
        ├── routes/            # Express router registrations
        ├── scheduler/         # Cron tasks
        └── workers/           # Background workers
```

## Conventions

| Folder     | Meaning                                 |
|------------|-----------------------------------------|
| `@system`  | Core template — shared, stable code     |
| `@custom`  | Product-specific — your code goes here  |

## Auth Flow

1. `POST /api/sessions` — email/password login → sets `token` cookie (JWT, 7d)
2. `GET /api/sessions/me` — returns current user from cookie
3. `DELETE /api/sessions` — clears cookie

## Database

PostgreSQL via `pg-promise`. Schemas in `server/src/db/schemas/@system/`.
Run migrations: `cd server && npm run migrate`

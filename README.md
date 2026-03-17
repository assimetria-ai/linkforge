# product-template

Assimetria product template — React (Vite) + Node.js/Express + PostgreSQL + shadcn/ui

## Tech Stack

- **Client**: React 18 + Vite + shadcn/ui + lucide-react + Tailwind CSS
- **Server**: Node.js + Express + PostgreSQL (pg-promise)
- **Auth**: JWT sessions
- **Payments**: Stripe

## Structure

```
product-template/
├── client/          # React (Vite) frontend
├── server/          # Node.js/Express backend
├── docs/            # Architecture & runbooks
└── scripts/         # Dev & deploy utilities
```

## Quick Start

```bash
# 1. Install root dependencies (includes node-forge for key generation)
npm install

# 2. Bootstrap: copy .env.example → .env for server + client, then generate crypto keys
npm run bootstrap

# 3. Fill in any remaining vars in server/.env (DATABASE_URL, etc.)
# Then install app dependencies and start
cd server && npm install && npm run dev
# In a second terminal:
cd client && npm install && npm run dev
```

### Bootstrap options

```bash
npm run bootstrap          # safe — skips existing .env files and already-set keys
npm run bootstrap:force    # overwrites existing .env files and regenerates all keys
npm run generate-keys      # only regenerate keys (skips env file creation)
```

The bootstrap command:
1. Copies `server/.env.example` → `server/.env` (if absent)
2. Copies `client/.env.example` → `client/.env` (if absent)
3. Generates RSA 2048-bit keypair (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`) for RS256 JWT signing
4. Generates AES-256 encryption keys (`ENCRYPT_KEY` / `ENCRYPT_IV`) for data-at-rest encryption

## Conventions

- `@system` — core template code (do not modify)
- `@custom` — product-specific code (your additions go here)

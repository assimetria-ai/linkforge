# Railway Deployment

## Setup

1. Create a new Railway project and link the repo.
2. Add a **PostgreSQL** plugin — Railway auto-sets `DATABASE_URL`.
3. Set the required environment variables (see below).

## Required Environment Variables

| Variable              | Example / Notes                                  |
|-----------------------|--------------------------------------------------|
| `NODE_ENV`            | `production`                                     |
| `DATABASE_URL`        | Auto-provided by Railway PostgreSQL plugin       |
| `JWT_SECRET`          | Long random string (min 32 chars)                |
| `APP_URL`             | Your Railway frontend URL e.g. `https://app.up.railway.app` |
| `STRIPE_SECRET_KEY`   | `sk_live_...`                                    |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`                                    |
| `AWS_REGION`          | e.g. `eu-west-1`                                 |
| `AWS_ACCESS_KEY_ID`   | AWS credentials for SES                          |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for SES                        |
| `SES_FROM_EMAIL`      | Verified SES sender address                      |

## How the Build Works

```
npm run build:railway
  └── cd client && npm install && npm run build   # Vite → client/dist/
  └── cp -r client/dist → server/public/          # Copy built SPA into server
  └── cd server && npm install                     # Install server deps
```

The Express server detects `NODE_ENV=production` and serves `server/public/`
as a static site, falling back to `index.html` for client-side routing.

## Files

| File              | Purpose                                        |
|-------------------|------------------------------------------------|
| `railway.json`    | Build + deploy config (builder, health check)  |
| `Procfile`        | Fallback process declaration (`web: node ...`) |
| `package.json`    | Root scripts wiring build and start commands   |

## Running Migrations on Deploy

Add a Railway **pre-deploy command** (Project Settings → Deploy):

```
node server/src/db/migrations/@system/run.js
```

Or chain it in the build step:

```json
"buildCommand": "npm run build:railway && cd server && npm run migrate"
```

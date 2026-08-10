# SahaCRM

A lightweight customer relationship management (CRM) app. Track customers,
their contact details, status in your pipeline, and notes.

- **Client** — React + Vite + TypeScript single-page app (`client/`)
- **Server** — Express + TypeScript REST API backed by SQLite (`server/`)

The project is an npm workspaces monorepo, so a single `npm install` at the
root installs both packages. No external database server is required — data is
stored in a local SQLite file (`server/data/sahacrm.sqlite`), created and
seeded automatically on first run.

## Prerequisites

- Node.js >= 20 (developed on Node 22)
- npm >= 10

## Getting started

```bash
npm install        # install both workspaces
npm run dev        # start API (:4000) and client (:5173) together
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*` requests
to the backend on port 4000, so no extra configuration is needed.

## Useful scripts (run from the repo root)

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and client together (hot reload) |
| `npm run dev:server` | Run only the API on port 4000 |
| `npm run dev:client` | Run only the Vite client on port 5173 |
| `npm run build` | Type-check and build both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run the server API test suite |

## API overview

Base URL: `http://localhost:4000`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Service health check |
| GET | `/api/stats` | Aggregate customer counts and pipeline |
| GET | `/api/customers?q=` | List / search customers |
| GET | `/api/customers/:id` | Fetch a single customer |
| POST | `/api/customers` | Create a customer (`name` required) |
| PUT | `/api/customers/:id` | Update a customer |
| DELETE | `/api/customers/:id` | Delete a customer |

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Port the API server listens on |
| `SAHACRM_DB_PATH` | `server/data/sahacrm.sqlite` | SQLite database file path |

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment:
`npm ci` installs dependencies, and two terminals run the API and client dev
servers on ports 4000 and 5173.

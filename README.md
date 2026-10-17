# VBI Product Intelligence Portal

Internal portal for the VBI product team: product catalog, product requests, NPD pipeline,
cost management, trading performance, business cases, country coverage and SLAs.

- **Web app:** React (Vite, Tailwind)
- **API:** Node.js / Express
- **Database:** PostgreSQL 16 (via Prisma)

In production the API also serves the web app, so the whole portal is **one container plus a database**.

---

## What you should have received

1. This code (zip or repository).
2. `8-Oct-26-Product Taxonomy - VGE VBI.xlsx` is the product master list.
3. `FY28_NPD_VBI_Responses_v2.xlsx` is the FY28 NPD cycle.
4. The email address for the first admin login.

The two Excel files are **not** part of the code. They are uploaded through the portal's
Admin page after installation (step 4 below).

---

## Install on a server (Docker, recommended)

### 1. Prerequisites

- A Linux or Windows server with **Docker** and **Docker Compose v2** (`docker compose version`).
- About 2 GB RAM and 2 GB of free disk.
- Outbound internet access during the build (to download Node and npm packages).

> **Windows only:** before unzipping or cloning, run `git config --global core.longpaths true`
> and use a short folder path such as `C:\vbi-portal`. Some dependency paths are long.

### 2. Configure

From the project folder:

```bash
cp .env.production.example .env
```

Edit `.env`:

| Setting | What to put |
|---|---|
| `POSTGRES_PASSWORD` | Any strong password for the portal's own database |
| `INITIAL_ADMIN_EMAIL` | Email of the first person to sign in (always an email) |
| `INITIAL_ADMIN_PASSWORD` | Their first password (at least 8 characters) |
| `PORTAL_PORT` | Port on this server, default `3001` |
| `SEED_DEMO_DATA` | `true` shows the placeholder figures (see below). Leave as `true`. |
| `COOKIE_SECURE` | `true` if users open the portal over **https** (recommended). `false` only for plain `http://`; otherwise sign-in won't stick. |

Keep `.env` private and never commit it.

### 3. Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The first start takes a few minutes. On every start the portal automatically:

1. applies database updates (migrations);
2. on an empty database, loads a starter product list and sample data;
3. creates the first admin login from `.env` (only while no users exist);
4. starts on `http://<server>:<PORTAL_PORT>`.

Check it's running:

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3001/health
```

`/health` should return `{"status":"ok",...}`.

### 4. First sign-in and loading the data

1. Open the portal, click **Enter Portal** and sign in with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`.
2. Go to **Admin → Product Taxonomy** and upload `8-Oct-26-Product Taxonomy - VGE VBI.xlsx`:
   1. Click **Preview**. Expect 541 rows, 151 shown in catalog, and the starter products listed as removed.
   2. Click **Apply**.
3. Go to **Admin → NPD Import**:
   1. Choose **FY28** and upload `FY28_NPD_VBI_Responses_v2.xlsx`.
   2. Click **Preview**. Expect 50 NPD actions and 166 epics.
   3. Click **Apply import**.
4. Go to **Admin → Users** and add everyone who needs access. Everyone has the same access.
   People can only sign in after they've been added here.

New NPD actions are spread across Q1–Q4. Drag them between quarters on the **NPD Pipeline** page.

### About the placeholder figures

With `SEED_DEMO_DATA=true`, product lines show **clearly flagged placeholder figures** until real
data is entered:

- **Cost Management:** a placeholder cost breakdown per product line. Editable in each line's breakdown sheet.
- **Trading Performance:** per region, a €10M AOV target (50% won), €15M pipeline and €10M revenue target (50% achieved).
- **Product drawer:** coverage and distributors.

Real figures entered in the portal always replace the placeholders.
Setting `SEED_DEMO_DATA=false` and restarting hides the cost and trading placeholders.

---

## https

Run the portal behind the office reverse proxy or load balancer (IIS, nginx, F5, …) that
terminates https and forwards to `http://<server>:<PORTAL_PORT>`. Keep `COOKIE_SECURE=true`.
The portal already trusts the proxy's forwarded client IP.

Example nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20m;   # Excel uploads
}
```

---

## Day-to-day operations

### Backups

All data lives in the `postgres` service, in the Docker volume `portal-db`.

**Back up** (run daily, e.g. from cron or Task Scheduler):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U vbi vbi_products > vbi-backup-$(date +%F).sql
```

**Restore** into an empty database:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U vbi vbi_products < vbi-backup-YYYY-MM-DD.sql
```

### Updating to a new version

1. Take a backup first.
2. Replace the code with the new version, keeping your `.env`.
3. Run:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

Database updates are applied automatically on start. Data is kept.

### Logs, restart, stop

```bash
docker compose -f docker-compose.prod.yml logs -f portal
docker compose -f docker-compose.prod.yml restart portal
docker compose -f docker-compose.prod.yml down        # stops; data is kept
```

> `down -v` **deletes the database volume**. Only use it to wipe everything.

### Someone is locked out

- **Forgotten password:** another user can reset it under **Admin → Users**.
- **Too many failed sign-ins:** after 10 failures the account is blocked for 15 minutes.
- **Nobody can sign in:** connect to the database and remove all users. The next start
  recreates the first admin from `.env`:

  ```bash
  docker compose -f docker-compose.prod.yml exec postgres psql -U vbi vbi_products -c "DELETE FROM users;"
  docker compose -f docker-compose.prod.yml restart portal
  ```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `up` fails with "Set POSTGRES_PASSWORD in .env" | `.env` is missing or incomplete; see step 2 |
| Sign-in succeeds but you're sent straight back to the sign-in page | You're on plain `http://` with `COOKIE_SECURE=true`. Use https, or set `COOKIE_SECURE=false` and restart |
| Can't sign in with the admin email on first start | The first user is only created while there are no users. Check `logs portal` for "No portal users exist" |
| "Internal server error" on an Admin upload | Read `logs portal` for the real error. On a slow database, retry |
| Large Excel upload rejected by the proxy | Raise the proxy's request size limit (e.g. `client_max_body_size 20m`) |

---

## Install without Docker

You need **Node.js 20+** and **PostgreSQL 14+**.

1. Create a database and user. Then create `.env` in the project root from `.env.example` and set:
   - `DATABASE_URL=postgresql://user:pass@host:5432/vbi_products`
   - `NODE_ENV=production`
   - `PORT=3001`
   - `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`
   - `SEED_DEMO_DATA=true`
   - `COOKIE_SECURE`
2. Install and build:

   ```bash
   npm ci
   npx prisma generate --schema=server/prisma/schema.prisma
   npm run build
   ```

3. Start the portal. This applies migrations, seeds an empty database, then starts:

   ```bash
   node server/scripts/start.mjs
   ```

   Keep it running with a service manager (systemd, NSSM or PM2).
4. Continue with step 4 above.

---

## Local development

```bash
docker compose up -d     # database only, on localhost:5433
cp .env.example .env     # then fill in INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
npm install
node start-dev.js        # API on :3002, web app on http://localhost:5173
```

Database schema changes are Prisma migrations in `server/prisma/migrations`.

---

## Project layout

```
client/                 React web app
server/                 Express API
  prisma/               schema, migrations, starter seed
  routes/               API endpoints
  lib/                  sign-in, business-case calculator
  scripts/start.mjs     production start (migrate → seed → serve)
data/prods.xlsx         starter product list (replaced by the taxonomy upload)
Dockerfile              production image
docker-compose.prod.yml full server stack (database + portal)
docker-compose.yml      database only, for local development
k8s/                    example Kubernetes manifests (not used by the Docker install)
```

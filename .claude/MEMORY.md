# VBI Product Management Portal — Project Memory

## Project Overview
Full-stack React + Express/Prisma/PostgreSQL application for Vodafone Business International (VBI).
Internal tool for product managers to manage 785+ products across 8 categories with catalog, NPD pipeline, cost management, trading performance, business cases, country coverage, SLA tracking, feature requests, and import/export.
**Built to production-ready IT team standards**: Docker, Kubernetes, PostgreSQL, health checks, graceful shutdown.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6 + Zustand (state) + Recharts (charts) + Lucide React (icons)
- **Backend**: Node.js + Express 5 + Prisma ORM + PostgreSQL 16 (via Docker)
- **File Processing**: SheetJS (`xlsx` npm package) for Excel parsing/generation
- **Fonts**: DM Sans + DM Mono (Google Fonts)
- **Module System**: ESM (`"type": "module"` in both package.json files)
- **Workspaces**: npm workspaces — root manages `client` and `server`
- **Dev**: Both servers started together via concurrently

## Key File Locations
```
server/
  index.js              # Express entry point (port 3001, uses API_PORT env var)
  lib/prisma.js          # Singleton PrismaClient export
  prisma/
    schema.prisma        # 8 models: Product, ProductCost, NpdStage, TradingData, CountryCoverage, SlaData, BusinessCase, FeatureRequest
    seed.js              # Parses prods.xlsx with forward-fill logic, seeds 785 products + sample data
    migrations/          # Prisma migration files
  routes/
    products.js          # Full CRUD + nested data, search, pagination (30/page), stats, families, categories
    featureRequests.js   # CRUD for feature requests
    trading.js           # GET /api/trading/summary with aggregation
    uploads.js           # 6 upload endpoints (catalog, trading, costs, npd, coverage, sla) — multer + XLSX
    exports.js           # 4 export endpoints generating XLSX files (catalog, trading, npd, costs)

client/
  vite.config.js         # React plugin, proxy /api → http://localhost:3001 (or 3002)
  tailwind.config.js     # VF design tokens, DM Sans/DM Mono fonts
  index.html             # Google Fonts link
  src/
    index.css            # Tailwind directives + category badges + stage dots + status pills
    App.jsx              # BrowserRouter with 9 routes under Layout
    store/useProductStore.js  # Zustand store: products, filters, pagination, drawer, feature requests, trading, toasts
    components/
      Layout.jsx         # Topbar + Sidebar + Outlet + ProductDrawer + Toast
      Topbar.jsx         # 52px dark header, Vodafone branding, "+ New Request" button
      Sidebar.jsx        # 204px white sidebar, 5 sections (Product, Financials, Operations, Engagement, Data), 9 NavLinks
      ProductDrawer.jsx  # 580px fixed right drawer, dark header, 7 tabs
      CategoryBadge.jsx  # Maps category names to CSS classes
      Toast.jsx          # Bottom-right notification
      drawer/            # 7 tab components: OverviewTab, CostsTab, NpdTab, TradingTab, CoverageTab, SlaTab, BusinessCaseTab
    pages/
      ProductCatalog.jsx      # / route — filterable table + stats row + pagination
      NpdPipeline.jsx         # /npd — stage gate table (8 stages)
      CostManagement.jsx      # /costs — 2-col cost cards + trend chart
      TradingPerformance.jsx  # /trading — 4 KPI cards + Recharts BarChart + category progress
      BusinessCasePage.jsx    # /business-case — expandable cards
      CountryCoverage.jsx     # /coverage — matrix table with 14 countries
      SlaService.jsx          # /sla — 3-col card grid
      FeatureRequests.jsx     # /feature-requests — form + list
      ImportExport.jsx        # /import-export — 6 upload zones + 4 export buttons

docker-compose.yml      # PostgreSQL 16-alpine on port 5433 (avoids local PG conflict on 5432)
Dockerfile              # Multi-stage build (deps → build → production) Node 20 Alpine
k8s/
  deployment.yaml       # 2 replicas, liveness/readiness probes on /health
  service.yaml          # ClusterIP port 80 → 3001
.env                    # DATABASE_URL, API_PORT, NODE_ENV (also copied to server/.env for Prisma)
```

## Database Schema (Prisma)
- **Product**: id, category, family, productLine, name, status, revenueModel, owner + relations
- **ProductCost**: component, amountEur, fy → Product
- **NpdStage**: 8 Int columns (concept, bizCase, design, gtm, salesEnable, distribution, slaDefinition, launch) — 0=todo, 1=done, 2=active
- **TradingData**: region, fy, actualEur, targetEur, pyActualEur → Product
- **CountryCoverage**: countryCode, status — @@unique([productId, countryCode])
- **SlaData**: availability, mttr, responseTime, supportHours, escalation, reviewFreq → Product
- **BusinessCase**: npv, irr, paybackMonths, status, summary → Product
- **FeatureRequest**: type, productName, title, description, justification, dealAccount, priority, status (standalone)

## API Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | Paginated list (30/page) with search, category/family filters, stats |
| GET | /api/products/:id | Single product with all nested data |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/families | Distinct families |
| GET | /api/products/categories | Distinct categories |
| GET | /api/feature-requests | All feature requests |
| POST | /api/feature-requests | Create feature request |
| PUT | /api/feature-requests/:id | Update feature request |
| DELETE | /api/feature-requests/:id | Delete feature request |
| GET | /api/trading/summary | Aggregated trading data by region/category |
| POST | /api/uploads/:type | Upload Excel (catalog, trading, costs, npd, coverage, sla) |
| GET | /api/exports/:type | Download Excel (catalog, trading, npd, costs) |
| GET | /health | Health check with DB ping |

## Design System
- **Theme**: Light (white/cream), NOT dark like Event Manager
- **Background**: White, Surface: #F4F3F0 (vf-surface), Border: #E5E5E5 (vf-border)
- **Primary**: #E60000 (Vodafone red)
- **Dark**: #1A1A1A (topbar, drawer header)
- **Text**: #1A1A1A primary, #6B7280 muted
- **Accent**: #2563EB, Success: #16A34A, Warning: #F59E0B
- **Fonts**: DM Sans (body), DM Mono (data/numbers)
- **Category badge colors**: Fixed Line (#EF4444), Mobile (#8B5CF6), Cloud and Security (#3B82F6), IoT (#10B981), Carrier (#F97316), UC (#6366F1), Digital (#EC4899), Other (#6B7280)

## Infrastructure
- **Docker**: PostgreSQL 16-alpine on port **5433** (not 5432, to avoid local PG conflict)
- **DATABASE_URL**: `postgresql://vbi:vbipass123@localhost:5433/vbi_products`
- **Kubernetes**: deployment.yaml (2 replicas, resource limits, probes), service.yaml (ClusterIP)
- **Graceful shutdown**: SIGTERM/SIGINT handlers in server/index.js

## XLSX / ESM Import Pattern
The `xlsx` package is CommonJS. In ESM you must use:
```js
import XLSX from 'xlsx';  // default import, NOT named imports
```
NOT `import * as XLSX from 'xlsx'` or `import { readFile } from 'xlsx'`.

## Seed Data
- 785 products parsed from prods.xlsx with forward-fill logic (blank category/family/productLine filled from previous row)
- 8 categories: Fixed Line, Mobile, Cloud and Security, IoT, Carrier, UC, Digital Services, Other
- 83 families, 179 product lines
- 3 sample feature requests + sample NPD/trading/cost/SLA/coverage/business case data

## Launch
- **Docker first**: `docker compose up -d` (starts PostgreSQL on 5433)
- **Migrate**: `npx prisma migrate deploy` (from server/ directory)
- **Seed**: `npx prisma db seed` (from server/ directory)
- **Dev servers**: `npm run dev` from root (concurrently starts API + Vite)
- API defaults to port 3001 (API_PORT env var), Vite on 5173
- Vite proxy: `/api` → `http://localhost:3001`

## Known Issues / Notes
- Port 5432 may be occupied by local PostgreSQL — that's why docker-compose uses 5433
- `.env` must exist in BOTH root and `server/` for Prisma to find DATABASE_URL
- The `mode: 'insensitive'` Prisma search only works with PostgreSQL (not SQLite)
- Preview tool in Claude Code: use the "vbi-products" config in launch.json

## Build Status
✅ Full-stack app built and verified — API returns 785 products, all 9 pages render, Docker/K8s configs ready

## Remaining Tasks
- ESLint + Prettier configuration
- README.md
- Visual refinements (compare each page against vbi_product_portal.html prototype)

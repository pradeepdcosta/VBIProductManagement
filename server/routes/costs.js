import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

const DEFAULT_FY = 'FY28';

export const IMPACT_TYPES = ['OpEx reduction', 'Depreciation reduction', 'OpEx & depreciation', 'Allocation reduction', 'Cost avoidance'];
export const ACTION_STATUSES = ['Planned', 'In Progress', 'On Track', 'At Risk', 'Completed', 'Cancelled'];

// ─── Cost breakdown model ─────────────────────────────────────────────────────
// A breakdown holds the figures typed into each line of the cost sheet:
//   ps / ppe: directFte, voisFte, external, manualAdj (opex), depreciation (dep),
//             crossOpex, crossDep (cross-portfolio), indirectOpex, indirectDep
//   alloc:    commercial, directorate, vsol, networks (all opex)
//   fte:      ps, ppe (headcount, not money)
// Every total is derived from these, so the sheet and the dashboard always add up.

const SECTION_FIELDS = ['directFte', 'voisFte', 'external', 'manualAdj', 'depreciation', 'crossOpex', 'crossDep', 'indirectOpex', 'indirectDep'];
const ALLOC_FIELDS = ['commercial', 'directorate', 'vsol', 'networks'];

const emptySection = () => Object.fromEntries(SECTION_FIELDS.map((k) => [k, 0]));
const emptyBreakdown = () => ({
  ps: emptySection(),
  ppe: emptySection(),
  alloc: Object.fromEntries(ALLOC_FIELDS.map((k) => [k, 0])),
  fte: { ps: 0, ppe: 0 },
});

// Placeholder profile for product lines with no cost data yet (clearly dummy;
// turned off with SEED_DEMO_DATA=false)
function placeholderBreakdown() {
  const b = emptyBreakdown();
  b.ps.directFte = 585166; b.ps.depreciation = 37441;
  b.ppe.directFte = 158516; b.ppe.depreciation = 303429;
  b.alloc = { commercial: 145501, directorate: 2140, vsol: 110206, networks: 0 };
  return b;
}
const placeholdersEnabled = () => process.env.SEED_DEMO_DATA !== 'false';

// Rows saved before breakdowns existed only have the summary columns
function breakdownFromColumns(row) {
  const b = emptyBreakdown();
  b.ps.directFte = row.psOpex; b.ps.depreciation = row.psDep;
  b.ppe.directFte = row.ppeOpex; b.ppe.depreciation = row.ppeDep;
  b.alloc = { commercial: row.commercial, directorate: row.directorate, vsol: row.vsol, networks: row.networks };
  b.fte.ps = row.fteCount || 0;
  return b;
}

function sectionTotals(s) {
  const directOpex = s.directFte + s.voisFte + s.external + s.manualAdj;
  const directDep = s.depreciation;
  const opex = directOpex + s.crossOpex + s.indirectOpex;
  const dep = directDep + s.crossDep + s.indirectDep;
  return { directOpex, directDep, directTotal: directOpex + directDep, opex, dep, total: opex + dep };
}

// Grand total = Opex + Depreciation = Direct (P&S + PPE) + Allocations
function totals(b) {
  const ps = sectionTotals(b.ps);
  const ppe = sectionTotals(b.ppe);
  const allocations = ALLOC_FIELDS.reduce((s, k) => s + b.alloc[k], 0);
  const direct = ps.total + ppe.total;
  return {
    psOpex: ps.opex, psDep: ps.dep, psTotal: ps.total,
    ppeOpex: ppe.opex, ppeDep: ppe.dep, ppeTotal: ppe.total,
    totalProductOpex: ps.opex + ppe.opex,
    totalProductDep: ps.dep + ppe.dep,
    totalProduct: direct,
    ...b.alloc,
    direct,
    allocations,
    opex: ps.opex + ppe.opex + allocations, // all allocations are opex
    dep: ps.dep + ppe.dep,
    grandTotal: direct + allocations,
    fteCount: b.fte.ps,
  };
}

// Validate a breakdown sent by the cost sheet. Amounts must be numbers;
// only manual adjustments may be negative.
function cleanBreakdown(input) {
  if (!input || typeof input !== 'object') return { error: 'breakdown is required' };
  const b = emptyBreakdown();
  const num = (v, label, allowNegative) => {
    const n = v === '' || v == null ? 0 : Number(v);
    if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
    if (n < 0 && !allowNegative) throw new Error(`${label} can't be negative`);
    return Math.round(n * 100) / 100;
  };
  try {
    for (const sec of ['ps', 'ppe']) {
      for (const k of SECTION_FIELDS) b[sec][k] = num(input[sec]?.[k], `${sec.toUpperCase()} ${k}`, k === 'manualAdj');
    }
    for (const k of ALLOC_FIELDS) b.alloc[k] = num(input.alloc?.[k], k, false);
    b.fte.ps = num(input.fte?.ps, 'P&S FTE', false);
    b.fte.ppe = num(input.fte?.ppe, 'PPE FTE', false);
  } catch (err) {
    return { error: err.message };
  }
  return { breakdown: b };
}

// Product lines (with family and portfolio) of products shown in the catalog,
// narrowed by the global filter bar
async function productLines(query) {
  const where = { showInCatalog: true };
  if (query.category) where.category = query.category;
  if (query.family) where.family = query.family;
  if (query.productLine) where.productLine = query.productLine;
  if (query.q) {
    where.OR = ['name', 'family', 'productLine', 'category'].map((f) => ({ [f]: { contains: query.q, mode: 'insensitive' } }));
  }
  return prisma.product.findMany({
    where,
    select: { category: true, family: true, productLine: true },
    distinct: ['family', 'productLine'],
    orderBy: [{ family: 'asc' }, { productLine: 'asc' }],
  });
}

const parseFy = (v) => (/^FY\d{2}$/.test(v || '') ? v : DEFAULT_FY);

function buildRow(line, fy, stored, actionAgg) {
  const breakdown = stored
    ? (stored.breakdown || breakdownFromColumns(stored))
    : (placeholdersEnabled() ? placeholderBreakdown() : emptyBreakdown());
  return {
    key: `${line.family}|${line.productLine}`,
    productLine: line.productLine,
    productFamily: line.family,
    portfolio: line.category,
    fy,
    placeholder: !stored,
    updatedAt: stored?.updatedAt || null,
    breakdown,
    fteBreakdown: stored?.fteBreakdown || [],
    ...totals(breakdown),
    actionCount: actionAgg?._count._all || 0,
    plannedSavings: actionAgg?._sum.savings || 0,
  };
}

// GET /api/costs?fy=FY28&category=&family=&productLine=&q= — cost to serve per product line
router.get('/', async (req, res, next) => {
  try {
    const fy = parseFy(req.query.fy);
    const lines = await productLines(req.query);
    const names = lines.map((l) => l.productLine);

    const [stored, actions] = await Promise.all([
      prisma.costAllocation.findMany({ where: { fy, serviceOffering: { in: names } } }),
      prisma.costAction.groupBy({
        by: ['productFamily', 'serviceOffering'],
        where: { fy, serviceOffering: { in: names }, status: { not: 'Cancelled' } },
        _count: { _all: true },
        _sum: { savings: true },
      }),
    ]);
    const storedByKey = new Map(stored.map((s) => [`${s.serviceTower}|${s.serviceOffering}`, s]));
    const actionsByKey = new Map(actions.map((a) => [`${a.productFamily}|${a.serviceOffering}`, a]));

    const rows = lines.map((l) => {
      const key = `${l.family}|${l.productLine}`;
      return buildRow(l, fy, storedByKey.get(key), actionsByKey.get(key));
    });

    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    res.json({
      fy,
      rows,
      summary: {
        lines: rows.length,
        placeholderLines: rows.filter((r) => r.placeholder).length,
        grandTotal: sum('grandTotal'),
        opex: sum('opex'),
        dep: sum('dep'),
        direct: sum('direct'),
        allocations: sum('allocations'),
        plannedSavings: sum('plannedSavings'),
      },
    });
  } catch (err) { next(err); }
});

// Find the catalog product line a cost-sheet edit refers to
async function findLine(body) {
  const productFamily = String(body.productFamily || '').trim();
  const productLine = String(body.productLine || '').trim();
  if (!productFamily || !productLine) return null;
  return prisma.product.findFirst({
    where: { showInCatalog: true, family: productFamily, productLine },
    select: { category: true, family: true, productLine: true },
  });
}

// PUT /api/costs/line { fy, productFamily, productLine, breakdown } — save the cost sheet for a line
router.put('/line', async (req, res, next) => {
  try {
    const fy = parseFy(req.body.fy);
    const line = await findLine(req.body);
    if (!line) return res.status(404).json({ error: 'Product line not found in the catalog' });
    const { breakdown, error } = cleanBreakdown(req.body.breakdown);
    if (error) return res.status(400).json({ error });

    const t = totals(breakdown);
    const columns = {
      psOpex: t.psOpex, psDep: t.psDep, psTotal: t.psTotal,
      ppeOpex: t.ppeOpex, ppeDep: t.ppeDep, ppeTotal: t.ppeTotal,
      totalProductOpex: t.totalProductOpex, totalProductDep: t.totalProductDep, totalProduct: t.totalProduct,
      commercial: t.commercial, directorate: t.directorate, vsol: t.vsol, networks: t.networks,
      vbts: 0, enterprise: 0, carrier: 0,
      grandTotal: t.grandTotal, fteCount: t.fteCount,
      breakdown,
    };
    const where = { serviceTower_serviceOffering_fy: { serviceTower: line.family, serviceOffering: line.productLine, fy } };
    const saved = await prisma.costAllocation.upsert({
      where,
      create: { serviceTower: line.family, serviceOffering: line.productLine, fy, ...columns },
      update: columns,
    });

    const agg = await prisma.costAction.groupBy({
      by: ['productFamily', 'serviceOffering'],
      where: { fy, productFamily: line.family, serviceOffering: line.productLine, status: { not: 'Cancelled' } },
      _count: { _all: true },
      _sum: { savings: true },
    });
    res.json(buildRow(line, fy, saved, agg[0]));
  } catch (err) { next(err); }
});

// DELETE /api/costs/line?fy=&productFamily=&productLine= — discard the line's figures (back to placeholder)
router.delete('/line', async (req, res, next) => {
  try {
    const fy = parseFy(req.query.fy);
    const line = await findLine(req.query);
    if (!line) return res.status(404).json({ error: 'Product line not found in the catalog' });
    await prisma.costAllocation.deleteMany({ where: { fy, serviceTower: line.family, serviceOffering: line.productLine } });
    res.json(buildRow(line, fy, null, null));
  } catch (err) { next(err); }
});

// ─── Cost reduction actions ───────────────────────────────────────────────────

// Validate an action form; partial=true for updates
function cleanAction(body, partial) {
  const data = {};
  const text = (v) => (v == null ? null : String(v).trim() || null);

  if (body.productLine !== undefined || !partial) {
    const v = text(body.productLine);
    if (!v) return { error: 'Product line is required' };
    data.serviceOffering = v;
  }
  if (body.productFamily !== undefined || !partial) {
    const v = text(body.productFamily);
    if (!v) return { error: 'Product family is required' };
    data.productFamily = v;
  }
  if (body.action !== undefined || !partial) {
    const v = text(body.action);
    if (!v) return { error: 'Describe the action' };
    data.action = v;
  }
  if (body.impactType !== undefined) {
    if (!IMPACT_TYPES.includes(body.impactType)) return { error: `Impact must be one of: ${IMPACT_TYPES.join(', ')}` };
    data.impactType = body.impactType;
  }
  if (body.status !== undefined) {
    if (!ACTION_STATUSES.includes(body.status)) return { error: `Status must be one of: ${ACTION_STATUSES.join(', ')}` };
    data.status = body.status;
  }
  if (body.savings !== undefined) {
    const n = body.savings === '' || body.savings == null ? 0 : Number(body.savings);
    if (!Number.isFinite(n) || n < 0) return { error: 'Saving must be a positive amount in €' };
    data.savings = n;
  }
  if (body.targetDate !== undefined) {
    if (!body.targetDate) data.targetDate = null;
    else {
      const d = new Date(body.targetDate);
      if (isNaN(d)) return { error: 'Target date is not a valid date' };
      data.targetDate = d;
    }
  }
  if (body.owner !== undefined) data.owner = text(body.owner);
  if (body.notes !== undefined) data.notes = text(body.notes);
  if (body.fy !== undefined) {
    if (!/^FY\d{2}$/.test(body.fy)) return { error: 'fy must look like FY28' };
    data.fy = body.fy;
  }
  return { data };
}

// GET /api/costs/actions?productLine=&productFamily=&fy=
router.get('/actions', async (req, res, next) => {
  try {
    const where = { fy: req.query.fy || DEFAULT_FY };
    if (req.query.productLine) where.serviceOffering = req.query.productLine;
    if (req.query.productFamily) where.productFamily = req.query.productFamily;
    const actions = await prisma.costAction.findMany({ where, orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }] });
    res.json(actions);
  } catch (err) { next(err); }
});

// GET /api/costs/actions/options — impact types and statuses for the form
router.get('/actions/options', (req, res) => {
  res.json({ impactTypes: IMPACT_TYPES, statuses: ACTION_STATUSES });
});

// POST /api/costs/actions
router.post('/actions', async (req, res, next) => {
  try {
    const { data, error } = cleanAction(req.body, false);
    if (error) return res.status(400).json({ error });
    const action = await prisma.costAction.create({ data: { fy: DEFAULT_FY, ...data } });
    res.status(201).json(action);
  } catch (err) { next(err); }
});

// PUT /api/costs/actions/:id
router.put('/actions/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = cleanAction(req.body, true);
    if (error) return res.status(400).json({ error });
    const action = await prisma.costAction.update({ where: { id }, data });
    res.json(action);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Action not found' });
    next(err);
  }
});

// DELETE /api/costs/actions/:id
router.delete('/actions/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.costAction.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Action not found' });
    next(err);
  }
});

export default router;

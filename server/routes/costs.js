import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

const DEFAULT_FY = 'FY28';

// Placeholder cost profile used for every product line that has no cost data
// yet. Clearly dummy figures; turned off with SEED_DEMO_DATA=false.
const PLACEHOLDER = {
  psOpex: 585166, psDep: 37441,
  ppeOpex: 158516, ppeDep: 303429,
  commercial: 145501, directorate: 2140, vsol: 110206, networks: 0,
  vbts: 0, enterprise: 0, carrier: 0,
  fteCount: 0, fteBreakdown: [],
};
const placeholdersEnabled = () => process.env.SEED_DEMO_DATA !== 'false';

export const IMPACT_TYPES = ['OpEx reduction', 'Depreciation reduction', 'OpEx & depreciation', 'Allocation reduction', 'Cost avoidance'];
export const ACTION_STATUSES = ['Planned', 'In Progress', 'On Track', 'At Risk', 'Completed', 'Cancelled'];

// Derive every total from the components so the figures always add up:
// Grand total = Opex + Depreciation = Direct (P&S + PPE) + Allocations
function withTotals(c) {
  const psTotal = c.psOpex + c.psDep;
  const ppeTotal = c.ppeOpex + c.ppeDep;
  const allocations = c.commercial + c.directorate + c.vsol + c.networks + c.vbts + c.enterprise + c.carrier;
  const direct = psTotal + ppeTotal;
  return {
    ...c,
    psTotal,
    ppeTotal,
    totalProduct: direct,
    totalProductOpex: c.psOpex + c.ppeOpex,
    totalProductDep: c.psDep + c.ppeDep,
    direct,
    allocations,
    opex: c.psOpex + c.ppeOpex + allocations, // all allocations are opex
    dep: c.psDep + c.ppeDep,
    grandTotal: direct + allocations,
  };
}

const ZERO = Object.fromEntries(Object.keys(PLACEHOLDER).map((k) => [k, k === 'fteBreakdown' ? [] : 0]));

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
  const rows = await prisma.product.findMany({
    where,
    select: { category: true, family: true, productLine: true },
    distinct: ['family', 'productLine'],
    orderBy: [{ family: 'asc' }, { productLine: 'asc' }],
  });
  return rows;
}

// GET /api/costs?fy=FY28&category=&family=&productLine=&q= — cost to serve per product line
router.get('/', async (req, res, next) => {
  try {
    const fy = /^FY\d{2}$/.test(req.query.fy || '') ? req.query.fy : DEFAULT_FY;
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
      const real = storedByKey.get(`${l.family}|${l.productLine}`);
      const base = real || (placeholdersEnabled() ? PLACEHOLDER : ZERO);
      const a = actionsByKey.get(`${l.family}|${l.productLine}`);
      return {
        key: `${l.family}|${l.productLine}`,
        productLine: l.productLine,
        productFamily: l.family,
        portfolio: l.category,
        fy,
        placeholder: !real,
        ...withTotals(Object.fromEntries(Object.keys(PLACEHOLDER).map((k) => [k, base[k] ?? ZERO[k]]))),
        actionCount: a?._count._all || 0,
        plannedSavings: a?._sum.savings || 0,
      };
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

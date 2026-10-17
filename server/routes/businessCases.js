import { Router } from 'express';
import prisma from '../lib/prisma.js';
import {
  BIZCASE_ROWS, BIZCASE_STATUSES, FY_KEYS,
  calculate, cleanValues, valuesFromLines, linesForStorage,
} from '../lib/bizcase.js';

// Business cases per product line, for the lines behind catalog products
const router = Router();

// Approved first, then In Review, Draft, then lines with no business case
const STATUS_RANK = { Approved: 0, 'In Review': 1, Draft: 2 };

async function catalogLines(query) {
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

async function findCatalogLine(productFamily, productLine) {
  const family = String(productFamily || '').trim();
  const line = String(productLine || '').trim();
  if (!family || !line) return null;
  return prisma.product.findFirst({
    where: { showInCatalog: true, family, productLine: line },
    select: { category: true, family: true, productLine: true },
  });
}

const caseKey = (family, line) => ({ productFamily_productLine: { productFamily: family, productLine: line } });

// Shape a stored case for the page: typed values, calculated P&L, summary metrics
function presentCase(bc) {
  if (!bc) return null;
  const values = valuesFromLines(bc.lines);
  return {
    id: bc.id,
    status: bc.status,
    npv: bc.npv,
    roi: bc.roi,
    irr: bc.irr,
    paybackYears: bc.paybackMonths != null ? Math.round((bc.paybackMonths / 12) * 10) / 10 : null,
    summary: bc.summary,
    updatedAt: bc.updatedAt,
    hasPnl: bc.lines.some((l) => FY_KEYS.some((fy) => l[fy] != null)),
    values,
    calculated: calculate(values),
  };
}

// GET /api/business-cases/template — P&L rows, formulas and statuses for the page
router.get('/template', (req, res) => {
  res.json({ rows: BIZCASE_ROWS, fyKeys: FY_KEYS, statuses: BIZCASE_STATUSES });
});

// GET /api/business-cases — one row per catalog product line, cases first
router.get('/', async (req, res, next) => {
  try {
    const lines = await catalogLines(req.query);
    const cases = await prisma.businessCase.findMany({
      where: { productLine: { in: lines.map((l) => l.productLine) } },
      select: {
        productFamily: true, productLine: true, status: true, updatedAt: true,
        lines: { select: Object.fromEntries(FY_KEYS.map((fy) => [fy, true])) },
      },
    });
    const byKey = new Map(cases.map((c) => [`${c.productFamily}|${c.productLine}`, c]));
    const rows = lines.map((l) => {
      const c = byKey.get(`${l.family}|${l.productLine}`);
      return {
        key: `${l.family}|${l.productLine}`,
        productLine: l.productLine,
        productFamily: l.family,
        portfolio: l.category,
        status: c?.status || null,
        hasCase: !!c,
        hasPnl: !!c?.lines.some((l) => FY_KEYS.some((fy) => l[fy] != null)),
        updatedAt: c?.updatedAt || null,
      };
    });
    rows.sort((a, b) =>
      (a.hasCase ? STATUS_RANK[a.status] ?? 3 : 9) - (b.hasCase ? STATUS_RANK[b.status] ?? 3 : 9)
      || a.productFamily.localeCompare(b.productFamily) || a.productLine.localeCompare(b.productLine));
    res.json({
      rows,
      summary: {
        lines: rows.length,
        withCase: rows.filter((r) => r.hasCase).length,
        byStatus: Object.fromEntries(BIZCASE_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/business-cases/line?productFamily=&productLine= — one line's business case (or null)
router.get('/line', async (req, res, next) => {
  try {
    const line = await findCatalogLine(req.query.productFamily, req.query.productLine);
    if (!line) return res.status(404).json({ error: 'Product line not found in the catalog' });
    const bc = await prisma.businessCase.findUnique({
      where: caseKey(line.family, line.productLine),
      include: { lines: true },
    });
    res.json({ productLine: line.productLine, productFamily: line.family, portfolio: line.category, case: presentCase(bc) });
  } catch (err) { next(err); }
});

const optionalNumber = (v, label) => {
  if (v === '' || v == null) return { value: null };
  const n = Number(v);
  return Number.isFinite(n) ? { value: n } : { error: `${label} must be a number` };
};

// PUT /api/business-cases/line — create or update a line's P&L and summary metrics.
// A new business case starts as Draft. Calculated rows are re-derived, never trusted from the client.
router.put('/line', async (req, res, next) => {
  try {
    const line = await findCatalogLine(req.body.productFamily, req.body.productLine);
    if (!line) return res.status(404).json({ error: 'Product line not found in the catalog' });

    const { values, error } = cleanValues(req.body.values || {});
    if (error) return res.status(400).json({ error });

    const metrics = {};
    for (const [k, label] of [['npv', 'NPV'], ['roi', 'RoI'], ['irr', 'IRR'], ['paybackYears', 'Payback']]) {
      const { value, error: e } = optionalNumber(req.body[k], label);
      if (e) return res.status(400).json({ error: e });
      metrics[k] = value;
    }
    if (metrics.paybackYears != null && metrics.paybackYears < 0) return res.status(400).json({ error: "Payback can't be negative" });

    const data = {
      npv: metrics.npv,
      roi: metrics.roi,
      irr: metrics.irr,
      paybackMonths: metrics.paybackYears != null ? Math.round(metrics.paybackYears * 12) : null,
      summary: String(req.body.summary || '').trim() || null,
    };
    const stored = linesForStorage(calculate(values));

    const bc = await prisma.$transaction(async (tx) => {
      const saved = await tx.businessCase.upsert({
        where: caseKey(line.family, line.productLine),
        create: { productFamily: line.family, productLine: line.productLine, status: 'Draft', ...data },
        update: data,
      });
      await tx.businessCaseLine.deleteMany({ where: { businessCaseId: saved.id } });
      await tx.businessCaseLine.createMany({ data: stored.map((l) => ({ businessCaseId: saved.id, ...l })) });
      return tx.businessCase.findUnique({ where: { id: saved.id }, include: { lines: true } });
    });

    res.json({ productLine: line.productLine, productFamily: line.family, portfolio: line.category, case: presentCase(bc) });
  } catch (err) { next(err); }
});

// PUT /api/business-cases/line/status { productFamily, productLine, status } — Draft / In Review / Approved
router.put('/line/status', async (req, res, next) => {
  try {
    if (!BIZCASE_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Status must be one of: ${BIZCASE_STATUSES.join(', ')}` });
    }
    const bc = await prisma.businessCase.update({
      where: caseKey(String(req.body.productFamily || ''), String(req.body.productLine || '')),
      data: { status: req.body.status },
      include: { lines: true },
    });
    res.json({ case: presentCase(bc) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'This product line has no business case yet' });
    next(err);
  }
});

// DELETE /api/business-cases/line?productFamily=&productLine= — remove a line's business case
router.delete('/line', async (req, res, next) => {
  try {
    await prisma.businessCase.delete({ where: caseKey(String(req.query.productFamily || ''), String(req.query.productLine || '')) });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'This product line has no business case' });
    next(err);
  }
});

export default router;

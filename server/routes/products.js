import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Helper: build Prisma where clause from filter query params
function buildProductWhere(query) {
  const where = {};
  if (query.category) where.category = query.category;
  if (query.family) where.family = query.family;
  if (query.productLine) where.productLine = query.productLine;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { family: { contains: query.q, mode: 'insensitive' } },
      { productLine: { contains: query.q, mode: 'insensitive' } },
      { category: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

// GET /api/products — list with filters + pagination
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = buildProductWhere(req.query);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: [{ category: 'asc' }, { family: 'asc' }, { productLine: 'asc' }, { name: 'asc' }],
      }),
      prisma.product.count({ where }),
    ]);

    // Compute unique counts
    const allFiltered = await prisma.product.findMany({
      where,
      select: { category: true, family: true, productLine: true },
    });
    const families = new Set(allFiltered.map((p) => p.family));
    const lines = new Set(allFiltered.map((p) => p.productLine));
    const categories = new Set(allFiltered.map((p) => p.category));

    res.json({
      data: products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
      stats: {
        totalProducts: total,
        families: families.size,
        lines: lines.size,
        categories: categories.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/families — distinct families, optionally filtered by category
router.get('/families', async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};
    const results = await prisma.product.findMany({
      where,
      select: { family: true },
      distinct: ['family'],
      orderBy: { family: 'asc' },
    });
    res.json(results.map((r) => r.family));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/lines — distinct product lines, optionally filtered by category/family
router.get('/lines', async (req, res, next) => {
  try {
    const { category, family } = req.query;
    const where = {};
    if (category) where.category = category;
    if (family) where.family = family;
    const results = await prisma.product.findMany({
      where,
      select: { productLine: true },
      distinct: ['productLine'],
      orderBy: { productLine: 'asc' },
    });
    res.json(results.map((r) => r.productLine));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/summary — per-category stats
router.get('/summary', async (req, res, next) => {
  try {
    const all = await prisma.product.findMany({
      select: { category: true, family: true, productLine: true },
      orderBy: { category: 'asc' },
    });
    const map = {};
    for (const p of all) {
      if (!map[p.category]) map[p.category] = { category: p.category, products: 0, families: new Set(), lines: new Set() };
      map[p.category].products++;
      map[p.category].families.add(p.family);
      map[p.category].lines.add(p.productLine);
    }
    res.json(Object.values(map).map((c) => ({
      category: c.category,
      products: c.products,
      families: c.families.size,
      lines: c.lines.size,
    })));
  } catch (err) { next(err); }
});

// GET /api/products/categories — distinct categories
router.get('/categories', async (req, res, next) => {
  try {
    const results = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json(results.map((r) => r.category));
  } catch (err) {
    next(err);
  }
});

// GET /api/npd — all NPD stages with product info (supports filters)
router.get('/npd', async (req, res, next) => {
  try {
    const productWhere = buildProductWhere(req.query);
    const stages = await prisma.npdStage.findMany({
      where: Object.keys(productWhere).length ? { product: productWhere } : undefined,
      include: { product: { select: { id: true, name: true, category: true, family: true, productLine: true } } },
    });
    res.json(stages);
  } catch (err) { next(err); }
});

// GET /api/products/npd-initiatives — NPD roadmap initiatives (supports filters)
router.get('/npd-initiatives', async (req, res, next) => {
  try {
    const { category, family, productLine, q, fy, status, roadmapCategory } = req.query;
    const where = {};
    if (category) where.portfolio = category;
    if (family) where.productFamily = family;
    if (productLine) where.productLine = productLine;
    if (fy) where.fy = fy;
    if (status) where.status = status;
    if (roadmapCategory) where.roadmapCategory = roadmapCategory;
    if (q) {
      where.OR = [
        { initiativeName: { contains: q, mode: 'insensitive' } },
        { productFamily: { contains: q, mode: 'insensitive' } },
        { productLine: { contains: q, mode: 'insensitive' } },
        { portfolio: { contains: q, mode: 'insensitive' } },
        { investmentCanvas: { contains: q, mode: 'insensitive' } },
      ];
    }
    const initiatives = await prisma.npdInitiative.findMany({
      where,
      orderBy: [{ fy: 'asc' }, { quarter: 'asc' }, { portfolio: 'asc' }],
    });

    // Compute summary stats
    const statusCounts = {};
    const categoryCounts = {};
    const portfolioCounts = {};
    const quarterCounts = {};
    for (const i of initiatives) {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      categoryCounts[i.roadmapCategory] = (categoryCounts[i.roadmapCategory] || 0) + 1;
      portfolioCounts[i.portfolio] = (portfolioCounts[i.portfolio] || 0) + 1;
      const key = `${i.fy} ${i.quarter}`;
      quarterCounts[key] = (quarterCounts[key] || 0) + 1;
    }

    res.json({
      initiatives,
      summary: { total: initiatives.length, statusCounts, categoryCounts, portfolioCounts, quarterCounts },
    });
  } catch (err) { next(err); }
});

// GET /api/costs — all costs with product info (supports filters)
router.get('/costs', async (req, res, next) => {
  try {
    const productWhere = buildProductWhere(req.query);
    const costs = await prisma.productCost.findMany({
      where: Object.keys(productWhere).length ? { product: productWhere } : undefined,
      include: { product: { select: { id: true, name: true, category: true, family: true } } },
      orderBy: { fy: 'desc' },
    });
    res.json(costs);
  } catch (err) { next(err); }
});

// GET /api/products/cost-allocations — detailed cost allocations
router.get('/cost-allocations', async (req, res, next) => {
  try {
    const { q, category, family, productLine } = req.query;
    const where = {};

    // If global filters are set, find matching product names first
    const hasProductFilter = category || family || productLine;
    if (hasProductFilter) {
      const productWhere = buildProductWhere({ category, family, productLine });
      const matchingProducts = await prisma.product.findMany({
        where: productWhere,
        select: { name: true },
        distinct: ['name'],
      });
      const names = matchingProducts.map((p) => p.name);
      // Match cost allocations whose serviceOffering contains any matching product name
      // Use case-insensitive partial matching for best coverage
      where.OR = names.map((n) => ({ serviceOffering: { contains: n, mode: 'insensitive' } }));
      if (where.OR.length === 0) {
        return res.json({ allocations: [], summary: { total: 0, totalGrand: 0, totalProduct: 0, totalFte: 0 } });
      }
    }

    if (q) {
      const qFilter = [
        { serviceOffering: { contains: q, mode: 'insensitive' } },
        { serviceTower: { contains: q, mode: 'insensitive' } },
      ];
      if (where.OR) {
        // Combine: must match product filter AND search
        where.AND = [{ OR: where.OR }, { OR: qFilter }];
        delete where.OR;
      } else {
        where.OR = qFilter;
      }
    }

    const allocations = await prisma.costAllocation.findMany({
      where,
      orderBy: [{ serviceTower: 'asc' }, { serviceOffering: 'asc' }],
    });

    const totalGrand = allocations.reduce((a, c) => a + c.grandTotal, 0);
    const totalProduct = allocations.reduce((a, c) => a + c.totalProduct, 0);
    const totalFte = allocations.reduce((a, c) => a + c.fteCount, 0);

    res.json({
      allocations,
      summary: { total: allocations.length, totalGrand, totalProduct, totalFte },
    });
  } catch (err) { next(err); }
});

// GET /api/products/cost-actions — cost reduction actions
router.get('/cost-actions', async (req, res, next) => {
  try {
    const { serviceOffering } = req.query;
    const where = {};
    if (serviceOffering) where.serviceOffering = serviceOffering;
    const actions = await prisma.costAction.findMany({
      where,
      orderBy: [{ targetDate: 'asc' }],
    });
    res.json(actions);
  } catch (err) { next(err); }
});

// GET /api/coverage — all coverage with product info (supports filters)
router.get('/coverage', async (req, res, next) => {
  try {
    const productWhere = buildProductWhere(req.query);
    const coverage = await prisma.countryCoverage.findMany({
      where: Object.keys(productWhere).length ? { product: productWhere } : undefined,
      include: { product: { select: { id: true, name: true, category: true } } },
    });
    res.json(coverage);
  } catch (err) { next(err); }
});

// GET /api/sla — all SLA data with product info (supports filters)
router.get('/sla', async (req, res, next) => {
  try {
    const productWhere = buildProductWhere(req.query);
    const sla = await prisma.slaData.findMany({
      where: Object.keys(productWhere).length ? { product: productWhere } : undefined,
      include: { product: { select: { id: true, name: true, category: true } } },
    });
    res.json(sla);
  } catch (err) { next(err); }
});

// GET /api/bizcase — all business cases with product info and lines (supports filters)
router.get('/bizcase', async (req, res, next) => {
  try {
    const productWhere = buildProductWhere(req.query);
    const cases = await prisma.businessCase.findMany({
      where: Object.keys(productWhere).length ? { product: productWhere } : undefined,
      include: {
        product: { select: { id: true, name: true, category: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });
    res.json(cases);
  } catch (err) { next(err); }
});

// GET /api/products/:id — full detail with all relations
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        costs: true,
        npd: true,
        trading: true,
        coverage: true,
        sla: true,
        bizCase: true,
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/costs
router.get('/:id/costs', async (req, res, next) => {
  try {
    const costs = await prisma.productCost.findMany({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(costs);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/npd
router.get('/:id/npd', async (req, res, next) => {
  try {
    const npd = await prisma.npdStage.findUnique({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(npd);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id/npd
router.put('/:id/npd', async (req, res, next) => {
  try {
    const npd = await prisma.npdStage.upsert({
      where: { productId: parseInt(req.params.id) },
      create: { productId: parseInt(req.params.id), ...req.body },
      update: req.body,
    });
    res.json(npd);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/trading
router.get('/:id/trading', async (req, res, next) => {
  try {
    const trading = await prisma.tradingData.findMany({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(trading);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/coverage
router.get('/:id/coverage', async (req, res, next) => {
  try {
    const coverage = await prisma.countryCoverage.findMany({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(coverage);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/sla
router.get('/:id/sla', async (req, res, next) => {
  try {
    const sla = await prisma.slaData.findUnique({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(sla);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/bizcase
router.get('/:id/bizcase', async (req, res, next) => {
  try {
    const bc = await prisma.businessCase.findUnique({
      where: { productId: parseInt(req.params.id) },
    });
    res.json(bc);
  } catch (err) {
    next(err);
  }
});

export default router;

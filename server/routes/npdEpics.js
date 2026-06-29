import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

const STANDARD_ACTIVITIES = [
  // 1. Market & Go-Live Dates
  { category: 'Market & Go-Live Dates', label: 'Overall go-live date confirmed', sortOrder: 1 },
  { category: 'Market & Go-Live Dates', label: 'Per-market go-live date confirmed (or noted as consistent across all markets)', sortOrder: 2 },
  { category: 'Market & Go-Live Dates', label: 'Actual go-live date recorded per market (populated at point of launch)', sortOrder: 3 },
  // 2. Systems Readiness
  { category: 'Systems Readiness', label: 'SAT tables updated — availability period', sortOrder: 4 },
  { category: 'Systems Readiness', label: 'Product tables updated', sortOrder: 5 },
  { category: 'Systems Readiness', label: 'Regulatory tables updated — availability and features', sortOrder: 6 },
  { category: 'Systems Readiness', label: 'Billing systems updated', sortOrder: 7 },
  { category: 'Systems Readiness', label: 'Any other back-end system dependencies confirmed and updated', sortOrder: 8 },
  // 3. VBTS Readiness
  { category: 'VBTS Readiness', label: 'VBTS updated with product / feature details', sortOrder: 9 },
  { category: 'VBTS Readiness', label: 'VBTS delivery processes and related components documented and updated', sortOrder: 10 },
  { category: 'VBTS Readiness', label: 'Ordering journey tested and confirmed functional', sortOrder: 11 },
  { category: 'VBTS Readiness', label: 'End-to-end ordering process documented', sortOrder: 12 },
  { category: 'VBTS Readiness', label: 'If third-party product — deal registration process confirmed and in place', sortOrder: 13 },
  { category: 'VBTS Readiness', label: 'If third-party product — ordering from distributor process confirmed and tested', sortOrder: 14 },
  { category: 'VBTS Readiness', label: 'In-life related journeys completed and tested', sortOrder: 15 },
  // 4. Commercial Readiness
  { category: 'Commercial Readiness', label: 'Pricing tool updated for each applicable market', sortOrder: 16 },
  { category: 'Commercial Readiness', label: 'Pricing-related system updates agreed and completed across all relevant systems', sortOrder: 17 },
  // 5. Sales Readiness
  { category: 'Sales Readiness', label: 'Sales teams trained and enabled', sortOrder: 18 },
  { category: 'Sales Readiness', label: 'Sales play confirmed available and distributed', sortOrder: 19 },
  { category: 'Sales Readiness', label: 'E-learning and / or technical training completed', sortOrder: 20 },
  { category: 'Sales Readiness', label: 'All sales-facing materials updated', sortOrder: 21 },
  { category: 'Sales Readiness', label: 'All customer-facing materials updated', sortOrder: 22 },
  { category: 'Sales Readiness', label: 'Overall proposition updated — not just the product in isolation, but the wider proposition it sits within', sortOrder: 23 },
  // 6. Marketing Readiness
  { category: 'Marketing Readiness', label: 'Customer-facing assets live', sortOrder: 24 },
  { category: 'Marketing Readiness', label: 'Market-specific communications completed', sortOrder: 25 },
  { category: 'Marketing Readiness', label: 'Campaign plan activated', sortOrder: 26 },
  { category: 'Marketing Readiness', label: 'Where local market-dependent — each market has confirmed they are live and able to take orders', sortOrder: 27 },
  // 7. Solution Sales Readiness
  { category: 'Solution Sales Readiness', label: 'Solution sales team briefed and knows what needs to be done to position and sell this product / feature', sortOrder: 28 },
];

function computeProgress(activities) {
  const applicable = activities.filter((a) => a.status !== 'na');
  if (applicable.length === 0) return 0;
  const done = applicable.filter((a) => a.status === 'complete').length;
  return Math.round((done / applicable.length) * 100);
}

// GET /api/npd-epics?initiativeId=X — list epics for an initiative (with progress)
router.get('/', async (req, res, next) => {
  try {
    const { initiativeId } = req.query;
    if (!initiativeId) return res.status(400).json({ error: 'initiativeId required' });

    const epics = await prisma.npdEpic.findMany({
      where: { initiativeId: String(initiativeId) },
      include: { activities: true },
      orderBy: { createdAt: 'asc' },
    });

    const result = epics.map((e) => ({
      ...e,
      progress: computeProgress(e.activities),
      totalActivities: e.activities.filter((a) => a.status !== 'na').length,
      completedActivities: e.activities.filter((a) => a.status === 'complete').length,
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/npd-epics — create epic, auto-seed standard activities
router.post('/', async (req, res, next) => {
  try {
    const {
      initiativeId, productCanvas, epicName, epicType, description,
      capex, opex, marketsAgreed, goLiveDateOverall, goLiveDatePerMarket,
    } = req.body;

    if (!initiativeId || !epicName) return res.status(400).json({ error: 'initiativeId and epicName required' });

    const epic = await prisma.npdEpic.create({
      data: {
        initiativeId: String(initiativeId),
        productCanvas: productCanvas || null,
        epicName,
        epicType: epicType || null,
        description: description || null,
        capex: capex != null ? parseFloat(capex) : null,
        opex: opex != null ? parseFloat(opex) : null,
        marketsAgreed: marketsAgreed || null,
        goLiveDateOverall: goLiveDateOverall ? new Date(goLiveDateOverall) : null,
        goLiveDatePerMarket: goLiveDatePerMarket || null,
        activities: {
          create: STANDARD_ACTIVITIES,
        },
      },
      include: { activities: true },
    });

    res.status(201).json({ ...epic, progress: 0, totalActivities: epic.activities.length, completedActivities: 0 });
  } catch (err) { next(err); }
});

// GET /api/npd-epics/:id — full epic with activities
router.get('/:id', async (req, res, next) => {
  try {
    const epic = await prisma.npdEpic.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { activities: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!epic) return res.status(404).json({ error: 'Not found' });
    res.json({ ...epic, progress: computeProgress(epic.activities) });
  } catch (err) { next(err); }
});

// PUT /api/npd-epics/:id — update epic header + sign-off fields
router.put('/:id', async (req, res, next) => {
  try {
    const allowed = [
      'productCanvas', 'epicName', 'epicType', 'description',
      'capex', 'opex', 'marketsAgreed', 'goLiveDateOverall',
      'goLiveDatePerMarket', 'riskLevel',
      'signOffComplete', 'signOffBy', 'signOffDate', 'signOffNotes',
    ];
    const data = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'capex' || k === 'opex') data[k] = req.body[k] != null ? parseFloat(req.body[k]) : null;
        else if (k === 'goLiveDateOverall' || k === 'signOffDate') data[k] = req.body[k] ? new Date(req.body[k]) : null;
        else data[k] = req.body[k];
      }
    }

    const epic = await prisma.npdEpic.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { activities: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ ...epic, progress: computeProgress(epic.activities) });
  } catch (err) { next(err); }
});

// DELETE /api/npd-epics/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.npdEpic.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/npd-epics/:id/activities/:activityId — update status (pending/complete/na)
router.put('/:id/activities/:activityId', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'complete', 'na'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const activity = await prisma.npdEpicActivity.update({
      where: { id: parseInt(req.params.activityId) },
      data: { status },
    });
    res.json(activity);
  } catch (err) { next(err); }
});

// POST /api/npd-epics/:id/activities — add custom milestone
router.post('/:id/activities', async (req, res, next) => {
  try {
    const { label } = req.body;
    if (!label) return res.status(400).json({ error: 'label required' });

    const maxSort = await prisma.npdEpicActivity.aggregate({
      where: { epicId: parseInt(req.params.id) },
      _max: { sortOrder: true },
    });

    const activity = await prisma.npdEpicActivity.create({
      data: {
        epicId: parseInt(req.params.id),
        category: 'Other',
        label,
        status: 'pending',
        isCustom: true,
        sortOrder: (maxSort._max.sortOrder || 28) + 1,
      },
    });
    res.status(201).json(activity);
  } catch (err) { next(err); }
});

export default router;

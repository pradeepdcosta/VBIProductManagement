import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import prisma from '../lib/prisma.js';
import { STANDARD_ACTIVITIES } from './npdEpics.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (v) => (v === null || v === undefined ? '' : String(v).trim());
const orNull = (v) => str(v) || null;

// Find the sheet whose header row contains every required column, and return
// its rows as objects keyed by header. Header may not be on the first row.
function readSheet(buffer, requiredHeaders) {
  const wb = XLSX.read(buffer, { cellDates: true });
  for (const name of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    const headerIdx = grid.findIndex((row) => requiredHeaders.every((h) => row.map(str).includes(h)));
    if (headerIdx === -1) continue;
    const headers = grid[headerIdx].map(str);
    const rows = grid.slice(headerIdx + 1)
      .filter((row) => row.some((c) => str(c)))
      .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] instanceof Date ? row[i].toISOString().slice(0, 10) : row[i]])));
    return { sheetName: name, rows };
  }
  return null;
}

function requireFile(req, res) {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return false;
  }
  return true;
}

// ─── Product taxonomy ─────────────────────────────────────────────────────────

const TAXONOMY_HEADERS = ['Product Offering ID', 'Product Name', 'Product Portfolio Name', 'Product Family Name', 'Product Line Name'];

// A product is shown in the catalog when VBI Portal List = Yes, or the
// New VBI Checked review says Yes / Move to VBI.
function defaultVisibility(portalList, vbiChecked) {
  const p = portalList.toLowerCase();
  const c = vbiChecked.toLowerCase();
  return p === 'yes' || c === 'yes' || c === 'move to vbi';
}

function parseTaxonomyRow(r) {
  const portalList = str(r['VBI Portal List']);
  const vbiChecked = str(r['New VBI Checked']);
  const managerEmail = orNull(r['Product Manager Email']);
  return {
    offeringId: str(r['Product Offering ID']),
    name: str(r['Product Name']),
    category: str(r['Product Portfolio Name']) || 'Unassigned',
    family: str(r['Product Family Name']) || 'Unassigned',
    productLine: str(r['Product Line Name']) || 'Unassigned',
    market: orNull(r['Market']),
    mainLifecycle: orNull(r['Main Lifecycle Stage']),
    lifecycleStage: orNull(r['Lifecycle Stage']),
    status: str(r['Main Lifecycle Stage']) || 'Live',
    portalList: portalList || null,
    vbiChecked: vbiChecked || null,
    managerEmail,
    owner: managerEmail ? managerEmail.split(';')[0].trim() : 'VBI Product Team',
    description: orNull(r['Product Offering Description']),
    taxonomy: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
    defaultShow: defaultVisibility(portalList, vbiChecked),
  };
}

// Work out what an import would do, without writing anything.
async function planTaxonomy(buffer) {
  const sheet = readSheet(buffer, TAXONOMY_HEADERS);
  if (!sheet) throw Object.assign(new Error(`No sheet with columns: ${TAXONOMY_HEADERS.join(', ')}`), { status: 400 });

  const incoming = sheet.rows.map(parseTaxonomyRow).filter((p) => p.offeringId && p.name);
  const existing = await prisma.product.findMany({
    include: { sla: { select: { id: true } }, _count: { select: { costs: true, trading: true, coverage: true } } },
  });

  const byOffering = new Map(existing.filter((p) => p.offeringId).map((p) => [p.offeringId, p]));
  // Legacy products (no offering ID) can be adopted by name so their linked data survives.
  // Names are compared ignoring case, spaces and punctuation ("IPVPN" = "IP-VPN").
  const nameKey = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hasLinkedData = (p) => p.sla || p._count.costs || p._count.trading || p._count.coverage;
  const legacyByName = new Map();
  for (const p of existing.filter((e) => !e.offeringId)) {
    const k = nameKey(p.name);
    // Where duplicate legacy names exist, prefer the one carrying linked data
    if (!legacyByName.has(k) || (!hasLinkedData(legacyByName.get(k)) && hasLinkedData(p))) legacyByName.set(k, p);
  }

  // When a name appears twice in the file, let the row shown in the catalog adopt the legacy product.
  const ordered = [...incoming].sort((a, b) => Number(b.defaultShow) - Number(a.defaultShow));
  const claimed = new Set();
  const actions = [];
  for (const p of ordered) {
    let match = byOffering.get(p.offeringId);
    let matchedBy = 'offeringId';
    if (!match) {
      const legacy = legacyByName.get(nameKey(p.name));
      if (legacy && !claimed.has(legacy.id)) { match = legacy; matchedBy = 'name'; }
    }
    if (match) claimed.add(match.id);
    actions.push({ product: p, match, matchedBy });
  }

  // Products added by hand in Admin are kept even though the file doesn't list them
  const isManual = (p) => p.taxonomy?._source === 'manual';
  const unclaimed = existing.filter((p) => !claimed.has(p.id));
  const toDelete = unclaimed.filter((p) => !isManual(p));
  const keptManual = unclaimed.filter(isManual);
  const hasLinked = hasLinkedData;
  const shown = actions.filter((a) => {
    const override = a.match?.taxonomy?._visibilityOverride;
    return typeof override === 'boolean' ? override : a.product.defaultShow;
  });

  const byPortfolio = {};
  for (const a of shown) byPortfolio[a.product.category] = (byPortfolio[a.product.category] || 0) + 1;

  return {
    sheetName: sheet.sheetName,
    actions,
    toDelete,
    summary: {
      rowsInFile: incoming.length,
      toCreate: actions.filter((a) => !a.match).length,
      toUpdate: actions.filter((a) => a.match).length,
      adoptedByName: actions.filter((a) => a.matchedBy === 'name' && a.match).length,
      toDelete: toDelete.length,
      keptAddedInPortal: keptManual.map((p) => p.name),
      shownInCatalog: shown.length + keptManual.filter((p) => p.showInCatalog).length,
      hiddenInCatalog: incoming.length - shown.length + keptManual.filter((p) => !p.showInCatalog).length,
      shownByPortfolio: byPortfolio,
      linkedDataKept: actions.filter((a) => a.match && hasLinked(a.match)).map((a) => a.product.name),
      linkedDataLost: toDelete.filter(hasLinked).map((p) => p.name),
    },
  };
}

// POST /api/admin/taxonomy?apply=1 — upload the product taxonomy.
// Without apply=1 it only returns the preview.
router.post('/taxonomy', upload.single('file'), async (req, res, next) => {
  try {
    if (!requireFile(req, res)) return;
    const plan = await planTaxonomy(req.file.buffer);
    if (req.query.apply !== '1') return res.json({ preview: true, ...plan.summary });

    await prisma.$transaction(async (tx) => {
      for (const { product: p, match } of plan.actions) {
        const override = match?.taxonomy?._visibilityOverride;
        const taxonomy = typeof override === 'boolean' ? { ...p.taxonomy, _visibilityOverride: override } : p.taxonomy;
        const data = {
          offeringId: p.offeringId,
          name: p.name,
          category: p.category,
          family: p.family,
          productLine: p.productLine,
          market: p.market,
          mainLifecycle: p.mainLifecycle,
          lifecycleStage: p.lifecycleStage,
          status: p.status,
          portalList: p.portalList,
          vbiChecked: p.vbiChecked,
          managerEmail: p.managerEmail,
          owner: p.owner,
          description: p.description,
          taxonomy,
          showInCatalog: typeof override === 'boolean' ? override : p.defaultShow,
        };
        if (match) await tx.product.update({ where: { id: match.id }, data });
        else await tx.product.create({ data });
      }
      if (plan.toDelete.length) {
        await tx.product.deleteMany({ where: { id: { in: plan.toDelete.map((p) => p.id) } } });
      }
    }, { timeout: 120000 });

    res.json({ preview: false, ...plan.summary, message: `Taxonomy imported: ${plan.summary.rowsInFile} products, ${plan.summary.shownInCatalog} shown in catalog` });
  } catch (err) { next(err); }
});

// GET /api/admin/products — full taxonomy list (shown and hidden)
router.get('/products', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: ADMIN_PRODUCT_SELECT,
      orderBy: [{ category: 'asc' }, { family: 'asc' }, { productLine: 'asc' }, { name: 'asc' }],
    });
    res.json(products.map(toAdminProduct));
  } catch (err) { next(err); }
});

const ADMIN_PRODUCT_SELECT = {
  id: true, offeringId: true, name: true, category: true, family: true, productLine: true,
  market: true, mainLifecycle: true, lifecycleStage: true, portalList: true, vbiChecked: true,
  managerEmail: true, description: true, showInCatalog: true, taxonomy: true,
};

function toAdminProduct({ taxonomy, ...p }) {
  return {
    ...p,
    manualVisibility: typeof taxonomy?._visibilityOverride === 'boolean',
    addedInPortal: taxonomy?._source === 'manual',
  };
}

// Editable product fields → matching column in the taxonomy file, so the stored
// copy of the row stays consistent with what the portal shows.
const PRODUCT_FIELDS = {
  offeringId: 'Product Offering ID',
  name: 'Product Name',
  category: 'Product Portfolio Name',
  family: 'Product Family Name',
  productLine: 'Product Line Name',
  market: 'Market',
  mainLifecycle: 'Main Lifecycle Stage',
  lifecycleStage: 'Lifecycle Stage',
  portalList: 'VBI Portal List',
  vbiChecked: 'New VBI Checked',
  managerEmail: 'Product Manager Email',
  description: 'Product Offering Description',
};
const REQUIRED_PRODUCT_FIELDS = ['name', 'category', 'family', 'productLine'];

// Validate an admin product form and build the Prisma data for it.
function buildProductData(body, current) {
  const values = {};
  for (const k of Object.keys(PRODUCT_FIELDS)) {
    if (body[k] !== undefined) values[k] = str(body[k]) || null;
    else if (current) values[k] = current[k] ?? null;
    else values[k] = null;
  }
  for (const k of REQUIRED_PRODUCT_FIELDS) {
    if (!values[k]) return { error: `${k === 'productLine' ? 'Product line' : k[0].toUpperCase() + k.slice(1)} is required` };
  }
  if (values.managerEmail && !values.managerEmail.split(';').every((e) => /^\S+@\S+\.\S+$/.test(e.trim()))) {
    return { error: 'Product manager email is not a valid email address' };
  }

  const taxonomy = { ...(current?.taxonomy || {}) };
  for (const [k, column] of Object.entries(PRODUCT_FIELDS)) taxonomy[column] = values[k] ?? '';
  if (!current) taxonomy._source = 'manual';

  // Visibility: follow the Yes / Move to VBI rule unless the admin chose otherwise
  const ruleShow = defaultVisibility(values.portalList || '', values.vbiChecked || '');
  let showInCatalog = ruleShow;
  if (typeof body.showInCatalog === 'boolean') showInCatalog = body.showInCatalog;
  else if (typeof taxonomy._visibilityOverride === 'boolean') showInCatalog = taxonomy._visibilityOverride;
  if (showInCatalog === ruleShow) delete taxonomy._visibilityOverride;
  else taxonomy._visibilityOverride = showInCatalog;

  return {
    data: {
      ...values,
      status: values.mainLifecycle || 'Live',
      owner: values.managerEmail ? values.managerEmail.split(';')[0].trim() : 'VBI Product Team',
      showInCatalog,
      taxonomy,
    },
  };
}

function productWriteError(err, res, next) {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Another product already uses that Product Offering ID' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
  return next(err);
}

// POST /api/admin/products — add a product by hand (kept on future taxonomy uploads)
router.post('/products', async (req, res, next) => {
  try {
    const { data, error } = buildProductData(req.body, null);
    if (error) return res.status(400).json({ error });
    const created = await prisma.product.create({ data, select: ADMIN_PRODUCT_SELECT });
    res.status(201).json(toAdminProduct(created));
  } catch (err) { productWriteError(err, res, next); }
});

// PUT /api/admin/products/:id — edit a product's taxonomy fields
router.put('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const current = await prisma.product.findUnique({ where: { id }, select: ADMIN_PRODUCT_SELECT });
    if (!current) return res.status(404).json({ error: 'Product not found' });
    const { data, error } = buildProductData(req.body, current);
    if (error) return res.status(400).json({ error });
    const updated = await prisma.product.update({ where: { id }, data, select: ADMIN_PRODUCT_SELECT });
    res.json(toAdminProduct(updated));
  } catch (err) { productWriteError(err, res, next); }
});

// DELETE /api/admin/products/:id — removes the product and its linked data
router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { productWriteError(err, res, next); }
});

// PATCH /api/admin/products/:id — show/hide a product in the catalog.
// The manual choice is remembered and survives future taxonomy uploads.
router.patch('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || typeof req.body.showInCatalog !== 'boolean') return res.status(400).json({ error: 'id and boolean showInCatalog required' });
    const current = await prisma.product.findUnique({ where: { id }, select: { taxonomy: true } });
    if (!current) return res.status(404).json({ error: 'Product not found' });
    const updated = await prisma.product.update({
      where: { id },
      data: { showInCatalog: req.body.showInCatalog, taxonomy: { ...(current.taxonomy || {}), _visibilityOverride: req.body.showInCatalog } },
      select: ADMIN_PRODUCT_SELECT,
    });
    res.json(toAdminProduct(updated));
  } catch (err) { next(err); }
});

// ─── NPD cycle import ─────────────────────────────────────────────────────────

const NPD_HEADERS = ['Level', 'NPD ID', 'NPD Action'];

const EPIC_CATEGORY_TO_ROADMAP = {
  'new product development': 'Product Launch',
  'market expansion': 'Product Launch',
  'new capability/feature': 'Feature Release',
  'cx improvement': 'Feature Release',
  'technical enabler/enhancement': 'Technical Enabler',
  'cross portfolio': 'Technical Enabler',
  'compliance': 'Technical Enabler',
  'simplification/cost saving': 'Product Rationalization',
  'rationalisation': 'Product Rationalization',
  'innovation/seedcorn': 'Aspirational',
};

const DRIVER_TO_ROADMAP = {
  'new product': 'Product Launch',
  'market expansion': 'Product Launch',
  'product enhancements': 'Feature Release',
  'technical enabler': 'Technical Enabler',
  'rationalisation': 'Product Rationalization',
  'simplification/ cost saving': 'Product Rationalization',
  'simplification/cost saving': 'Product Rationalization',
  'innovation/ seedcorn': 'Aspirational',
  'innovation/seedcorn': 'Aspirational',
};

// Roadmap category = most common category across the action's epics, with the
// investment driver counted twice and used to break ties.
function inferRoadmapCategory(driver, epics) {
  const fromDriver = DRIVER_TO_ROADMAP[driver.toLowerCase()];
  const votes = {};
  for (const e of epics) {
    const c = EPIC_CATEGORY_TO_ROADMAP[str(e['Epic Category']).toLowerCase()];
    if (c) votes[c] = (votes[c] || 0) + 1;
  }
  if (fromDriver) votes[fromDriver] = (votes[fromDriver] || 0) + 2;
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1] || (a[0] === fromDriver ? -1 : b[0] === fromDriver ? 1 : 0));
  return ranked[0]?.[0] || fromDriver || 'Feature Release';
}

// Budget review columns: "VBI Review (Day 1)", "VBI Review (Day 2)", ..., "VBI Review (Final)".
// Values like "Yes - Day 1" / "No" become Approved / Not approved for that stage.
function parseDbReview(row) {
  const review = {};
  for (const [header, value] of Object.entries(row)) {
    const m = /^VBI Review \((Day ([123])|Final[^)]*)\)$/i.exec(str(header));
    if (!m) continue;
    const stage = m[2] ? `day${m[2]}` : 'final';
    const v = str(value).toLowerCase();
    if (v.startsWith('yes')) review[stage] = 'Approved';
    else if (v.startsWith('no')) review[stage] = 'Not approved';
  }
  return review;
}

function parseNpd(buffer) {
  const sheet = readSheet(buffer, NPD_HEADERS);
  if (!sheet) throw Object.assign(new Error(`No sheet with columns: ${NPD_HEADERS.join(', ')}`), { status: 400 });

  const actionRows = sheet.rows.filter((r) => str(r.Level).toLowerCase() === 'npd action');
  const epicRows = sheet.rows.filter((r) => str(r.Level).toLowerCase() === 'epic' && str(r.Epic));
  const placeholderEpics = sheet.rows.filter((r) => str(r.Level).toLowerCase() === 'epic' && !str(r.Epic)).length;

  const actions = actionRows.map((r) => {
    const externalId = parseInt(r['NPD ID']);
    const epics = epicRows.filter((e) => parseInt(e['NPD ID']) === externalId);
    const driver = str(r['Investment Driver']);
    return {
      externalId,
      initiative: {
        market: 'VBI',
        portfolio: str(r.Portfolio) || 'Unassigned',
        productFamily: str(r['Product Family']) || 'Unassigned',
        productLine: str(r['Product Line']) || 'Unassigned',
        initiativeName: str(r['NPD Action']),
        primaryInvestmentDriver: driver || null,
        groupOwner: orNull(r['Group Owner']),
        vbiReview: orNull(r['VBI Review (Day 1)']),
        dbReviewFromFile: parseDbReview(r),
        vbiTargetPortfolio: orNull(r['VBI Target Portfolio?']),
        aiFlag: orNull(r['AI?']),
        localItImpact: orNull(r['Local IT Impact?']),
        vbiResponse: orNull(r['VBI NPD Action Response']),
      },
      roadmapCategory: inferRoadmapCategory(driver, epics),
      epics: epics.map((e) => ({
        externalEpicId: parseInt(e['Epic ID']) || null,
        epicName: str(e.Epic),
        description: orNull(e['Epic Details']),
        epicCategory: orNull(e['Epic Category']),
        vbiTargetPortfolio: orNull(e['VBI Target Portfolio?']),
        groupAccountability: orNull(e['Group Accountability']),
        vbiAccountability: orNull(e['VBI (Market) Accountability']),
        vbiImportance: orNull(e['VBI Importance']),
        vbiResponse: orNull(e['VBI Epic Response']),
        checkFlag: orNull(e['Check Flag']),
      })),
    };
  }).filter((a) => a.externalId && a.initiative.initiativeName);

  return { sheetName: sheet.sheetName, actions, placeholderEpics };
}

// Spread new actions across Q1–Q4, interleaving portfolios so each quarter gets a mix.
function staggerQuarters(actions) {
  const sorted = [...actions].sort((a, b) => a.initiative.portfolio.localeCompare(b.initiative.portfolio) || a.externalId - b.externalId);
  const quarterOf = new Map();
  sorted.forEach((a, i) => quarterOf.set(a.externalId, QUARTERS[i % QUARTERS.length]));
  return quarterOf;
}

async function planNpd(buffer, fy) {
  const parsed = parseNpd(buffer);
  const existing = await prisma.npdInitiative.findMany({ where: { fy }, select: { id: true, externalId: true, initiativeName: true, dbReview: true } });
  const existingByExt = new Map(existing.filter((e) => e.externalId != null).map((e) => [e.externalId, e]));
  const incomingIds = new Set(parsed.actions.map((a) => a.externalId));
  const newActions = parsed.actions.filter((a) => !existingByExt.has(a.externalId));

  const categories = {};
  for (const a of newActions) categories[a.roadmapCategory] = (categories[a.roadmapCategory] || 0) + 1;

  return {
    parsed,
    existingByExt,
    quarterOf: staggerQuarters(newActions),
    summary: {
      fy,
      sheetName: parsed.sheetName,
      actionsInFile: parsed.actions.length,
      epicsInFile: parsed.actions.reduce((s, a) => s + a.epics.length, 0),
      placeholderEpicsSkipped: parsed.placeholderEpics,
      initiativesToCreate: newActions.length,
      initiativesToUpdate: parsed.actions.length - newActions.length,
      inDatabaseNotInFile: existing.filter((e) => e.externalId == null || !incomingIds.has(e.externalId)).map((e) => e.initiativeName),
      newByRoadmapCategory: categories,
    },
  };
}

// POST /api/admin/npd?fy=FY28&apply=1 — import an NPD cycle (actions + epics) for one year.
// Re-importing updates the fields that come from the file and keeps everything set
// in the portal (quarter, status, category, stage gates, epic checklists, sign-off).
router.post('/npd', upload.single('file'), async (req, res, next) => {
  try {
    if (!requireFile(req, res)) return;
    const fy = str(req.query.fy).toUpperCase();
    if (!/^FY\d{2}$/.test(fy)) return res.status(400).json({ error: 'fy must look like FY28' });

    const plan = await planNpd(req.file.buffer, fy);
    if (req.query.apply !== '1') return res.json({ preview: true, ...plan.summary });

    let epicsCreated = 0, epicsUpdated = 0;
    await prisma.$transaction(async (tx) => {
      for (const a of plan.parsed.actions) {
        const found = plan.existingByExt.get(a.externalId);
        // Review stages in the file are added to (not replacing) stages already set in the portal
        const { dbReviewFromFile, ...fields } = a.initiative;
        const dbReview = { day1: null, day2: null, day3: null, final: null, ...(found?.dbReview || {}), ...dbReviewFromFile };
        const initiative = found
          ? await tx.npdInitiative.update({ where: { id: found.id }, data: { ...fields, dbReview } })
          : await tx.npdInitiative.create({
              data: {
                ...fields,
                dbReview,
                externalId: a.externalId,
                fy,
                quarter: plan.quarterOf.get(a.externalId),
                status: 'Not Started',
                roadmapCategory: a.roadmapCategory,
                stages: {},
              },
            });

        const initiativeId = String(initiative.id);
        const existingEpics = await tx.npdEpic.findMany({ where: { initiativeId }, select: { id: true, externalEpicId: true } });
        const epicByExt = new Map(existingEpics.filter((e) => e.externalEpicId != null).map((e) => [e.externalEpicId, e]));

        for (const e of a.epics) {
          const match = e.externalEpicId != null ? epicByExt.get(e.externalEpicId) : null;
          if (match) {
            await tx.npdEpic.update({ where: { id: match.id }, data: e });
            epicsUpdated++;
          } else {
            await tx.npdEpic.create({ data: { ...e, initiativeId, activities: { create: STANDARD_ACTIVITIES } } });
            epicsCreated++;
          }
        }
      }
    }, { timeout: 180000 });

    res.json({ preview: false, ...plan.summary, epicsCreated, epicsUpdated, message: `${fy} NPD imported: ${plan.summary.actionsInFile} initiatives, ${epicsCreated + epicsUpdated} epics` });
  } catch (err) { next(err); }
});

export default router;

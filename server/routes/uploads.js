import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import prisma from '../lib/prisma.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/upload/catalog
router.post('/catalog', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip row 0 (pivot header) and row 1 (column headers), start from row 2
    const dataRows = rawRows.slice(2);

    // Forward-fill blank cells in cols A, B, C
    let lastCat = '', lastFam = '', lastLine = '';
    const products = [];

    for (const row of dataRows) {
      const cat = row[0] || lastCat;
      const fam = row[1] || lastFam;
      const line = row[2] || lastLine;
      const name = row[3];

      if (cat) lastCat = cat;
      if (fam) lastFam = fam;
      if (line) lastLine = line;

      if (!name || name === 'Grand Total') continue;

      products.push({
        category: String(cat).trim(),
        family: String(fam).trim(),
        productLine: String(line).trim(),
        name: String(name).trim(),
      });
    }

    // Upsert each product
    let imported = 0;
    for (const p of products) {
      await prisma.product.upsert({
        where: {
          id: (await prisma.product.findFirst({
            where: { name: p.name, category: p.category, family: p.family },
            select: { id: true },
          }))?.id || 0,
        },
        create: p,
        update: p,
      });
      imported++;
    }

    res.json({ imported, message: `Successfully imported ${imported} products` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/trading
router.post('/trading', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: row['Product Name'], mode: 'insensitive' } },
      });
      if (!product) continue;

      await prisma.tradingData.create({
        data: {
          productId: product.id,
          region: row['Region'] || '',
          fy: row['FY'] || '',
          actualEur: parseFloat(row['Revenue YTD (€M)'] || row['Actual (€M)'] || 0),
          targetEur: parseFloat(row['Revenue Target (€M)'] || row['Target (€M)'] || 0),
          pyActualEur: row['PY Actual (€M)'] ? parseFloat(row['PY Actual (€M)']) : null,
          aovWonYtd: row['AOV Won YTD (€M)'] ? parseFloat(row['AOV Won YTD (€M)']) : null,
          aovTarget: row['AOV Target (€M)'] ? parseFloat(row['AOV Target (€M)']) : null,
          aovPipelineOpen: row['AOV Pipeline Open (€M)'] ? parseFloat(row['AOV Pipeline Open (€M)']) : null,
          aovPipelineOpenedYtd: row['AOV Pipeline Opened YTD (€M)'] ? parseFloat(row['AOV Pipeline Opened YTD (€M)']) : null,
        },
      });
      imported++;
    }

    res.json({ imported, message: `Imported ${imported} trading records` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/costs
router.post('/costs', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: row['Product Name'], mode: 'insensitive' } },
      });
      if (!product) continue;

      await prisma.productCost.create({
        data: {
          productId: product.id,
          component: row['Component'] || row['Cost Component'] || '',
          amountEur: parseFloat(row['Amount (€M)'] || row['Amount'] || 0),
          fy: row['FY'] || 'FY26',
        },
      });
      imported++;
    }

    res.json({ imported, message: `Imported ${imported} cost records` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/npd
router.post('/npd', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: row['Product Name'], mode: 'insensitive' } },
      });
      if (!product) continue;

      await prisma.npdStage.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          concept: parseInt(row['Concept'] || 0),
          bizCase: parseInt(row['Business Case'] || 0),
          design: parseInt(row['Design'] || 0),
          gtm: parseInt(row['GTM'] || 0),
          salesEnable: parseInt(row['Sales Enablement'] || 0),
          distribution: parseInt(row['Distribution'] || 0),
          slaDefinition: parseInt(row['SLA Definition'] || 0),
          launch: parseInt(row['Launch'] || 0),
          owner: row['Owner'] || null,
          targetLaunch: row['Target Launch'] ? new Date(row['Target Launch']) : null,
        },
        update: {
          concept: parseInt(row['Concept'] || 0),
          bizCase: parseInt(row['Business Case'] || 0),
          design: parseInt(row['Design'] || 0),
          gtm: parseInt(row['GTM'] || 0),
          salesEnable: parseInt(row['Sales Enablement'] || 0),
          distribution: parseInt(row['Distribution'] || 0),
          slaDefinition: parseInt(row['SLA Definition'] || 0),
          launch: parseInt(row['Launch'] || 0),
          owner: row['Owner'] || null,
          targetLaunch: row['Target Launch'] ? new Date(row['Target Launch']) : null,
        },
      });
      imported++;
    }

    res.json({ imported, message: `Imported ${imported} NPD records` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/coverage
router.post('/coverage', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: row['Product Name'] || row['Product'], mode: 'insensitive' } },
      });
      if (!product) continue;

      const countries = ['UK', 'DE', 'IT', 'ES', 'NL', 'PT', 'US', 'ZA', 'IN', 'AU', 'JP', 'SG', 'AE', 'NG'];
      for (const cc of countries) {
        if (row[cc] !== undefined) {
          await prisma.countryCoverage.upsert({
            where: { productId_countryCode: { productId: product.id, countryCode: cc } },
            create: { productId: product.id, countryCode: cc, status: String(row[cc]).toLowerCase() },
            update: { status: String(row[cc]).toLowerCase() },
          });
          imported++;
        }
      }
    }

    res.json({ imported, message: `Imported ${imported} coverage entries` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/sla
router.post('/sla', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: row['Product Name'] || row['Product'], mode: 'insensitive' } },
      });
      if (!product) continue;

      await prisma.slaData.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          availability: row['Availability'] || '',
          mttr: row['MTTR'] || '',
          responseTime: row['Response Time'] || '',
          supportHours: row['Support Hours'] || '',
          escalation: row['Escalation'] || null,
          reviewFreq: row['Review Frequency'] || null,
        },
        update: {
          availability: row['Availability'] || '',
          mttr: row['MTTR'] || '',
          responseTime: row['Response Time'] || '',
          supportHours: row['Support Hours'] || '',
          escalation: row['Escalation'] || null,
          reviewFreq: row['Review Frequency'] || null,
        },
      });
      imported++;
    }

    res.json({ imported, message: `Imported ${imported} SLA records` });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/bizcase
router.post('/bizcase', upload.single('file'), async (req, res, next) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    // Look for P&L sheet, fall back to first sheet
    const sheetName = workbook.SheetNames.find(n => n.includes('P&L')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Resolve product: prefer productId query param, fall back to cell B1
    let product;
    if (req.query.productId) {
      product = await prisma.product.findUnique({ where: { id: parseInt(req.query.productId) } });
      if (!product) {
        return res.status(400).json({ error: 'Selected product not found' });
      }
    } else {
      const productName = rows[0]?.[1];
      if (!productName) {
        return res.status(400).json({ error: 'Product Name not found in cell B1 of P&L sheet' });
      }
      product = await prisma.product.findFirst({
        where: { name: { contains: String(productName).trim(), mode: 'insensitive' } },
      });
      if (!product) {
        return res.status(400).json({ error: `Product "${productName}" not found in catalog` });
      }
    }

    // Row 2 is header: [lineItem, FY27, FY28, FY29, FY30, FY31, Total]
    // Data rows start at row 3 (index 3)
    const dataStartIdx = 3;

    // Find the summary section (look for "FY27-FY31" marker)
    let summaryIdx = -1;
    for (let i = dataStartIdx; i < rows.length; i++) {
      const cell = String(rows[i]?.[0] || '').trim();
      if (cell === 'FY27-FY31') {
        summaryIdx = i;
        break;
      }
    }

    // Parse line items
    const lineItems = [];
    const endIdx = summaryIdx > 0 ? summaryIdx : rows.length;

    for (let i = dataStartIdx; i < endIdx; i++) {
      const row = rows[i];
      const label = String(row?.[0] || '').trim();
      if (!label) continue;

      const parseVal = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        // Handle bracketed negatives: (1.5) → -1.5
        const s = String(v).trim();
        if (s.startsWith('(') && s.endsWith(')')) {
          return -parseFloat(s.slice(1, -1)) || null;
        }
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
      };

      lineItems.push({
        lineItem: label,
        fy27: parseVal(row?.[1]),
        fy28: parseVal(row?.[2]),
        fy29: parseVal(row?.[3]),
        fy30: parseVal(row?.[4]),
        fy31: parseVal(row?.[5]),
      });
    }

    // Parse summary
    let npv = null, roi = null, irr = null, paybackMonths = null;
    if (summaryIdx > 0) {
      for (let i = summaryIdx + 1; i < rows.length; i++) {
        const label = String(rows[i]?.[0] || '').trim().toLowerCase();
        const val = rows[i]?.[1];
        if (label === 'npv') npv = parseFloat(val) || null;
        if (label === 'roi') roi = parseFloat(String(val).replace('%', '')) || null;
        if (label === 'irr') irr = parseFloat(String(val).replace('%', '').replace('n/a', '')) || null;
        if (label === 'payback') {
          const pv = String(val).replace(/[^\d.]/g, '');
          paybackMonths = pv ? parseFloat(pv) : null;
        }
      }
    }

    // Upsert BusinessCase
    const bizCase = await prisma.businessCase.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        npv,
        roi,
        irr,
        paybackMonths: paybackMonths ? Math.round(paybackMonths * 12) : null,
        status: 'In Review',
      },
      update: { npv, roi, irr, paybackMonths: paybackMonths ? Math.round(paybackMonths * 12) : null },
    });

    // Known line items for section/sort mapping
    const { BIZCASE_TEMPLATE_ROWS } = await import('./exports.js');
    const templateMap = new Map(BIZCASE_TEMPLATE_ROWS.map(r => [r.lineItem.toLowerCase(), r]));

    // Delete existing lines and re-create
    await prisma.businessCaseLine.deleteMany({ where: { businessCaseId: bizCase.id } });

    let imported = 0;
    for (const item of lineItems) {
      const template = templateMap.get(item.lineItem.toLowerCase());
      await prisma.businessCaseLine.create({
        data: {
          businessCaseId: bizCase.id,
          section: template?.section || 'Other',
          lineItem: item.lineItem,
          sortOrder: template?.sortOrder || 99,
          isTotal: template?.isTotal || item.lineItem.toLowerCase().startsWith('total') || false,
          fy27: item.fy27,
          fy28: item.fy28,
          fy29: item.fy29,
          fy30: item.fy30,
          fy31: item.fy31,
        },
      });
      imported++;
    }

    res.json({
      imported,
      message: `Imported business case for "${product.name}" with ${imported} line items`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

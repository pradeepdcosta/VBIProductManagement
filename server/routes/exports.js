import { Router } from 'express';
import XLSX from 'xlsx';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/export/catalog
router.get('/catalog', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ category: 'asc' }, { family: 'asc' }, { productLine: 'asc' }],
    });

    const data = products.map((p) => ({
      'Product Category': p.category,
      'Product Family': p.family,
      'Product Line': p.productLine,
      'Product Name': p.name,
      Status: p.status,
      Owner: p.owner,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_product_catalog.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/trading
router.get('/trading', async (req, res, next) => {
  try {
    const trading = await prisma.tradingData.findMany({
      include: { product: { select: { name: true, category: true } } },
      orderBy: [{ fy: 'desc' }, { region: 'asc' }],
    });

    const data = trading.map((t) => ({
      'Product Name': t.product.name,
      Category: t.product.category,
      Region: t.region,
      FY: t.fy,
      'Actual (€M)': t.actualEur,
      'Target (€M)': t.targetEur,
      'PY Actual (€M)': t.pyActualEur,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Trading');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_trading_report.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/npd
router.get('/npd', async (req, res, next) => {
  try {
    const npd = await prisma.npdStage.findMany({
      include: { product: { select: { name: true, category: true } } },
    });

    const stageLabel = (v) => (v === 1 ? 'Done' : v === 2 ? 'Active' : 'Todo');
    const data = npd.map((n) => ({
      'Product Name': n.product.name,
      Category: n.product.category,
      Concept: stageLabel(n.concept),
      'Business Case': stageLabel(n.bizCase),
      Design: stageLabel(n.design),
      GTM: stageLabel(n.gtm),
      'Sales Enablement': stageLabel(n.salesEnable),
      Distribution: stageLabel(n.distribution),
      'SLA Definition': stageLabel(n.slaDefinition),
      Launch: stageLabel(n.launch),
      Owner: n.owner,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'NPD Pipeline');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_npd_tracker.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/costs
router.get('/costs', async (req, res, next) => {
  try {
    const costs = await prisma.productCost.findMany({
      include: { product: { select: { name: true, category: true, family: true } } },
      orderBy: [{ fy: 'desc' }],
    });

    const data = costs.map((c) => ({
      'Product Name': c.product.name,
      Category: c.product.category,
      Family: c.product.family,
      Component: c.component,
      'Amount (€M)': c.amountEur,
      FY: c.fy,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Costs');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_cost_summary.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// P&L template row definitions
const BIZCASE_TEMPLATE_ROWS = [
  { section: 'Revenue', lineItem: 'Revenue - Service Recurring Americas', sortOrder: 1 },
  { section: 'Revenue', lineItem: 'Revenue - Service Recurring APAC', sortOrder: 2 },
  { section: 'Revenue', lineItem: 'Revenue - Service Recurring Others', sortOrder: 3 },
  { section: 'Revenue', lineItem: 'Total Service Revenue', sortOrder: 4, isTotal: true },
  { section: 'Revenue', lineItem: 'Revenue - Non Service Recurring', sortOrder: 5 },
  { section: 'Revenue', lineItem: 'Revenue - Non Service Non Recurring', sortOrder: 6 },
  { section: 'Revenue', lineItem: 'Total Non Service Revenue', sortOrder: 7, isTotal: true },
  { section: 'Revenue', lineItem: 'Total Revenue', sortOrder: 8, isTotal: true },
  { section: 'Cost of Sale', lineItem: 'CoS - Service Recurring', sortOrder: 9 },
  { section: 'Cost of Sale', lineItem: 'CoS - Service Non Recurring', sortOrder: 10 },
  { section: 'Cost of Sale', lineItem: 'Total Service Cost of Sale', sortOrder: 11, isTotal: true },
  { section: 'Cost of Sale', lineItem: 'CoS - Non Service Recurring', sortOrder: 12 },
  { section: 'Cost of Sale', lineItem: 'CoS - Non Service Non Recurring', sortOrder: 13 },
  { section: 'Cost of Sale', lineItem: 'Total Non Service Cost of Sale', sortOrder: 14, isTotal: true },
  { section: 'Cost of Sale', lineItem: 'Total Cost of Sale', sortOrder: 15, isTotal: true },
  { section: 'Margin', lineItem: 'Sales variable margin - Service', sortOrder: 16 },
  { section: 'Margin', lineItem: 'Sales variable margin - Service %', sortOrder: 17 },
  { section: 'Margin', lineItem: 'Sales variable margin - Non Service', sortOrder: 18 },
  { section: 'Margin', lineItem: 'Sales variable margin - Non Service %', sortOrder: 19 },
  { section: 'Margin', lineItem: 'Total Sales variable margin', sortOrder: 20, isTotal: true },
  { section: 'Margin', lineItem: 'Total Sales variable margin %', sortOrder: 21, isTotal: true },
  { section: 'OpEx', lineItem: 'OpEx Run & Maintain', sortOrder: 22 },
  { section: 'OpEx', lineItem: 'OpEx New development', sortOrder: 23 },
  { section: 'OpEx', lineItem: 'OpEx Operation/Market/Customer impact', sortOrder: 24 },
  { section: 'OpEx', lineItem: 'OpEx Market cost', sortOrder: 25 },
  { section: 'OpEx', lineItem: 'Customer (OpEx)', sortOrder: 26 },
  { section: 'OpEx', lineItem: 'VB overheads', sortOrder: 27 },
  { section: 'OpEx', lineItem: 'Total OpEx', sortOrder: 28, isTotal: true },
  { section: 'EBITDA', lineItem: 'EBITDA', sortOrder: 29, isTotal: true },
  { section: 'CapEx', lineItem: 'CapEx Run & Maintain', sortOrder: 30 },
  { section: 'CapEx', lineItem: 'CapEx New development', sortOrder: 31 },
  { section: 'CapEx', lineItem: 'CapEx Operation/Market/Customer impact', sortOrder: 32 },
  { section: 'CapEx', lineItem: 'CapEx Market cost', sortOrder: 33 },
  { section: 'CapEx', lineItem: 'Customer (CapEx)', sortOrder: 34 },
  { section: 'CapEx', lineItem: 'Cap OH Customer', sortOrder: 35 },
  { section: 'CapEx', lineItem: 'Cap OH Run & Maintain', sortOrder: 36 },
  { section: 'CapEx', lineItem: 'Cap OH New Development', sortOrder: 37 },
  { section: 'CapEx', lineItem: 'Total CapEx', sortOrder: 38, isTotal: true },
  { section: 'Cash Flow', lineItem: 'Incremental Cash flow', sortOrder: 39, isTotal: true },
  { section: 'Cash Flow', lineItem: 'Cash margin %', sortOrder: 40, isTotal: true },
];

// GET /api/export/bizcase-template — downloadable blank template
router.get('/bizcase-template', async (req, res, next) => {
  try {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instrData = [
      ['VBI Business Case P&L Template'],
      [''],
      ['Instructions:'],
      ['1. Fill in the Product Name in cell B1 of the "P&L" sheet (must match an existing product name exactly)'],
      ['2. Enter values in the FY27-FY31 columns (in €M)'],
      ['3. Fill in the Summary section at the bottom (NPV, RoI, IRR, Payback)'],
      ['4. Save and upload via Import / Export > Business Case'],
      [''],
      ['Notes:'],
      ['- Use negative numbers in brackets e.g. (1.5) or as -1.5'],
      ['- Percentage rows: enter as decimals e.g. 28.5 for 28.5%'],
      ['- Total rows are auto-stored but you should fill them in for your own reference'],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instrData);
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

    // P&L sheet
    const plData = [
      ['Product Name:', '', '', '', '', '', ''],
      [''],
      ['Business Case P&L', 'FY27 (€m)', 'FY28 (€m)', 'FY29 (€m)', 'FY30 (€m)', 'FY31 (€m)', 'Total FY27-FY31 (€m)'],
    ];

    for (const row of BIZCASE_TEMPLATE_ROWS) {
      plData.push([row.lineItem, '', '', '', '', '', '']);
    }

    // Summary section
    plData.push(['']);
    plData.push(['FY27-FY31']);
    plData.push(['NPV', '']);
    plData.push(['RoI', '']);
    plData.push(['IRR', '']);
    plData.push(['Payback', '']);

    const plWs = XLSX.utils.aoa_to_sheet(plData);

    // Set column widths
    plWs['!cols'] = [
      { wch: 45 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, plWs, 'P&L');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_business_case_template.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/bizcase — export existing business case data
router.get('/bizcase', async (req, res, next) => {
  try {
    const cases = await prisma.businessCase.findMany({
      include: {
        product: { select: { name: true, category: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (cases.length === 0) {
      return res.status(404).json({ error: 'No business case data to export' });
    }

    const wb = XLSX.utils.book_new();

    for (const bc of cases) {
      const plData = [
        ['Product Name:', bc.product.name, '', '', '', '', ''],
        [''],
        ['Business Case P&L', 'FY27 (€m)', 'FY28 (€m)', 'FY29 (€m)', 'FY30 (€m)', 'FY31 (€m)', 'Total FY27-FY31 (€m)'],
      ];

      for (const line of bc.lines) {
        const total = [line.fy27, line.fy28, line.fy29, line.fy30, line.fy31]
          .filter(v => v != null).reduce((s, v) => s + v, 0);
        plData.push([
          line.lineItem,
          line.fy27 ?? '',
          line.fy28 ?? '',
          line.fy29 ?? '',
          line.fy30 ?? '',
          line.fy31 ?? '',
          total || '',
        ]);
      }

      plData.push(['']);
      plData.push(['FY27-FY31']);
      plData.push(['NPV', bc.npv ?? '']);
      plData.push(['RoI', bc.roi ?? '']);
      plData.push(['IRR', bc.irr ?? '']);
      plData.push(['Payback', bc.paybackMonths ?? '']);

      const ws = XLSX.utils.aoa_to_sheet(plData);
      ws['!cols'] = [
        { wch: 45 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      ];

      // Sanitize sheet name (max 31 chars, no special chars)
      const sheetName = bc.product.name.replace(/[\\/?*[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vbi_business_cases.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export { BIZCASE_TEMPLATE_ROWS };
export default router;

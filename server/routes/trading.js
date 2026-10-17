import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

export const REGIONS = ['Americas', 'APAC & ME', 'Europe International'];
export const DEFAULT_TRADING_FY = 'FY28';

// Placeholder trading profile (€M) for every catalog product, per region, until
// real trading data is uploaded for it. Clearly dummy; off with SEED_DEMO_DATA=false.
// AOV and revenue are each 50% of a €10M target; open pipeline is 3x the AOV still to win.
const PLACEHOLDER_REGION = {
  aovTarget: 10,
  aovWonYtd: 5,
  aovPipelineOpen: 15,
  aovPipelineOpenedYtd: 10,
  targetEur: 10,
  actualEur: 5,
};
const placeholdersEnabled = () => process.env.SEED_DEMO_DATA !== 'false';

// Trading rows for one product: its uploaded rows for the year, or the
// placeholder profile in every region (flagged placeholder: true)
export function tradingRowsFor(product, stored, fy) {
  if (stored.length) return stored.map((t) => ({ ...t, placeholder: false }));
  if (!placeholdersEnabled()) return [];
  return REGIONS.map((region, i) => ({
    id: `placeholder-${product.id}-${i}`,
    productId: product.id,
    region,
    fy,
    pyActualEur: null,
    ...PLACEHOLDER_REGION,
    placeholder: true,
  }));
}

// GET /api/trading/summary — aggregate trading KPIs across catalog products
router.get('/summary', async (req, res, next) => {
  try {
    const { category, family, productLine, q } = req.query;
    const fy = /^FY\d{2}$/.test(req.query.fy || '') ? req.query.fy : DEFAULT_TRADING_FY;

    const productWhere = { showInCatalog: true };
    if (category) productWhere.category = category;
    if (family) productWhere.family = family;
    if (productLine) productWhere.productLine = productLine;
    if (q) {
      productWhere.OR = ['name', 'family', 'productLine', 'category'].map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: { id: true, trading: { where: { fy } } },
    });

    const byRegion = Object.fromEntries(REGIONS.map((r) => [r, {
      aovWonYtd: 0, aovTarget: 0, aovPipelineOpen: 0, aovPipelineOpenedYtd: 0, revenueYtd: 0, revenueTarget: 0,
    }]));
    let placeholderProducts = 0;
    for (const p of products) {
      const rows = tradingRowsFor(p, p.trading, fy);
      if (rows[0]?.placeholder) placeholderProducts++;
      for (const t of rows) {
        const r = byRegion[t.region];
        if (!r) continue;
        r.aovWonYtd += t.aovWonYtd || 0;
        r.aovTarget += t.aovTarget || 0;
        r.aovPipelineOpen += t.aovPipelineOpen || 0;
        r.aovPipelineOpenedYtd += t.aovPipelineOpenedYtd || 0;
        r.revenueYtd += t.actualEur || 0;
        r.revenueTarget += t.targetEur || 0;
      }
    }

    const total = (k) => REGIONS.reduce((s, r) => s + byRegion[r][k], 0);
    const aovTarget = total('aovTarget');
    const aovWonYtd = total('aovWonYtd');
    res.json({
      fy,
      products: products.length,
      placeholderProducts,
      aovWonYtd,
      aovTarget,
      aovPipelineOpen: total('aovPipelineOpen'),
      aovTargetToGo: aovTarget - aovWonYtd,
      aovPipelineOpenedYtd: total('aovPipelineOpenedYtd'),
      revenueYtd: total('revenueYtd'),
      revenueTarget: total('revenueTarget'),
      byRegion,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

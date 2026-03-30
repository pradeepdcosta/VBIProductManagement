import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

const REGIONS = ['Americas', 'APAC & ME', 'Europe International'];

// GET /api/trading/summary — aggregate trading KPIs
router.get('/summary', async (req, res, next) => {
  try {
    const { fy = 'FY26', category, family, productLine, q } = req.query;

    const productWhere = {};
    if (category) productWhere.category = category;
    if (family) productWhere.family = family;
    if (productLine) productWhere.productLine = productLine;
    if (q) {
      productWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { family: { contains: q, mode: 'insensitive' } },
        { productLine: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const tradingWhere = { fy };
    if (Object.keys(productWhere).length) tradingWhere.product = productWhere;

    const allTrading = await prisma.tradingData.findMany({
      where: tradingWhere,
      include: { product: { select: { category: true, name: true } } },
    });

    // Totals
    const totalAovWonYtd = allTrading.reduce((s, t) => s + (t.aovWonYtd || 0), 0);
    const totalAovTarget = allTrading.reduce((s, t) => s + (t.aovTarget || 0), 0);
    const totalAovPipelineOpen = allTrading.reduce((s, t) => s + (t.aovPipelineOpen || 0), 0);
    const totalAovPipelineOpenedYtd = allTrading.reduce((s, t) => s + (t.aovPipelineOpenedYtd || 0), 0);
    const totalRevenueYtd = allTrading.reduce((s, t) => s + t.actualEur, 0);
    const totalRevenueTarget = allTrading.reduce((s, t) => s + t.targetEur, 0);

    // By region — always include all 3 regions
    const byRegion = {};
    for (const r of REGIONS) {
      byRegion[r] = {
        aovWonYtd: 0,
        aovTarget: 0,
        aovPipelineOpen: 0,
        aovPipelineOpenedYtd: 0,
        revenueYtd: 0,
        revenueTarget: 0,
      };
    }
    allTrading.forEach((t) => {
      const r = byRegion[t.region];
      if (!r) return;
      r.aovWonYtd += t.aovWonYtd || 0;
      r.aovTarget += t.aovTarget || 0;
      r.aovPipelineOpen += t.aovPipelineOpen || 0;
      r.aovPipelineOpenedYtd += t.aovPipelineOpenedYtd || 0;
      r.revenueYtd += t.actualEur;
      r.revenueTarget += t.targetEur;
    });

    res.json({
      aovWonYtd: totalAovWonYtd,
      aovTarget: totalAovTarget,
      aovPipelineOpen: totalAovPipelineOpen,
      aovTargetToGo: totalAovTarget - totalAovWonYtd,
      aovPipelineOpenedYtd: totalAovPipelineOpenedYtd,
      revenueYtd: totalRevenueYtd,
      revenueTarget: totalRevenueTarget,
      byRegion,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

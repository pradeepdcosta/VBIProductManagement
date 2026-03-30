import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'npd-data.json'), 'utf-8'));
const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.npdInitiative.count();
  if (existing > 0) {
    console.log(`NPD already has ${existing} initiatives. Skipping.`);
    return;
  }

  for (const item of data) {
    await prisma.npdInitiative.create({
      data: {
        externalId: item.externalId,
        market: item.market,
        portfolio: item.portfolio,
        productFamily: item.productFamily,
        productLine: item.productLine,
        initiativeName: item.initiativeName,
        roadmapCategory: item.roadmapCategory,
        roadmapHorizon: item.roadmapHorizon,
        roadmapType: item.roadmapType,
        fy: item.fy,
        quarter: item.quarter,
        status: item.status,
        investmentCanvas: item.investmentCanvas,
        primaryInvestmentDriver: item.primaryInvestmentDriver,
        description: item.description,
        capex: item.capex,
        opex: item.opex,
        stages: item.stages,
      },
    });
  }
  console.log(`Seeded ${data.length} NPD initiatives`);
}

seed().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });

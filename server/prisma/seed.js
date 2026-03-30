import { PrismaClient } from '@prisma/client';
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if already seeded
  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} products. Skipping seed.`);
    return;
  }

  // Parse prods.xlsx
  const filePath = path.join(__dirname, '..', '..', 'data', 'prods.xlsx');
  const workbook = readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = utils.sheet_to_json(sheet, { header: 1 });

  // Skip row 0 ("Sum of Actual AOV(€)") and row 1 (column headers)
  const dataRows = rawRows.slice(2);

  // Forward-fill blank cells in cols A (category), B (family), C (productLine)
  let lastCat = '', lastFam = '', lastLine = '';
  const products = [];

  for (const row of dataRows) {
    const rawCat = row[0];
    const rawFam = row[1];
    const rawLine = row[2];
    const rawName = row[3];

    if (rawCat) lastCat = String(rawCat).trim();
    if (rawFam) lastFam = String(rawFam).trim();
    if (rawLine) lastLine = String(rawLine).trim();

    if (!rawName || String(rawName).trim() === 'Grand Total') continue;

    products.push({
      category: lastCat,
      family: lastFam,
      productLine: lastLine,
      name: String(rawName).trim(),
    });
  }

  console.log(`Parsed ${products.length} products from prods.xlsx`);

  // Batch insert products
  await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log(`Inserted ${products.length} products`);

  // Seed sample feature requests (from build brief Section 8)
  await prisma.featureRequest.createMany({
    data: [
      {
        type: 'Country',
        productName: 'IPVPN',
        title: 'Myanmar/Brunei regulatory coverage for Maybank APAC bid',
        description: 'Need regulatory clearance and local loop access in Myanmar and Brunei to support the Maybank APAC regional network bid. Estimated deal value €2.4M ARR.',
        priority: 'High',
        status: 'Open',
      },
      {
        type: 'Deal',
        productName: 'SD-WAN',
        title: 'Cisco SD-WAN BYOC pricing exception for Fastweb Italy renewal',
        description: 'Fastweb Italy renewal requires BYOC (Bring Your Own CPE) pricing model for Cisco SD-WAN. Current pricing structure does not support this model.',
        dealAccount: 'Fastweb Italy',
        priority: 'High',
        status: 'Open',
      },
      {
        type: 'Feature',
        productName: 'MPN Dedicated',
        title: 'Celona Private 5G partner enablement — DE & NL launch readiness',
        description: 'Enable Celona as a Private 5G partner for MPN Dedicated in Germany and Netherlands markets. Requires technical integration and commercial framework.',
        priority: 'Medium',
        status: 'Open',
      },
    ],
  });

  console.log('Inserted 3 sample feature requests');

  // Seed sample NPD stages for a few products
  const sampleNpdProducts = await prisma.product.findMany({
    where: {
      name: {
        in: ['Cisco Catalyst SD-WAN', 'Zscaler Managed Security', 'MPN Dedicated', 'CyberHub', 'Vodafone Business UC'],
      },
    },
    take: 5,
  });

  const npdData = [
    { concept: 1, bizCase: 1, design: 1, gtm: 1, salesEnable: 2, distribution: 0, slaDefinition: 0, launch: 0, owner: 'Sarah Chen' },
    { concept: 1, bizCase: 1, design: 1, gtm: 2, salesEnable: 0, distribution: 0, slaDefinition: 0, launch: 0, owner: 'Marcus Weber' },
    { concept: 1, bizCase: 1, design: 2, gtm: 0, salesEnable: 0, distribution: 0, slaDefinition: 0, launch: 0, owner: 'James Liu' },
    { concept: 1, bizCase: 2, design: 0, gtm: 0, salesEnable: 0, distribution: 0, slaDefinition: 0, launch: 0, owner: 'Ana Rodriguez' },
    { concept: 1, bizCase: 1, design: 1, gtm: 1, salesEnable: 1, distribution: 1, slaDefinition: 2, launch: 0, owner: 'David Park' },
  ];

  for (let i = 0; i < sampleNpdProducts.length; i++) {
    await prisma.npdStage.create({
      data: {
        productId: sampleNpdProducts[i].id,
        ...npdData[i],
      },
    });
  }

  console.log(`Inserted ${sampleNpdProducts.length} sample NPD stages`);

  // Seed sample trading data
  const tradingProducts = await prisma.product.findMany({
    where: { name: { in: ['IPVPN', 'SDN-WAN', 'Zscaler Managed Security', 'MPN Dedicated', 'Ethernet VPN'] } },
    take: 5,
  });

  const regions = ['Americas', 'APAC & ME', 'Europe International'];
  for (const prod of tradingProducts) {
    for (const region of regions) {
      const revenueTarget = Math.round((Math.random() * 40 + 10) * 10) / 10;
      const revenueYtd = Math.round(revenueTarget * (0.4 + Math.random() * 0.35) * 10) / 10;
      const py = Math.round(revenueTarget * (0.7 + Math.random() * 0.3) * 10) / 10;
      const aovTarget = Math.round((Math.random() * 60 + 20) * 10) / 10;
      const aovWon = Math.round(aovTarget * (0.3 + Math.random() * 0.4) * 10) / 10;
      const aovPipelineOpen = Math.round(aovTarget * (0.5 + Math.random() * 0.6) * 10) / 10;
      const aovPipelineOpened = Math.round(aovTarget * (0.6 + Math.random() * 0.5) * 10) / 10;
      await prisma.tradingData.create({
        data: {
          productId: prod.id,
          region,
          fy: 'FY26',
          actualEur: revenueYtd,
          targetEur: revenueTarget,
          pyActualEur: py,
          aovWonYtd: aovWon,
          aovTarget,
          aovPipelineOpen,
          aovPipelineOpenedYtd: aovPipelineOpened,
        },
      });
    }
  }

  console.log('Inserted sample trading data');

  // Seed sample costs
  const costProducts = await prisma.product.findMany({
    where: { name: { in: ['IPVPN', 'Zscaler Managed Security', 'MPN Dedicated'] } },
    take: 3,
  });

  const costTemplates = [
    [
      { component: 'Network Infrastructure', amountEur: 4.2 },
      { component: 'P&S Costs (FY27)', amountEur: 1.1 },
      { component: 'Support & Assure', amountEur: 0.6 },
      { component: 'Overhead Allocation', amountEur: 0.3 },
    ],
    [
      { component: 'Vendor Licensing (Zscaler)', amountEur: 2.8 },
      { component: 'Managed Service Delivery', amountEur: 1.4 },
      { component: 'NOC / SOC Operations', amountEur: 0.9 },
      { component: 'Professional Services', amountEur: 0.4 },
    ],
    [
      { component: 'Platform (GDSP)', amountEur: 1.6 },
      { component: 'SIM Provisioning', amountEur: 0.7 },
      { component: 'Support Tiers', amountEur: 0.5 },
      { component: 'Partner Costs', amountEur: 0.3 },
    ],
  ];

  for (let i = 0; i < costProducts.length; i++) {
    for (const cost of costTemplates[i]) {
      await prisma.productCost.create({
        data: {
          productId: costProducts[i].id,
          component: cost.component,
          amountEur: cost.amountEur,
          fy: 'FY26',
        },
      });
    }
  }

  console.log('Inserted sample cost data');

  // Seed sample SLA data
  const slaProducts = await prisma.product.findMany({
    where: { name: { in: ['IPVPN', 'Zscaler Managed Security', 'Ethernet VPN', 'SDN-WAN', 'MPN Dedicated'] } },
    take: 5,
  });

  const slaTemplates = [
    { availability: '99.95%', mttr: '4 hours', responseTime: '15 minutes', supportHours: '24/7', escalation: 'P1: 30min, P2: 2hr, P3: 8hr' },
    { availability: '99.99%', mttr: '2 hours', responseTime: '10 minutes', supportHours: '24/7', escalation: 'P1: 15min, P2: 1hr, P3: 4hr' },
    { availability: '99.9%', mttr: '6 hours', responseTime: '30 minutes', supportHours: '24/5', escalation: 'P1: 1hr, P2: 4hr, P3: NBD' },
    { availability: '99.95%', mttr: '4 hours', responseTime: '20 minutes', supportHours: '24/7', escalation: 'P1: 30min, P2: 2hr, P3: 8hr' },
    { availability: '99.9%', mttr: '8 hours', responseTime: '1 hour', supportHours: '12/5', escalation: 'P1: 2hr, P2: 8hr, P3: NBD' },
  ];

  for (let i = 0; i < slaProducts.length; i++) {
    await prisma.slaData.create({
      data: { productId: slaProducts[i].id, ...slaTemplates[i] },
    });
  }

  console.log('Inserted sample SLA data');

  // Seed sample business cases
  const bcProducts = await prisma.product.findMany({
    where: { name: { in: ['Cisco Catalyst SD-WAN', 'CyberHub', 'MPN Dedicated'] } },
    take: 3,
  });

  const bcTemplates = [
    { npv: 12.4, irr: 28.5, paybackMonths: 18, status: 'Approved', summary: 'Cisco Catalyst SD-WAN migration provides a 28.5% IRR with payback in 18 months. Strong customer demand from enterprise segment.' },
    { npv: 8.2, irr: 22.0, paybackMonths: 24, status: 'In Review', summary: 'CyberHub consolidation platform reduces tooling costs by 35% while improving threat detection. Investment required for partner integrations.' },
    { npv: 15.6, irr: 34.0, paybackMonths: 14, status: 'Draft', summary: 'MPN Dedicated expansion into DE and NL markets. High-margin opportunity driven by Industry 4.0 demand in manufacturing sector.' },
  ];

  for (let i = 0; i < bcProducts.length; i++) {
    await prisma.businessCase.create({
      data: { productId: bcProducts[i].id, ...bcTemplates[i] },
    });
  }

  console.log('Inserted sample business cases');

  // Seed sample country coverage
  const coverageProducts = await prisma.product.findMany({
    where: { name: { in: ['IPVPN', 'SDN-WAN', 'Zscaler Managed Security', 'MPN Dedicated', 'Ethernet VPN'] } },
    take: 5,
  });

  const countries = ['UK', 'DE', 'IT', 'ES', 'NL', 'PT', 'US', 'ZA', 'IN', 'AU', 'JP', 'SG', 'AE', 'NG'];
  const statuses = ['available', 'available', 'available', 'partial', 'unavailable', 'na'];

  for (const prod of coverageProducts) {
    for (const cc of countries) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await prisma.countryCoverage.create({
        data: { productId: prod.id, countryCode: cc, status },
      });
    }
  }

  console.log('Inserted sample country coverage');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const costData = JSON.parse(readFileSync(join(__dirname, 'cost-data.json'), 'utf-8'));
const prisma = new PrismaClient();

async function seed() {
  await prisma.costAction.deleteMany({});
  await prisma.costAllocation.deleteMany({});

  const products = costData.filter(p => !p.product.includes('Total') && !p.product.includes('check'));

  for (const p of products) {
    await prisma.costAllocation.create({
      data: {
        serviceTower: p.tower,
        serviceOffering: p.product,
        fy: 'FY26',
        psOpex: p.ps_opex,
        psDep: p.ps_dep,
        psTotal: p.ps_total,
        ppeOpex: p.ppe_opex,
        ppeDep: p.ppe_dep,
        ppeTotal: p.ppe_total,
        totalProductOpex: p.total_product_opex,
        totalProductDep: p.total_product_dep,
        totalProduct: p.total_product,
        commercial: p.commercial,
        vbts: p.vbts,
        enterprise: p.enterprise,
        carrier: p.carrier,
        networks: p.networks,
        vsol: p.vsol,
        directorate: p.directorate,
        grandTotal: p.grand_total,
        fteCount: 0,
        fteBreakdown: [],
      },
    });
  }
  console.log(`Inserted ${products.length} cost allocations`);

  const sampleProducts = [
    'Google Workspace', 'SDN Cisco', 'IP-VPN  (including Carrier MPLS)',
    'CyberHub', 'Azure Managed & Professional Services',
    'Vodafone Business UC', 'One Net Collaboration Overlay',
    'Atlas', 'Colocation', 'Vodafone Contact Centre',
  ];

  const dummyActions = [
    { action: 'Migrate to shared platform to reduce dedicated hosting costs', savings: 120000, status: 'In Progress', owner: 'Sarah Mitchell', targetDate: new Date('2026-06-30') },
    { action: 'Renegotiate vendor contract for lower licensing fees', savings: 85000, status: 'Planned', owner: 'Tom Henderson', targetDate: new Date('2026-09-30') },
    { action: 'Automate manual testing processes to reduce FTE allocation', savings: 65000, status: 'On Track', owner: 'Priya Sharma', targetDate: new Date('2026-12-31') },
    { action: 'Consolidate redundant infrastructure across regions', savings: 200000, status: 'At Risk', owner: "James O'Brien", targetDate: new Date('2027-03-31') },
    { action: 'Reduce VOIS dependency via in-house tooling', savings: 45000, status: 'Planned', owner: 'Kathryn Wells', targetDate: new Date('2026-08-15') },
    { action: 'Decommission legacy dev/test environments', savings: 30000, status: 'Completed', owner: 'Mark Taylor', targetDate: new Date('2026-03-15') },
    { action: 'Optimize cloud spend via reserved instances', savings: 150000, status: 'In Progress', owner: 'Lisa Chen', targetDate: new Date('2026-07-31') },
    { action: 'Rationalize duplicate SaaS licenses', savings: 55000, status: 'On Track', owner: 'David Brown', targetDate: new Date('2026-11-30') },
  ];

  let actionCount = 0;
  for (const product of sampleProducts) {
    const count = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...dummyActions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      const a = shuffled[i];
      const factor = 0.5 + Math.random();
      await prisma.costAction.create({
        data: {
          serviceOffering: product,
          action: a.action,
          savings: Math.round(a.savings * factor),
          status: a.status,
          owner: a.owner,
          targetDate: a.targetDate,
        },
      });
      actionCount++;
    }
  }
  console.log(`Inserted ${actionCount} cost reduction actions`);
}

seed().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });

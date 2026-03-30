import { readFile } from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample FTE names for breakdown
const FTE_NAMES = [
  'Antoine Garcia', 'Sarah Mitchell', 'Ravi Patel', 'Lisa Chen', 'Marco Rossi',
  'Emma Williams', 'James O\'Brien', 'Priya Sharma', 'Thomas Mueller', 'Ana Silva',
  'David Kim', 'Sophie Laurent', 'Hassan Ali', 'Maria Gonzalez', 'Oliver Brown',
  'Yuki Tanaka', 'Elena Petrova', 'Michael Scott', 'Fatima Al-Hassan', 'Carlos Rivera',
];

// Cost reduction action templates
const ACTION_TEMPLATES = [
  { action: 'Migrate to shared platform to reduce duplicate infrastructure', savingsPct: 0.08 },
  { action: 'Renegotiate vendor contract for better volume pricing', savingsPct: 0.05 },
  { action: 'Automate manual provisioning workflows', savingsPct: 0.06 },
  { action: 'Consolidate monitoring tools across product lines', savingsPct: 0.03 },
  { action: 'Reduce VOIS FTE through automation and self-service', savingsPct: 0.07 },
  { action: 'Decommission legacy infrastructure components', savingsPct: 0.10 },
  { action: 'Optimize cloud resource utilization (right-sizing)', savingsPct: 0.04 },
  { action: 'Move to consumption-based licensing model', savingsPct: 0.05 },
  { action: 'Rationalize test environments and reduce non-prod costs', savingsPct: 0.03 },
  { action: 'Implement zero-touch deployment to reduce delivery FTE', savingsPct: 0.06 },
  { action: 'Centralize L2/L3 support to shared service team', savingsPct: 0.04 },
  { action: 'Negotiate improved payment terms with key suppliers', savingsPct: 0.02 },
  { action: 'Replace proprietary components with open-source alternatives', savingsPct: 0.05 },
  { action: 'Streamline change management process', savingsPct: 0.03 },
  { action: 'Reduce third-party professional services dependency', savingsPct: 0.04 },
];

const STATUS_OPTIONS = ['Planned', 'In Progress', 'On Track', 'At Risk', 'Completed'];

function generateFteBreakdown(totalFte) {
  if (!totalFte || totalFte < 0.5) return [];
  const count = Math.max(1, Math.min(Math.round(totalFte), 8));
  const breakdown = [];
  let remaining = totalFte;
  const shuffled = [...FTE_NAMES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count && remaining > 0; i++) {
    const alloc = i === count - 1 ? remaining : Math.min(remaining, Math.round((Math.random() * 0.8 + 0.2) * 10) / 10);
    breakdown.push({
      name: shuffled[i % shuffled.length],
      type: Math.random() > 0.3 ? 'Direct' : 'VOIS',
      allocation: Math.round(alloc * 100) / 100,
    });
    remaining -= alloc;
    remaining = Math.round(remaining * 100) / 100;
  }
  return breakdown;
}

function generateActions(product, grandTotal) {
  const numActions = Math.floor(Math.random() * 3) + 2; // 2-4 actions
  const shuffled = [...ACTION_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, numActions);
  const baseDate = new Date(2026, 3, 1); // April 2026

  return shuffled.map((t, i) => {
    const savings = Math.round(grandTotal * t.savingsPct);
    const targetDate = new Date(baseDate);
    targetDate.setMonth(targetDate.getMonth() + Math.floor(Math.random() * 12) + 1);
    return {
      serviceOffering: product,
      action: t.action,
      savings,
      targetDate,
      status: STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)],
      owner: FTE_NAMES[Math.floor(Math.random() * FTE_NAMES.length)],
    };
  });
}

async function main() {
  const raw = JSON.parse(await readFile(new URL('./cost-data.json', import.meta.url), 'utf-8'));
  console.log(`Loaded ${raw.length} products from cost-data.json`);

  // Clear existing
  await prisma.costAllocation.deleteMany();
  await prisma.costAction.deleteMany();
  console.log('Cleared existing cost data');

  let createdCosts = 0;
  let createdActions = 0;

  for (const p of raw) {
    if (p.product.includes('Total')) continue;

    // Estimate FTE count from opex (rough: 1 FTE ~ €100k-150k)
    const fteCount = Math.max(0, Math.round((p.ps_opex / 120000) * 10) / 10);
    const fteBreakdown = generateFteBreakdown(fteCount);

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
        fteCount,
        fteBreakdown,
      },
    });
    createdCosts++;

    // Generate actions for products with >€500k total cost
    if (p.grand_total > 500000) {
      const actions = generateActions(p.product, p.grand_total);
      for (const a of actions) {
        await prisma.costAction.create({ data: a });
        createdActions++;
      }
    }
  }

  console.log(`Seeded ${createdCosts} cost allocations`);
  console.log(`Seeded ${createdActions} cost reduction actions`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

// Starter business cases: three generic placeholder P&Ls (same figures for each),
// created only on an empty business_cases table and only while SEED_DEMO_DATA is not 'false'.
// Revenue 10 per region, CoS 3 per element, OpEx -1 and CapEx -0.3 per element, every year.
import { PrismaClient } from '@prisma/client';
import { BIZCASE_ROWS, FY_KEYS, calculate, linesForStorage } from '../lib/bizcase.js';

const prisma = new PrismaClient();

const SUMMARY = 'Generic placeholder business case (same figures for every case). Replace with the real P&L via Edit business case or the upload template.';

const CASES = [
  { productFamily: 'SDN', productLine: 'Vodafone Business – Cisco Catalyst SDN', status: 'Approved' },
  { productFamily: 'Mobile Private Networks', productLine: 'MPN Connectivity', status: 'In Review' },
  { productFamily: 'SDN', productLine: 'Vodafone Business Fortinet SD-WAN/SASE', status: 'In Review' },
];

const PLACEHOLDER = {
  'Revenue - Service Recurring Americas': 10,
  'Revenue - Service Recurring APAC': 10,
  'Revenue - Service Recurring Others': 10,
  'CoS - Service Recurring': 3,
  'CoS - Service Non Recurring': 3,
  'CoS - Non Service Recurring': 3,
  'CoS - Non Service Non Recurring': 3,
};

function placeholderValues() {
  const values = {};
  for (const row of BIZCASE_ROWS.filter((r) => r.input)) {
    const v = PLACEHOLDER[row.lineItem] ?? (row.section === 'OpEx' ? -1 : row.section === 'CapEx' ? -0.3 : null);
    values[row.lineItem] = Object.fromEntries(FY_KEYS.map((fy) => [fy, v]));
  }
  return values;
}

async function seed() {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('SEED_DEMO_DATA=false — no placeholder business cases.');
    return;
  }
  const existing = await prisma.businessCase.count();
  if (existing > 0) {
    console.log(`Business cases already exist (${existing}). Skipping.`);
    return;
  }

  const lines = linesForStorage(calculate(placeholderValues()));
  for (const c of CASES) {
    await prisma.businessCase.create({
      data: { ...c, summary: SUMMARY, lines: { create: lines } },
    });
  }
  console.log(`Inserted ${CASES.length} placeholder business cases`);
}

seed()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

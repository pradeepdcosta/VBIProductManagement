import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'bizcase-data.json'), 'utf-8'));
const prisma = new PrismaClient();

async function seed() {
  // Runs on every startup — only seed when no business case has P&L lines yet,
  // so uploaded business cases survive restarts.
  // (seed.js creates summary-only cases; this script replaces them with full P&L data)
  const withLines = await prisma.businessCaseLine.count();
  if (withLines > 0) {
    console.log(`Business cases already have ${withLines} P&L lines. Skipping.`);
    return;
  }
  await prisma.businessCase.deleteMany({});

  let caseCount = 0;
  let lineCount = 0;

  for (const item of data) {
    const product = await prisma.product.findFirst({
      where: { name: item.productName },
    });
    if (!product) {
      console.log(`Product not found: ${item.productName}, skipping`);
      continue;
    }

    // Business cases belong to the product's line; skip if that line already has one
    const lineKey = { productFamily: product.family, productLine: product.productLine };
    if (await prisma.businessCase.findUnique({ where: { productFamily_productLine: lineKey } })) {
      console.log(`Product line "${product.productLine}" already has a business case, skipping ${item.productName}`);
      continue;
    }
    const bc = await prisma.businessCase.create({
      data: {
        ...lineKey,
        npv: item.npv,
        roi: item.roi,
        irr: item.irr,
        paybackMonths: item.paybackMonths,
        status: item.status,
        summary: item.summary,
      },
    });
    caseCount++;

    for (const line of item.lines) {
      await prisma.businessCaseLine.create({
        data: {
          businessCaseId: bc.id,
          section: line.section,
          lineItem: line.lineItem,
          sortOrder: line.sortOrder,
          isTotal: line.isTotal,
          fy27: line.fy27,
          fy28: line.fy28,
          fy29: line.fy29,
          fy30: line.fy30,
          fy31: line.fy31,
        },
      });
      lineCount++;
    }
  }
  console.log(`Seeded ${caseCount} business cases with ${lineCount} P&L lines`);
}

seed().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });

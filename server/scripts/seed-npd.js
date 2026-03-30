import { readFile } from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const prisma = new PrismaClient();

const STAGE_KEYS = ['concept', 'bizCase', 'design', 'gtm', 'salesEnable', 'distribution', 'slaDefinition', 'launch'];

// Generate realistic stages based on the initiative status
function generateStages(status, fy, quarter) {
  const stages = {};
  const baseYear = fy === 'FY26' ? 2025 : 2026;
  const qMonth = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 }[quarter] || 6;

  // How many stages are complete depends on status
  let completedCount;
  switch (status) {
    case 'Done': completedCount = 8; break;
    case 'In Progress': completedCount = Math.floor(Math.random() * 3) + 3; break;
    case 'On Track': completedCount = Math.floor(Math.random() * 3) + 2; break;
    case 'Mobilise': completedCount = Math.floor(Math.random() * 2) + 1; break;
    case 'DB Approved': completedCount = 1; break;
    case 'At Risk': completedCount = Math.floor(Math.random() * 2) + 2; break;
    case 'Off-Track': completedCount = Math.floor(Math.random() * 2) + 1; break;
    case 'Not Started': completedCount = 0; break;
    default: completedCount = 0;
  }

  for (let i = 0; i < STAGE_KEYS.length; i++) {
    const key = STAGE_KEYS[i];
    if (i < completedCount) {
      // Completed stage
      const monthOffset = i * 1 + 1;
      const d = new Date(baseYear, qMonth - 6 + monthOffset, 10 + Math.floor(Math.random() * 15));
      stages[key] = { status: 'complete', date: d.toISOString().slice(0, 10) };
    } else if (i === completedCount && completedCount > 0 && status !== 'Done') {
      // Current active stage
      stages[key] = { status: status === 'At Risk' || status === 'Off-Track' ? 'at-risk' : 'in-progress', date: null };
    } else {
      // Future / not started
      if (i < completedCount + 3 && completedCount > 0) {
        // Planned with future date
        const monthOffset = i * 1 + 2;
        const d = new Date(baseYear, qMonth - 3 + monthOffset, 1 + Math.floor(Math.random() * 20));
        stages[key] = { status: 'planned', date: d.toISOString().slice(0, 10) };
      } else {
        stages[key] = { status: 'not-started', date: null };
      }
    }
  }
  return stages;
}

// Generate description based on initiative name and category
function generateDescription(name, category, portfolio, family, driver) {
  const descs = {
    'Product Launch': `Launch of ${name} to expand the ${portfolio} portfolio. This initiative focuses on bringing a market-ready solution to VBI customers across all regions, delivering enhanced ${family} capabilities with competitive differentiation.`,
    'Feature Release': `Feature enhancement for the ${family} product line under ${portfolio}. This release introduces key capabilities requested by enterprise customers, improving usability, performance, and integration with existing VBI services.`,
    'Product Rationalization': `Rationalization and consolidation of ${family} offerings within ${portfolio}. This initiative streamlines the product portfolio by migrating customers to modern platforms, reducing operational complexity and improving cost efficiency.`,
    'Technical Enabler': `Technical infrastructure enablement for ${family} under ${portfolio}. This initiative builds foundational capabilities that support future product launches, including platform modernization, API enhancements, and operational tooling.`,
    'Service Launch': `New service offering under ${family} in the ${portfolio} category. This launch delivers managed service capabilities to VBI enterprise customers, with SLA-backed performance guarantees and global reach.`,
    'Aspirational': `Strategic initiative for ${family} within ${portfolio}. This aspirational project explores new market opportunities and innovation areas, with potential for significant revenue growth. Investment driver: ${driver || 'Innovation'}.`,
  };
  return descs[category] || `Initiative for ${name} under ${portfolio} - ${family}. ${driver || 'Product enhancement'} focused.`;
}

async function main() {
  const filePath = process.argv[2] || 'D:\\Data Export - 2026-03-29T21_24_08.5007529Z.xlsx';
  const buf = await readFile(filePath);
  const wb = XLSX.read(buf);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} NPD initiatives to seed`);

  await prisma.npdInitiative.deleteMany();
  console.log('Cleared existing NPD initiatives');

  let created = 0;
  for (const row of rows) {
    const status = row['i. Status'] || 'Not Started';
    const fy = row['g. Year'];
    const quarter = row['h. Quarter'];
    const category = row['Roadmap Category'];
    const portfolio = row['b. Portfolio'];
    const family = row['c. Product Family'];
    const driver = row['l. Primary Investment Driver'] || null;
    const name = row['e. Initiative Name'];

    const stages = generateStages(status, fy, quarter);
    const description = generateDescription(name, category, portfolio, family, driver);

    // Generate capex/opex based on category
    const isAspi = category === 'Aspirational';
    const capex = isAspi
      ? parseFloat((Math.random() * 0.5 + 0.1).toFixed(2))
      : parseFloat((Math.random() * 2 + 0.3).toFixed(2));
    const opex = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));

    await prisma.npdInitiative.create({
      data: {
        externalId: row['a. ID'] ? parseInt(row['a. ID']) : null,
        market: row['Market'] || 'VBI',
        portfolio,
        productFamily: family,
        productLine: row['d. Product Line'],
        initiativeName: name,
        roadmapCategory: category,
        roadmapHorizon: row['Roadmap Horizon'] || null,
        roadmapType: row['f. Roadmap Type'] || null,
        fy,
        quarter,
        status,
        investmentCanvas: row['j. Investment Canvas'] || null,
        primaryInvestmentDriver: driver,
        description,
        capex,
        opex,
        stages,
      },
    });
    created++;
  }

  console.log(`Seeded ${created} NPD initiatives with stages, descriptions, capex/opex`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

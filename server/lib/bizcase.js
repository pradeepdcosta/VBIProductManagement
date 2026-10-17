// Business case P&L layout (FY27–FY31, €m). Input rows are typed in; every
// other row is calculated with the formulas below, which reproduce the
// business case spreadsheet:
//   totals = sum of their lines, margin = revenue − cost of sale,
//   EBITDA = margin + OpEx, cash flow = EBITDA + CapEx, % rows = x ÷ revenue.
// Sign convention (as in the spreadsheet): revenue and cost of sale are positive;
// OpEx and CapEx are costs entered as negative numbers.
// This list is sent to the browser so the page calculates the same way.

export const FY_KEYS = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'];

const input = (section, lineItem, sign) => ({ section, lineItem, input: true, sign });
const calc = (section, lineItem, formula, extra = {}) => ({ section, lineItem, formula, isTotal: true, ...extra });
const sum = (...of) => ({ op: 'sum', of });
const sub = (a, b) => ({ op: 'sub', of: [a, b] });
const pct = (a, b) => ({ op: 'pct', of: [a, b] });

const R = 'Revenue', C = 'Cost of Sale', M = 'Margin', O = 'OpEx', E = 'EBITDA', K = 'CapEx', F = 'Cash Flow';

export const BIZCASE_ROWS = [
  input(R, 'Revenue - Service Recurring Americas', 'positive'),
  input(R, 'Revenue - Service Recurring APAC', 'positive'),
  input(R, 'Revenue - Service Recurring Others', 'positive'),
  calc(R, 'Total Service Revenue', sum('Revenue - Service Recurring Americas', 'Revenue - Service Recurring APAC', 'Revenue - Service Recurring Others')),
  input(R, 'Revenue - Non Service Recurring', 'positive'),
  input(R, 'Revenue - Non Service Non Recurring', 'positive'),
  calc(R, 'Total Non Service Revenue', sum('Revenue - Non Service Recurring', 'Revenue - Non Service Non Recurring')),
  calc(R, 'Total Revenue', sum('Total Service Revenue', 'Total Non Service Revenue')),

  input(C, 'CoS - Service Recurring', 'positive'),
  input(C, 'CoS - Service Non Recurring', 'positive'),
  calc(C, 'Total Service Cost of Sale', sum('CoS - Service Recurring', 'CoS - Service Non Recurring')),
  input(C, 'CoS - Non Service Recurring', 'positive'),
  input(C, 'CoS - Non Service Non Recurring', 'positive'),
  calc(C, 'Total Non Service Cost of Sale', sum('CoS - Non Service Recurring', 'CoS - Non Service Non Recurring')),
  calc(C, 'Total Cost of Sale', sum('Total Service Cost of Sale', 'Total Non Service Cost of Sale')),

  calc(M, 'Sales variable margin - Service', sub('Total Service Revenue', 'Total Service Cost of Sale'), { isTotal: false }),
  calc(M, 'Sales variable margin - Service %', pct('Sales variable margin - Service', 'Total Service Revenue'), { isTotal: false, percent: true }),
  calc(M, 'Sales variable margin - Non Service', sub('Total Non Service Revenue', 'Total Non Service Cost of Sale'), { isTotal: false }),
  calc(M, 'Sales variable margin - Non Service %', pct('Sales variable margin - Non Service', 'Total Non Service Revenue'), { isTotal: false, percent: true }),
  calc(M, 'Total Sales variable margin', sum('Sales variable margin - Service', 'Sales variable margin - Non Service')),
  calc(M, 'Total Sales variable margin %', pct('Total Sales variable margin', 'Total Revenue'), { percent: true }),

  input(O, 'OpEx Run & Maintain', 'negative'),
  input(O, 'OpEx New development', 'negative'),
  input(O, 'OpEx Operation/Market/Customer impact', 'negative'),
  input(O, 'OpEx Market cost', 'negative'),
  input(O, 'Customer (OpEx)', 'negative'),
  input(O, 'VB overheads', 'negative'),
  calc(O, 'Total OpEx', sum('OpEx Run & Maintain', 'OpEx New development', 'OpEx Operation/Market/Customer impact', 'OpEx Market cost', 'Customer (OpEx)', 'VB overheads')),

  calc(E, 'EBITDA', sum('Total Sales variable margin', 'Total OpEx')),

  input(K, 'CapEx Run & Maintain', 'negative'),
  input(K, 'CapEx New development', 'negative'),
  input(K, 'CapEx Operation/Market/Customer impact', 'negative'),
  input(K, 'CapEx Market cost', 'negative'),
  input(K, 'Customer (CapEx)', 'negative'),
  input(K, 'Cap OH Customer', 'negative'),
  input(K, 'Cap OH Run & Maintain', 'negative'),
  input(K, 'Cap OH New Development', 'negative'),
  calc(K, 'Total CapEx', sum('CapEx Run & Maintain', 'CapEx New development', 'CapEx Operation/Market/Customer impact', 'CapEx Market cost', 'Customer (CapEx)', 'Cap OH Customer', 'Cap OH Run & Maintain', 'Cap OH New Development')),

  calc(F, 'Incremental Cash flow', sum('EBITDA', 'Total CapEx')),
  calc(F, 'Cash margin %', pct('Incremental Cash flow', 'Total Revenue'), { percent: true }),
].map((row, i) => ({ isTotal: false, ...row, sortOrder: i + 1 }));

export const BIZCASE_STATUSES = ['Draft', 'In Review', 'Approved'];

// values: { [lineItem]: { fy27, ..., fy31 } } with numbers or null.
// Returns a full map including every calculated row. A calculated cell is null
// when none of its inputs has a value, so empty cases stay blank.
export function calculate(values) {
  const out = {};
  for (const row of BIZCASE_ROWS) {
    if (row.input) {
      out[row.lineItem] = Object.fromEntries(FY_KEYS.map((fy) => [fy, values?.[row.lineItem]?.[fy] ?? null]));
      continue;
    }
    const { op, of } = row.formula;
    out[row.lineItem] = Object.fromEntries(FY_KEYS.map((fy) => {
      const parts = of.map((item) => out[item]?.[fy] ?? null);
      if (parts.every((v) => v == null)) return [fy, null];
      if (op === 'sum') return [fy, round(parts.reduce((s, v) => s + (v || 0), 0))];
      if (op === 'sub') return [fy, round((parts[0] || 0) - (parts[1] || 0))];
      if (op === 'pct') return [fy, parts[0] == null || !parts[1] ? null : round((parts[0] / parts[1]) * 100, 1)];
      return [fy, null];
    }));
  }
  return out;
}

const round = (n, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;

// Validate typed input values. Returns { values } or { error }.
export function cleanValues(raw) {
  const values = {};
  for (const row of BIZCASE_ROWS.filter((r) => r.input)) {
    values[row.lineItem] = {};
    for (const fy of FY_KEYS) {
      const v = raw?.[row.lineItem]?.[fy];
      if (v === '' || v == null) { values[row.lineItem][fy] = null; continue; }
      const n = Number(v);
      if (!Number.isFinite(n)) return { error: `${row.lineItem} ${fy.toUpperCase()} must be a number` };
      if (row.sign === 'positive' && n < 0) return { error: `${row.lineItem} ${fy.toUpperCase()} can't be negative` };
      if (row.sign === 'negative' && n > 0) return { error: `${row.lineItem} ${fy.toUpperCase()} is a cost — enter it as a negative number (e.g. -1.2)` };
      values[row.lineItem][fy] = n;
    }
  }
  return { values };
}

// Stored business case lines → input values map
export function valuesFromLines(lines) {
  const map = {};
  for (const l of lines || []) map[l.lineItem.trim().toLowerCase()] = l;
  const values = {};
  for (const row of BIZCASE_ROWS.filter((r) => r.input)) {
    const l = map[row.lineItem.toLowerCase()];
    values[row.lineItem] = Object.fromEntries(FY_KEYS.map((fy) => [fy, l?.[fy] ?? null]));
  }
  return values;
}

// Full calculated P&L → rows ready to store as business_case_lines
export function linesForStorage(calculated) {
  return BIZCASE_ROWS.map((row) => ({
    section: row.section,
    lineItem: row.lineItem,
    sortOrder: row.sortOrder,
    isTotal: row.isTotal,
    ...calculated[row.lineItem],
  }));
}

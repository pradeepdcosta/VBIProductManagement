import { Check, X } from 'lucide-react';
import { SectionTitle, PlaceholderNote } from './shared.jsx';

const REGION_COUNTRIES = {
  Americas: ['United States', 'Canada', 'Brazil', 'Mexico'],
  'APAC & ME': ['India', 'Australia', 'Japan', 'Singapore', 'Hong Kong', 'United Arab Emirates', 'Saudi Arabia'],
  'Europe International': ['United Kingdom', 'Germany', 'Netherlands', 'France', 'Spain', 'Italy', 'Portugal', 'Switzerland', 'South Africa', 'Nigeria'],
};

// Country codes used by uploaded coverage data
const CODE_TO_COUNTRY = {
  US: 'United States', IN: 'India', AU: 'Australia', JP: 'Japan', SG: 'Singapore', AE: 'United Arab Emirates',
  UK: 'United Kingdom', DE: 'Germany', NL: 'Netherlands', ES: 'Spain', IT: 'Italy', PT: 'Portugal', ZA: 'South Africa', NG: 'Nigeria',
};

const DISTRIBUTORS = ['Westcon', 'Ingram Micro', 'NCR', 'Infinigate', 'TD SYNNEX', 'Exclusive Networks', 'Arrow ECS'];

// Deterministic pseudo-random numbers from the product id, so placeholders don't change between visits
function seededRandom(seed) {
  let a = seed >>> 0; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rand, list, min, max) => {
  const n = Math.min(list.length, min + Math.floor(rand() * (max - min + 1)));
  return [...list].sort(() => rand() - 0.5).slice(0, n);
};

function placeholderCoverage(productId) {
  const rand = seededRandom(productId * 7919);
  const byRegion = {};
  for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
    byRegion[region] = rand() < 0.2 ? [] : pick(rand, countries, 1, Math.min(5, countries.length));
  }
  // Every product is sold somewhere
  if (Object.values(byRegion).every((c) => c.length === 0)) {
    byRegion['Europe International'] = pick(rand, REGION_COUNTRIES['Europe International'], 2, 4);
  }
  const distributors = pick(rand, DISTRIBUTORS, 2, 4).map((name) => ({
    name,
    regions: pick(rand, Object.keys(REGION_COUNTRIES), 1, 3),
    status: rand() < 0.75 ? 'Active' : 'Onboarding',
  }));
  return { byRegion, distributors };
}

function realCoverage(coverage) {
  const available = new Set(coverage.filter((c) => c.status === 'available' || c.status === 'partial').map((c) => CODE_TO_COUNTRY[c.countryCode]).filter(Boolean));
  return Object.fromEntries(Object.entries(REGION_COUNTRIES).map(([region, countries]) => [region, countries.filter((c) => available.has(c))]));
}

export default function CoverageTab({ product }) {
  const hasReal = (product.coverage || []).length > 0;
  const placeholder = placeholderCoverage(product.id);
  const byRegion = hasReal ? realCoverage(product.coverage) : placeholder.byRegion;

  return (
    <div>
      <PlaceholderNote>
        {hasReal ? 'country availability is from uploaded data; ' : 'country availability and '}distributors are sample data until real coverage is loaded.
      </PlaceholderNote>

      <SectionTitle>Regional availability</SectionTitle>
      <div className="bg-white border border-vf-border rounded-lg overflow-hidden mb-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-vf-surface border-b border-vf-border text-left text-[0.625rem] text-vf-muted uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold w-[150px]">Region</th>
              <th className="px-3 py-2 font-semibold text-center w-[80px]">Available</th>
              <th className="px-3 py-2 font-semibold">Countries</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byRegion).map(([region, countries]) => (
              <tr key={region} className="border-b border-[#f0eeea] last:border-b-0 align-top">
                <td className="px-3 py-2.5 font-medium text-vf-dark">{region}</td>
                <td className="px-3 py-2.5 text-center">
                  {countries.length
                    ? <Check size={15} className="inline text-vf-success" aria-label="Available" />
                    : <X size={15} className="inline text-vf-red" aria-label="Not available" />}
                </td>
                <td className="px-3 py-2.5 text-vf-text">{countries.length ? countries.join(', ') : <span className="text-vf-muted">Not available</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Distribution</SectionTitle>
      <div className="bg-white border border-vf-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-vf-surface border-b border-vf-border text-left text-[0.625rem] text-vf-muted uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Distributor</th>
              <th className="px-3 py-2 font-semibold">Regions</th>
              <th className="px-3 py-2 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {placeholder.distributors.map((d) => (
              <tr key={d.name} className="border-b border-[#f0eeea] last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-vf-dark">{d.name}</td>
                <td className="px-3 py-2.5 text-vf-text">{d.regions.join(', ')}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-semibold ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

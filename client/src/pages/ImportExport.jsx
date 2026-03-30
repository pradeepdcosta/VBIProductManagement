import { useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

const UPLOAD_ZONES = [
  { key: 'catalog', label: 'Product Catalog', desc: 'XLSX / CSV · categories, families, lines, names', emoji: '📋', endpoint: '/api/upload/catalog' },
  { key: 'trading', label: 'Trading Data', desc: 'XLSX / CSV · actual vs target, by region & product', emoji: '📈', endpoint: '/api/upload/trading' },
  { key: 'costs', label: 'Cost / P&L', desc: 'XLSX · P&S costs, network costs, overhead', emoji: '💰', endpoint: '/api/upload/costs' },
  { key: 'npd', label: 'NPD Pipeline', desc: 'XLSX · stage gates, owners, launch dates', emoji: '🚀', endpoint: '/api/upload/npd' },
  { key: 'coverage', label: 'Country Coverage', desc: 'XLSX · market availability matrix', emoji: '🌍', endpoint: '/api/upload/coverage' },
  { key: 'sla', label: 'SLA Data', desc: 'XLSX · SLA tiers, uptime, support levels', emoji: '⭐', endpoint: '/api/upload/sla' },
  { key: 'bizcase', label: 'Business Case', desc: 'XLSX · P&L template with revenue, costs, margins, CapEx', emoji: '📊', endpoint: '/api/upload/bizcase' },
];

const EXPORTS = [
  { label: 'Full Catalog (XLSX)', endpoint: '/api/export/catalog', filename: 'vbi_product_catalog.xlsx' },
  { label: 'Trading Report (XLSX)', endpoint: '/api/export/trading', filename: 'vbi_trading_report.xlsx' },
  { label: 'NPD Tracker (XLSX)', endpoint: '/api/export/npd', filename: 'vbi_npd_tracker.xlsx' },
  { label: 'Cost Summary (XLSX)', endpoint: '/api/export/costs', filename: 'vbi_cost_summary.xlsx' },
  { label: 'Business Case Template', endpoint: '/api/export/bizcase-template', filename: 'vbi_business_case_template.xlsx', isTemplate: true },
  { label: 'Business Cases (XLSX)', endpoint: '/api/export/bizcase', filename: 'vbi_business_cases.xlsx' },
];

function UploadZone({ zone }) {
  const { showToast } = useProductStore();
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(zone.endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Uploaded ${zone.label} successfully`);
      } else {
        showToast(data.error || 'Upload failed', 'warning');
      }
    } catch {
      showToast('Upload failed', 'warning');
    }
    e.target.value = '';
  };

  return (
    <div
      className="border-2 border-dashed border-vf-border rounded-[10px] p-7 text-center cursor-pointer bg-white hover:border-vf-red transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="text-[32px] mb-2">{zone.emoji}</div>
      <div className="text-[13px] font-semibold mb-1">{zone.label}</div>
      <div className="text-[11px] text-vf-muted">{zone.desc}</div>
    </div>
  );
}

export default function ImportExport() {
  const { showToast } = useProductStore();

  const handleExport = async (exp) => {
    try {
      const res = await fetch(exp.endpoint);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exp.filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${exp.label}`);
    } catch {
      showToast('Export failed', 'warning');
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-base font-semibold mb-1">Import / Export</h2>
      <p className="text-xs text-vf-muted mb-5">
        Upload Excel or CSV files to auto-update catalog data, costs, and trading performance.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {UPLOAD_ZONES.map((zone) => (
          <UploadZone key={zone.key} zone={zone} />
        ))}
      </div>

      <div className="bg-white border border-vf-border rounded-[10px] p-4">
        <div className="text-[13px] font-semibold mb-2.5">Export</div>
        <div className="flex gap-2.5 flex-wrap">
          {EXPORTS.map((exp) => (
            <button
              key={exp.label}
              className="border border-vf-border bg-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface"
              onClick={() => handleExport(exp)}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import useProductStore from '../store/useProductStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  'On Track':    { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  'Done':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  'In Progress': { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  'Mobilise':    { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  'DB Approved': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'Not Started': { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  'At Risk':     { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Off-Track':   { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
};

const CATEGORY_COLORS = {
  'Product Launch':          '#E60000',
  'Feature Release':         '#0066CC',
  'Product Rationalization': '#FF9900',
  'Technical Enabler':       '#6B6A66',
  'Service Launch':          '#00857C',
  'Aspirational':            '#9B59B6',
};

const PORTFOLIO_ICONS = {
  'Cybersecurity':           '🛡️',
  'Fixed Connectivity':      '🔌',
  'Mobility':                '📱',
  'Unified Communications':  '📞',
  'Cloud & Edge Computing':  '☁️',
};

const QUARTERS   = ['Q1', 'Q2', 'Q3', 'Q4'];
const STAGE_KEYS = ['concept', 'bizCase', 'design', 'gtm', 'salesEnable', 'distribution', 'slaDefinition', 'launch'];
const STAGE_LABELS = ['Concept', 'Business Case', 'Design', 'GTM', 'Sales Enablement', 'Distribution', 'SLA Definition', 'Launch'];

const EPIC_TYPES = [
  'New Product',
  'New Feature',
  'Enhancement',
  'Migration',
  'Retirement',
];

const RISK_CONFIG = {
  High:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'High Risk' },
  Medium: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Medium Risk' },
  Low:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Low Risk' },
};

const CHECKLIST_CATEGORIES = [
  'Market & Go-Live Dates',
  'Systems Readiness',
  'VBTS Readiness',
  'Commercial Readiness',
  'Sales Readiness',
  'Marketing Readiness',
  'Solution Sales Readiness',
  'Other',
];

// ─── Small shared components ──────────────────────────────────────────────────

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function CategoryTag({ category }) {
  const color = CATEGORY_COLORS[category] || '#6B6A66';
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-white" style={{ backgroundColor: color }}>
      {category}
    </span>
  );
}

function RiskBadge({ level }) {
  const c = RISK_CONFIG[level] || RISK_CONFIG.Medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function fmt(v) {
  if (v == null) return '—';
  return `€${Number(v).toFixed(1)}M`;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProgressBar({ pct }) {
  const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-vf-red';
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Stage Gate ───────────────────────────────────────────────────────────────

function StageGateFlow({ stages }) {
  if (!stages) return null;
  return (
    <div className="flex items-start gap-0 w-full">
      {STAGE_KEYS.map((key, i) => {
        const s = stages[key] || { status: 'not-started', date: null };
        let dotColor, dotBorder, icon;
        switch (s.status) {
          case 'complete':    dotColor = 'bg-green-500'; dotBorder = 'border-green-500'; icon = '✓'; break;
          case 'in-progress': dotColor = 'bg-blue-500';  dotBorder = 'border-blue-500';  icon = '●'; break;
          case 'at-risk':     dotColor = 'bg-red-500';   dotBorder = 'border-red-500';   icon = '!'; break;
          case 'planned':     dotColor = 'bg-amber-400'; dotBorder = 'border-amber-400'; icon = '○'; break;
          default:            dotColor = 'bg-gray-200';  dotBorder = 'border-gray-300';  icon = '';  break;
        }
        return (
          <div key={key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div className={`absolute top-[14px] right-1/2 w-full h-0.5 ${s.status === 'complete' || stages[STAGE_KEYS[i - 1]]?.status === 'complete' ? 'bg-green-400' : 'bg-gray-200'}`} style={{ zIndex: 0 }} />
            )}
            <div className={`relative z-10 w-7 h-7 rounded-full ${dotColor} border-2 ${dotBorder} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
              {icon}
            </div>
            <div className="text-[10px] font-semibold text-vf-dark mt-1.5 text-center leading-tight">{STAGE_LABELS[i]}</div>
            <div className="text-[10px] text-vf-muted mt-0.5 text-center font-mono">
              {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'TBC'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Epic Modal ───────────────────────────────────────────────────────────

function AddEpicModal({ initiative, onClose, onCreated }) {
  const [form, setForm] = useState({
    productCanvas: initiative.investmentCanvas || '',
    epicName: '',
    epicType: '',
    description: '',
    capex: '',
    opex: '',
    marketsAgreed: '',
    goLiveDateOverall: '',
    goLiveDatePerMarket: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/npd-epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: String(initiative.id),
          ...form,
          capex: form.capex !== '' ? parseFloat(form.capex) : null,
          opex:  form.opex  !== '' ? parseFloat(form.opex)  : null,
        }),
      });
      const epic = await res.json();
      onCreated(epic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-vf-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-vf-dark">Add Epic</h2>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-dark text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Name / ID *</label>
              <input required className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.epicName} onChange={(e) => set('epicName', e.target.value)} placeholder="e.g. EP-001 VBTS Ordering Integration" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Type</label>
              <select className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white" value={form.epicType} onChange={(e) => set('epicType', e.target.value)}>
                <option value="">Select type…</option>
                {EPIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Canvas</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.productCanvas} onChange={(e) => set('productCanvas', e.target.value)} placeholder="Canvas name" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description — what this epic delivers</label>
            <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of scope and deliverable…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">CAPEX Draw (€M)</label>
              <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.capex} onChange={(e) => set('capex', e.target.value)} placeholder="0.0" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">OPEX Draw (€M)</label>
              <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.opex} onChange={(e) => set('opex', e.target.value)} placeholder="0.0" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Markets Agreed for This Launch</label>
            <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.marketsAgreed} onChange={(e) => set('marketsAgreed', e.target.value)} placeholder="e.g. UK, DE, NL, AU" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Planned Go-Live — Overall</label>
              <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.goLiveDateOverall} onChange={(e) => set('goLiveDateOverall', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Per-Market Go-Live Notes</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.goLiveDatePerMarket} onChange={(e) => set('goLiveDatePerMarket', e.target.value)} placeholder="e.g. UK: Aug 26, DE: Sep 26…" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-vf-border rounded-lg text-vf-dark hover:bg-vf-surface">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Epic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Epic Detail ──────────────────────────────────────────────────────────────

function EpicDetail({ epic: initialEpic, onBack }) {
  const [epic, setEpic] = useState(initialEpic);
  const [activities, setActivities] = useState(initialEpic.activities || []);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [savingHeader, setSavingHeader] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [signOffForm, setSignOffForm] = useState({
    signOffComplete: epic.signOffComplete || false,
    signOffBy: epic.signOffBy || '',
    signOffDate: epic.signOffDate ? epic.signOffDate.split('T')[0] : '',
    signOffNotes: epic.signOffNotes || '',
  });
  const [savingSignOff, setSavingSignOff] = useState(false);

  const progress = useMemo(() => {
    const applicable = activities.filter((a) => a.status !== 'na');
    if (!applicable.length) return 0;
    return Math.round((applicable.filter((a) => a.status === 'complete').length / applicable.length) * 100);
  }, [activities]);

  const grouped = useMemo(() => {
    const g = {};
    for (const cat of CHECKLIST_CATEGORIES) g[cat] = [];
    for (const a of activities) {
      if (!g[a.category]) g[a.category] = [];
      g[a.category].push(a);
    }
    return g;
  }, [activities]);

  const toggleActivity = async (activity, nextStatus) => {
    const optimistic = activities.map((a) => a.id === activity.id ? { ...a, status: nextStatus } : a);
    setActivities(optimistic);
    await fetch(`/api/npd-epics/${epic.id}/activities/${activity.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
  };

  const updateRisk = async (level) => {
    setEpic((e) => ({ ...e, riskLevel: level }));
    await fetch(`/api/npd-epics/${epic.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskLevel: level }),
    });
  };

  const startEditHeader = () => {
    setHeaderForm({
      productCanvas: epic.productCanvas || '',
      epicName: epic.epicName || '',
      epicType: epic.epicType || '',
      description: epic.description || '',
      capex: epic.capex != null ? String(epic.capex) : '',
      opex:  epic.opex  != null ? String(epic.opex)  : '',
      marketsAgreed: epic.marketsAgreed || '',
      goLiveDateOverall: epic.goLiveDateOverall ? epic.goLiveDateOverall.split('T')[0] : '',
      goLiveDatePerMarket: epic.goLiveDatePerMarket || '',
    });
    setEditingHeader(true);
  };

  const saveHeader = async () => {
    setSavingHeader(true);
    try {
      const res = await fetch(`/api/npd-epics/${epic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          capex: headerForm.capex !== '' ? parseFloat(headerForm.capex) : null,
          opex:  headerForm.opex  !== '' ? parseFloat(headerForm.opex)  : null,
        }),
      });
      const updated = await res.json();
      setEpic(updated);
      setEditingHeader(false);
    } finally {
      setSavingHeader(false);
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    try {
      const res = await fetch(`/api/npd-epics/${epic.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newMilestone.trim() }),
      });
      const activity = await res.json();
      setActivities((a) => [...a, activity]);
      setNewMilestone('');
    } finally {
      setAddingMilestone(false);
    }
  };

  const saveSignOff = async () => {
    setSavingSignOff(true);
    try {
      const res = await fetch(`/api/npd-epics/${epic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signOffForm),
      });
      const updated = await res.json();
      setEpic(updated);
    } finally {
      setSavingSignOff(false);
    }
  };

  const hSet = (k, v) => setHeaderForm((f) => ({ ...f, [k]: v }));
  const soSet = (k, v) => setSignOffForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline font-medium">
        ← Back to Initiative
      </button>

      {/* Epic header card */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="bg-vf-dark text-white px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {epic.epicType && (
                <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded text-white">{epic.epicType}</span>
              )}
              <RiskBadge level={epic.riskLevel} />
            </div>
            <h3 className="text-lg font-bold">{epic.epicName}</h3>
            {epic.productCanvas && (
              <p className="text-gray-300 text-sm mt-0.5">Product Canvas: {epic.productCanvas}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Risk selector */}
            <div className="flex gap-1">
              {Object.keys(RISK_CONFIG).map((level) => (
                <button
                  key={level}
                  onClick={() => updateRisk(level)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${epic.riskLevel === level ? 'bg-white text-vf-dark' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {level}
                </button>
              ))}
            </div>
            <button onClick={startEditHeader} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded font-medium transition-all">
              Edit
            </button>
          </div>
        </div>

        {/* Progress bar row */}
        <div className="px-6 py-3 border-b border-vf-border bg-vf-surface flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Completion Progress</span>
              <span className="text-sm font-bold text-vf-dark font-mono">{progress}%</span>
            </div>
            <ProgressBar pct={progress} />
          </div>
          <div className="text-xs text-vf-muted">
            {activities.filter((a) => a.status === 'complete').length} of {activities.filter((a) => a.status !== 'na').length} gates done
          </div>
        </div>

        {/* Header info grid */}
        {editingHeader ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Name *</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.epicName} onChange={(e) => hSet('epicName', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Type</label>
                <select className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white" value={headerForm.epicType} onChange={(e) => hSet('epicType', e.target.value)}>
                  <option value="">Select…</option>
                  {EPIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Canvas</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.productCanvas} onChange={(e) => hSet('productCanvas', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description</label>
              <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={headerForm.description} onChange={(e) => hSet('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">CAPEX Draw (€M)</label>
                <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.capex} onChange={(e) => hSet('capex', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">OPEX Draw (€M)</label>
                <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.opex} onChange={(e) => hSet('opex', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Markets Agreed</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.marketsAgreed} onChange={(e) => hSet('marketsAgreed', e.target.value)} placeholder="e.g. UK, DE, NL" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Planned Go-Live (Overall)</label>
                <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.goLiveDateOverall} onChange={(e) => hSet('goLiveDateOverall', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Per-Market Go-Live Notes</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.goLiveDatePerMarket} onChange={(e) => hSet('goLiveDatePerMarket', e.target.value)} placeholder="e.g. UK: Aug 26, DE: Sep 26…" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingHeader(false)} className="px-4 py-2 text-sm border border-vf-border rounded-lg text-vf-dark hover:bg-vf-surface">Cancel</button>
              <button onClick={saveHeader} disabled={savingHeader} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
                {savingHeader ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 grid grid-cols-3 gap-x-8 gap-y-3">
            {epic.description && (
              <div className="col-span-3 text-sm text-vf-dark leading-relaxed border-b border-vf-border pb-3 mb-1">{epic.description}</div>
            )}
            <InfoField label="CAPEX Draw" value={fmt(epic.capex)} />
            <InfoField label="OPEX Draw"  value={fmt(epic.opex)} />
            <InfoField label="Total Draw"  value={fmt((epic.capex || 0) + (epic.opex || 0))} highlight />
            <InfoField label="Markets Agreed" value={epic.marketsAgreed} />
            <InfoField label="Planned Go-Live" value={fmtDate(epic.goLiveDateOverall)} />
            {epic.goLiveDatePerMarket && <InfoField label="Per-Market Dates" value={epic.goLiveDatePerMarket} />}
          </div>
        )}
      </div>

      {/* ─── Checklist ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-vf-border bg-vf-surface">
          <h4 className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Launch Readiness Checklist</h4>
          <p className="text-[11px] text-vf-muted mt-0.5">Tick complete or mark N/A for each gate. N/A items are excluded from progress.</p>
        </div>

        <div className="divide-y divide-vf-border">
          {CHECKLIST_CATEGORIES.map((cat) => {
            const items = grouped[cat] || [];
            if (items.length === 0) return null;
            const done = items.filter((a) => a.status === 'complete').length;
            const applicable = items.filter((a) => a.status !== 'na').length;
            return (
              <ChecklistSection
                key={cat}
                category={cat}
                items={items}
                done={done}
                applicable={applicable}
                onToggle={toggleActivity}
              />
            );
          })}
        </div>

        {/* Add custom milestone */}
        <div className="px-5 py-4 border-t border-vf-border bg-vf-surface">
          <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-2">Add Custom Milestone</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red"
              placeholder="Describe the milestone…"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            />
            <button
              onClick={addMilestone}
              disabled={addingMilestone || !newMilestone.trim()}
              className="px-4 py-1.5 text-sm bg-vf-dark text-white rounded-lg hover:bg-vf-dark/90 disabled:opacity-40"
            >
              {addingMilestone ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── VBI Sign-Off ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-vf-border bg-vf-surface flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-vf-muted uppercase tracking-wide">VBI Sign-Off</h4>
            <p className="text-[11px] text-vf-muted mt-0.5">All launch gates confirmed and formally signed off.</p>
          </div>
          {epic.signOffComplete && (
            <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Signed Off</span>
          )}
        </div>
        <div className="px-5 py-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-vf-red"
              checked={signOffForm.signOffComplete}
              onChange={(e) => soSet('signOffComplete', e.target.checked)}
            />
            <span className="text-sm font-medium text-vf-dark">All above launch gates confirmed and signed off</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Sign-Off By (Name)</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={signOffForm.signOffBy} onChange={(e) => soSet('signOffBy', e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Sign-Off Date</label>
              <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={signOffForm.signOffDate} onChange={(e) => soSet('signOffDate', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Notes / Caveats / Deferred Markets</label>
            <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={signOffForm.signOffNotes} onChange={(e) => soSet('signOffNotes', e.target.value)} placeholder="Any market where launch was deferred and new agreed date, caveats, etc." />
          </div>
          <div className="flex justify-end">
            <button onClick={saveSignOff} disabled={savingSignOff} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
              {savingSignOff ? 'Saving…' : 'Save Sign-Off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }) {
  if (!value || value === '—') return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-vf-muted">—</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-vf-red' : 'text-vf-dark'}`}>{value}</span>
    </div>
  );
}

function ChecklistSection({ category, items, done, applicable, onToggle }) {
  const [open, setOpen] = useState(true);
  const pct = applicable > 0 ? Math.round((done / applicable) * 100) : 0;

  return (
    <div>
      <button
        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold text-vf-dark flex-1">{category}</span>
        <span className="text-[11px] text-vf-muted font-mono">{done}/{applicable}</span>
        <div className="w-20">
          <ProgressBar pct={pct} />
        </div>
        <span className={`text-[10px] font-mono ${pct === 100 ? 'text-green-600' : 'text-vf-muted'}`}>{pct}%</span>
        <span className="text-vf-muted text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2">
          {items.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity, onToggle }) {
  const isDone = activity.status === 'complete';
  const isNa   = activity.status === 'na';

  const nextStatus = () => {
    if (isDone) return 'pending';
    return 'complete';
  };

  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${isDone ? 'border-green-200 bg-green-50' : isNa ? 'border-gray-200 bg-gray-50' : 'border-vf-border bg-white'}`}>
      <button
        onClick={() => onToggle(activity, nextStatus())}
        className={`mt-0.5 flex-shrink-0 w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
          isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-vf-red'
        }`}
      >
        {isDone && <span className="text-[10px] leading-none">✓</span>}
      </button>
      <span className={`flex-1 text-xs leading-relaxed ${isDone ? 'text-green-800 line-through decoration-green-400' : isNa ? 'text-gray-400' : 'text-vf-dark'}`}>
        {activity.label}
        {activity.isCustom && <span className="ml-1.5 text-[10px] text-vf-muted italic">(custom)</span>}
      </span>
      <button
        onClick={() => onToggle(activity, isNa ? 'pending' : 'na')}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all flex-shrink-0 ${
          isNa ? 'bg-gray-200 text-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        N/A
      </button>
    </div>
  );
}

// ─── Initiative Detail ────────────────────────────────────────────────────────

function InitiativeDetail({ item, onBack }) {
  const [epics, setEpics] = useState([]);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [showAddEpic, setShowAddEpic] = useState(false);
  const [selectedEpic, setSelectedEpic] = useState(null);

  const fetchEpics = useCallback(async () => {
    setLoadingEpics(true);
    try {
      const res = await fetch(`/api/npd-epics?initiativeId=${item.id}`);
      const data = await res.json();
      setEpics(data);
    } catch {}
    setLoadingEpics(false);
  }, [item.id]);

  useEffect(() => { fetchEpics(); }, [fetchEpics]);

  const openEpic = async (epicSummary) => {
    const res = await fetch(`/api/npd-epics/${epicSummary.id}`);
    const full = await res.json();
    setSelectedEpic(full);
  };

  if (selectedEpic) {
    return (
      <EpicDetail
        epic={selectedEpic}
        onBack={() => { setSelectedEpic(null); fetchEpics(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline font-medium">
        ← Back to Pipeline
      </button>

      {/* Header */}
      <div className="bg-vf-dark text-white rounded-t-[10px] px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{item.initiativeName}</h3>
            <div className="text-sm text-gray-300 mt-1">
              {PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio} › {item.productFamily} › {item.productLine}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <CategoryTag category={item.roadmapCategory} />
          </div>
        </div>
      </div>

      {/* Stage Gate */}
      <div className="bg-white border-x border-vf-border px-6 py-5 -mt-4">
        <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-4">Development Stage Gate</div>
        <StageGateFlow stages={item.stages} />
      </div>

      {/* Info Grid */}
      <div className="bg-white border-x border-b border-vf-border rounded-b-[10px] px-6 py-5 -mt-4">
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Initiative Details</div>
            <div className="text-sm"><span className="text-vf-muted">Year / Quarter:</span> <span className="font-semibold">{item.fy} {item.quarter}</span></div>
            <div className="text-sm"><span className="text-vf-muted">Market:</span> <span className="font-semibold">{item.market}</span></div>
            {item.roadmapHorizon && <div className="text-sm"><span className="text-vf-muted">Horizon:</span> <span className="font-semibold">{item.roadmapHorizon}</span></div>}
            {item.primaryInvestmentDriver && <div className="text-sm"><span className="text-vf-muted">Investment Driver:</span> <span className="font-semibold">{item.primaryInvestmentDriver}</span></div>}
            {item.investmentCanvas && <div className="text-sm"><span className="text-vf-muted">Investment Canvas:</span> <span className="font-semibold">{item.investmentCanvas}</span></div>}
          </div>
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Investment</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">CapEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.capex)}</div>
              </div>
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">OpEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.opex)}</div>
              </div>
            </div>
            <div className="bg-vf-surface rounded-lg p-3 mt-3 text-center">
              <div className="text-xs text-vf-muted font-medium mb-1">Total Investment</div>
              <div className="text-xl font-bold text-vf-red font-mono">{fmt((item.capex || 0) + (item.opex || 0))}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Description & Objectives</div>
            <div className="bg-vf-surface rounded-lg p-4 text-sm text-vf-dark leading-relaxed h-[160px] overflow-y-auto">
              {item.description || 'No description available.'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Epics Section ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-vf-border flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-vf-dark">Epics</h4>
            <p className="text-[11px] text-vf-muted mt-0.5">Scoped work packages and delivery tracking against this initiative.</p>
          </div>
          <button
            onClick={() => setShowAddEpic(true)}
            className="px-3 py-1.5 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover font-medium"
          >
            + Add Epic
          </button>
        </div>

        {loadingEpics ? (
          <div className="p-8 text-center text-vf-muted text-sm">Loading epics…</div>
        ) : epics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-vf-muted text-sm mb-1">No epics yet for this initiative.</p>
            <p className="text-vf-muted text-xs">Add an epic to start tracking delivery milestones and readiness gates.</p>
          </div>
        ) : (
          <div className="divide-y divide-vf-border">
            {epics.map((epic) => (
              <EpicCard key={epic.id} epic={epic} onClick={() => openEpic(epic)} />
            ))}
          </div>
        )}
      </div>

      {showAddEpic && (
        <AddEpicModal
          initiative={item}
          onClose={() => setShowAddEpic(false)}
          onCreated={(epic) => {
            setEpics((e) => [...e, epic]);
            setShowAddEpic(false);
          }}
        />
      )}
    </div>
  );
}

function EpicCard({ epic, onClick }) {
  const rc = RISK_CONFIG[epic.riskLevel] || RISK_CONFIG.Medium;
  return (
    <div
      className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-vf-dark truncate">{epic.epicName}</span>
          {epic.epicType && (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">{epic.epicType}</span>
          )}
        </div>
        {epic.description && (
          <p className="text-xs text-vf-muted truncate">{epic.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {epic.goLiveDateOverall && (
            <span className="text-[11px] text-vf-muted">Go-live: {fmtDate(epic.goLiveDateOverall)}</span>
          )}
          {epic.marketsAgreed && (
            <span className="text-[11px] text-vf-muted">Markets: {epic.marketsAgreed}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Investment */}
        {(epic.capex != null || epic.opex != null) && (
          <div className="text-right">
            <div className="text-[11px] text-vf-muted">CAPEX / OPEX</div>
            <div className="text-xs font-mono font-semibold text-vf-dark">{fmt(epic.capex)} / {fmt(epic.opex)}</div>
          </div>
        )}

        {/* Progress */}
        <div className="w-24 text-right">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <span className="text-[11px] font-mono font-bold text-vf-dark">{epic.progress}%</span>
          </div>
          <ProgressBar pct={epic.progress} />
          <div className="text-[10px] text-vf-muted mt-0.5 text-right">{epic.completedActivities}/{epic.totalActivities} gates</div>
        </div>

        {/* Risk */}
        <RiskBadge level={epic.riskLevel} />

        {/* Sign-off indicator */}
        {epic.signOffComplete && (
          <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Signed Off</span>
        )}

        <span className="text-vf-muted text-sm">›</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NpdPipeline() {
  const filters = useProductStore((s) => s.filters);
  const [data, setData] = useState({ initiatives: [], summary: { total: 0, statusCounts: {}, categoryCounts: {}, portfolioCounts: {}, quarterCounts: {} } });
  const [loading, setLoading] = useState(true);
  const [fyFilter, setFyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.family) params.set('family', filters.family);
        if (filters.productLine) params.set('productLine', filters.productLine);
        if (filters.q) params.set('q', filters.q);
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('roadmapCategory', categoryFilter);
        const qs = params.toString();
        const res = await fetch(`/api/products/npd-initiatives${qs ? '?' + qs : ''}`);
        const json = await res.json();
        setData(json);
      } catch {}
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q, statusFilter, categoryFilter]);

  const initiatives = useMemo(() => {
    const fy27 = data.initiatives.filter((i) => i.fy === 'FY27');
    const fy28 = fy27.map((i) => ({ ...i, id: `fy28-${i.id}`, fy: 'FY28' }));
    const base = [...fy27, ...fy28];
    if (fyFilter) return base.filter((i) => i.fy === fyFilter);
    return base;
  }, [data.initiatives, fyFilter]);

  const summary = useMemo(() => {
    const statusCounts = {}, categoryCounts = {}, portfolioCounts = {}, quarterCounts = {};
    for (const i of initiatives) {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      categoryCounts[i.roadmapCategory] = (categoryCounts[i.roadmapCategory] || 0) + 1;
      portfolioCounts[i.portfolio] = (portfolioCounts[i.portfolio] || 0) + 1;
      const key = `${i.fy} ${i.quarter}`;
      quarterCounts[key] = (quarterCounts[key] || 0) + 1;
    }
    return { total: initiatives.length, statusCounts, categoryCounts, portfolioCounts, quarterCounts };
  }, [initiatives]);

  const matrix = useMemo(() => {
    const counts = summary.quarterCounts || {};
    const years = [...new Set(Object.keys(counts).map((k) => k.split(' ')[0]))].sort();
    const grid = {};
    for (const q of QUARTERS) {
      grid[q] = {};
      for (const y of years) grid[q][y] = counts[`${y} ${q}`] || 0;
      grid[q]._total = Object.values(grid[q]).reduce((a, b) => a + b, 0);
    }
    const colTotals = {};
    for (const y of years) colTotals[y] = QUARTERS.reduce((a, q) => a + (grid[q][y] || 0), 0);
    colTotals._total = summary.total;
    return { years, grid, colTotals };
  }, [summary]);

  const timelineData = useMemo(() => {
    const grouped = {};
    for (const i of initiatives) {
      if (!grouped[i.fy]) grouped[i.fy] = {};
      if (!grouped[i.fy][i.quarter]) grouped[i.fy][i.quarter] = [];
      grouped[i.fy][i.quarter].push(i);
    }
    return grouped;
  }, [initiatives]);

  const fys = Object.keys(timelineData).sort();

  if (selectedItem) {
    return (
      <div className="p-5">
        <InitiativeDetail item={selectedItem} onBack={() => setSelectedItem(null)} />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">NPD Roadmap Pipeline</h2>
        <div className="flex border border-vf-border rounded-md overflow-hidden">
          <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'timeline' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>Timeline</button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>List</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
          <option value="">All Years</option>
          <option value="FY27">FY27</option>
          <option value="FY28">FY28</option>
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(fyFilter || statusFilter || categoryFilter) && (
          <button onClick={() => { setFyFilter(''); setStatusFilter(''); setCategoryFilter(''); }} className="text-xs text-vf-red hover:underline ml-1">Clear filters</button>
        )}
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Initiatives by Quarter</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-vf-muted font-medium pb-1.5" />
                {matrix.years.map((y) => (
                  <th key={y} className="text-center text-xs text-vf-muted font-semibold pb-1.5 px-1">{y}</th>
                ))}
                <th className="text-center text-xs text-vf-dark font-bold pb-1.5 px-1 border-l border-[#e8e6e1]">Total</th>
              </tr>
            </thead>
            <tbody>
              {QUARTERS.map((q) => (
                <tr key={q} className="border-t border-[#f0eeea]">
                  <td className="py-1.5 text-xs font-semibold text-vf-dark">{q}</td>
                  {matrix.years.map((y) => (
                    <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-dark">{matrix.grid[q][y] || <span className="text-gray-300">—</span>}</td>
                  ))}
                  <td className="py-1.5 text-center font-mono font-bold text-vf-dark border-l border-[#e8e6e1]">{matrix.grid[q]._total}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-vf-dark">
                <td className="py-1.5 text-xs font-bold text-vf-dark">Total</td>
                {matrix.years.map((y) => (
                  <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-red text-base">{matrix.colTotals[y]}</td>
                ))}
                <td className="py-1.5 text-center font-mono font-bold text-vf-red text-lg border-l border-[#e8e6e1]">{matrix.colTotals._total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Status</div>
          <div className="space-y-1.5">
            {Object.entries(summary.statusCounts || {}).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="font-mono font-bold text-vf-dark text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Category</div>
          <div className="space-y-1.5">
            {Object.entries(summary.categoryCounts || {}).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <div key={c} className="flex items-center justify-between gap-2">
                <CategoryTag category={c} />
                <span className="font-mono font-bold text-vf-dark text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Portfolio</div>
          <div className="space-y-1.5">
            {Object.entries(summary.portfolioCounts || {}).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
              <div key={p} className="flex items-center justify-between gap-2">
                <span className="text-xs text-vf-dark font-medium truncate">{PORTFOLIO_ICONS[p] || '📦'} {p}</span>
                <span className="font-mono font-bold text-vf-dark text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">Loading NPD pipeline...</div>
      ) : initiatives.length === 0 ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">No initiatives found. Upload NPD data via Import / Export.</div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-4">
          {fys.map((fy) => (
            <div key={fy}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-base font-bold text-white bg-vf-dark px-3 py-1 rounded">{fy}</div>
                <div className="flex-1 h-px bg-vf-border" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {QUARTERS.map((q) => {
                  const items = timelineData[fy]?.[q] || [];
                  return (
                    <div key={q} className="min-h-[120px]">
                      <div className="text-sm font-semibold text-vf-muted mb-2 flex items-center justify-between">
                        <span>{q}</span>
                        {items.length > 0 && <span className="bg-vf-surface text-vf-muted text-xs px-1.5 py-0.5 rounded-full font-mono">{items.length}</span>}
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-vf-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-vf-red transition-all"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="text-sm font-semibold text-vf-dark leading-tight mb-1.5">{item.initiativeName}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <StatusBadge status={item.status} />
                              <CategoryTag category={item.roadmapCategory} />
                            </div>
                            <div className="text-xs text-vf-muted">
                              {PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio} › {item.productFamily}
                            </div>
                            {(item.capex != null || item.opex != null) && (
                              <div className="text-[10px] text-vf-muted mt-1 font-mono">
                                CapEx {fmt(item.capex)} · OpEx {fmt(item.opex)}
                              </div>
                            )}
                          </div>
                        ))}
                        {items.length === 0 && (
                          <div className="text-xs text-vf-muted italic p-2">No initiatives</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1fr_130px_120px_110px_60px_50px] border-b border-vf-border bg-vf-surface">
            <div className="px-4 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Initiative</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Portfolio</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Category</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Status</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Year</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Qtr</div>
          </div>
          {initiatives.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_130px_120px_110px_60px_50px] border-b border-[#f0eeea] last:border-b-0 items-center cursor-pointer hover:bg-[#fdf9f9] transition-colors"
              onClick={() => setSelectedItem(item)}
            >
              <div className="px-4 py-2.5">
                <div className="text-sm font-medium text-vf-dark truncate">{item.initiativeName}</div>
                <div className="text-xs text-vf-muted truncate">{item.productFamily} › {item.productLine}</div>
              </div>
              <div className="px-3 py-2.5 text-xs text-vf-dark truncate">{PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio}</div>
              <div className="px-3 py-2.5"><CategoryTag category={item.roadmapCategory} /></div>
              <div className="px-3 py-2.5"><StatusBadge status={item.status} /></div>
              <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.fy}</div>
              <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.quarter}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-vf-muted items-center">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} />
            {cat}
          </span>
        ))}
        <span className="ml-auto">Click any initiative to view details →</span>
      </div>
    </div>
  );
}

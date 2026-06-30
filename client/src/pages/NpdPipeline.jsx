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
const STAGE_KEYS = ['concept', 'bizCase', 'development', 'deliveryReadiness', 'regulatoryCompliance', 'commercialApproval', 'gtm', 'channelPartner', 'salesEnable', 'launch'];
const STAGE_LABELS = ['Concept', 'Business Case', 'Development', 'Delivery Readiness', 'Regulatory & Compliance', 'Commercial Approval', 'GTM', 'Channel & Partner Readiness', 'Sales Enablement', 'Launch'];
const STAGE_DEFINITIONS = [
  'Initial idea validated — market need, opportunity, and feasibility confirmed by product leadership.',
  'Strategic and financial justification approved — funding agreed and investment committed to proceed.',
  'Product design and technical build complete — solution developed, tested, and ready for operational deployment.',
  'Operational readiness confirmed — ordering journeys live, support teams trained, back-office and billing systems updated.',
  'All market-specific regulatory and compliance requirements checked and cleared for target geographies.',
  'Pricing model, margins, and P&L reviewed and signed off by commercial and finance leadership.',
  'Go-to-market strategy agreed — positioning, messaging, target segments, pricing, and launch plan confirmed.',
  'External distribution channels and partners fully enabled — trained, contracted, and ready to sell.',
  'Internal sales teams trained, sales plays distributed, all customer-facing and sales-facing materials updated.',
  'Product live in market — orders can be taken across all agreed geographies. Post-launch monitoring active.',
];

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

const STAGE_STATUS_OPTIONS = [
  { value: 'complete',    label: 'Complete',    dot: 'bg-green-500', ring: 'ring-green-400', text: 'text-green-700', bg: 'bg-green-50',  icon: '✓' },
  { value: 'in-progress', label: 'In Progress', dot: 'bg-blue-500',  ring: 'ring-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50',   icon: '●' },
  { value: 'at-risk',     label: 'At Risk',     dot: 'bg-red-500',   ring: 'ring-red-400',   text: 'text-red-700',   bg: 'bg-red-50',    icon: '!' },
  { value: 'planned',     label: 'Planned',     dot: 'bg-amber-400', ring: 'ring-amber-300', text: 'text-amber-700', bg: 'bg-amber-50',  icon: '○' },
  { value: 'not-started', label: 'Not Started', dot: 'bg-gray-300',  ring: 'ring-gray-300',  text: 'text-gray-500',  bg: 'bg-gray-50',   icon: '' },
];

function stageMeta(status) {
  return STAGE_STATUS_OPTIONS.find((o) => o.value === status) || STAGE_STATUS_OPTIONS[4];
}

function isOverdue(stage) {
  if (!stage?.date || stage?.status === 'complete') return false;
  return new Date(stage.date) < new Date();
}

function EditableStageGate({ stages = {}, initiativeId, onStagesChange }) {
  const [activeKey, setActiveKey] = useState(null);
  const [localStages, setLocalStages] = useState(stages);
  const [saving, setSaving] = useState(false);
  const isReadOnly = String(initiativeId).startsWith('fy28-');

  const toggleStage = (key) => setActiveKey((k) => (k === key ? null : key));

  const updateStageField = async (key, field, value) => {
    const updated = { ...localStages, [key]: { ...(localStages[key] || {}), [field]: value } };
    setLocalStages(updated);
    if (isReadOnly) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/npd-initiatives/${initiativeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updated }),
      });
      if (res.ok) onStagesChange?.(updated);
    } finally { setSaving(false); }
  };

  const completeCount = STAGE_KEYS.filter((k) => localStages[k]?.status === 'complete').length;
  const inProgressCount = STAGE_KEYS.filter((k) => ['in-progress', 'at-risk', 'planned'].includes(localStages[k]?.status)).length;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Development Stage Gate</div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-vf-muted"><span className="font-bold text-green-600">{completeCount}</span> of {STAGE_KEYS.length} complete</span>
          {inProgressCount > 0 && <span className="text-vf-muted"><span className="font-bold text-blue-600">{inProgressCount}</span> in progress</span>}
          {saving && <span className="text-vf-muted italic text-[11px]">Saving…</span>}
          {isReadOnly
            ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">FY28 — read only</span>
            : <span className="text-[11px] text-vf-muted italic">Click any stage to update</span>
          }
        </div>
      </div>

      {/* Stage dots */}
      <div className="flex items-start w-full">
        {STAGE_KEYS.map((key, i) => {
          const s = localStages[key] || {};
          const meta = stageMeta(s.status);
          const overdue = isOverdue(s);
          const isActive = activeKey === key;
          return (
            <div key={key} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute top-[16px] right-1/2 w-full h-0.5 ${localStages[STAGE_KEYS[i-1]]?.status === 'complete' && s.status === 'complete' ? 'bg-green-400' : 'bg-gray-200'}`} style={{ zIndex: 0 }} />
              )}
              <button
                onClick={() => !isReadOnly && toggleStage(key)}
                title={STAGE_DEFINITIONS[i]}
                className={`relative z-10 w-8 h-8 rounded-full ${meta.dot} border-2 flex items-center justify-center text-white text-sm font-bold shadow-sm transition-all ${isActive ? `ring-2 ring-offset-2 ${meta.ring} scale-110` : !isReadOnly ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
              >
                {meta.icon}
              </button>
              <div className={`text-xs font-semibold mt-2 text-center leading-tight ${isActive ? 'text-vf-red' : 'text-vf-dark'}`}>
                {STAGE_LABELS[i]}
              </div>
              <div className={`text-xs mt-0.5 text-center font-mono font-medium ${overdue ? 'text-red-500' : 'text-vf-muted'}`}>
                {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC'}
              </div>
              {overdue && <div className="text-[10px] text-red-400 font-semibold text-center">Overdue</div>}
              {s.owner && <div className="text-[10px] text-vf-muted text-center truncate max-w-[72px] mt-0.5">{s.owner}</div>}
            </div>
          );
        })}
      </div>

      {/* Inline edit panel */}
      {activeKey && !isReadOnly && (() => {
        const s = localStages[activeKey] || {};
        const stageIdx = STAGE_KEYS.indexOf(activeKey);
        const pct = Math.round(((stageIdx + 0.5) / STAGE_KEYS.length) * 100);
        return (
          <div className="mt-5 border border-vf-border rounded-xl bg-vf-surface p-4 relative">
            {/* Pointer arrow */}
            <div className="absolute -top-[7px] w-3 h-3 bg-vf-surface border-l border-t border-vf-border rotate-45" style={{ left: `calc(${pct}% - 6px)` }} />
            <div className="flex items-start justify-between mb-3 gap-4">
              <div>
                <span className="text-sm font-semibold text-vf-dark">{STAGE_LABELS[stageIdx]}</span>
                <p className="text-[11px] text-vf-muted mt-0.5 leading-relaxed max-w-lg">{STAGE_DEFINITIONS[stageIdx]}</p>
              </div>
              <button onClick={() => setActiveKey(null)} className="text-vf-muted hover:text-vf-dark text-lg leading-none px-1 flex-shrink-0">×</button>
            </div>

            {/* Status pills */}
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-2">Status — stages are independent and can be updated in any order</div>
              <div className="flex flex-wrap gap-2">
                {STAGE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStageField(activeKey, 'status', opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${s.status === opt.value ? `${opt.bg} ${opt.text} border-current shadow-sm` : 'bg-white text-vf-muted border-vf-border hover:border-gray-400'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Target / Actual Date</div>
                <input
                  type="date"
                  className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white"
                  value={s.date ? s.date.split('T')[0] : ''}
                  onChange={(e) => updateStageField(activeKey, 'date', e.target.value || null)}
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Stage Owner</div>
                <input
                  type="text"
                  placeholder="Name or team"
                  className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white"
                  value={s.owner || ''}
                  onChange={(e) => updateStageField(activeKey, 'owner', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Notes / Blockers</div>
              <textarea
                rows={2}
                placeholder="Any blockers, dependencies, or context…"
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-vf-red resize-none bg-white"
                value={s.notes || ''}
                onChange={(e) => updateStageField(activeKey, 'notes', e.target.value)}
              />
            </div>
          </div>
        );
      })()}
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

// ─── Initiative Form Modal (add / edit) ──────────────────────────────────────

const PORTFOLIO_OPTIONS = [
  'Mobility',
  'Unified Communications',
  'Fixed Connectivity',
  'Cybersecurity',
  'Cloud & Edge Computing',
];

function InitiativeFormModal({ item, onClose, onSave, onDelete }) {
  const isEdit = !!(item && item.id);
  const [form, setForm] = useState({
    initiativeName:          item?.initiativeName          || '',
    portfolio:               item?.portfolio               || '',
    productFamily:           item?.productFamily           || '',
    productLine:             item?.productLine             || '',
    roadmapCategory:         item?.roadmapCategory         || '',
    fy:                      item?.fy                      || 'FY27',
    quarter:                 item?.quarter                 || 'Q1',
    status:                  item?.status                  || 'Not Started',
    capex:                   item?.capex   ?? '',
    opex:                    item?.opex    ?? '',
    investmentCanvas:        item?.investmentCanvas        || '',
    primaryInvestmentDriver: item?.primaryInvestmentDriver || '',
    description:             item?.description             || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.initiativeName.trim() || !form.portfolio || !form.productFamily.trim() || !form.productLine.trim() || !form.roadmapCategory) {
      setError('Please fill in all required fields marked with *');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        capex: form.capex !== '' ? parseFloat(form.capex) : null,
        opex:  form.opex  !== '' ? parseFloat(form.opex)  : null,
      };
      const url    = isEdit ? `/api/products/npd-initiatives/${item.id}` : '/api/products/npd-initiatives';
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      onSave(await res.json(), isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/products/npd-initiatives/${item.id}`, { method: 'DELETE' });
      onDelete(item.id);
    } finally { setDeleting(false); }
  };

  const field = (label, required, children) => (
    <div>
      <label className="block text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1">
        {label}{required && <span className="text-vf-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = 'w-full border border-vf-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vf-red bg-white';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-[500px] bg-white h-full shadow-2xl flex flex-col border-l border-vf-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-vf-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-semibold text-vf-dark">{isEdit ? 'Edit Initiative' : 'Add Initiative'}</h3>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-dark text-2xl leading-none">×</button>
        </div>

        {/* Scrollable fields + sticky footer, all inside the form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            {field('Initiative Name', true,
              <input className={inputCls} value={form.initiativeName} onChange={(e) => set('initiativeName', e.target.value)} placeholder="e.g. SD-WAN Global Rollout" />
            )}

            <div className="grid grid-cols-2 gap-3">
              {field('FY', true,
                <select className={inputCls} value={form.fy} onChange={(e) => set('fy', e.target.value)}>
                  <option value="FY27">FY27</option>
                  <option value="FY28">FY28</option>
                </select>
              )}
              {field('Quarter', true,
                <select className={inputCls} value={form.quarter} onChange={(e) => set('quarter', e.target.value)}>
                  {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field('Portfolio', true,
                <select className={inputCls} value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)}>
                  <option value="">Select…</option>
                  {PORTFOLIO_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {field('Roadmap Category', true,
                <select className={inputCls} value={form.roadmapCategory} onChange={(e) => set('roadmapCategory', e.target.value)}>
                  <option value="">Select…</option>
                  {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field('Product Family', true,
                <input className={inputCls} value={form.productFamily} onChange={(e) => set('productFamily', e.target.value)} placeholder="e.g. SDN" />
              )}
              {field('Product Line', true,
                <input className={inputCls} value={form.productLine} onChange={(e) => set('productLine', e.target.value)} placeholder="e.g. IP-VPN" />
              )}
            </div>

            {field('Status', false,
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <div className="grid grid-cols-2 gap-3">
              {field('CapEx (€M)', false,
                <input type="number" step="0.1" min="0" className={inputCls} value={form.capex} onChange={(e) => set('capex', e.target.value)} placeholder="0.0" />
              )}
              {field('OpEx (€M)', false,
                <input type="number" step="0.1" min="0" className={inputCls} value={form.opex} onChange={(e) => set('opex', e.target.value)} placeholder="0.0" />
              )}
            </div>

            {field('Investment Canvas', false,
              <input className={inputCls} value={form.investmentCanvas} onChange={(e) => set('investmentCanvas', e.target.value)} placeholder="Link or reference" />
            )}

            {field('Primary Investment Driver', false,
              <input className={inputCls} value={form.primaryInvestmentDriver} onChange={(e) => set('primaryInvestmentDriver', e.target.value)} placeholder="e.g. Revenue growth, Cost reduction" />
            )}

            {field('Description', false,
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of the initiative…" />
            )}
          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t border-vf-border flex items-center gap-3 flex-shrink-0 bg-white">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition-all ${
                  confirmDelete ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'
                }`}
              >
                {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="text-sm font-medium text-vf-muted hover:text-vf-dark px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-semibold bg-vf-red text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add initiative'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pipeline Card (timeline view) with quick-status edit ────────────────────

function PipelineCard({ item, onClick, onStatusChange, onEdit }) {
  const [status, setStatus] = useState(item.status);
  const [showPicker, setShowPicker] = useState(false);
  const isReadOnly = String(item.id).startsWith('fy28-');

  const changeStatus = async (e, newStatus) => {
    e.stopPropagation();
    setStatus(newStatus);
    setShowPicker(false);
    onStatusChange?.(item.id, newStatus);
    if (isReadOnly) return;
    await fetch(`/api/products/npd-initiatives/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  return (
    <div
      className="bg-white border border-vf-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-vf-red transition-all relative group"
      onClick={onClick}
    >
      {!isReadOnly && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
          title="Edit initiative"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-vf-muted hover:text-vf-dark z-10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      <div className="text-sm font-semibold text-vf-dark leading-tight mb-1.5 pr-5">{item.initiativeName}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {/* Clickable status badge */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); !isReadOnly && setShowPicker((v) => !v); }}
            title={isReadOnly ? undefined : 'Click to change status'}
            className={`${!isReadOnly ? 'hover:opacity-70' : ''} transition-opacity`}
          >
            <StatusBadge status={status} />
          </button>
          {showPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-vf-border rounded-xl shadow-xl z-30 p-1.5 min-w-[150px]">
              {Object.keys(STATUS_COLORS).map((s) => (
                <button
                  key={s}
                  onClick={(e) => changeStatus(e, s)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-vf-surface text-left ${s === status ? 'font-semibold bg-vf-surface' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[s].dot}`} />
                  <span className="text-vf-dark">{s}</span>
                  {s === status && <span className="ml-auto text-vf-muted text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <CategoryTag category={item.roadmapCategory} />
      </div>
      <div className="text-xs text-vf-muted">
        {item.portfolio} › {item.productFamily}
      </div>
      {(item.capex != null || item.opex != null) && (
        <div className="text-[10px] text-vf-muted mt-1 font-mono">
          CapEx {fmt(item.capex)} · OpEx {fmt(item.opex)}
        </div>
      )}
    </div>
  );
}

// ─── Initiative Detail ────────────────────────────────────────────────────────

function InitiativeDetail({ item, onBack, onStatusChange, onEdit }) {
  const [epics, setEpics] = useState([]);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [showAddEpic, setShowAddEpic] = useState(false);
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [currentStages, setCurrentStages] = useState(item.stages || {});
  const [currentStatus, setCurrentStatus] = useState(item.status || 'Not Started');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const isReadOnly = String(item.id).startsWith('fy28-');

  const updateStatus = async (newStatus) => {
    setCurrentStatus(newStatus);
    setShowStatusPicker(false);
    onStatusChange?.(item.id, newStatus);
    if (isReadOnly) return;
    await fetch(`/api/products/npd-initiatives/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const fetchEpics = useCallback(async () => {
    setLoadingEpics(true);
    try {
      const res = await fetch(`/api/npd-epics?initiativeId=${item.id}`);
      const data = await res.json();
      setEpics(Array.isArray(data) ? data : []);
    } catch {
      setEpics([]);
    }
    setLoadingEpics(false);
  }, [item.id]);

  useEffect(() => { fetchEpics(); }, [fetchEpics]);

  const openEpic = async (epicSummary) => {
    try {
      const res = await fetch(`/api/npd-epics/${epicSummary.id}`);
      const full = await res.json();
      if (full && full.id) setSelectedEpic(full);
    } catch {}
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold">{item.initiativeName}</h3>
            <div className="text-sm text-gray-300 mt-1">
              {item.portfolio} › {item.productFamily} › {item.productLine}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Editable status */}
            <div className="relative">
              <button
                onClick={() => !isReadOnly && setShowStatusPicker((v) => !v)}
                className={`${!isReadOnly ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                title={isReadOnly ? 'FY28 — read only' : 'Click to change status'}
              >
                <StatusBadge status={currentStatus} />
              </button>
              {showStatusPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-vf-border rounded-xl shadow-lg z-20 p-2 min-w-[160px]">
                  <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide px-2 pb-1.5">Set Status</div>
                  {Object.keys(STATUS_COLORS).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-vf-surface text-left transition-colors ${s === currentStatus ? 'bg-vf-surface font-semibold' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s].dot}`} />
                      <span className="text-vf-dark">{s}</span>
                      {s === currentStatus && <span className="ml-auto text-vf-muted">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-vf-border mt-1 pt-1 px-2">
                    <p className="text-[10px] text-vf-muted italic">Status is set manually by the product manager. It is not auto-calculated.</p>
                  </div>
                </div>
              )}
            </div>
            <CategoryTag category={item.roadmapCategory} />
            {!isReadOnly && (
              <button
                onClick={() => onEdit?.(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stage Gate */}
      <div className="bg-white border-x border-vf-border px-6 py-5 -mt-4">
        <EditableStageGate
          stages={currentStages}
          initiativeId={item.id}
          onStagesChange={setCurrentStages}
        />
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
            {epics.map((epic, i) => (
              <EpicCard key={epic.id} epic={epic} index={i + 1} onClick={() => openEpic(epic)} />
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

function EpicCard({ epic, index, onClick }) {
  const totalDraw = (epic.capex || 0) + (epic.opex || 0);
  const progressColor = epic.progress === 100 ? 'text-green-600' : epic.progress >= 50 ? 'text-amber-600' : 'text-vf-red';

  return (
    <div
      className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4"
      onClick={onClick}
    >
      {/* Number pill */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vf-dark text-white flex items-center justify-center text-sm font-bold">
        {index}
      </div>

      {/* Name + description — takes remaining space */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-bold text-vf-dark leading-tight">{epic.epicName}</span>
          {epic.signOffComplete && (
            <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">Signed Off</span>
          )}
        </div>
        {epic.epicType && (
          <span className="text-[11px] font-medium text-vf-muted">{epic.epicType}</span>
        )}
        {epic.description && (
          <p className="text-[11px] text-vf-muted leading-snug line-clamp-2 mt-0.5 pr-4">{epic.description}</p>
        )}
        {(epic.goLiveDateOverall || epic.marketsAgreed) && (
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {epic.goLiveDateOverall && (
              <span className="text-[10px] text-vf-muted">Go-live: <span className="font-medium text-vf-dark">{fmtDate(epic.goLiveDateOverall)}</span></span>
            )}
            {epic.marketsAgreed && (
              <span className="text-[10px] text-vf-muted">Markets: <span className="font-medium text-vf-dark">{epic.marketsAgreed}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 flex items-center divide-x divide-vf-border border-l border-vf-border ml-2">
        {/* Budget draw */}
        <div className="px-4 text-right">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Budget Draw</div>
          <div className="text-lg font-bold text-vf-dark font-mono leading-none">
            {totalDraw > 0 ? fmt(totalDraw) : '—'}
          </div>
          {totalDraw > 0 && (
            <div className="text-[10px] text-vf-muted font-mono mt-1 whitespace-nowrap">
              {fmt(epic.capex)} Cap · {fmt(epic.opex)} Op
            </div>
          )}
        </div>

        {/* Completion */}
        <div className="px-4 text-right">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Completion</div>
          <div className={`text-2xl font-bold font-mono leading-none ${progressColor}`}>
            {epic.progress}%
          </div>
          <div className="mt-1.5 w-14 ml-auto">
            <ProgressBar pct={epic.progress} />
          </div>
          <div className="text-[10px] text-vf-muted mt-1 whitespace-nowrap">
            {epic.completedActivities}/{epic.totalActivities} gates
          </div>
        </div>

        {/* Risk */}
        <div className="px-4">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">Risk</div>
          <RiskBadge level={epic.riskLevel} />
        </div>

        <div className="pl-3 pr-1 text-vf-muted text-lg">›</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NpdPipeline() {
  const filters = useProductStore((s) => s.filters);
  const [data, setData] = useState({ initiatives: [], summary: { total: 0, statusCounts: {}, categoryCounts: {}, portfolioCounts: {}, quarterCounts: {} } });
  const [loading, setLoading] = useState(true);
  const [fyFilter, setFyFilter] = useState('FY27');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formItem, setFormItem] = useState(null);

  const updateInitiativeStatus = useCallback((itemId, newStatus) => {
    const realId = String(itemId).startsWith('fy28-')
      ? parseInt(String(itemId).replace('fy28-', ''), 10)
      : itemId;
    setData((prev) => ({
      ...prev,
      initiatives: prev.initiatives.map((i) => (i.id === realId ? { ...i, status: newStatus } : i)),
    }));
    setSelectedItem((prev) => (prev && (prev.id === itemId || prev.id === realId) ? { ...prev, status: newStatus } : prev));
  }, []);

  const handleSaveInitiative = useCallback((saved, isEdit) => {
    setData((prev) => ({
      ...prev,
      initiatives: isEdit
        ? prev.initiatives.map((i) => (i.id === saved.id ? { ...i, ...saved } : i))
        : [...prev.initiatives, saved],
    }));
    setSelectedItem((prev) => (prev && isEdit && prev.id === saved.id ? { ...prev, ...saved } : prev));
    setFormItem(null);
  }, []);

  const handleDeleteInitiative = useCallback((id) => {
    setData((prev) => ({ ...prev, initiatives: prev.initiatives.filter((i) => i.id !== id) }));
    setFormItem(null);
    setSelectedItem((prev) => (prev && prev.id === id ? null : prev));
  }, []);

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
        {formItem !== null && (
          <InitiativeFormModal
            item={formItem}
            onClose={() => setFormItem(null)}
            onSave={handleSaveInitiative}
            onDelete={handleDeleteInitiative}
          />
        )}
        <InitiativeDetail
          item={selectedItem}
          onBack={() => setSelectedItem(null)}
          onStatusChange={updateInitiativeStatus}
          onEdit={(i) => setFormItem(i)}
        />
      </div>
    );
  }

  return (
    <div className="p-5">
      {formItem !== null && (
        <InitiativeFormModal
          item={formItem}
          onClose={() => setFormItem(null)}
          onSave={handleSaveInitiative}
          onDelete={handleDeleteInitiative}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">NPD Roadmap Pipeline</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormItem({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-vf-red text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Initiative
          </button>
          <div className="flex border border-vf-border rounded-md overflow-hidden">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'timeline' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>Timeline</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>List</button>
          </div>
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
        {/* Tile 1 — Initiatives by Quarter */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">Initiatives by Quarter</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-vf-muted font-medium pb-1.5" />
                {matrix.years.map((y) => (
                  <th key={y} className="text-center text-xs text-vf-muted font-semibold pb-1.5 px-1">{y}</th>
                ))}
                {matrix.years.length > 1 && (
                  <th className="text-center text-xs text-vf-dark font-bold pb-1.5 px-1 border-l border-[#e8e6e1]">Total</th>
                )}
              </tr>
            </thead>
            <tbody>
              {QUARTERS.map((q) => (
                <tr key={q} className="border-t border-[#f0eeea]">
                  <td className="py-1.5 text-xs font-semibold text-vf-dark">{q}</td>
                  {matrix.years.map((y) => (
                    <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-dark">{matrix.grid[q][y] || <span className="text-gray-300">—</span>}</td>
                  ))}
                  {matrix.years.length > 1 && (
                    <td className="py-1.5 text-center font-mono font-bold text-vf-dark border-l border-[#e8e6e1]">{matrix.grid[q]._total}</td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-vf-dark">
                <td className="py-1.5 text-xs font-bold text-vf-dark">Total</td>
                {matrix.years.map((y) => (
                  <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-red text-base">{matrix.colTotals[y]}</td>
                ))}
                {matrix.years.length > 1 && (
                  <td className="py-1.5 text-center font-mono font-bold text-vf-red text-lg border-l border-[#e8e6e1]">{matrix.colTotals._total}</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tile 2 — By Category */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Category</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.categoryCounts || {}).sort((a, b) => b[1] - a[1]).map(([c, n]) => {
              const color = CATEGORY_COLORS[c] || '#6B6A66';
              return (
                <div key={c} className="rounded-lg border border-[#e8e6e1] px-3 py-2.5 flex flex-col gap-1" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                  <span className="text-[11px] font-semibold text-vf-dark leading-tight">{c}</span>
                  <span className="text-lg font-bold font-mono leading-none" style={{ color }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tile 3 — By Portfolio */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Portfolio</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.portfolioCounts || {}).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
              <div key={p} className="rounded-lg border border-[#e8e6e1] bg-[#fafaf9] px-3 py-2.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-vf-dark leading-tight">{p}</span>
                <span className="text-lg font-bold font-mono text-vf-dark leading-none">{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tile 4 — By Status */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Status</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.statusCounts || {}).sort((a, b) => b[1] - a[1]).map(([s, c]) => {
              const col = STATUS_COLORS[s] || STATUS_COLORS['Not Started'];
              return (
                <div key={s} className={`rounded-lg border border-[#e8e6e1] px-3 py-2.5 flex flex-col gap-1 ${col.bg}`}>
                  <span className={`text-[11px] font-semibold leading-tight ${col.text}`}>{s}</span>
                  <span className={`text-lg font-bold font-mono leading-none ${col.text}`}>{c}</span>
                </div>
              );
            })}
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
                          <PipelineCard key={item.id} item={item} onClick={() => setSelectedItem(item)} onStatusChange={updateInitiativeStatus} onEdit={(i) => setFormItem(i)} />
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
          <div className="grid grid-cols-[1fr_130px_120px_110px_60px_50px_36px] border-b border-vf-border bg-vf-surface">
            <div className="px-4 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Initiative</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Portfolio</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Category</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Status</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Year</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Qtr</div>
            <div />
          </div>
          {initiatives.map((item) => {
            const isReadOnly = String(item.id).startsWith('fy28-');
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_130px_120px_110px_60px_50px_36px] border-b border-[#f0eeea] last:border-b-0 items-center cursor-pointer hover:bg-[#fdf9f9] transition-colors group"
                onClick={() => setSelectedItem(item)}
              >
                <div className="px-4 py-2.5">
                  <div className="text-sm font-medium text-vf-dark truncate">{item.initiativeName}</div>
                  <div className="text-xs text-vf-muted truncate">{item.productFamily} › {item.productLine}</div>
                </div>
                <div className="px-3 py-2.5 text-xs text-vf-dark truncate">{item.portfolio}</div>
                <div className="px-3 py-2.5"><CategoryTag category={item.roadmapCategory} /></div>
                <div className="px-3 py-2.5"><StatusBadge status={item.status} /></div>
                <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.fy}</div>
                <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.quarter}</div>
                <div className="pr-2 flex items-center justify-center">
                  {!isReadOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setFormItem(item); }}
                      title="Edit initiative"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-vf-muted hover:text-vf-dark"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

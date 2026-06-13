import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Link } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

function useCascadingDropdowns() {
  const [categories, setCategories] = useState([]);
  const [families, setFamilies] = useState([]);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetch('/api/products/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const onCategoryChange = (cat) => {
    setFamilies([]);
    setLines([]);
    if (!cat) return;
    fetch(`/api/products/families?category=${encodeURIComponent(cat)}`).then(r => r.json()).then(setFamilies).catch(() => {});
  };

  const onFamilyChange = (cat, fam) => {
    setLines([]);
    if (!fam) return;
    const p = new URLSearchParams({ category: cat, family: fam });
    fetch(`/api/products/lines?${p}`).then(r => r.json()).then(setLines).catch(() => {});
  };

  return { categories, families, lines, onCategoryChange, onFamilyChange };
}

const REQUEST_TYPES = [
  'New Partner Product Onboarding',
  'New Product Feature (Existing Product)',
  'Country Availability Expansion (Existing Product)',
  'New Product Development',
  'Product Delivery SLA Improvement (Existing Product)',
  'Other',
];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Review', 'Approved', 'Declined', 'Completed'];

const typeClass = (type) => {
  if (type?.includes('Feature')) return 'rt-feature';
  if (type?.includes('Deal')) return 'rt-deal';
  if (type?.includes('Country')) return 'rt-country';
  if (type?.includes('SLA')) return 'rt-sla';
  return 'rt-other';
};

const priClass = (pri) => {
  if (pri === 'High') return 'pri-high';
  if (pri === 'Medium') return 'pri-medium';
  return 'pri-low';
};

const statusClass = (s) => {
  if (s === 'Open') return 'bg-blue-100 text-blue-700';
  if (s === 'In Review') return 'bg-yellow-100 text-yellow-700';
  if (s === 'Approved') return 'bg-green-100 text-green-700';
  if (s === 'Declined') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

function RequestModal({ request, onClose, onSave }) {
  const [form, setForm] = useState({ vbiFeedback: '', ...request });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const magicLink = `${window.location.origin}/request/${request.token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vf-border">
          <div className="flex items-center gap-2">
            <span className={`${typeClass(request.type)} px-2 py-0.5 rounded text-[10px] font-semibold uppercase`}>
              {request.type}
            </span>
            <span className="text-sm font-semibold text-vf-text">{request.title}</span>
          </div>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Magic Link */}
          <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
            <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">Magic Link — share with requester</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={magicLink}
                className="flex-1 text-xs border border-vf-border rounded-md px-2.5 py-1.5 bg-white font-mono text-vf-muted"
              />
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors"
              >
                {copied ? <Check size={13} className="text-vf-success" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={magicLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Status</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Priority</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Submitter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Submitter Name</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.submitterName || ''}
                onChange={(e) => setForm({ ...form, submitterName: e.target.value })}
                placeholder="Name of requester"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Submitter Email</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.submitterEmail || ''}
                onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
                placeholder="email@company.com"
              />
            </div>
          </div>

          {/* Category / Family / Line */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Category</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red bg-vf-surface"
                value={form.category || ''}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Family</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red bg-vf-surface"
                value={form.productFamily || ''}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Line</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red bg-vf-surface"
                value={form.productLine || ''}
                readOnly
              />
            </div>
          </div>

          {/* Product + Deal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Name</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.productName || ''}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Deal / Account</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.dealAccount || ''}
                onChange={(e) => setForm({ ...form, dealAccount: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Justification */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Business Justification</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
              value={form.justification || ''}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              rows={3}
            />
          </div>

          {/* VBI Feedback */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI Product &amp; Services Feedback</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
              value={form.vbiFeedback || ''}
              onChange={(e) => setForm({ ...form, vbiFeedback: e.target.value })}
              rows={3}
              placeholder="Feedback on existing VBI products and services…"
            />
          </div>

          <div className="text-[11px] text-vf-muted">
            Submitted {new Date(request.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-vf-border bg-vf-surface rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium border border-vf-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-medium bg-vf-red text-white rounded-lg hover:bg-vf-red-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicLinkBar() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/raise-request`;
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-white border border-vf-border rounded-[10px] px-4 py-3 mb-5 flex items-center gap-3">
      <Link size={14} className="text-vf-muted shrink-0" />
      <span className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide shrink-0">Public request link</span>
      <input
        readOnly
        value={url}
        className="flex-1 text-xs border border-vf-border rounded-md px-2.5 py-1.5 bg-vf-surface font-mono text-vf-muted"
      />
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors whitespace-nowrap"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

export default function FeatureRequests() {
  const { featureRequests, fetchFeatureRequests, addFeatureRequest, updateRequestStatus } = useProductStore();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { categories, families, lines, onCategoryChange, onFamilyChange } = useCascadingDropdowns();

  const [form, setForm] = useState({
    type: 'Feature Request',
    category: '',
    productFamily: '',
    productLine: '',
    productName: '',
    title: '',
    description: '',
    justification: '',
    dealAccount: '',
    priority: 'Medium',
    vbiFeedback: '',
  });

  useEffect(() => {
    fetchFeatureRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.productName) return;
    const success = await addFeatureRequest({
      type: form.type.includes('Feature') ? 'Feature' : form.type.includes('Deal') ? 'Deal' : form.type.includes('Country') ? 'Country' : form.type.includes('SLA') ? 'SLA' : 'Other',
      category: form.category || null,
      productFamily: form.productFamily || null,
      productLine: form.productLine || null,
      productName: form.productName,
      title: form.title,
      description: form.description,
      justification: form.justification || null,
      dealAccount: form.dealAccount || null,
      priority: form.priority,
      vbiFeedback: form.vbiFeedback || null,
    });
    if (success) {
      setForm({ type: 'Feature Request', category: '', productFamily: '', productLine: '', productName: '', title: '', description: '', justification: '', dealAccount: '', priority: 'Medium', vbiFeedback: '' });
    }
  };

  const handleSave = async (updated) => {
    await fetch(`/api/requests/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    fetchFeatureRequests();
  };

  const statusCounts = {
    Open: featureRequests.filter((r) => r.status === 'Open').length,
    'In Review': featureRequests.filter((r) => r.status === 'In Review').length,
    Approved: featureRequests.filter((r) => r.status === 'Approved').length,
    Declined: featureRequests.filter((r) => r.status === 'Declined').length,
    Completed: featureRequests.filter((r) => r.status === 'Completed').length,
  };
  const totalCount = featureRequests.length;

  return (
    <div className="p-5">
      {selectedRequest && (
        <RequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSave={handleSave}
        />
      )}

      {/* Form */}
      <div className="bg-white border border-vf-border rounded-[10px] p-5 mb-5">
        <h3 className="text-sm font-semibold mb-3.5">Submit a Feature / Deal Request</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Request Type</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Category</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setForm({ ...form, category: cat, productFamily: '', productLine: '' });
                  onCategoryChange(cat);
                }}
              >
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Family</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red disabled:opacity-40"
                value={form.productFamily}
                disabled={!form.category}
                onChange={(e) => {
                  const fam = e.target.value;
                  setForm({ ...form, productFamily: fam, productLine: '' });
                  onFamilyChange(form.category, fam);
                }}
              >
                <option value="">Select family…</option>
                {families.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Line</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red disabled:opacity-40"
                value={form.productLine}
                disabled={!form.productFamily}
                onChange={(e) => setForm({ ...form, productLine: e.target.value })}
              >
                <option value="">Select product line…</option>
                {lines.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Name</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                placeholder="e.g. RedBox, Vodafone Identity Hub…"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Title</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                placeholder="Brief summary of the request"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Priority</label>
              <select
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Deal / Account (if applicable)</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                placeholder="e.g. Maybank APAC bid"
                value={form.dealAccount}
                onChange={(e) => setForm({ ...form, dealAccount: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">Description</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
              placeholder="Describe the feature needed, countries required, SLA requirements, timeline..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">Business Justification</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
              placeholder="Revenue at stake, customer name (if permitted), strategic rationale..."
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              rows={3}
            />
          </div>
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">VBI Product &amp; Services Feedback</label>
            <textarea
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
              placeholder="Feedback on existing VBI products and services…"
              value={form.vbiFeedback || ''}
              onChange={(e) => setForm({ ...form, vbiFeedback: e.target.value })}
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="bg-vf-red text-white border-none rounded-lg px-5 py-2 text-[13px] font-medium cursor-pointer font-sans hover:bg-vf-red-hover"
          >
            Submit Request
          </button>
        </form>
      </div>

      {/* Public form link */}
      <PublicLinkBar />

      {/* Status tiles */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Open', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'In Review', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Approved', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Declined', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Completed', color: 'bg-gray-50 border-gray-200 text-gray-600' },
        ].map(({ label, color }) => (
          <div key={label} className={`border rounded-[10px] p-4 text-center ${color}`}>
            <div className="text-2xl font-bold">{statusCounts[label]}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Request list */}
      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-vf-border text-[13px] font-semibold flex items-center gap-2 bg-vf-surface">
          All Requests
          <span className="bg-vf-dark text-white rounded-full px-2 py-px text-[11px] font-semibold">{totalCount}</span>
          <span className="text-[11px] text-vf-muted font-normal ml-1">— click any row to view, edit or copy magic link</span>
        </div>
        {featureRequests.length === 0 ? (
          <div className="p-8 text-center text-vf-muted text-sm">No requests yet.</div>
        ) : (
          featureRequests.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedRequest(r)}
              className="px-4 py-3 border-b border-[#f0eeea] last:border-b-0 hover:bg-[#fdf9f9] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`${typeClass(r.type)} px-2 py-0.5 rounded text-[10px] font-semibold uppercase`}>
                  {r.type}
                </span>
                <span className="text-[13px] font-medium flex-1">{r.title}</span>
                <span className={`${statusClass(r.status)} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
                  {r.status}
                </span>
                <span className={`${priClass(r.priority)} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
                  {r.priority}
                </span>
              </div>
              <div className="text-[11px] text-vf-muted">
                {r.productName}
                {r.submitterName ? ` · ${r.submitterName}` : ''}
                {r.dealAccount ? ` · ${r.dealAccount}` : ''}
                {' · '}{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

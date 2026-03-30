import { useEffect, useState } from 'react';
import useProductStore from '../store/useProductStore.js';

const REQUEST_TYPES = ['Feature Request', 'Deal Enablement', 'Country Expansion', 'SLA Exception', 'Other'];
const PRIORITIES = ['High', 'Medium', 'Low'];

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

export default function FeatureRequests() {
  const { featureRequests, fetchFeatureRequests, addFeatureRequest } = useProductStore();

  const [form, setForm] = useState({
    type: 'Feature Request',
    productName: '',
    title: '',
    description: '',
    justification: '',
    dealAccount: '',
    priority: 'Medium',
  });

  useEffect(() => {
    fetchFeatureRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.productName) return;
    const success = await addFeatureRequest({
      type: form.type.includes('Feature') ? 'Feature' : form.type.includes('Deal') ? 'Deal' : form.type.includes('Country') ? 'Country' : form.type.includes('SLA') ? 'SLA' : 'Other',
      productName: form.productName,
      title: form.title,
      description: form.description,
      justification: form.justification || null,
      dealAccount: form.dealAccount || null,
      priority: form.priority,
    });
    if (success) {
      setForm({ type: 'Feature Request', productName: '', title: '', description: '', justification: '', dealAccount: '', priority: 'Medium' });
    }
  };

  const openCount = featureRequests.filter((r) => r.status === 'Open').length;

  return (
    <div className="p-5">
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
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                placeholder="e.g. IPVPN, SD-WAN"
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
              className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y"
              placeholder="Revenue at stake, customer name (if permitted), strategic rationale..."
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              rows={2}
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

      {/* Request list */}
      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-vf-border text-[13px] font-semibold flex items-center gap-2 bg-vf-surface">
          Open Requests
          {openCount > 0 && (
            <span className="bg-vf-red text-white rounded-full px-2 py-px text-[11px] font-semibold">
              {openCount}
            </span>
          )}
        </div>
        {featureRequests.length === 0 ? (
          <div className="p-8 text-center text-vf-muted text-sm">No requests yet.</div>
        ) : (
          featureRequests.map((r) => (
            <div key={r.id} className="px-4 py-3 border-b border-[#f0eeea] last:border-b-0 hover:bg-[#fdf9f9] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className={`${typeClass(r.type)} px-2 py-0.5 rounded text-[10px] font-semibold uppercase`}>
                  {r.type}
                </span>
                <span className="text-[13px] font-medium flex-1">{r.title}</span>
                <span className={`${priClass(r.priority)} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
                  {r.priority}
                </span>
              </div>
              <div className="text-[11px] text-vf-muted">
                {r.productName} · {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

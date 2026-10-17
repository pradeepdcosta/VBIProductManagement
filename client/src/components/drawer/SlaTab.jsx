import { SectionTitle } from './shared.jsx';

const FIELDS = [
  ['Availability', 'availability'],
  ['MTTR', 'mttr'],
  ['Response Time', 'responseTime'],
  ['Support Hours', 'supportHours'],
  ['Escalation', 'escalation'],
  ['Review Frequency', 'reviewFreq'],
];

// Always shows the SLA table; blank where no SLA data has been loaded
export default function SlaTab({ sla }) {
  return (
    <div>
      <SectionTitle right={!sla && <span className="text-[10px] text-vf-muted">No SLA data loaded yet</span>}>Service Level Agreement</SectionTitle>
      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        {FIELDS.map(([label, key]) => (
          <div key={key} className="flex justify-between items-center gap-4 px-4 py-2.5 border-b border-[#f0eeea] last:border-b-0">
            <span className="text-xs text-vf-muted">{label}</span>
            <span className="text-xs font-medium font-mono text-right">{sla?.[key] || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SlaTab({ sla }) {
  if (!sla) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No SLA data available</p>
        <p className="text-xs">Upload SLA data to populate</p>
      </div>
    );
  }

  const items = [
    { label: 'Availability', value: sla.availability },
    { label: 'MTTR', value: sla.mttr },
    { label: 'Response Time', value: sla.responseTime },
    { label: 'Support Hours', value: sla.supportHours },
    { label: 'Escalation', value: sla.escalation },
    { label: 'Review Frequency', value: sla.reviewFreq },
  ].filter((item) => item.value);

  return (
    <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between items-center px-4 py-2.5 border-b border-[#f0eeea] last:border-b-0">
          <span className="text-xs text-vf-muted">{item.label}</span>
          <span className="text-xs font-medium font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

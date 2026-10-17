const categoryMap = {
  'Fixed Connectivity': 'cat-fixed',
  'Mobile Connectivity': 'cat-mobile',
  'Cloud and Security': 'cat-cloud',
  'IoT': 'cat-iot',
  'Converged Comms': 'cat-comms',
  'Services': 'cat-services',
  'Carrier': 'cat-carrier',
};

export default function CategoryBadge({ category }) {
  const cls = categoryMap[category] || 'cat-other';
  return (
    <span className={`${cls} px-2 py-0.5 rounded text-[0.6875rem] font-medium whitespace-nowrap inline-block`}>
      {category}
    </span>
  );
}

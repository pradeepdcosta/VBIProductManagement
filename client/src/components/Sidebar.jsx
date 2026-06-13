import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  GitBranch,
  Wallet,
  TrendingUp,
  Building2,
  Globe,
  Shield,
  MessageSquare,
  Upload,
} from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

const sections = [
  {
    label: 'Product Management',
    items: [
      { to: '/', icon: LayoutGrid, label: 'Product Catalog' },
      { to: '/features', icon: MessageSquare, label: 'Product Requests', badge: true },
      { to: '/npd', icon: GitBranch, label: 'NPD Pipeline' },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/costs', icon: Wallet, label: 'Cost Management' },
      { to: '/trading', icon: TrendingUp, label: 'Trading Performance' },
      { to: '/business-case', icon: Building2, label: 'Business Case' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/coverage', icon: Globe, label: 'Country Coverage' },
      { to: '/sla', icon: Shield, label: 'SLA & Service' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/import-export', icon: Upload, label: 'Import / Export' },
    ],
  },
];

export default function Sidebar() {
  const featureRequests = useProductStore((s) => s.featureRequests);
  const openCount = featureRequests.filter((r) => r.status === 'Open').length;

  return (
    <div className="w-[204px] shrink-0 bg-white border-r border-vf-border overflow-y-auto py-3">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-vf-muted uppercase tracking-wider mt-2">
            {section.label}
          </div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 cursor-pointer relative text-[12.5px] font-normal transition-colors select-none ${
                  isActive
                    ? 'bg-red-50 text-vf-red font-medium'
                    : 'text-vf-text hover:bg-[#f7f6f3]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-vf-red rounded-r" />
                  )}
                  <item.icon
                    size={16}
                    className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-55'}`}
                  />
                  {item.label}
                  {item.badge && openCount > 0 && (
                    <span className="ml-auto bg-vf-red text-white rounded-full px-1.5 py-px text-[10px] font-semibold">
                      {openCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </div>
  );
}

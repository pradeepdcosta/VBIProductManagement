import { useState } from 'react';
import useProductStore from '../store/useProductStore.js';
import OverviewTab from './drawer/OverviewTab.jsx';
import CostsTab from './drawer/CostsTab.jsx';
import NpdTab from './drawer/NpdTab.jsx';
import TradingTab from './drawer/TradingTab.jsx';
import CoverageTab from './drawer/CoverageTab.jsx';
import SlaTab from './drawer/SlaTab.jsx';
import BusinessCaseTab from './drawer/BusinessCaseTab.jsx';

const TABS = ['Overview', 'Costs', 'NPD Status', 'Trading', 'Coverage', 'SLA', 'Business Case'];

export default function ProductDrawer() {
  const { selectedProduct, drawerOpen, closeDrawer } = useProductStore();
  const [activeTab, setActiveTab] = useState(0);

  if (!drawerOpen) return null;

  const p = selectedProduct;
  if (!p) return null;

  const tabContent = [
    <OverviewTab key="overview" product={p} />,
    <CostsTab key="costs" costs={p.costs} />,
    <NpdTab key="npd" npd={p.npd} />,
    <TradingTab key="trading" trading={p.trading} />,
    <CoverageTab key="coverage" coverage={p.coverage} />,
    <SlaTab key="sla" sla={p.sla} />,
    <BusinessCaseTab key="bizcase" bizCase={p.bizCase} />,
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-[99]"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[580px] bg-white border-l border-vf-border shadow-[-6px_0_30px_rgba(0,0,0,0.1)] z-[100] flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-vf-border flex items-start gap-3 shrink-0 bg-vf-dark text-white">
          <div className="flex-1">
            <div className="text-[11px] text-[#aaa] mb-0.5">
              {p.category} → {p.family} → {p.productLine}
            </div>
            <div className="text-[15px] font-semibold">{p.name}</div>
          </div>
          <button
            onClick={closeDrawer}
            className="border-none bg-white/10 text-white rounded-md px-3 py-1 cursor-pointer text-xs font-sans hover:bg-white/20"
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-vf-border bg-white shrink-0 overflow-x-auto">
          {TABS.map((tab, i) => (
            <div
              key={tab}
              className={`px-3.5 py-2.5 text-xs cursor-pointer whitespace-nowrap font-normal transition-colors border-b-2 ${
                activeTab === i
                  ? 'text-vf-red border-vf-red font-medium'
                  : 'text-vf-muted border-transparent hover:text-vf-text'
              }`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tabContent[activeTab]}
        </div>
      </div>
    </>
  );
}

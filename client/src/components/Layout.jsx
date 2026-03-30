import { Outlet, useLocation } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import ProductDrawer from './ProductDrawer.jsx';
import Toast from './Toast.jsx';
import FilterBar from './FilterBar.jsx';

// Pages where the global filter bar is NOT shown
const NO_FILTER_PAGES = ['/import-export', '/features'];

export default function Layout() {
  const { pathname } = useLocation();
  const showFilters = !NO_FILTER_PAGES.includes(pathname);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {showFilters && <FilterBar />}
          <div className="flex-1 overflow-y-auto bg-vf-surface">
            <Outlet />
          </div>
        </div>
      </div>
      <ProductDrawer />
      <Toast />
    </div>
  );
}

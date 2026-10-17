import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProductCatalog from './pages/ProductCatalog.jsx';
import NpdPipeline from './pages/NpdPipeline.jsx';
import CostManagement from './pages/CostManagement.jsx';
import TradingPerformance from './pages/TradingPerformance.jsx';
import BusinessCasePage from './pages/BusinessCasePage.jsx';
import CountryCoverage from './pages/CountryCoverage.jsx';
import SlaService from './pages/SlaService.jsx';
import FeatureRequests from './pages/FeatureRequests.jsx';
import ImportExport from './pages/ImportExport.jsx';
import Admin from './pages/Admin.jsx';
import MagicLinkPage from './pages/MagicLinkPage.jsx';
import PublicSubmitPage from './pages/PublicSubmitPage.jsx';
import ProductReviewPage from './pages/ProductReviewPage.jsx';

// Portal pages: landing page (once per browser session) → sign in → portal
function PortalGate() {
  const { user } = useAuth();
  const [entered, setEntered] = useState(() => !!sessionStorage.getItem('vbi-entered'));

  if (!entered) {
    return (
      <LandingPage
        onEnter={() => {
          sessionStorage.setItem('vbi-entered', '1');
          setEntered(true);
        }}
      />
    );
  }
  if (user === undefined) return <div className="h-screen bg-vf-dark" />; // checking session
  if (!user) return <LoginPage />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no sign-in needed */}
          <Route path="request/:token" element={<MagicLinkPage />} />
          <Route path="review/:token" element={<ProductReviewPage />} />
          <Route path="raise-request" element={<PublicSubmitPage />} />
          <Route element={<PortalGate />}>
            <Route element={<Layout />}>
              <Route index element={<ProductCatalog />} />
              <Route path="npd" element={<NpdPipeline />} />
              <Route path="costs" element={<CostManagement />} />
              <Route path="trading" element={<TradingPerformance />} />
              <Route path="business-case" element={<BusinessCasePage />} />
              <Route path="coverage" element={<CountryCoverage />} />
              <Route path="sla" element={<SlaService />} />
              <Route path="features" element={<FeatureRequests />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

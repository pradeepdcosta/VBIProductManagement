import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProductCatalog from './pages/ProductCatalog.jsx';
import NpdPipeline from './pages/NpdPipeline.jsx';
import CostManagement from './pages/CostManagement.jsx';
import TradingPerformance from './pages/TradingPerformance.jsx';
import BusinessCasePage from './pages/BusinessCasePage.jsx';
import CountryCoverage from './pages/CountryCoverage.jsx';
import SlaService from './pages/SlaService.jsx';
import FeatureRequests from './pages/FeatureRequests.jsx';
import ImportExport from './pages/ImportExport.jsx';
import MagicLinkPage from './pages/MagicLinkPage.jsx';
import PublicSubmitPage from './pages/PublicSubmitPage.jsx';
import ProductReviewPage from './pages/ProductReviewPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no layout/auth */}
        <Route path="request/:token" element={<MagicLinkPage />} />
        <Route path="review/:token" element={<ProductReviewPage />} />
        <Route path="raise-request" element={<PublicSubmitPage />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

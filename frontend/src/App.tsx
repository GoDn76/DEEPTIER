import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { OverviewPage } from './pages/OverviewPage';
import { SupplyChainPage } from './pages/SupplyChainPage';
import { DisruptionsPage } from './pages/DisruptionsPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RfqsPage } from './pages/RfqsPage';
import { AuditPage } from './pages/AuditPage';
import './style.css';

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RedirectIfAuth() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
          </Route>

          {/* Protected routes inside AppShell */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="/supply-chain" element={<SupplyChainPage />} />
              <Route path="/disruptions" element={<DisruptionsPage />} />
              <Route path="/what-if" element={<WhatIfPage />} />
              <Route path="/logistics" element={<LogisticsPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/rfqs" element={<RfqsPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

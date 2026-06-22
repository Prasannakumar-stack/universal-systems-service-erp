import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Services from './pages/Services.jsx';
import Contact from './pages/Contact.jsx';
import BookService from './pages/BookService.jsx';
import Login from './pages/Login.jsx';
import { adminWorkspaceRoles } from './utils/roles.js';

const lazyRoute = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));

const AdminDashboard = lazyRoute(() => import('./features/dashboard/AdminDashboard.jsx'), 'AdminDashboard');
const BookingsPage = lazyRoute(() => import('./features/bookings/BookingsPage.jsx'), 'BookingsPage');
const CustomerProfilePage = lazyRoute(() => import('./features/customers/CustomerProfilePage.jsx'), 'CustomerProfilePage');
const CustomersPage = lazyRoute(() => import('./features/customers/CustomersPage.jsx'), 'CustomersPage');
const InventoryPage = lazyRoute(() => import('./features/inventory/InventoryPage.jsx'), 'InventoryPage');
const StockMovementsPage = lazyRoute(() => import('./features/inventory/StockMovementsPage.jsx'), 'StockMovementsPage');
const DocumentsPage = lazyRoute(() => import('./features/invoices/DocumentsPage.jsx'), 'DocumentsPage');
const CreateDocumentPage = lazyRoute(() => import('./features/invoices/DocumentsPage.jsx'), 'CreateDocumentPage');
const DocumentPreviewPage = lazyRoute(() => import('./features/invoices/DocumentsPage.jsx'), 'DocumentPreviewPage');
const InvoicesPage = lazyRoute(() => import('./features/invoices/InvoicesPage.jsx'), 'InvoicesPage');
const PaymentsPage = lazyRoute(() => import('./features/payments/PaymentsPage.jsx'), 'PaymentsPage');
const AuditLogsPage = lazyRoute(() => import('./features/notifications/AuditLogsPage.jsx'), 'AuditLogsPage');
const NotificationsPage = lazyRoute(() => import('./features/notifications/NotificationsPage.jsx'), 'NotificationsPage');
const ReportsAnalyticsPage = lazyRoute(() => import('./features/reports/ReportsPage.jsx'), 'ReportsAnalyticsPage');
const SystemSettingsPage = lazyRoute(() => import('./features/settings/SettingsPage.jsx'), 'SystemSettingsPage');
const TechnicianDashboard = lazyRoute(() => import('./features/technicians/TechnicianDashboard.jsx'), 'TechnicianDashboard');
const TechnicianPanelPage = lazyRoute(() => import('./features/technicians/TechnicianPanelPage.jsx'), 'TechnicianPanelPage');
const TechnicianSettingsPage = lazyRoute(() => import('./features/technicians/TechnicianModules.jsx'), 'TechnicianSettingsPage');
const AMCContractsPage = lazyRoute(() => import('./features/workOrders/AMCContractsPage.jsx'), 'AMCContractsPage');
const WarrantiesPage = lazyRoute(() => import('./features/workOrders/AMCContractsPage.jsx'), 'WarrantiesPage');
const AMCRenewalsPage = lazyRoute(() => import('./features/workOrders/AMCRenewalsPage.jsx'), 'AMCRenewalsPage');
const AMCSchedulePage = lazyRoute(() => import('./features/workOrders/AMCSchedulePage.jsx'), 'AMCSchedulePage');
const WorkOrderDetailsPage = lazyRoute(() => import('./features/workOrders/WorkOrderDetailsPage.jsx'), 'WorkOrderDetailsPage');
const WorkOrdersPage = lazyRoute(() => import('./features/workOrders/WorkOrdersPage.jsx'), 'WorkOrdersPage');

function RouteLoadingFallback() {
  return (
    <div className="surface animate-pulse p-5">
      <div className="h-4 w-36 rounded bg-white/10" />
      <div className="mt-4 h-8 w-64 max-w-full rounded bg-white/10" />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 rounded-card bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function lazyElement(element) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

function LegacyWorkspaceRedirect({ fromPrefix, toPrefix, defaultPath = '/dashboard' }) {
  const location = useLocation();
  const suffix = location.pathname.startsWith(fromPrefix) ? location.pathname.slice(fromPrefix.length) : '';
  const nextSuffix = suffix && suffix !== '/' ? suffix : defaultPath;
  return <Navigate to={`${toPrefix}${nextSuffix}${location.search}${location.hash}`} replace />;
}

function BrowserScrollRestoration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !('scrollRestoration' in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <BrowserScrollRestoration />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book-service" element={<BookService />} />
        </Route>

        <Route path="/app" element={<Login role="staff" appMode />} />
        <Route path="/admin/login" element={<Navigate to="/app" replace />} />
        <Route path="/technician/login" element={<Navigate to="/app" replace />} />

        <Route element={<ProtectedRoute role="admin" allowedRoles={adminWorkspaceRoles} loginPath="/app" />}>
          <Route path="/app/admin" element={<DashboardLayout role="admin" />}>
            <Route index element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="dashboard" element={lazyElement(<AdminDashboard />)} />
            <Route path="technician-panel" element={lazyElement(<TechnicianPanelPage />)} />
            <Route path="bookings" element={lazyElement(<BookingsPage />)} />
            <Route path="work-orders" element={lazyElement(<WorkOrdersPage role="admin" />)} />
            <Route path="work-orders/:id" element={lazyElement(<WorkOrderDetailsPage role="admin" />)} />
            <Route path="dispatch-board" element={<Navigate to="/app/admin/work-orders?view=dispatch" replace />} />
            <Route path="technician-tasks" element={<Navigate to="/app/admin/work-orders?view=technicians" replace />} />
            <Route path="installations-projects" element={<Navigate to="/app/admin/work-orders" replace />} />
            <Route path="customers" element={lazyElement(<CustomersPage />)} />
            <Route path="customers/:id" element={lazyElement(<CustomerProfilePage />)} />
            <Route path="customer-360" element={<Navigate to="/app/admin/customers" replace />} />
            <Route path="devices-assets" element={<Navigate to="/app/admin/customers" replace />} />
            <Route path="service-history" element={<Navigate to="/app/admin/customers" replace />} />
            <Route path="documents" element={lazyElement(<DocumentsPage />)} />
            <Route path="documents/new" element={lazyElement(<CreateDocumentPage />)} />
            <Route path="documents/:id" element={lazyElement(<DocumentPreviewPage />)} />
            <Route path="quotations" element={<Navigate to="/app/admin/documents?type=quotation" replace />} />
            <Route path="payments" element={lazyElement(<PaymentsPage />)} />
            <Route path="parts" element={lazyElement(<InventoryPage />)} />
            <Route path="stock-management" element={<Navigate to="/app/admin/parts" replace />} />
            <Route path="stock-movements" element={lazyElement(<InventoryPage />)} />
            <Route path="amc-contracts" element={lazyElement(<AMCContractsPage />)} />
            <Route path="amc-schedule" element={lazyElement(<AMCSchedulePage />)} />
            <Route path="amc-renewals" element={lazyElement(<AMCRenewalsPage />)} />
            <Route path="warranties" element={lazyElement(<WarrantiesPage />)} />
            <Route path="audit-logs" element={lazyElement(<AuditLogsPage />)} />
            <Route path="invoices" element={lazyElement(<InvoicesPage />)} />
            <Route path="reports" element={lazyElement(<ReportsAnalyticsPage section="main" />)} />
            <Route path="reports/operations" element={<Navigate to="/app/admin/reports" replace />} />
            <Route path="reports/technicians" element={lazyElement(<ReportsAnalyticsPage section="technicians" />)} />
            <Route path="reports/finance" element={lazyElement(<ReportsAnalyticsPage section="finance" />)} />
            <Route path="reports/payments" element={lazyElement(<ReportsAnalyticsPage section="payments" />)} />
            <Route path="reports/inventory" element={lazyElement(<ReportsAnalyticsPage section="inventory" />)} />
            <Route path="reports/amc" element={<Navigate to="/app/admin/reports" replace />} />
            <Route path="reports/customers" element={<Navigate to="/app/admin/reports" replace />} />
            <Route path="inventory-reports" element={<Navigate to="/app/admin/reports/inventory" replace />} />
            <Route path="payment-reports" element={<Navigate to="/app/admin/reports/finance" replace />} />
            <Route path="notifications" element={lazyElement(<NotificationsPage role="admin" />)} />
            <Route path="settings" element={lazyElement(<SystemSettingsPage />)} />
            <Route path="settings/backup-storage" element={lazyElement(<SystemSettingsPage initialTab="backup-storage" />)} />
            <Route path="settings/system-information" element={lazyElement(<SystemSettingsPage initialTab="system-information" />)} />
            <Route path="settings/system-info" element={lazyElement(<SystemSettingsPage initialTab="system-info" />)} />
            <Route path="settings/documents-pdfs" element={lazyElement(<SystemSettingsPage initialTab="documentsPdfs" standaloneTab />)} />
            <Route path="settings/tax-gst" element={lazyElement(<SystemSettingsPage initialTab="taxGst" standaloneTab />)} />
            <Route path="settings/payment-settings" element={lazyElement(<SystemSettingsPage initialTab="paymentSettings" standaloneTab />)} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="technician" allowedRoles={['technician']} loginPath="/app" />}>
          <Route path="/app/tech" element={<DashboardLayout role="technician" />}>
            <Route index element={<Navigate to="/app/tech/dashboard" replace />} />
            <Route path="dashboard" element={lazyElement(<TechnicianDashboard />)} />
            <Route path="bookings" element={lazyElement(<BookingsPage role="technician" />)} />
            <Route path="work-orders" element={lazyElement(<WorkOrdersPage role="technician" />)} />
            <Route path="work-orders/:id" element={lazyElement(<WorkOrderDetailsPage role="technician" />)} />
            <Route path="customers" element={lazyElement(<CustomersPage role="technician" />)} />
            <Route path="customers/:id" element={lazyElement(<CustomerProfilePage role="technician" />)} />
            <Route path="invoices" element={lazyElement(<InvoicesPage role="technician" />)} />
            <Route path="payments" element={lazyElement(<PaymentsPage role="technician" />)} />
            <Route path="parts" element={lazyElement(<InventoryPage role="technician" />)} />
            <Route path="amc-contracts" element={lazyElement(<AMCContractsPage role="technician" />)} />
            <Route path="amc-contracts/schedule" element={<Navigate to="/app/tech/amc-schedule" replace />} />
            <Route path="amc-schedule" element={lazyElement(<AMCSchedulePage role="technician" />)} />
            <Route path="amc-renewals" element={lazyElement(<AMCRenewalsPage role="technician" />)} />
            <Route path="warranties" element={lazyElement(<WarrantiesPage role="technician" />)} />
            <Route path="settings" element={lazyElement(<TechnicianSettingsPage />)} />
          </Route>
        </Route>

        <Route path="/admin/*" element={<LegacyWorkspaceRedirect fromPrefix="/admin" toPrefix="/app/admin" />} />
        <Route path="/tech/*" element={<LegacyWorkspaceRedirect fromPrefix="/tech" toPrefix="/app/tech" />} />
        <Route path="/technician/*" element={<LegacyWorkspaceRedirect fromPrefix="/technician" toPrefix="/app/tech" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

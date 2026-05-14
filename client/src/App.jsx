import { Navigate, Route, Routes } from 'react-router-dom';
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
import { AdminDashboard } from './features/dashboard/AdminDashboard.jsx';
import {
  AMCContractsPage,
  AMCRenewalsPage,
  AMCSchedulePage,
  AuditLogsPage,
  BookingsPage,
  CustomerProfilePage,
  CustomersPage,
  CreateDocumentPage,
  DocumentPreviewPage,
  DocumentsPage,
  InventoryPage,
  InvoicesPage,
  PaymentsPage,
  ReportsAnalyticsPage,
  SystemSettingsPage,
  StockMovementsPage,
  TechnicianDashboard,
  TechnicianPanelPage,
  WorkOrderDetailsPage,
  WorkOrdersPage
} from './pages/Phase1Pages.jsx';
import { TechnicianProfilePage } from './pages/WorkspacePages.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book-service" element={<BookService />} />
      </Route>

      <Route path="/admin/login" element={<Login role="admin" />} />
      <Route path="/technician/login" element={<Login role="technician" />} />

      <Route element={<ProtectedRoute role="admin" allowedRoles={adminWorkspaceRoles} loginPath="/admin/login" />}>
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="technician-panel" element={<TechnicianPanelPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="work-orders" element={<WorkOrdersPage role="admin" />} />
          <Route path="work-orders/:id" element={<WorkOrderDetailsPage role="admin" />} />
          <Route path="dispatch-board" element={<Navigate to="/admin/work-orders?view=dispatch" replace />} />
          <Route path="technician-tasks" element={<Navigate to="/admin/work-orders?view=technicians" replace />} />
          <Route path="installations-projects" element={<Navigate to="/admin/work-orders" replace />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerProfilePage />} />
          <Route path="customer-360" element={<Navigate to="/admin/customers" replace />} />
          <Route path="devices-assets" element={<Navigate to="/admin/customers" replace />} />
          <Route path="service-history" element={<Navigate to="/admin/customers" replace />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/new" element={<CreateDocumentPage />} />
          <Route path="documents/:id" element={<DocumentPreviewPage />} />
          <Route path="quotations" element={<Navigate to="/admin/documents?type=quotation" replace />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="parts" element={<InventoryPage />} />
          <Route path="stock-management" element={<Navigate to="/admin/parts" replace />} />
          <Route path="stock-movements" element={<StockMovementsPage />} />
          <Route path="amc-contracts" element={<AMCContractsPage />} />
          <Route path="amc-schedule" element={<AMCSchedulePage />} />
          <Route path="amc-renewals" element={<AMCRenewalsPage />} />
          <Route path="warranties" element={<Navigate to="/admin/amc-contracts" replace />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="reports" element={<ReportsAnalyticsPage section="main" />} />
          <Route path="reports/operations" element={<Navigate to="/admin/reports" replace />} />
          <Route path="reports/technicians" element={<ReportsAnalyticsPage section="technicians" />} />
          <Route path="reports/finance" element={<ReportsAnalyticsPage section="finance" />} />
          <Route path="reports/payments" element={<ReportsAnalyticsPage section="payments" />} />
          <Route path="reports/inventory" element={<ReportsAnalyticsPage section="inventory" />} />
          <Route path="reports/amc" element={<Navigate to="/admin/reports" replace />} />
          <Route path="reports/customers" element={<Navigate to="/admin/reports" replace />} />
          <Route path="inventory-reports" element={<Navigate to="/admin/reports/inventory" replace />} />
          <Route path="payment-reports" element={<Navigate to="/admin/reports/finance" replace />} />
          <Route path="notifications" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="settings" element={<SystemSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="technician" allowedRoles={['technician']} loginPath="/technician/login" />}>
        <Route path="/tech" element={<DashboardLayout role="technician" />}>
          <Route index element={<Navigate to="/tech/dashboard" replace />} />
          <Route path="dashboard" element={<TechnicianDashboard />} />
          <Route path="work-orders" element={<WorkOrdersPage role="technician" />} />
          <Route path="work-orders/:id" element={<WorkOrderDetailsPage role="technician" />} />
        </Route>
        <Route path="/technician" element={<DashboardLayout role="technician" />}>
          <Route index element={<Navigate to="/tech/dashboard" replace />} />
          <Route path="profile" element={<TechnicianProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export const supportedRoles = [
  'admin',
  'manager',
  'receptionist',
  'accountant',
  'inventory',
  'technician',
  'viewer'
];

export const adminWorkspaceRoles = [
  'admin',
  'manager',
  'receptionist',
  'accountant',
  'inventory',
  'viewer'
];

export const roleLabels = {
  admin: 'Admin',
  manager: 'Manager',
  receptionist: 'Receptionist',
  accountant: 'Accountant',
  inventory: 'Inventory',
  technician: 'Technician',
  viewer: 'Viewer'
};

export const roleDisplayOrder = [...supportedRoles];

export const roleUiMetadata = Object.freeze({
  admin: Object.freeze({
    label: 'Admin',
    cardLabel: 'Admin',
    shortLabel: 'Admin',
    description: 'Full system access',
    badge: 'System Role'
  }),
  manager: Object.freeze({
    label: 'Manager',
    cardLabel: 'Manager',
    shortLabel: 'Manager',
    description: 'Operations & Reports',
    badge: 'Default'
  }),
  receptionist: Object.freeze({
    label: 'Receptionist',
    cardLabel: 'Receptionist',
    shortLabel: 'Receptionist',
    description: 'Bookings & Customers',
    badge: 'Default'
  }),
  accountant: Object.freeze({
    label: 'Accountant',
    cardLabel: 'Accountant',
    shortLabel: 'Accountant',
    description: 'Billing & Payments',
    badge: 'Default'
  }),
  inventory: Object.freeze({
    label: 'Inventory Staff',
    cardLabel: 'Inventory Staff',
    shortLabel: 'Inventory',
    description: 'Inventory Management',
    badge: 'Default'
  }),
  technician: Object.freeze({
    label: 'Technician',
    cardLabel: 'Technician',
    shortLabel: 'Technician',
    description: 'Assigned Jobs Only',
    badge: 'System Role'
  }),
  viewer: Object.freeze({
    label: 'Viewer',
    cardLabel: 'Viewer',
    shortLabel: 'Viewer',
    description: 'Read Only Access',
    badge: 'Default'
  })
});

export const ALL_PERMISSIONS = [
  'view_dashboard',
  'view_business_dashboard',
  'view_bookings',
  'create_booking',
  'edit_booking',
  'assign_technician',
  'delete_booking',
  'view_work_orders',
  'create_work_order',
  'edit_work_order',
  'update_work_order_status',
  'edit_service_charge',
  'manage_parts_used',
  'approve_part_requests',
  'create_part_request',
  'upload_photos',
  'add_notes',
  'view_customers',
  'create_customer',
  'edit_customer',
  'view_customer_360',
  'view_invoices',
  'create_invoice',
  'edit_invoice',
  'download_invoice_pdf',
  'view_payments',
  'record_payment',
  'edit_payment',
  'view_inventory',
  'create_part',
  'edit_stock',
  'view_stock_movements',
  'view_amc',
  'create_amc',
  'renew_amc',
  'create_amc_job',
  'view_reports',
  'export_reports',
  'print_reports',
  'view_documents',
  'send_pdf_whatsapp',
  'mark_document_sent',
  'manage_pdf_templates',
  'view_settings',
  'edit_settings',
  'manage_company_profile',
  'manage_public_website_settings',
  'manage_backup_storage',
  'manage_document_numbering',
  'manage_tax_settings',
  'manage_payment_settings',
  'manage_notification_templates',
  'manage_status_workflows',
  'manage_pdf_terms',
  'view_system_information',
  'manage_users',
  'manage_roles',
  'view_audit_logs',
  'delete_work_order',
  'delete_part',
  'manage_call_requests'
];

const managerPermissions = [
  'view_dashboard',
  'view_business_dashboard',
  'view_bookings',
  'create_booking',
  'edit_booking',
  'assign_technician',
  'view_work_orders',
  'create_work_order',
  'edit_work_order',
  'update_work_order_status',
  'upload_photos',
  'add_notes',
  'view_customers',
  'create_customer',
  'edit_customer',
  'view_customer_360',
  'view_amc',
  'view_reports',
  'export_reports',
  'print_reports',
  'view_documents',
  'download_invoice_pdf'
];

const receptionistPermissions = [
  'view_dashboard',
  'view_business_dashboard',
  'view_bookings',
  'create_booking',
  'view_work_orders',
  'view_customers',
  'view_customer_360'
];

const accountantPermissions = [
  'view_dashboard',
  'view_business_dashboard',
  'view_work_orders',
  'view_customers',
  'view_customer_360',
  'view_invoices',
  'create_invoice',
  'view_payments',
  'record_payment',
  'view_reports',
  'view_documents',
  'download_invoice_pdf'
];

const inventoryPermissions = [
  'view_dashboard',
  'view_business_dashboard',
  'view_work_orders',
  'view_inventory',
  'create_part',
  'edit_stock',
  'view_stock_movements'
];

const technicianPermissions = [
  'view_dashboard',
  'view_bookings',
  'view_work_orders',
  'update_work_order_status',
  'add_notes',
  'upload_photos',
  'create_part_request',
  'view_customers',
  'view_customer_360',
  'view_invoices',
  'download_invoice_pdf',
  'view_payments',
  'view_amc',
  'view_documents'
];

const viewerPermissions = [
  'view_dashboard',
  'view_business_dashboard',
  'view_bookings',
  'view_work_orders',
  'view_customers',
  'view_customer_360',
  'view_reports'
];

export const ROLE_PERMISSIONS = Object.freeze({
  admin: Object.freeze([...ALL_PERMISSIONS]),
  manager: Object.freeze(managerPermissions),
  receptionist: Object.freeze(receptionistPermissions),
  accountant: Object.freeze(accountantPermissions),
  inventory: Object.freeze(inventoryPermissions),
  technician: Object.freeze(technicianPermissions),
  viewer: Object.freeze(viewerPermissions)
});

export const permissionMatrixGroups = Object.freeze([
  Object.freeze({
    group: 'Dashboard',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Dashboard', permission: 'view_dashboard' })
    ])
  }),
  Object.freeze({
    group: 'Bookings',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Bookings', permission: 'view_bookings' }),
      Object.freeze({ label: 'Create Booking', permission: 'create_booking' }),
      Object.freeze({ label: 'Edit Booking', permission: 'edit_booking' }),
      Object.freeze({ label: 'Assign Technician', permission: 'assign_technician' }),
      Object.freeze({ label: 'Delete Booking', permission: 'delete_booking' })
    ])
  }),
  Object.freeze({
    group: 'Work Orders',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Work Orders', permission: 'view_work_orders' }),
      Object.freeze({ label: 'Create Work Order', permission: 'create_work_order' }),
      Object.freeze({ label: 'Edit Work Order', permission: 'edit_work_order' }),
      Object.freeze({ label: 'Update Status', permission: 'update_work_order_status' }),
      Object.freeze({ label: 'Edit Service Charge', permission: 'edit_service_charge' }),
      Object.freeze({ label: 'Manage Parts Used', permission: 'manage_parts_used' }),
      Object.freeze({ label: 'Approve Part Requests', permission: 'approve_part_requests' })
    ])
  }),
  Object.freeze({
    group: 'Customers',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Customers', permission: 'view_customers' }),
      Object.freeze({ label: 'Create Customer', permission: 'create_customer' }),
      Object.freeze({ label: 'Edit Customer', permission: 'edit_customer' }),
      Object.freeze({ label: 'View Customer 360', permission: 'view_customer_360' }),
      Object.freeze({ label: 'Delete Customer', permission: null })
    ])
  }),
  Object.freeze({
    group: 'Inventory',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Inventory', permission: 'view_inventory' }),
      Object.freeze({ label: 'Add Stock', permission: 'create_part' }),
      Object.freeze({ label: 'Edit Stock', permission: 'edit_stock' }),
      Object.freeze({ label: 'Delete Part', permission: 'delete_part' }),
      Object.freeze({ label: 'View Stock Reports', permission: 'view_stock_movements' })
    ])
  }),
  Object.freeze({
    group: 'Invoices & Payments',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Invoices', permission: 'view_invoices' }),
      Object.freeze({ label: 'Create Invoice', permission: 'create_invoice' }),
      Object.freeze({ label: 'Edit Invoice', permission: 'edit_invoice' }),
      Object.freeze({ label: 'Record Payment', permission: 'record_payment' }),
      Object.freeze({ label: 'View Payments', permission: 'view_payments' }),
      Object.freeze({ label: 'Delete Payment', permission: null })
    ])
  }),
  Object.freeze({
    group: 'AMC',
    permissions: Object.freeze([
      Object.freeze({ label: 'View AMC', permission: 'view_amc' }),
      Object.freeze({ label: 'Create AMC', permission: 'create_amc' }),
      Object.freeze({ label: 'Renew AMC', permission: 'renew_amc' }),
      Object.freeze({ label: 'Create AMC Job', permission: 'create_amc_job' }),
      Object.freeze({ label: 'Edit AMC', permission: null })
    ])
  }),
  Object.freeze({
    group: 'Reports',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Reports', permission: 'view_reports' }),
      Object.freeze({ label: 'Export Reports', permission: 'export_reports' }),
      Object.freeze({ label: 'Print Reports', permission: 'print_reports' })
    ])
  }),
  Object.freeze({
    group: 'Documents / PDFs',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Documents', permission: 'view_documents' }),
      Object.freeze({ label: 'Download PDF', permission: 'download_invoice_pdf' }),
      Object.freeze({ label: 'Send PDF WhatsApp', permission: 'send_pdf_whatsapp' }),
      Object.freeze({ label: 'Mark Document Sent', permission: 'mark_document_sent' }),
      Object.freeze({ label: 'Manage PDF Templates', permission: 'manage_pdf_templates' })
    ])
  }),
  Object.freeze({
    group: 'Users & Settings',
    permissions: Object.freeze([
      Object.freeze({ label: 'View Users', permission: 'manage_users' }),
      Object.freeze({ label: 'Edit User Role', permission: 'manage_roles' }),
      Object.freeze({ label: 'View Settings', permission: 'view_settings' }),
      Object.freeze({ label: 'Edit Settings', permission: 'edit_settings' }),
      Object.freeze({ label: 'Manage Company Profile', permission: 'manage_company_profile' }),
      Object.freeze({ label: 'Manage Public Website Settings', permission: 'manage_public_website_settings' }),
      Object.freeze({ label: 'Manage Backup & Storage', permission: 'manage_backup_storage' }),
      Object.freeze({ label: 'Manage Document Numbering', permission: 'manage_document_numbering' }),
      Object.freeze({ label: 'Manage Tax / GST Settings', permission: 'manage_tax_settings' }),
      Object.freeze({ label: 'Manage Payment Settings', permission: 'manage_payment_settings' }),
      Object.freeze({ label: 'Manage Notification Templates', permission: 'manage_notification_templates' }),
      Object.freeze({ label: 'Manage Status Workflows', permission: 'manage_status_workflows' }),
      Object.freeze({ label: 'Manage PDF Terms', permission: 'manage_pdf_terms' }),
      Object.freeze({ label: 'View System Information', permission: 'view_system_information' }),
      Object.freeze({ label: 'View Audit Logs', permission: 'view_audit_logs' })
    ])
  })
]);

export function normalizeRole(role = '') {
  return String(role || '').trim().toLowerCase().replace(/[\s/-]+/g, '_');
}

function roleFrom(userOrRole = '') {
  return normalizeRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role);
}

function permissionMapFrom(userOrRole = null) {
  if (!userOrRole || typeof userOrRole !== 'object') return null;
  const map = userOrRole.permissions || userOrRole.effectivePermissions || userOrRole._effectivePermissions || userOrRole.rolePermissions;
  if (!map || typeof map !== 'object') return null;
  if (map instanceof Map) return Object.fromEntries(map.entries());
  return map;
}

export function roleLabel(role = '') {
  const normalized = normalizeRole(role);
  return roleLabels[normalized] || 'Team Member';
}

export function hasRole(userOrRole, role) {
  return roleFrom(userOrRole) === normalizeRole(role);
}

export function can(userOrRole, permission) {
  if (!permission) return false;
  const permissionMap = permissionMapFrom(userOrRole);
  if (permissionMap && Object.prototype.hasOwnProperty.call(permissionMap, permission)) {
    return Boolean(permissionMap[permission]);
  }
  const role = roleFrom(userOrRole);
  if (role === 'admin') return true;
  return Boolean(ROLE_PERMISSIONS[role]?.includes(permission));
}

export function permissionStateForRole(userOrRole, permission) {
  if (!permission || !ALL_PERMISSIONS.includes(permission)) return 'not_set';
  return can(userOrRole, permission) ? 'allowed' : 'denied';
}

export function canAny(userOrRole, permissions = []) {
  return permissions.some((permission) => can(userOrRole, permission));
}

export function canAll(userOrRole, permissions = []) {
  return permissions.every((permission) => can(userOrRole, permission));
}

export function PermissionGate({ user, role, permission, permissions = [], all = false, children, fallback = null }) {
  const subject = user || role;
  const checks = permission ? [permission] : permissions;
  const allowed = all ? canAll(subject, checks) : canAny(subject, checks);
  return allowed ? children : fallback;
}

export function rolesWithPermission(permission) {
  return supportedRoles.filter((role) => can(role, permission));
}

export function isAdminWorkspaceRole(role = '') {
  return adminWorkspaceRoles.includes(normalizeRole(role));
}

export function canAccessRoles(role = '', allowedRoles = []) {
  const normalized = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalized);
}

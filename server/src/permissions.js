import { appError } from './utils/http.js';
import RolePermission from './models/RolePermission.js';

export const SUPPORTED_ROLES = [
  'admin',
  'manager',
  'receptionist',
  'accountant',
  'inventory',
  'technician',
  'viewer'
];

export const ADMIN_WORKSPACE_ROLES = [
  'admin',
  'manager',
  'receptionist',
  'accountant',
  'inventory',
  'viewer'
];

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
  'view_settings',
  'edit_settings',
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

export const ADMIN_LOCKED_PERMISSIONS = Object.freeze([
  'manage_roles',
  'manage_users',
  'view_settings',
  'edit_settings',
  'view_audit_logs'
]);

export function normalizeRole(role = '') {
  return String(role || '').trim().toLowerCase().replace(/[\s/-]+/g, '_');
}

export function defaultPermissionMap(role = '') {
  const normalized = normalizeRole(role);
  const allowed = new Set(normalized === 'admin' ? ALL_PERMISSIONS : ROLE_PERMISSIONS[normalized] || []);
  return ALL_PERMISSIONS.reduce((map, permission) => {
    map[permission] = allowed.has(permission);
    return map;
  }, {});
}

function normalizeStoredPermissions(permissions = {}) {
  if (permissions instanceof Map) return Object.fromEntries(permissions.entries());
  if (permissions && typeof permissions === 'object') return { ...permissions };
  return {};
}

export function validatePermissionKeys(permissions = {}) {
  const permissionObject = normalizeStoredPermissions(permissions);
  const invalid = Object.keys(permissionObject).filter((permission) => !ALL_PERMISSIONS.includes(permission));
  if (invalid.length) throw appError(`Unknown permission key: ${invalid.join(', ')}`, 400);
  return permissionObject;
}

export function mergeRolePermissions(role = '', permissions = {}) {
  const normalized = normalizeRole(role);
  const base = defaultPermissionMap(normalized);
  const validated = validatePermissionKeys(permissions);
  const merged = { ...base };

  Object.entries(validated).forEach(([permission, allowed]) => {
    merged[permission] = Boolean(allowed);
  });

  if (normalized === 'admin') {
    const disabledAdminPermissions = Object.entries(merged)
      .filter(([, allowed]) => !allowed)
      .map(([permission]) => permission);
    if (disabledAdminPermissions.length) {
      throw appError('Admin role must keep full system access', 400);
    }
    ALL_PERMISSIONS.forEach((permission) => {
      merged[permission] = true;
    });
  }

  ADMIN_LOCKED_PERMISSIONS.forEach((permission) => {
    if (normalized === 'admin') merged[permission] = true;
  });

  return merged;
}

export async function getRolePermissionRecord(role = '') {
  const normalized = normalizeRole(role);
  if (!SUPPORTED_ROLES.includes(normalized)) throw appError('Role is not supported', 400);
  return RolePermission.findOne({ role: normalized }).lean();
}

export async function resolveRolePermissions(role = '') {
  const normalized = normalizeRole(role);
  if (!SUPPORTED_ROLES.includes(normalized)) return defaultPermissionMap(normalized);
  if (normalized === 'admin') return defaultPermissionMap('admin');
  const record = await getRolePermissionRecord(normalized);
  return mergeRolePermissions(normalized, record?.permissions || {});
}

export async function resolveAllRolePermissions() {
  const records = await RolePermission.find({ role: { $in: SUPPORTED_ROLES } }).lean();
  const recordsByRole = new Map(records.map((record) => [normalizeRole(record.role), record]));
  return SUPPORTED_ROLES.map((role) => {
    const record = recordsByRole.get(role);
    if (role === 'admin') {
      return {
        role,
        permissions: defaultPermissionMap(role),
        defaults: defaultPermissionMap(role),
        hasOverride: false,
        updatedAt: null,
        updatedBy: null
      };
    }
    return {
      role,
      permissions: mergeRolePermissions(role, record?.permissions || {}),
      defaults: defaultPermissionMap(role),
      hasOverride: Boolean(record),
      updatedAt: record?.updatedAt || null,
      updatedBy: record?.updatedBy || null
    };
  });
}

export async function saveRolePermissions(role = '', permissions = {}, updatedBy = null) {
  const normalized = normalizeRole(role);
  if (!SUPPORTED_ROLES.includes(normalized)) throw appError('Role is not supported', 400);
  const merged = mergeRolePermissions(normalized, permissions);
  const update = {
    role: normalized,
    permissions: merged,
    updatedBy: updatedBy || null
  };
  const record = await RolePermission.findOneAndUpdate(
    { role: normalized },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return {
    role: normalized,
    permissions: mergeRolePermissions(normalized, record.permissions || {}),
    defaults: defaultPermissionMap(normalized),
    hasOverride: true,
    updatedAt: record.updatedAt || null,
    updatedBy: record.updatedBy || null
  };
}

export async function resetRolePermissions(role = '') {
  const normalized = normalizeRole(role);
  if (!SUPPORTED_ROLES.includes(normalized)) throw appError('Role is not supported', 400);
  await RolePermission.deleteOne({ role: normalized });
  return {
    role: normalized,
    permissions: defaultPermissionMap(normalized),
    defaults: defaultPermissionMap(normalized),
    hasOverride: false,
    updatedAt: null,
    updatedBy: null
  };
}

export async function attachEffectivePermissions(user) {
  if (!user) return user;
  user._effectivePermissions = await resolveRolePermissions(user.role);
  return user;
}

export function hasRole(userOrRole, role) {
  const currentRole = normalizeRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role);
  return currentRole === normalizeRole(role);
}

export function hasPermission(userOrRole, permission) {
  const role = normalizeRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role);
  if (role === 'admin') return true;
  if (typeof userOrRole === 'object' && userOrRole?._effectivePermissions) {
    return Boolean(permission && userOrRole._effectivePermissions[permission]);
  }
  return Boolean(permission && ROLE_PERMISSIONS[role]?.includes(permission));
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    next();
  };
}

export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!permissions.some((permission) => hasPermission(req.user, permission))) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    next();
  };
}

export function assertPermission(user, permission, message = 'You do not have permission to access this resource') {
  if (!hasPermission(user, permission)) throw appError(message, 403);
}

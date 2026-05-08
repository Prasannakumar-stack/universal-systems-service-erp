export const adminWorkspaceRoles = [
  'admin',
  'owner',
  'service_manager',
  'accounts_staff',
  'inventory_staff',
  'front_desk',
  'viewer',
  'auditor'
];

export const roleLabels = {
  admin: 'Admin / Owner',
  owner: 'Admin / Owner',
  service_manager: 'Service Manager',
  accounts_staff: 'Accounts Staff',
  inventory_staff: 'Inventory Staff',
  front_desk: 'Front Desk',
  viewer: 'Viewer / Auditor',
  auditor: 'Viewer / Auditor',
  technician: 'Technician'
};

export function normalizeRole(role = '') {
  return String(role || '').trim().toLowerCase().replace(/[\s/-]+/g, '_');
}

export function roleLabel(role = '') {
  const normalized = normalizeRole(role);
  return roleLabels[normalized] || 'Team Member';
}

export function isAdminWorkspaceRole(role = '') {
  return adminWorkspaceRoles.includes(normalizeRole(role));
}

export function canAccessRoles(role = '', allowedRoles = []) {
  const normalized = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalized);
}


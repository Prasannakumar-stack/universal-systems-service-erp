export const adminWorkspaceRoles = ['admin'];

export const roleLabels = {
  admin: 'Admin',
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

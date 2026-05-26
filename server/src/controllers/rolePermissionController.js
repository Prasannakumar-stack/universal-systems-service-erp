import {
  ADMIN_LOCKED_PERMISSIONS,
  ALL_PERMISSIONS,
  SUPPORTED_ROLES,
  normalizeRole,
  resetRolePermissions,
  resolveRolePermissions,
  resolveAllRolePermissions,
  saveRolePermissions,
  validatePermissionKeys
} from '../permissions.js';
import { logAudit } from '../services/auditService.js';
import { appError } from '../utils/http.js';

function permissionsFromBody(body = {}) {
  if (!body.permissions || typeof body.permissions !== 'object' || Array.isArray(body.permissions)) {
    throw appError('Permissions object is required', 400);
  }
  return validatePermissionKeys(body.permissions);
}

export async function list(req, res) {
  const roles = await resolveAllRolePermissions();
  res.json({
    roles,
    permissions: ALL_PERMISSIONS,
    supportedRoles: SUPPORTED_ROLES,
    adminLockedPermissions: ADMIN_LOCKED_PERMISSIONS
  });
}

export async function update(req, res) {
  const role = normalizeRole(req.params.role);
  if (!SUPPORTED_ROLES.includes(role)) throw appError('Role is not supported', 400);
  const permissions = permissionsFromBody(req.body);
  const before = await resolveRolePermissions(role);
  const record = await saveRolePermissions(role, permissions, req.user?._id);
  await logAudit({
    userId: req.user?._id || null,
    action: 'role_permissions_updated',
    module: 'role_permissions',
    before: { role, permissions: before },
    after: { role, permissions: record.permissions }
  });
  res.json({
    success: true,
    role: record,
    permissions: ALL_PERMISSIONS,
    supportedRoles: SUPPORTED_ROLES,
    adminLockedPermissions: ADMIN_LOCKED_PERMISSIONS,
    message: 'Role permissions saved'
  });
}

export async function reset(req, res) {
  const role = normalizeRole(req.params.role);
  if (!SUPPORTED_ROLES.includes(role)) throw appError('Role is not supported', 400);
  const before = await resolveRolePermissions(role);
  const record = await resetRolePermissions(role);
  await logAudit({
    userId: req.user?._id || null,
    action: 'role_permissions_reset',
    module: 'role_permissions',
    before: { role, permissions: before },
    after: { role, permissions: record.permissions }
  });
  res.json({
    success: true,
    role: record,
    permissions: ALL_PERMISSIONS,
    supportedRoles: SUPPORTED_ROLES,
    adminLockedPermissions: ADMIN_LOCKED_PERMISSIONS,
    message: 'Role permissions reset'
  });
}

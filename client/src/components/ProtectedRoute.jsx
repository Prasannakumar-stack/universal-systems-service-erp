import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccessRoles, roleLabel } from '../utils/roles.js';

function UnauthorizedState({ userRole, auditOnly = false }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] p-4">
      <div className="surface max-w-md p-6 text-center">
        <p className="text-xs font-black uppercase text-[var(--brand)]">Access denied</p>
        <h1 className="mt-2 text-2xl font-black">{auditOnly ? 'Audit logs are admin only.' : 'You do not have permission to open this workspace.'}</h1>
        <p className="mt-3 text-sm leading-6 muted">
          {auditOnly ? 'Access denied. Audit logs are available only for admin users.' : `Signed in as ${roleLabel(userRole)}. Please use the correct workspace or contact the administrator.`}
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ role, allowedRoles = null, loginPath = null }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="surface px-6 py-5 text-sm font-semibold">Loading secure workspace...</div>
      </div>
    );
  }

  const loginTarget = loginPath || '/app';
  if (!user) return <Navigate to={loginTarget} replace state={{ from: location }} />;
  const roles = allowedRoles || (role ? [role] : []);
  if (roles.length && !canAccessRoles(user.role, roles)) return <UnauthorizedState userRole={user.role} auditOnly={location.pathname.startsWith('/app/admin/audit-logs')} />;
  if (user.forcePasswordReset) {
    const resetTarget = user.role === 'technician' ? '/app/tech/settings' : '/app/admin/settings?tab=adminProfile';
    const alreadyOnResetPage = location.pathname === '/app/tech/settings' || location.pathname === '/app/admin/settings';
    if (!alreadyOnResetPage) return <Navigate to={resetTarget} replace state={{ from: location, forcePasswordReset: true }} />;
  }
  return <Outlet />;
}

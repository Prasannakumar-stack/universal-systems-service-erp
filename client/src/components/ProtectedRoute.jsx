import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="surface px-6 py-5 text-sm font-semibold">Loading secure workspace...</div>
      </div>
    );
  }

  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/technician/login'} replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/tech/dashboard'} replace />;
  return <Outlet />;
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login({ role }) {
  const [username, setUsername] = useState(role === 'admin' ? 'admin' : 'emp1');
  const [password, setPassword] = useState(role === 'admin' ? 'admin123' : 'emp123');
  const [selectedRole, setSelectedRole] = useState(role);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password, selectedRole);
      if (user.role !== selectedRole) {
        push(`This login is for ${selectedRole} users`, 'error');
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/tech/dashboard');
        return;
      }
      push(`Welcome ${user.name}`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/tech/dashboard');
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] p-4">
      <div className="surface w-full max-w-md p-6">
        <Link to="/" className="mx-auto mb-6 flex w-fit rounded-card bg-white px-2 py-1 shadow-sm">
          <img src="/logo-full.png" alt="Universal Systems" className="h-12 w-auto max-w-[220px]" />
        </Link>
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-card bg-[var(--surface-2)] text-[var(--brand)]">
            {role === 'admin' ? <LockKeyhole className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-black">{role === 'admin' ? 'Admin Login' : 'Technician Login'}</h1>
          <p className="mt-2 text-sm muted">Universal Systems secure workspace</p>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label>
            <span className="label">Username</span>
            <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            <span className="label">Password</span>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>
            <span className="label">Role</span>
            <select className="input" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="admin">Admin</option>
              <option value="technician">Technician</option>
            </select>
          </label>
          <button className="btn btn-primary w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-5 rounded-card bg-[var(--surface-2)] p-4 text-sm">
          <p className="font-bold">Default credentials</p>
          {role === 'admin' ? (
            <p className="mt-1 muted">admin / admin123</p>
          ) : (
            <p className="mt-1 muted">emp1 / emp123 or emp2 / emp123</p>
          )}
        </div>
      </div>
    </div>
  );
}

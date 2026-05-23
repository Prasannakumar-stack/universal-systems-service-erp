import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { normalizeRole } from '../utils/roles.js';

function workspacePath(userRole) {
  return normalizeRole(userRole) === 'technician' ? '/technician/dashboard' : '/admin/dashboard';
}

function BrandLogo() {
  return (
    <span className="login-brand-lockup" aria-hidden="true">
      <svg className="login-brand-icon" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r="41" />
        <path d="M8 46h76M46 5c-15 12-23 25-23 41s8 29 23 41M46 5c15 12 23 25 23 41s-8 29-23 41" />
        <path d="M16 24c17 7 43 7 60 0M16 68c17-7 43-7 60 0" />
        <path d="M46 5v82" />
        <text x="46" y="62" textAnchor="middle">
          US
        </text>
      </svg>
      <span className="login-brand-text">
        <span>Universal</span>
        <span>Systems</span>
      </span>
    </span>
  );
}

function LoginSideImage({ side, src }) {
  return (
    <div className={`login-side-image login-side-image-${side}`} aria-hidden="true">
      <img src={src} alt="" aria-hidden="true" draggable="false" />
    </div>
  );
}

export default function Login({ role }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      push(`Welcome ${user.name}`);
      navigate(workspacePath(user.role));
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-grid-pattern" aria-hidden="true" />
      <div className="login-circuit-pattern" aria-hidden="true" />
      <LoginSideImage side="left" src="/Login%20page%20left%20side%20image.png" />
      <LoginSideImage side="right" src="/Login%20page%20right%20side%20image.png" />

      <section className="login-stage" aria-label={`${role === 'admin' ? 'Admin' : 'Technician'} login`}>
        <Link to="/" className="login-logo-link" aria-label="Universal Systems home">
          <BrandLogo />
        </Link>

        <div className="login-card">
          <div className="login-card-glow" aria-hidden="true" />
          <div className="login-avatar-wrap" aria-hidden="true">
            <span className="login-avatar-rings" />
            <span className="login-avatar">
              <UserRound />
            </span>
          </div>

          <div className="login-heading">
            <h1>Welcome Back</h1>
            <p>Secure access to your workspace</p>
            <span aria-hidden="true" />
          </div>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span className="login-label">Username</span>
              <span className="login-input-shell">
                <UserRound className="login-input-icon" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Enter your username"
                />
              </span>
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <span className="login-input-shell">
                <LockKeyhole className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>

            <button className="login-submit" disabled={loading} aria-busy={loading}>
              <ShieldCheck className="login-submit-shield" />
              <span>Access Dashboard</span>
              <ArrowRight className="login-submit-arrow" />
            </button>
          </form>

          <div className="login-protection-note">
            <span aria-hidden="true" />
            <ShieldCheck />
            <p>Protected access for authorized staff</p>
            <span aria-hidden="true" />
          </div>
        </div>

        <p className="login-footer">© 2026 Universal Systems. All rights reserved.</p>
      </section>
    </main>
  );
}

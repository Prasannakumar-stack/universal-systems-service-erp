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
    <span className="login-brand" aria-hidden="true">
      <svg className="login-brand-mark" viewBox="0 0 92 92">
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

function LeftRepairIllustration() {
  return (
    <div className="login-illustration login-illustration-left" aria-hidden="true">
      <div className="login-floating-icon login-floating-icon-tools">
        <svg viewBox="0 0 90 90" role="img">
          <path d="M27 17l13 13M20 24l13 13M16 29l45 45 11-11-45-45" />
          <path d="M62 18l10 10-32 32-10-10 32-32z" />
          <path d="M19 65l17-17M16 69l8 8 17-17" />
        </svg>
      </div>
      <svg className="login-line-art login-line-art-left" viewBox="0 0 560 690" preserveAspectRatio="xMinYMid meet">
        <defs>
          <linearGradient id="loginLeftStroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset="0.48" stopColor="#0ea5ff" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <radialGradient id="loginLeftGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#0ea5ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#0ea5ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path className="login-fill-glow" d="M30 176c54-112 183-120 232-16 44 93-13 167-6 250 7 88 84 141 43 210-51 86-207 69-270-22-76-109-60-294 1-422z" fill="url(#loginLeftGlow)" />
        <g className="login-art-stroke">
          <path d="M69 199c-7-69 35-130 99-145 79-18 155 38 161 120" />
          <path d="M80 159c44-55 145-71 214 6" />
          <path d="M91 125c53-42 139-44 190 7" />
          <path d="M57 202c59-19 139-24 239 2" />
          <path d="M87 205c15 93-20 136-23 203-3 74 42 142 110 164" />
          <path d="M287 209c-1 62-25 98-22 155 4 66 58 122 94 167" />
          <path d="M112 240c31 10 75 9 112-15" />
          <path d="M123 242c-15 44-7 87 23 111" />
          <path d="M215 229c-5 48 7 81 31 101" />
          <path d="M147 275c18 19 47 18 62-4" />
          <path d="M149 322c25 20 55 19 82-5" />
          <path d="M52 351c67 10 135 57 179 126" />
          <path d="M205 424c61 13 106 58 139 119" />
          <path d="M89 383c44 21 83 55 118 101" />
          <path d="M229 492c27 12 57 37 92 73" />
          <path d="M101 446c34 58 90 96 163 117" />
          <path d="M201 83l10-35M233 90l25-28M111 117l-30-19" />
          <path d="M75 191l-53-14M312 190l44 16" />
        </g>
        <g className="login-art-stroke login-art-bright">
          <path d="M167 289c-2-18 7-34 22-39 16-5 31 5 37 20" />
          <path d="M171 295c16 15 35 15 54-1" />
          <path d="M115 213c44 15 101 12 158-9" />
          <path d="M148 91c63-18 131 15 154 80" />
        </g>
        <g className="login-art-device">
          <path d="M169 335h336c25 0 45 20 45 45v195H124V380c0-25 20-45 45-45z" />
          <path d="M147 371h378v177H147z" />
          <path d="M122 577h428l-28 43H92l30-43z" />
          <path d="M193 410h94v88h-94z" />
          <path d="M322 405h124v29H322z" />
          <path d="M322 458h124v28H322z" />
          <circle cx="482" cy="409" r="16" />
          <circle cx="482" cy="470" r="24" />
          <circle cx="482" cy="470" r="7" />
          <path d="M211 431h58M211 454h42M339 420h82M340 474h58" />
          <path d="M170 522h71M264 522h72M360 522h111" />
        </g>
        <g className="login-art-stroke login-art-bright">
          <path d="M86 472c54-25 117-26 183-2" />
          <path d="M80 484c61 18 121 22 181 11" />
          <path d="M71 509c58 26 118 40 183 37" />
          <path d="M284 443c45 2 81 13 108 35" />
        </g>
        <g className="login-art-tools">
          <path d="M80 642l120-42 13 22-113 58-20-38z" />
          <path d="M94 653l96-40" />
          <path d="M213 657l116-64 19 27-122 51-13-14z" />
          <circle cx="338" cy="600" r="10" />
        </g>
      </svg>
    </div>
  );
}

function RightDiagnosticsIllustration() {
  return (
    <div className="login-illustration login-illustration-right" aria-hidden="true">
      <div className="login-floating-icon login-floating-icon-gear">
        <svg viewBox="0 0 90 90" role="img">
          <path d="M45 15v10M45 65v10M15 45h10M65 45h10M24 24l8 8M58 58l8 8M66 24l-8 8M32 58l-8 8" />
          <circle cx="45" cy="45" r="20" />
          <circle cx="45" cy="45" r="9" />
        </svg>
      </div>
      <div className="login-floating-icon login-floating-icon-shield">
        <svg viewBox="0 0 90 90" role="img">
          <path d="M45 14c11 9 22 12 34 14v18c0 22-12 35-34 48C23 81 11 68 11 46V28c12-2 23-5 34-14z" />
          <path d="M31 47l10 10 20-23" />
        </svg>
      </div>
      <svg className="login-line-art login-line-art-right" viewBox="0 0 600 690" preserveAspectRatio="xMaxYMid meet">
        <defs>
          <linearGradient id="loginRightStroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#93e7ff" />
            <stop offset="0.5" stopColor="#0ea5ff" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <radialGradient id="loginRightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#0ea5ff" stopOpacity="0.24" />
            <stop offset="1" stopColor="#0ea5ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path className="login-fill-glow" d="M163 109c105-55 287-43 345 57 56 97-6 184 3 281 7 77 59 146 11 199-72 78-251 41-349-55C39 460 20 184 163 109z" fill="url(#loginRightGlow)" />
        <g className="login-art-device">
          <path d="M71 247h252c28 0 51 23 51 51v271H71V247z" />
          <path d="M102 283h222v207H102z" />
          <path d="M356 272h111c24 0 43 19 43 43v248H374V298c0-9-8-20-18-26z" />
          <path d="M399 319h73M399 369h73M399 419h73" />
          <path d="M392 469h88M392 510h62" />
          <circle cx="158" cy="306" r="11" />
          <circle cx="276" cy="306" r="11" />
          <circle cx="213" cy="402" r="45" />
          <circle cx="213" cy="402" r="12" />
          <path d="M213 357v90M168 402h90M181 370l64 64M245 370l-64 64" />
          <path d="M130 347h171M128 464h72M227 464h75M128 518h178" />
          <path d="M126 541h31M171 541h31M216 541h31M261 541h31" />
        </g>
        <g className="login-art-detail">
          <path d="M124 318h66M207 318h80" />
          <path d="M125 376h38M263 374h40" />
          <path d="M135 426h38l18 18h44l18-18h37" />
          <path d="M148 546v-19M194 546v-19M240 546v-19M286 546v-19" />
          <path d="M407 339h48M407 389h48M407 439h48" />
          <circle cx="338" cy="332" r="5" />
          <circle cx="338" cy="474" r="5" />
          <circle cx="491" cy="338" r="4" />
          <circle cx="491" cy="438" r="4" />
        </g>
        <g className="login-art-laptop">
          <path d="M364 401h212v145H364z" />
          <path d="M340 546h260l-28 44H316l24-44z" />
          <circle cx="471" cy="463" r="31" />
          <path d="M450 463l15 15 28-34" />
          <path d="M429 505h82" />
          <path d="M392 425h38M512 425h34M389 522h58M464 522h68" />
          <path d="M430 449c12-18 34-26 55-18 21 7 34 27 33 49" />
          <path d="M403 569h107M524 569h42" />
        </g>
        <g className="login-art-tools">
          <path d="M95 611l143-48 12 27-137 60-18-39z" />
          <path d="M122 626l101-40" />
          <path d="M351 633l144-50 30 25-147 56-27-31z" />
          <path d="M499 590l23-12 35 23-33 10" />
          <path d="M262 594c8-44 23-67 45-67s34 22 27 63" />
          <path d="M278 593v-38M302 592v-51M326 592v-34" />
          <path d="M246 590h103v60H246z" />
          <path d="M249 615h98" />
          <circle cx="418" cy="610" r="7" />
          <circle cx="442" cy="602" r="5" />
          <circle cx="470" cy="627" r="6" />
          <path d="M104 666l34-14M155 655l34-14M522 647l47-18" />
        </g>
        <g className="login-art-stroke">
          <path d="M63 161h112l30-31h82" />
          <path d="M374 137h75l25-25h95" />
          <path d="M396 207h92l33-37h69" />
          <path d="M427 231h44M494 231h32" />
          <path d="M83 208h68M175 208h38" />
          <path d="M45 355H0M562 310h34M535 178h47" />
          <circle cx="218" cy="130" r="5" />
          <circle cx="474" cy="112" r="5" />
          <circle cx="521" cy="170" r="4" />
          <circle cx="152" cy="208" r="4" />
        </g>
      </svg>
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
      <LeftRepairIllustration />
      <RightDiagnosticsIllustration />

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

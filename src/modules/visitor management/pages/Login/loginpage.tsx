import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import "./Login.css";

const DEMO = { username: "admin", password: "secret" };

const EyeIcon = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const fillDemo = () => {
    setForm(DEMO);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Enter both username and password to continue.");
      return;
    }
    setLoading(true);
    try {
      await authService.login(form.username.trim(), form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── Left branding panel ── */}
      <div className="login-panel">
        <div className="login-panel-logo">
          <div className="login-logo-mark">VMS</div>
          <span className="login-logo-name">Visitor Management System</span>
        </div>

        <div className="login-panel-body">
          <h2>Secure &amp; Smart Visitor Control</h2>
          <p>
            A unified platform for managing visitor registrations, approvals,
            face verification, and check-in workflows.
          </p>

          <ul className="login-features">
            {[
              "Visitor registration with face capture",
              "QR-based check-in and check-out",
              "Host approval workflow",
              "Real-time dashboard and statistics",
              "Role-based access control",
            ].map((feat) => (
              <li className="login-feature-item" key={feat}>
                <span className="login-feature-dot">
                  <CheckIcon />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="login-panel-footer">
          &copy; {new Date().getFullYear()} VMS &mdash; All rights reserved
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to access the visitor management console.</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertIcon />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-fields">
              <div className="login-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  className={error ? "input-error" : ""}
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className="login-password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className={error ? "input-error" : ""}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldIcon />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>demo credentials</span>
          </div>

          <div className="login-demo-box">
            <div>
              <div className="login-demo-box-label">Test Account</div>
              <div className="login-demo-box-creds">admin&nbsp;/&nbsp;secret</div>
            </div>
            <button type="button" className="login-demo-fill" onClick={fillDemo}>
              Fill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

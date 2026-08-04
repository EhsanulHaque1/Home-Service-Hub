import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Check, Loader2, Wrench } from 'lucide-react';
import { useCardTilt } from '@/hooks/useCardTilt';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { createRipple } from '@/lib/ripple';
import './SignIn.css';

export default function SignIn() {
  const navigate = useNavigate();
  const cardRef = useCardTilt();
  const submitBtnRef = useRef(null);

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const hidePassword = isPasswordFocused && !showPassword;

  useEyeTracking(cardRef, hidePassword);

  const handleRipple = (e) => createRipple(e, submitBtnRef.current);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => navigate('/'), 1800);
    }, 900);
  };

  return (
    <div className="signin-page">
      <div className="pointer-events-none absolute inset-0 mesh-bg opacity-40" />
      <div className="glow-sphere glow-1" />
      <div className="glow-sphere glow-2" />

      <Link to="/" className="signin-header flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
          <Wrench className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="font-display text-lg font-700 tracking-tight text-white">
          Home<span className="text-brand-400">Service</span>Hub
        </span>
      </Link>

      <div>
        <div
          ref={cardRef}
          className={`login-container${status === 'success' ? ' success' : ''}${hidePassword ? ' hide-password' : ''}`}
        >
          <div className="success-overlay">
            <div className="success-checkmark">
              <Check className="h-9 w-9" strokeWidth={3} />
            </div>
            <h2>Welcome Back!</h2>
            <p>Logging you in...</p>
          </div>

          <div className="avatar-area">
            <div className="face">
              <div className="eye">
                <div className="pupil" />
              </div>
              <div className="eye">
                <div className="pupil" />
              </div>
            </div>
          </div>

          <h2>Account Login</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className={`input-group${errors.email ? ' has-error' : ''}`}>
              <Mail className="input-icon h-4 w-4" />
              <input
                id="email"
                type="email"
                placeholder=" "
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
              />
              <label htmlFor="email">Email Address</label>
              {errors.email && <p className="input-error">{errors.email}</p>}
            </div>

            <div className={`input-group${errors.password ? ' has-error' : ''}`}>
              <Lock className="input-icon h-4 w-4" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                autoComplete="current-password"
                value={form.password}
                onChange={update('password')}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {errors.password && <p className="input-error">{errors.password}</p>}
            </div>

            <div className="utils">
              <label className="remember-me">
                <input type="checkbox" checked={form.remember} onChange={update('remember')} />
                Remember me
              </label>
              <a href="#" className="forgot-pass" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            <button
              ref={submitBtnRef}
              type="submit"
              className="submit-btn"
              disabled={status !== 'idle'}
              onClick={handleRipple}
            >
              {status === 'loading' ? <Loader2 className="h-4 w-4 spin" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="signin-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Wrench, Check, AlertCircle, ArrowLeft, ShieldCheck, Mail } from 'lucide-react';
import { useCardTilt } from '@/hooks/useCardTilt';
import { createRipple } from '@/lib/ripple';
import { resetUserPassword } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import './SignIn.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardRef = useCardTilt();
  const submitBtnRef = useRef(null);
  const { refreshUser, notifyAuthChange } = useAuth();

  const emailParam = decodeURIComponent(searchParams.get('email') || '');
  const tokenParam = searchParams.get('token') || '';

  const [form, setForm] = useState({
    email: emailParam,
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (emailParam) {
      setForm((f) => ({ ...f, email: emailParam }));
    }
  }, [emailParam]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (!form.password_confirmation) next.password_confirmation = 'Confirm your password';
    else if (form.password !== form.password_confirmation) {
      next.password_confirmation = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRipple = (e) => createRipple(e, submitBtnRef.current);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!tokenParam) {
      setServerError('Reset token is missing or invalid. Please request a new reset link.');
      return;
    }

    setStatus('loading');
    setServerError('');

    try {
      await resetUserPassword({
        email: form.email,
        token: tokenParam,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      // Keep user logged in and update context
      await refreshUser();
      notifyAuthChange();

      setStatus('success');
      setTimeout(() => {
        navigate('/?verified=1');
      }, 1200);
    } catch (err) {
      setStatus('idle');
      if (err.errors) {
        const formatted = {};
        Object.keys(err.errors).forEach((key) => {
          formatted[key] = Array.isArray(err.errors[key]) ? err.errors[key][0] : err.errors[key];
        });
        setErrors(formatted);
      } else {
        setServerError(err.message || 'Failed to reset password. The link may have expired.');
      }
    }
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
        <div ref={cardRef} className={`login-container${status === 'success' ? ' success' : ''}`}>
          <div className="success-overlay">
            <div className="success-checkmark">
              <Check className="h-9 w-9" strokeWidth={3} />
            </div>
            <h2>Password Reset!</h2>
            <p>Password updated successfully! Logging you in...</p>
          </div>

          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h2>Set New Password</h2>
          <p className="-mt-4 mb-6 text-center text-xs text-slate-400">
            Email verified successfully. Please enter your new password below.
          </p>

          {!tokenParam && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Reset token is missing. Please click the link in your email or request a new one.</span>
              </div>
              <Link to="/forgot-password" className="mt-1 font-semibold underline text-amber-200 hover:text-white">
                Request a new reset link
              </Link>
            </div>
          )}

          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {emailParam ? (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="truncate">
                  <span className="text-emerald-400 font-semibold block text-[11px]">Email Verified</span>
                  <span className="text-white font-medium">{form.email}</span>
                </div>
              </div>
            ) : (
              <div className={`input-group${errors.email ? ' has-error' : ''}`}>
                <Mail className="input-icon h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  placeholder=" "
                  value={form.email}
                  onChange={update('email')}
                />
                <label htmlFor="email">Email Address</label>
                {errors.email && <p className="input-error">{errors.email}</p>}
              </div>
            )}

            <div className={`input-group${errors.password ? ' has-error' : ''}`}>
              <Lock className="input-icon h-4 w-4" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
              />
              <label htmlFor="password">New Password (min 8 chars)</label>
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

            <div className={`input-group${errors.password_confirmation ? ' has-error' : ''}`}>
              <Lock className="input-icon h-4 w-4" />
              <input
                id="password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder=" "
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
              />
              <label htmlFor="password_confirmation">Confirm New Password</label>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {errors.password_confirmation && <p className="input-error">{errors.password_confirmation}</p>}
            </div>

            <button
              ref={submitBtnRef}
              type="submit"
              className="submit-btn"
              disabled={status !== 'idle' || !tokenParam}
              onClick={handleRipple}
            >
              {status === 'loading' ? <Loader2 className="h-4 w-4 spin" /> : 'Save New Password'}
            </button>
          </form>

          <div className="mt-6 flex justify-center">
            <Link to="/sign-in" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>

        <p className="signin-footer">
          Remembered your password? <Link to="/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

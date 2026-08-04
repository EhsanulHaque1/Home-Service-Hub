import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Check, Loader2, Wrench, AlertCircle, CheckCircle, RefreshCw, UserCheck, ShieldAlert, UserX } from 'lucide-react';
import { useCardTilt } from '@/hooks/useCardTilt';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { createRipple } from '@/lib/ripple';
import { useAuth } from '@/context/AuthContext';
import { checkEmailStatus, resendVerificationEmail } from '@/lib/api';
import './SignIn.css';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardRef = useCardTilt();
  const submitBtnRef = useRef(null);
  const { user, login, refreshUser, notifyAuthChange } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [status, setStatus] = useState('idle');

  // Real-time email lookup state
  const [emailInfo, setEmailInfo] = useState({ checking: false, exists: null, verified: null, name: '' });

  const verifiedParam = searchParams.get('verified');
  const alreadyVerifiedParam = searchParams.get('already_verified');
  const errorParam = searchParams.get('error');

  // Real-time redirect if user is authenticated
  useEffect(() => {
    if (user) {
      setStatus('success');
      const timer = setTimeout(() => {
        navigate('/?verified=1');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Real-time debounced email lookup as user types
  useEffect(() => {
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setEmailInfo({ checking: false, exists: null, verified: null, name: '' });
      return;
    }

    setEmailInfo((prev) => ({ ...prev, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailStatus(form.email);
        setEmailInfo({
          checking: false,
          exists: res?.exists ?? false,
          verified: res?.verified ?? false,
          name: res?.name || '',
        });

        if (res?.exists && !res?.verified) {
          setRequiresVerification(true);
        }
      } catch (e) {
        setEmailInfo({ checking: false, exists: null, verified: null, name: '' });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.email]);

  // Continuous real-time background polling when email verification is pending
  useEffect(() => {
    if (!emailInfo.exists || emailInfo.verified) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkEmailStatus(form.email);
        if (res?.verified) {
          setEmailInfo((prev) => ({ ...prev, verified: true }));
          const currentUser = await refreshUser();
          if (currentUser) {
            notifyAuthChange();
            setStatus('success');
            navigate('/?verified=1');
          }
        }
      } catch (e) {}
    }, 1500);

    return () => clearInterval(interval);
  }, [form.email, emailInfo.exists, emailInfo.verified, refreshUser, notifyAuthChange, navigate]);

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));

    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
    if (serverError) {
      setServerError('');
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setServerError('');
    setRequiresVerification(false);
    setResendMessage('');

    try {
      await login({ email: form.email, password: form.password, remember: form.remember });
      setStatus('success');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setStatus('idle');
      if (err.status === 403 && err.errors?.email) {
        setRequiresVerification(true);
        setServerError(err.message || 'Your email address is not verified. Please check your email.');
      } else if (err.errors) {
        const formattedErrors = {};
        Object.keys(err.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(err.errors[key]) ? err.errors[key][0] : err.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setServerError(err.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  const handleResend = async () => {
    if (!form.email) {
      setResendMessage('Please enter your email address first.');
      return;
    }
    setResendStatus('loading');
    try {
      const res = await resendVerificationEmail(form.email);
      setResendMessage(res?.message || 'Verification link sent!');
    } catch (err) {
      setResendMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setResendStatus('idle');
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

          {verifiedParam === '1' && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Email verified successfully! You are now logged in.</span>
            </div>
          )}

          {alreadyVerifiedParam === '1' && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Your email address is verified. Logging you in...</span>
            </div>
          )}

          {errorParam && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Verification link is invalid or expired. Please enter your email and click Resend.</span>
            </div>
          )}

          {serverError && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
              {requiresVerification && (
                <div className="mt-1 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300">
                    <Loader2 className="h-3.5 w-3.5 spin shrink-0" />
                    <span>Auto-detecting email verification in real time...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === 'loading'}
                    className="flex items-center justify-center gap-1.5 rounded bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/30"
                  >
                    {resendStatus === 'loading' ? <Loader2 className="h-3 w-3 spin" /> : <RefreshCw className="h-3 w-3" />}
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          {resendMessage && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{resendMessage}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-brand-300">
                <Loader2 className="h-3 w-3 spin" />
                <span>Auto-detecting...</span>
              </div>
            </div>
          )}

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

            {/* Real-time Email Verification Badge */}
            {emailInfo.checking && (
              <div className="-mt-2 mb-3 flex items-center gap-1.5 text-[11px] text-slate-400 animate-pulse">
                <Loader2 className="h-3 w-3 spin text-brand-400" />
                <span>Checking account status...</span>
              </div>
            )}

            {!emailInfo.checking && emailInfo.exists === true && emailInfo.verified === true && (
              <div className="-mt-2 mb-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Verified Account ({emailInfo.name}) • Enter password to sign in</span>
              </div>
            )}

            {!emailInfo.checking && emailInfo.exists === true && emailInfo.verified === false && (
              <div className="-mt-2 mb-3 flex flex-col gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span>Verification Pending ({emailInfo.name})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === 'loading'}
                    className="text-[10px] underline font-bold text-amber-200 hover:text-white"
                  >
                    Resend Link
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-200/80">
                  <Loader2 className="h-3 w-3 spin shrink-0 text-amber-400" />
                  <span>Watching live for verification... Click link in your email</span>
                </div>
              </div>
            )}

            {!emailInfo.checking && emailInfo.exists === false && form.email && /^\S+@\S+\.\S+$/.test(form.email) && (
              <div className="-mt-2 mb-3 flex items-center justify-between gap-1.5 text-[11px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-1.5">
                  <UserX className="h-3.5 w-3.5 shrink-0" />
                  <span>No account found for this email.</span>
                </div>
                <Link to="/register" className="text-[10px] font-bold text-brand-300 underline">
                  Sign Up
                </Link>
              </div>
            )}

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

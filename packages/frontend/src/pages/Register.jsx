import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Wrench, Mail, Lock, Phone, Eye, EyeOff, Check, ArrowRight, Loader2, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { createRipple } from '@/lib/ripple';
import { useAuth } from '@/context/AuthContext';

const trades = ['Plumbing', 'Cleaning', 'Electrical', 'Carpentry', 'Painting', 'Appliance repair'];

const roleCopy = {
  client: {
    eyebrow: 'Join as a customer',
    title: 'Get help around the house in minutes.',
    subtitle: 'Post a task, get matched with a nearby worker, and pay securely once the job is done.',
  },
  worker: {
    eyebrow: 'Join as a worker',
    title: 'Turn your skills into steady work.',
    subtitle: 'Build your profile, browse live tasks in your trade, and get paid the moment a job completes.',
  },
};

export default function Register() {
  const navigate = useNavigate();
  const { register, refreshUser, notifyAuthChange } = useAuth();
  const [role, setRole] = useState('client');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    trade: '',
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [confirmFocus, setConfirmFocus] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [status, setStatus] = useState('idle');

  const avatarRef = useRef(null);
  const submitBtnRef = useRef(null);
  const hidePassword = (passwordFocus || confirmFocus) && !showPassword;
  useEyeTracking(avatarRef, hidePassword);
  const handleRipple = (e) => createRipple(e, submitBtnRef.current);

  // Real-time verification polling: when user verifies in another tab/email, auto-login immediately
  useEffect(() => {
    if (status !== 'verification_pending') return;

    const interval = setInterval(async () => {
      const currentUser = await refreshUser();
      if (currentUser) {
        notifyAuthChange();
        navigate('/?verified=1');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, refreshUser, notifyAuthChange, navigate]);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const switchRole = (r) => {
    setRole(r);
    setErrors({});
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters';
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match';
    if (role === 'worker' && !form.trade) next.trade = 'Select your trade';
    if (!form.location.trim()) next.location = role === 'worker' ? 'Service area is required' : 'Your address is required';
    if (!form.terms) next.terms = 'You must accept the terms to continue';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setServerError('');
    try {
      const res = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        location: form.location,
        trade: form.trade,
      });
      if (res?.requires_verification) {
        setStatus('verification_pending');
      } else {
        setStatus('success');
        setTimeout(() => navigate('/'), 1200);
      }
    } catch (err) {
      setStatus('idle');
      if (err.errors) {
        const formattedErrors = {};
        Object.keys(err.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(err.errors[key]) ? err.errors[key][0] : err.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setServerError(err.message || 'Failed to create account. Please try again.');
      }
    }
  };

  const copy = roleCopy[role];

  return (
    <AuthLayout
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      cardClassName={status === 'success' ? 'success' : status === 'verification_pending' ? 'success' : ''}
      overlay={
        status === 'verification_pending' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-900/95 rounded-2xl inset-0 absolute backdrop-blur-md z-20 text-white">
            <div className="h-16 w-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Check Your Email</h2>
            <p className="text-sm text-slate-300 mb-4 max-w-xs leading-relaxed">
              We sent a verification link to <br /><strong className="text-brand-300">{form.email}</strong>.<br />Please verify your email address to activate your account.
            </p>
            <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-brand-300 bg-brand-500/10 px-3 py-1.5 rounded-full border border-brand-500/20">
              <Loader2 className="h-3.5 w-3.5 spin" />
              <span>Waiting for verification... (auto-detecting)</span>
            </div>
            <Link
              to="/sign-in"
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-glow"
            >
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <div className="success-overlay">
            <div className="success-checkmark">
              <Check className="h-9 w-9" strokeWidth={3} />
            </div>
            <h2>Account created!</h2>
            <p>Redirecting…</p>
          </div>
        )
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-semibold text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </>
      }
    >
      <div ref={avatarRef} className={`avatar-area${hidePassword ? ' hide-password' : ''}`}>
        <div className="face">
          <div className="eye">
            <div className="pupil" />
          </div>
          <div className="eye">
            <div className="pupil" />
          </div>
        </div>
      </div>

      <div className="mb-6 inline-flex w-full rounded-full border border-white/10 bg-ink-900 p-1">
        {['client', 'worker'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold capitalize transition-all ${role === r ? 'bg-brand-500 text-ink-950 shadow-glow' : 'text-slate-300 hover:text-white'
              }`}
          >
            {r === 'client' ? <User className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            I'm a {r}
          </button>
        ))}
      </div>

      {serverError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={`input-group${errors.name ? ' has-error' : ''}`}>
          <User className="input-icon h-4 w-4" />
          <input id="name" type="text" placeholder=" " autoComplete="name" value={form.name} onChange={update('name')} />
          <label htmlFor="name">Full name</label>
          {errors.name && <p className="input-error">{errors.name}</p>}
        </div>

        <div className="grid gap-x-5 sm:grid-cols-2">
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
            <label htmlFor="email">Email</label>
            {errors.email && <p className="input-error">{errors.email}</p>}
          </div>

          <div className="input-group">
            <Phone className="input-icon h-4 w-4" />
            <input id="phone" type="tel" placeholder=" " autoComplete="tel" value={form.phone} onChange={update('phone')} />
            <label htmlFor="phone">Phone (optional)</label>
          </div>
        </div>

        {role === 'worker' && (
          <div className={`input-group static-label${errors.trade ? ' has-error' : ''}`}>
            <label htmlFor="trade">Trade</label>
            <div className="static-input-wrap">
              <Wrench className="input-icon h-4 w-4" />
              <select id="trade" value={form.trade} onChange={update('trade')}>
                <option value="" disabled>
                  Select your trade…
                </option>
                {trades.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {errors.trade && <p className="input-error">{errors.trade}</p>}
          </div>
        )}

        <div className={`input-group${errors.location ? ' has-error' : ''}`}>
          <MapPin className="input-icon h-4 w-4" />
          <input
            id="location"
            type="text"
            placeholder=" "
            value={form.location}
            onChange={update('location')}
          />
          <label htmlFor="location">{role === 'worker' ? 'Service area' : 'Address'}</label>
          {errors.location && <p className="input-error">{errors.location}</p>}
        </div>

        <div className="grid gap-x-5 sm:grid-cols-2">
          <div className={`input-group${errors.password ? ' has-error' : ''}`}>
            <Lock className="input-icon h-4 w-4" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder=" "
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
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

          <div className={`input-group${errors.confirmPassword ? ' has-error' : ''}`}>
            <Lock className="input-icon h-4 w-4" />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder=" "
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              onFocus={() => setConfirmFocus(true)}
              onBlur={() => setConfirmFocus(false)}
            />
            <label htmlFor="confirmPassword">Confirm password</label>
            {errors.confirmPassword && <p className="input-error">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div className="mb-5">
          <label className="flex items-start gap-2.5 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={update('terms')}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-900 text-brand-500 accent-brand-500"
            />
            I agree to the <span className="text-brand-300">Terms</span> and{' '}
            <span className="text-brand-300">Privacy Policy</span>.
          </label>
          {errors.terms && <p className="input-error">{errors.terms}</p>}
        </div>

        <button
          ref={submitBtnRef}
          type="submit"
          className="submit-btn"
          disabled={status !== 'idle'}
          onClick={handleRipple}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 spin" />
          ) : (
            <>
              Create {role} account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

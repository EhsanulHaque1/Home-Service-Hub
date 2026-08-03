import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Wrench, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, Loader2, MapPin } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

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
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const switchRole = (r) => {
    setRole(r);
    setErrors({});
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => navigate('/'), 900);
    }, 900);
  };

  const copy = roleCopy[role];

  return (
    <AuthLayout
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-semibold text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 inline-flex w-full rounded-full border border-white/10 bg-ink-900 p-1">
        {['client', 'worker'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
              role === r ? 'bg-brand-500 text-ink-950 shadow-glow' : 'text-slate-300 hover:text-white'
            }`}
          >
            {r === 'client' ? <User className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            I'm a {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Full name
          </label>
          <div className="relative mt-2">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              placeholder="Jane Doe"
              className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                errors.name ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
          </div>
          {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@email.com"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.email ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Phone <span className="normal-case text-slate-500">(optional)</span>
            </label>
            <div className="relative mt-2">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="(555) 000-0000"
                className="w-full rounded-xl border border-white/10 bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400"
              />
            </div>
          </div>
        </div>

        {role === 'worker' && (
          <div>
            <label htmlFor="trade" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trade
            </label>
            <select
              id="trade"
              value={form.trade}
              onChange={update('trade')}
              className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-400 ${
                errors.trade ? 'border-red-500/50' : 'border-white/10'
              }`}
            >
              <option value="" disabled>
                Select your trade…
              </option>
              {trades.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            {errors.trade && <p className="mt-1.5 text-xs text-red-400">{errors.trade}</p>}
          </div>
        )}

        <div>
          <label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {role === 'worker' ? 'Service area' : 'Address'}
          </label>
          <div className="relative mt-2">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={update('location')}
              placeholder={role === 'worker' ? 'Neighborhoods you cover' : 'Street, city'}
              className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                errors.location ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
          </div>
          {errors.location && <p className="mt-1.5 text-xs text-red-400">{errors.location}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.password ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Confirm password
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div>
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
          {errors.terms && <p className="mt-1.5 text-xs text-red-400">{errors.terms}</p>}
        </div>

        {status === 'success' && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Account created! Redirecting…
          </p>
        )}

        <button type="submit" disabled={status !== 'idle'} className="btn-primary w-full disabled:opacity-70">
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
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

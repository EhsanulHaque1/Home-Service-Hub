import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Phone, MapPin, Wrench, Mail, Loader2, Check, ArrowRight } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/context/AuthContext';
import { apiPut } from '@/lib/api';
import { CATEGORIES } from '@/lib/marketplace';
import '@/styles/auth-form.css';

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const isWorker = user?.role === 'worker';

  const [form, setForm] = useState({ name: '', phone: '', location: '', expertise: [] });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        expertise: user.expertise || [],
      });
    }
  }, [user]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const toggleExpertise = (category) => {
    setForm((f) => ({
      ...f,
      expertise: f.expertise.includes(category) ? f.expertise.filter((c) => c !== category) : [...f.expertise, category],
    }));
    if (errors.expertise) setErrors((prev) => ({ ...prev, expertise: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.location.trim()) next.location = 'Location is required';
    if (isWorker && form.expertise.length === 0) next.expertise = 'Choose at least one area of expertise';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await apiPut('/profile', form);
      await refreshUser();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('idle');
      if (err.errors && Object.keys(err.errors).length) {
        const next = {};
        for (const key in err.errors) next[key] = err.errors[key][0];
        setErrors(next);
      } else {
        setErrors({ form: err.message || 'Could not update your profile. Try again.' });
      }
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="container-x flex justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container-x flex flex-col items-center gap-4 py-24 text-center">
          <h1 className="font-display text-2xl font-700 text-white">Sign in to view your profile</h1>
          <p className="max-w-sm text-slate-400">You need an account to manage your profile details.</p>
          <Link to="/sign-in" className="btn-primary">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-x">
        <span className="section-eyebrow">Account</span>
        <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Your profile</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          {isWorker
            ? 'Keep your expertise and service area current so you only see tasks that fit.'
            : 'Keep your contact details current for the tasks you post.'}
        </p>

        <div className="mx-auto mt-10 max-w-xl">
          <div className="card p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-6">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-800 text-ink-950">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{user.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <Mail className="h-3.5 w-3.5" /> {user.email}
                  </span>
                  <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold capitalize text-brand-400">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={`input-group${errors.name ? ' has-error' : ''}`}>
                <User className="input-icon h-4 w-4" />
                <input id="name" type="text" placeholder=" " value={form.name} onChange={update('name')} />
                <label htmlFor="name">Full name</label>
                {errors.name && <p className="input-error">{errors.name}</p>}
              </div>

              <div className="input-group">
                <Phone className="input-icon h-4 w-4" />
                <input id="phone" type="tel" placeholder=" " value={form.phone} onChange={update('phone')} />
                <label htmlFor="phone">Phone (optional)</label>
              </div>

              <div className={`input-group${errors.location ? ' has-error' : ''}`}>
                <MapPin className="input-icon h-4 w-4" />
                <input id="location" type="text" placeholder=" " value={form.location} onChange={update('location')} />
                <label htmlFor="location">{isWorker ? 'Service area' : 'Address'}</label>
                {errors.location && <p className="input-error">{errors.location}</p>}
              </div>

              {isWorker && (
                <div className="mb-6">
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Wrench className="h-3.5 w-3.5" /> Areas of expertise
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const selected = form.expertise.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleExpertise(c)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? 'border-brand-400/50 bg-brand-500/15 text-brand-300'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                          }`}
                        >
                          {selected && <Check className="mr-1 inline h-3 w-3" />}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {errors.expertise && <p className="input-error">{errors.expertise}</p>}
                </div>
              )}

              {errors.form && <p className="mb-4 text-sm text-red-400">{errors.form}</p>}
              {status === 'success' && (
                <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <Check className="h-4 w-4" /> Profile updated.
                </p>
              )}

              <button type="submit" disabled={status === 'loading'} className="submit-btn">
                {status === 'loading' ? <Loader2 className="h-4 w-4 spin" /> : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

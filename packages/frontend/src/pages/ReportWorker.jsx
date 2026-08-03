import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Wrench, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { apiPost } from '@/lib/api';

const categories = [
  'Late arrival',
  'Poor work quality',
  'Unprofessional behavior',
  'Overcharging',
  'No-show',
  'Other',
];

export default function ReportWorker() {
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    worker_name: '',
    worker_email: '',
    category: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.client_name.trim()) next.client_name = 'Your name is required';
    if (!form.client_email.trim()) next.client_email = 'Your email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.client_email)) next.client_email = 'Enter a valid email';
    if (!form.worker_name.trim()) next.worker_name = "Worker's name is required";
    if (form.worker_email && !/^\S+@\S+\.\S+$/.test(form.worker_email)) next.worker_email = 'Enter a valid email';
    if (!form.category) next.category = 'Select a category';
    if (!form.description.trim()) next.description = 'Please describe what happened';
    else if (form.description.trim().length < 10) next.description = 'Please add a few more details (min 10 characters)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await apiPost('/complaints', form);
      setStatus('success');
      setForm({
        client_name: '',
        client_email: '',
        worker_name: '',
        worker_email: '',
        category: '',
        description: '',
      });
    } catch (err) {
      setStatus('idle');
      if (err.errors && Object.keys(err.errors).length) {
        const next = {};
        for (const key in err.errors) next[key] = err.errors[key][0];
        setErrors(next);
      } else {
        setErrors({ form: 'Something went wrong. Please try again.' });
      }
    }
  };

  return (
    <AuthLayout
      eyebrow="Trust & safety"
      title="Report a problem with a worker."
      subtitle="Tell us what happened and our safety team will follow up. Every report is reviewed."
      footer={
        <>
          Back to{' '}
          <Link to="/" className="font-semibold text-brand-300 hover:text-brand-200">
            home
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="client_name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your name
            </label>
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="client_name"
                type="text"
                value={form.client_name}
                onChange={update('client_name')}
                placeholder="Jane Doe"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.client_name ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.client_name && <p className="mt-1.5 text-xs text-red-400">{errors.client_name}</p>}
          </div>

          <div>
            <label htmlFor="client_email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your email
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="client_email"
                type="email"
                value={form.client_email}
                onChange={update('client_email')}
                placeholder="you@email.com"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.client_email ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.client_email && <p className="mt-1.5 text-xs text-red-400">{errors.client_email}</p>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="worker_name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Worker's name
            </label>
            <div className="relative mt-2">
              <Wrench className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="worker_name"
                type="text"
                value={form.worker_name}
                onChange={update('worker_name')}
                placeholder="John Smith"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.worker_name ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.worker_name && <p className="mt-1.5 text-xs text-red-400">{errors.worker_name}</p>}
          </div>

          <div>
            <label htmlFor="worker_email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Worker's email <span className="normal-case text-slate-500">(optional)</span>
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="worker_email"
                type="email"
                value={form.worker_email}
                onChange={update('worker_email')}
                placeholder="worker@email.com"
                className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.worker_email ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.worker_email && <p className="mt-1.5 text-xs text-red-400">{errors.worker_email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Category
          </label>
          <select
            id="category"
            value={form.category}
            onChange={update('category')}
            className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-400 ${
              errors.category ? 'border-red-500/50' : 'border-white/10'
            }`}
          >
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1.5 text-xs text-red-400">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            What happened?
          </label>
          <div className="relative mt-2">
            <ShieldAlert className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={update('description')}
              placeholder="Describe the issue in a few sentences…"
              className={`w-full rounded-xl border bg-ink-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                errors.description ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
          </div>
          {errors.description && <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>}
        </div>

        {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

        {status === 'success' && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Report submitted. Our team will review it shortly.
          </p>
        )}

        <button type="submit" disabled={status === 'loading'} className="btn-primary w-full disabled:opacity-70">
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Submit report <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

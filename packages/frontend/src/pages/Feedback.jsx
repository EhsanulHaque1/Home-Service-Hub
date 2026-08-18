import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, createFeedback } from '@/lib/api';

const FEEDBACK_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'UI/UX Improvement',
  'Performance Issue',
  'General Feedback',
];

export default function Feedback() {
  const { user, loading: authLoading } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle');
  const [form, setForm] = useState({ category: '', message: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiGet('/feedback')
      .then((data) => {
        setFeedbacks(data.data || []);
      })
      .catch(() => {
        setFeedbacks([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.message.trim()) next.message = 'Please describe your feedback';
    else if (form.message.trim().length < 10) next.message = 'Please add a few more details (min 10 characters)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      const created = await createFeedback({
        category: form.category || null,
        message: form.message.trim(),
      });
      setFeedbacks((prev) => [created, ...prev]);
      setForm({ category: '', message: '' });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('idle');
      if (err.errors && Object.keys(err.errors).length) {
        const next = {};
        for (const key in err.errors) next[key] = err.errors[key][0];
        setErrors(next);
      } else {
        setErrors({ form: err.message || 'Could not submit feedback. Try again.' });
      }
    }
  };

  if (authLoading) {
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
          <h1 className="font-display text-2xl font-700 text-white">Sign in to send feedback</h1>
          <p className="max-w-sm text-slate-400">You need an account to submit feedback and help improve the website.</p>
          <Link to="/sign-in" className="btn-primary">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageShell>
    );
  }

  const statusStyles = {
    open: 'border-brand-400/30 bg-brand-500/10 text-brand-300',
    resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    closed: 'border-white/10 bg-white/5 text-slate-300',
  };

  const statusLabels = {
    open: 'Open',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  return (
    <PageShell>
      <div className="container-x pb-20">
        <span className="section-eyebrow">Community</span>
        <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Send feedback</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Found a bug, have a feature idea, or want to share how we can improve the website? We read every piece of feedback.
        </p>

        <div className="mx-auto mt-10 max-w-3xl flex flex-col gap-10">
          {/* Submit Feedback Form */}
          <div className="card p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">New feedback</h3>
                <p className="text-xs text-slate-400">Tell us what's on your mind</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Category <span className="normal-case text-slate-500">(optional)</span>
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={update('category')}
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-400 ${
                    errors.category ? 'border-red-500/50' : 'border-white/10'
                  }`}
                >
                  <option value="">Select a category…</option>
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="mt-1.5 text-xs text-red-400">{errors.category}</p>}
              </div>

              <div>
                <label htmlFor="message" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your feedback
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={update('message')}
                  placeholder="Describe the issue or idea in a few sentences…"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.message ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.message && <p className="mt-1.5 text-xs text-red-400">{errors.message}</p>}
              </div>

              {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

              {status === 'success' && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <CheckCircle className="h-4 w-4" /> Feedback submitted. Thank you!
                </p>
              )}

              <button type="submit" disabled={status === 'loading'} className="btn-primary disabled:opacity-70">
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send feedback <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Previous Feedback */}
          <div>
            <h2 className="font-display text-xl font-700 text-white">Your feedback</h2>
            <p className="mt-1 text-sm text-slate-400">A history of everything you've submitted.</p>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading feedback…
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-ink-900/40 px-6 py-10 text-center text-slate-400">
                  You haven't submitted any feedback yet.
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="card p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {fb.category || 'General Feedback'}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-300">{fb.message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(fb.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[fb.status] || statusStyles.open}`}>
                        {statusLabels[fb.status] || fb.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

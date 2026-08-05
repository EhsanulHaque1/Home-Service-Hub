import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Clock, Loader2, Plus, X, ArrowRight, ChevronLeft, ChevronRight, Send, Check } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES, STATUS_STYLES, STATUS_LABELS, formatRelativeTime } from '@/lib/marketplace';

const statuses = ['open', 'matching', 'completed'];

const emptyForm = {
  title: '',
  description: '',
  category: '',
  budget: '',
  location: '',
  client_name: '',
  client_email: '',
};

export default function BrowseTasks() {
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';
  // Stable across renders even though `user?.expertise` is a fresh [] fallback each time.
  const expertiseKey = (user?.expertise || []).join(',');
  const workerExpertise = useMemo(() => (expertiseKey ? expertiseKey.split(',') : []), [expertiseKey]);
  // Workers only ever filter/browse within their own expertise; everyone else sees every category.
  const pillCategories = isWorker ? workerExpertise : CATEGORIES;

  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [category, setCategory] = useState(CATEGORIES.includes(initialCategory) ? initialCategory : '');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [showForm, setShowForm] = useState(searchParams.get('post') === '1');
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState('idle');

  const [appliedTaskIds, setAppliedTaskIds] = useState(new Set());
  const [applyingId, setApplyingId] = useState(null);
  const [applyErrors, setApplyErrors] = useState({});

  useEffect(() => {
    if (!isWorker) {
      setAppliedTaskIds(new Set());
      return;
    }
    apiGet('/my-applications')
      .then((apps) => setAppliedTaskIds(new Set(apps.map((a) => a.task_id))))
      .catch(() => {});
  }, [isWorker]);

  // Prefill the post-task form with the signed-in client's own details.
  useEffect(() => {
    if (user?.role === 'client') {
      setForm((f) => (f.client_name || f.client_email ? f : { ...f, client_name: user.name, client_email: user.email }));
    }
  }, [user]);

  // Workers can't filter or browse outside their own expertise — clamp back to "all mine"
  // if a category from the URL (or a stale selection) falls outside it.
  useEffect(() => {
    if (isWorker && category && !workerExpertise.includes(category)) {
      setCategory('');
    }
  }, [isWorker, workerExpertise, category]);

  const handleApply = async (taskId) => {
    setApplyingId(taskId);
    setApplyErrors((prev) => ({ ...prev, [taskId]: null }));
    try {
      const res = await apiPost(`/tasks/${taskId}/apply`, {});
      setAppliedTaskIds((prev) => new Set(prev).add(taskId));
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      }
    } catch (err) {
      if (err.status === 409) {
        setAppliedTaskIds((prev) => new Set(prev).add(taskId));
      } else {
        setApplyErrors((prev) => ({ ...prev, [taskId]: err.message || 'Could not apply. Try again.' }));
      }
    } finally {
      setApplyingId(null);
    }
  };

  useEffect(() => {
    // A worker's "all categories" still means all of *their* categories, not the whole board.
    if (isWorker && !category && workerExpertise.length === 0) {
      setTasks([]);
      setMeta({ current_page: 1, last_page: 1, total: 0 });
      setLoading(false);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams({ page: String(page) });
    const categoryFilter = category || (isWorker ? workerExpertise.join(',') : '');
    if (categoryFilter) params.set('category', categoryFilter);
    if (status) params.set('status', status);

    apiGet(`/tasks?${params.toString()}`)
      .then((data) => {
        setTasks(data.data);
        setMeta(data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [category, status, page, isWorker, workerExpertise]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.description.trim() || form.description.trim().length < 10) next.description = 'Add at least 10 characters';
    if (!form.category) next.category = 'Select a category';
    if (!form.budget || Number(form.budget) <= 0) next.budget = 'Enter a valid budget';
    if (!form.location.trim()) next.location = 'Location is required';
    if (!form.client_name.trim()) next.client_name = 'Your name is required';
    if (!form.client_email.trim()) next.client_email = 'Your email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.client_email)) next.client_email = 'Enter a valid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitStatus('loading');
    try {
      const created = await apiPost('/tasks', { ...form, budget: Number(form.budget) });
      setSubmitStatus('success');
      setForm(emptyForm);
      if (page === 1 && (!category || category === created.category) && !status) {
        setTasks((t) => [created, ...t].slice(0, 15));
      }
      setTimeout(() => {
        setShowForm(false);
        setSubmitStatus('idle');
      }, 1200);
    } catch (err) {
      setSubmitStatus('idle');
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
    <PageShell>
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="section-eyebrow">Live task board</span>
            <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">
              Browse open tasks
            </h1>
            <p className="mt-4 text-slate-300">
              Real tasks posted by real customers. Filter by category or status, or post one of your own.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary shrink-0"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Close' : 'Post a task'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} noValidate className="card mt-8 space-y-5 p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Task title
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={update('title')}
                  placeholder="Fix leaking kitchen faucet"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.title ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.title && <p className="mt-1.5 text-xs text-red-400">{errors.title}</p>}
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
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1.5 text-xs text-red-400">{errors.category}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={update('description')}
                placeholder="Describe what needs to be done…"
                className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                  errors.description ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {errors.description && <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="budget" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Budget (USD)
                </label>
                <input
                  id="budget"
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={update('budget')}
                  placeholder="85"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.budget ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.budget && <p className="mt-1.5 text-xs text-red-400">{errors.budget}</p>}
              </div>

              <div>
                <label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={form.location}
                  onChange={update('location')}
                  placeholder="Downtown, 2.1 mi"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.location ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.location && <p className="mt-1.5 text-xs text-red-400">{errors.location}</p>}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="client_name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your name
                </label>
                <input
                  id="client_name"
                  type="text"
                  value={form.client_name}
                  onChange={update('client_name')}
                  placeholder="Jane Doe"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.client_name ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.client_name && <p className="mt-1.5 text-xs text-red-400">{errors.client_name}</p>}
              </div>

              <div>
                <label htmlFor="client_email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your email
                </label>
                <input
                  id="client_email"
                  type="email"
                  value={form.client_email}
                  onChange={update('client_email')}
                  placeholder="you@email.com"
                  className={`mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
                    errors.client_email ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.client_email && <p className="mt-1.5 text-xs text-red-400">{errors.client_email}</p>}
              </div>
            </div>

            {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}
            {submitStatus === 'success' && (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Task posted!
              </p>
            )}

            <button type="submit" disabled={submitStatus === 'loading'} className="btn-primary w-full disabled:opacity-70">
              {submitStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Post task <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {isWorker && (
          <p className="mt-8 text-xs text-slate-500">
            Showing tasks in your areas of expertise.{' '}
            <Link to="/profile" className="font-semibold text-brand-300 hover:text-brand-200">
              Update expertise
            </Link>
          </p>
        )}

        <div className={`flex flex-wrap items-center gap-2 ${isWorker ? 'mt-3' : 'mt-10'}`}>
          <button
            onClick={() => {
              setCategory('');
              setPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              category === '' ? 'border-brand-400/50 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            {isWorker ? 'All my expertise' : 'All categories'}
          </button>
          {pillCategories.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                category === c ? 'border-brand-400/50 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setStatus('');
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              status === '' ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Any status
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                status === s ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading tasks…
            </div>
          ) : loadError ? (
            <p className="px-6 py-16 text-center text-slate-400">Couldn't load tasks. Try again shortly.</p>
          ) : isWorker && workerExpertise.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-400">Add at least one area of expertise to see matching tasks.</p>
              <Link to="/profile" className="btn-primary mt-4 inline-flex">
                Set your expertise <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : tasks.length === 0 ? (
            <p className="px-6 py-16 text-center text-slate-400">No tasks match those filters yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {tasks.map((t) => {
                const applied = appliedTaskIds.has(t.id);
                const closed = t.status === 'completed';

                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-[1.4fr_0.7fr_0.9fr_0.7fr_auto_auto] md:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                      <div>
                        <p className="font-semibold text-white">{t.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{t.description}</p>
                      </div>
                    </div>

                    <span className="hidden text-sm text-slate-300 md:block">{t.category}</span>

                    <span className="hidden items-center gap-1.5 text-sm text-slate-400 md:flex">
                      <MapPin className="h-4 w-4 text-brand-400" /> {t.location}
                    </span>

                    <div className="flex items-center justify-between md:block">
                      <span className="font-display text-lg font-700 text-white">${t.budget}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-xs text-slate-500 md:justify-end">
                      <Clock className="h-3.5 w-3.5" /> {formatRelativeTime(t.created_at)}
                    </span>

                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      {isWorker ? (
                        applied ? (
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                            <Check className="h-3.5 w-3.5" /> Applied
                          </span>
                        ) : closed ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-500">
                            Closed
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => handleApply(t.id)}
                              disabled={applyingId === t.id}
                              className="flex items-center gap-1.5 rounded-full border border-brand-400/50 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 transition-colors hover:bg-brand-500 hover:text-ink-950 disabled:opacity-60"
                            >
                              {applyingId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Apply
                            </button>
                            {applyErrors[t.id] && <p className="text-[11px] text-red-400">{applyErrors[t.id]}</p>}
                          </div>
                        )
                      ) : !user ? (
                        <Link to="/sign-in" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                          Sign in to apply
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loading && !loadError && meta.last_page > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-400">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page >= meta.last_page}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

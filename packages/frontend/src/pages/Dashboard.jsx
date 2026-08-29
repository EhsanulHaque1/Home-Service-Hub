import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  CheckCircle2,
  Star,
  MapPin,
  ArrowRight,
  Loader2,
  Plus,
  Send,
  Clock,
  Hourglass,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Phone,
  BadgeCheck,
  MessageSquare,
  Info,
  Wallet,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import { apiGet, apiPost, apiPut, apiDelete, advanceProgress, initiatePayment } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  CATEGORIES,
  STATUS_STYLES,
  STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  APPLICATION_STATUS_LABELS,
  BADGE_STYLES,
  initials,
  formatRelativeTime,
} from '@/lib/marketplace';

// Progress stages shown in the Status mini-window.
const STATUS_FLOW = [
  { key: 'arriving', label: 'Arriving at the task place' },
  { key: 'starting', label: 'Starting the work' },
  { key: 'completing', label: 'Completing the work' },
  { key: 'finished', label: 'The task is finished' },
];

function completedSteps(taskStatus) {
  if (taskStatus === 'completed') return 4;
  if (taskStatus === 'assigned') return 2;
  return 0;
}

// Order of progress labels stored in tasks.progress ('' = not started).
const PROGRESS_ORDER = ['', 'Arriving at the task place', 'Starting the work', 'Completing the work', 'The task is finished'];

function progressIndex(label) {
  const i = PROGRESS_ORDER.indexOf(typeof label === 'string' ? label : '');
  return i === -1 ? 0 : i;
}

function StatusModal({ app, onClose, canAdvance = false, onAdvance, advancing = false, onPay, paying = false, payError = '' }) {
  if (!app) return null;

  const progress = progressIndex(app.task?.progress);
  const finished = progress >= STATUS_FLOW.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-ink-900 p-8 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-700 text-white">Task Status</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-7 space-y-1">
          {STATUS_FLOW.map((s, i) => {
            const done = i < progress;
            const isLast = i === STATUS_FLOW.length - 1;
            return (
              <div key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && (
                  <span
                    className={`absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px ${done ? 'bg-brand-400/40' : 'bg-white/10'}`}
                  />
                )}
                <span
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm ${
                    done
                      ? 'border-brand-400/50 bg-brand-500/20 text-brand-300'
                      : 'border-white/10 bg-white/5 text-slate-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <div className="pt-1">
                  <p className={`text-base font-medium ${done ? 'text-white' : 'text-slate-400'}`}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {canAdvance && (
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            {finished ? (
              <span className="text-sm font-medium text-brand-300">Task finished. 🎉</span>
            ) : progress >= 3 ? (
              <span className="text-sm text-slate-400">
                {STATUS_FLOW[progress].label} — waiting for the customer to release payment.
              </span>
            ) : (
              <>
                <span className="text-sm text-slate-400">
                  Step {progress + 1} of {STATUS_FLOW.length}: {STATUS_FLOW[progress].label}
                </span>
                <button
                  onClick={onAdvance}
                  disabled={advancing}
                  className="flex items-center gap-1.5 rounded-full border border-brand-400/50 bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-300 transition-colors hover:bg-brand-500 hover:text-ink-950 disabled:opacity-60"
                >
                  {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Progress
                </button>
              </>
            )}
          </div>
        )}

        {!canAdvance && app.task?.progress === 'Completing the work' && (
          <>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-sm text-slate-400">Worker is completing the work — release payment to finish.</span>
              <button
                onClick={() => onPay?.(app)}
                disabled={paying}
                className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-ink-950 disabled:opacity-60"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Pay Now
              </button>
            </div>
            {payError && (
              <p className="mt-3 text-xs text-rose-400">{payError}</p>
            )}
          </>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
          <span className="text-sm text-slate-400">Application: {APPLICATION_STATUS_LABELS[app.status]}</span>
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${STATUS_STYLES[app.task?.status]}`}>
            {STATUS_LABELS[app.task?.status]}
          </span>
        </div>
        </div>
      </div>,
    document.body,
  );
}

function PaymentResultModal({ result, onClose }) {
  if (!result) return null;
  const ok = result === 'success';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-8 text-center shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
          {ok ? <CheckCircle2 className="h-7 w-7" /> : <X className="h-7 w-7" />}
        </div>
        <h3 className="mt-4 font-display text-xl font-700 text-white">
          {ok ? 'Payment Successful' : 'Payment Failed'}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          {ok
            ? 'Thank you! The worker has been paid and the task is now complete.'
            : 'The payment could not be completed. Please try again.'}
        </p>
        <button
          onClick={onClose}
          className="mt-6 rounded-full border border-brand-400/50 bg-brand-500/15 px-5 py-2 text-sm font-semibold text-brand-300 transition-colors hover:bg-brand-500 hover:text-ink-950"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}

// A client's own task can only be edited/deleted before a worker is confirmed for it.
const LOCKED_STATUSES = ['assigned', 'completed'];

function GuestOverview() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openTasks, setOpenTasks] = useState([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [topWorkers, setTopWorkers] = useState([]);
  const [workerTotal, setWorkerTotal] = useState(0);

  useEffect(() => {
    Promise.all([apiGet('/tasks?status=open'), apiGet('/tasks?status=completed'), apiGet('/workers')])
      .then(([open, completed, workers]) => {
        setOpenTasks(open.data.slice(0, 5));
        setOpenTotal(open.total);
        setCompletedTotal(completed.total);
        setTopWorkers(workers.data.slice(0, 4));
        setWorkerTotal(workers.total);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const avgRating = topWorkers.length
    ? (topWorkers.reduce((sum, w) => sum + w.rating, 0) / topWorkers.length).toFixed(1)
    : '—';

  const stats = [
    { label: 'Open tasks', value: openTotal, icon: ClipboardList },
    { label: 'Completed tasks', value: completedTotal, icon: CheckCircle2 },
    { label: 'Active workers', value: workerTotal, icon: Users },
    { label: 'Avg. top-worker rating', value: avgRating, icon: Star },
  ];

  if (loading) {
    return (
      <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
      </div>
    );
  }
  if (loadError) {
    return <p className="mt-16 text-center text-slate-400">Couldn't load dashboard data. Try again shortly.</p>;
  }

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <s.icon className="h-5 w-5 text-brand-400" />
            <p className="mt-4 font-display text-3xl font-800 text-white">{s.value}</p>
            <p className="mt-1 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-700 text-white">Recent open tasks</h2>
            <Link to="/tasks" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
            {openTasks.length === 0 ? (
              <p className="px-6 py-10 text-center text-slate-400">No open tasks right now.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {openTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{t.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {t.location} · {t.category}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                      <span className="font-display text-sm font-700 text-white">${t.budget}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-700 text-white">Top workers</h2>
            <Link to="/workers" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {topWorkers.map((w) => {
              const b = BADGE_STYLES[w.badge] || BADGE_STYLES.new;
              return (
                <div key={w.id} className="card flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950">
                    {initials(w.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{w.name}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Star className="h-3 w-3 fill-brand-400 text-brand-400" /> {w.rating} · {w.trade}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-slate-500">
        <Link to="/sign-in" className="font-semibold text-brand-300 hover:text-brand-200">
          Sign in
        </Link>{' '}
        to see your own posted tasks or applications here instead of this marketplace-wide snapshot.
      </p>
    </>
  );
}

const editFieldClass = (hasError) =>
  `mt-2 w-full rounded-xl border bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400 ${
    hasError ? 'border-red-500/50' : 'border-white/10'
  }`;

function TaskEditForm({ task, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    category: task.category,
    budget: task.budget,
    location: task.location,
    client_name: task.client_name,
    client_email: task.client_email,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const updated = await apiPut(`/tasks/${task.id}`, { ...form, budget: Number(form.budget) });
      onSaved(updated);
    } catch (err) {
      setStatus('idle');
      if (err.errors && Object.keys(err.errors).length) {
        const next = {};
        for (const key in err.errors) next[key] = err.errors[key][0];
        setErrors(next);
      } else {
        setErrors({ form: err.message || 'Could not save changes.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 border-t border-white/10 bg-ink-900/40 px-6 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Title</label>
          <input type="text" value={form.title} onChange={update('title')} className={editFieldClass(errors.title)} />
          {errors.title && <p className="mt-1.5 text-xs text-red-400">{errors.title}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
          <select value={form.category} onChange={update('category')} className={editFieldClass(errors.category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1.5 text-xs text-red-400">{errors.category}</p>}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
        <textarea rows={3} value={form.description} onChange={update('description')} className={editFieldClass(errors.description)} />
        {errors.description && <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget (USD)</label>
          <input type="number" min="1" value={form.budget} onChange={update('budget')} className={editFieldClass(errors.budget)} />
          {errors.budget && <p className="mt-1.5 text-xs text-red-400">{errors.budget}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Location</label>
          <input type="text" value={form.location} onChange={update('location')} className={editFieldClass(errors.location)} />
          {errors.location && <p className="mt-1.5 text-xs text-red-400">{errors.location}</p>}
        </div>
      </div>

      {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === 'loading'} className="btn-primary disabled:opacity-70">
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ApplicantsPanel({ task, onTaskUpdated }) {
  const [applicants, setApplicants] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [openStatusApp, setOpenStatusApp] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payError, setPayError] = useState('');

  const handlePay = async (app) => {
    if (!app.task) return;
    setPayingId(app.task.id);
    setPayError('');
    try {
      const res = await initiatePayment(app.task.id);
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      throw new Error('no_gateway');
    } catch (err) {
      setPayError(err?.message || 'Could not start the payment. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  useEffect(() => {
    apiGet(`/tasks/${task.id}/applicants`)
      .then(setApplicants)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [task.id]);

  const handleConfirm = async (applicationId) => {
    setConfirmingId(applicationId);
    try {
      const res = await apiPost(`/applications/${applicationId}/confirm`, {});
      onTaskUpdated(res.task);
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: 'accepted' } : { ...a, status: a.status === 'pending' ? 'declined' : a.status }))
      );
    } catch (err) {
      setError(err.message || true);
    } finally {
      setConfirmingId(null);
    }
  };

  const canConfirm = task.status === 'open' || task.status === 'matching';

  return (
    <>
      <div className="border-t border-white/10 bg-ink-900/40 px-6 py-5">
        {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading applicants…
        </div>
      ) : error ? (
        <p className="text-sm text-slate-400">{typeof error === 'string' ? error : "Couldn't load applicants."}</p>
      ) : applicants.length === 0 ? (
        <p className="text-sm text-slate-400">No one has applied yet.</p>
      ) : (
        <div className="space-y-3">
          {applicants.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950">
                  {initials(a.user?.name || '?')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{a.user?.name || 'Worker'}</p>
                  <p className="text-xs text-slate-400">
                    {(a.user?.expertise || []).join(', ')} · {a.user?.location}
                  </p>
                  {a.user?.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" /> {a.user.phone}
                    </p>
                  )}
                  {a.message && <p className="mt-1 max-w-md text-xs text-slate-400">“{a.message}”</p>}
                </div>
              </div>

              <div className="relative flex shrink-0 items-center gap-2">
                <Link
                  to={`/chat?with=${a.user.id}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </Link>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLES[a.status]}`}>
                  {APPLICATION_STATUS_LABELS[a.status]}
                </span>
                {canConfirm && a.status === 'pending' && (
                  <button
                    onClick={() => handleConfirm(a.id)}
                    disabled={confirmingId === a.id}
                    className="flex items-center gap-1.5 rounded-full border border-brand-400/50 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 transition-colors hover:bg-brand-500 hover:text-ink-950 disabled:opacity-60"
                  >
                    {confirmingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                    Confirm
                  </button>
                )}
                {a.user && (
                  <button
                    onClick={() => setOpenStatusApp({ ...a, task })}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                    aria-label="View status"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Status
                  </button>
                )}
              </div>
            </div>
          ))}
            </div>
          )}
        </div>
      {openStatusApp && (
      <StatusModal
        app={openStatusApp}
        onClose={() => setOpenStatusApp(null)}
        canAdvance={false}
        onPay={handlePay}
        paying={payingId === openStatusApp.task?.id}
        payError={payError}
      />
      )}
    </>
  );
}

function TaskRow({ task, onUpdated, onDeleted }) {
  const [mode, setMode] = useState('view');
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const canModify = !LOCKED_STATUSES.includes(task.status);

  const handleDelete = async () => {
    setDeleteStatus('loading');
    try {
      await apiDelete(`/tasks/${task.id}`);
      onDeleted(task.id);
    } catch (err) {
      setDeleteStatus('idle');
      setDeleteError(err.message || 'Could not delete this task.');
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-white">{task.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3" /> {task.location} · {task.category} · {formatRelativeTime(task.created_at)}
          </p>
          {task.assigned_worker && (
            <p className="mt-1 flex items-center gap-1 text-xs text-teal-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Assigned to {task.assigned_worker.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => setApplicantsOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <Users className="h-3.5 w-3.5" /> {task.applications_count} applied
            {applicantsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className="font-display text-sm font-700 text-white">${task.budget}</span>

          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleteStatus === 'loading'}
                className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
              >
                {deleteStatus === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes'}
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/20">
                No
              </button>
            </div>
          ) : (
            canModify && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white"
                  aria-label="Edit task"
                  title="Edit task"
                >
                  {mode === 'edit' ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-red-300"
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {deleteError && <p className="px-6 pb-3 text-xs text-red-400">{deleteError}</p>}

      {mode === 'edit' && (
        <TaskEditForm
          task={task}
          onCancel={() => setMode('view')}
          onSaved={(updated) => {
            onUpdated(updated);
            setMode('view');
          }}
        />
      )}

      {applicantsOpen && <ApplicantsPanel task={task} onTaskUpdated={onUpdated} />}
    </div>
  );
}

function ClientProgress() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    apiGet('/my-tasks')
      .then(setTasks)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const updateTask = (updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  if (loading) {
    return (
      <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your tasks…
      </div>
    );
  }
  if (loadError) {
    return <p className="mt-16 text-center text-slate-400">Couldn't load your tasks. Try again shortly.</p>;
  }

  const stats = [
    { label: 'Posted', value: tasks.length, icon: ClipboardList },
    { label: 'Open', value: tasks.filter((t) => t.status === 'open').length, icon: Hourglass },
    { label: 'Assigned', value: tasks.filter((t) => t.status === 'assigned').length, icon: BadgeCheck },
    { label: 'Completed', value: tasks.filter((t) => t.status === 'completed').length, icon: CheckCircle2 },
  ];

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <s.icon className="h-5 w-5 text-brand-400" />
            <p className="mt-4 font-display text-3xl font-800 text-white">{s.value}</p>
            <p className="mt-1 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-700 text-white">Your posted tasks</h2>
          <Link to="/tasks?post=1" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
            <Plus className="h-4 w-4" /> Post a task
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
          {tasks.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-slate-400">You haven't posted a task yet.</p>
              <Link to="/tasks?post=1" className="btn-primary mt-4 inline-flex">
                <Plus className="h-4 w-4" /> Post your first task
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onUpdated={updateTask} onDeleted={removeTask} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WorkerProgress() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applications, setApplications] = useState([]);
  const [openStatusApp, setOpenStatusApp] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);

  const handleAdvance = async (app) => {
    if (!app.task) return;
    setAdvancingId(app.task.id);
    try {
      const updated = await advanceProgress(app.task.id);
      const nextTask = {
        ...app.task,
        progress: updated?.progress ?? app.task?.progress ?? '',
        status: updated?.status ?? app.task.status,
      };
      setApplications((prev) =>
        prev.map((a) => (a.task && a.task.id === app.task.id ? { ...a, task: nextTask } : a)),
      );
      setOpenStatusApp((cur) => (cur ? { ...cur, task: nextTask } : cur));
    } catch {
      // ignore failures (e.g. not the assigned worker)
    } finally {
      setAdvancingId(null);
    }
  };

  useEffect(() => {
    apiGet('/my-applications')
      .then(setApplications)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your applications…
      </div>
    );
  }
  if (loadError) {
    return <p className="mt-16 text-center text-slate-400">Couldn't load your applications. Try again shortly.</p>;
  }

  const stats = [
    { label: 'Applied', value: applications.length, icon: Send },
    { label: 'Pending', value: applications.filter((a) => a.status === 'pending').length, icon: Hourglass },
    { label: 'Assigned to you', value: applications.filter((a) => a.status === 'accepted').length, icon: UserCheck },
    {
      label: 'Completed',
      value: applications.filter((a) => a.task?.status === 'completed').length,
      icon: CheckCircle2,
    },
  ];

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <s.icon className="h-5 w-5 text-brand-400" />
            <p className="mt-4 font-display text-3xl font-800 text-white">{s.value}</p>
            <p className="mt-1 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-700 text-white">Your applications</h2>
          <Link to="/tasks" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
            Browse more tasks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
          {applications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-slate-400">You haven't applied to any tasks yet.</p>
              <Link to="/tasks" className="btn-primary mt-4 inline-flex">
                Browse open tasks <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {applications.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{a.task?.title || 'Task no longer available'}</p>
                    {a.task && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {a.task.location} · {a.task.category}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" /> Applied {formatRelativeTime(a.created_at)}
                    </p>
                  </div>
                   {a.task && (
                     <div className="relative flex shrink-0 flex-wrap items-center gap-2">
                       <Link
                         to={`/chat?with=${a.task.user_id}`}
                         className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                       >
                         <MessageSquare className="h-3.5 w-3.5" />
                         Chat
                       </Link>
                       <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLES[a.status]}`}>
                         {APPLICATION_STATUS_LABELS[a.status]}
                       </span>
                       <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[a.task.status]}`}>
                         {STATUS_LABELS[a.task.status]}
                       </span>
                       <span className="font-display text-sm font-700 text-white">${a.task.budget}</span>
                       <button
                         onClick={() => setOpenStatusApp(a)}
                         className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                         aria-label="View status"
                       >
                         <Info className="h-3.5 w-3.5" />
                         Status
                       </button>
                     </div>
                   )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {openStatusApp && (
      <StatusModal
        app={openStatusApp}
        onClose={() => setOpenStatusApp(null)}
        canAdvance={openStatusApp.status === 'accepted'}
        advancing={advancingId === openStatusApp.task?.id}
        onAdvance={() => handleAdvance(openStatusApp)}
      />
      )}
    </>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const copy = !user
    ? { eyebrow: 'Overview', title: 'Dashboard', subtitle: "A live snapshot of what's happening across the marketplace right now." }
    : user.role === 'worker'
      ? { eyebrow: 'Your progress', title: `Welcome back, ${user.name.split(' ')[0]}`, subtitle: 'Track the tasks you’ve applied to and how each one is moving along.' }
      : { eyebrow: 'Your progress', title: `Welcome back, ${user.name.split(' ')[0]}`, subtitle: 'Track the tasks you’ve posted and how many workers have applied.' };

  return (
    <PageShell>
      <div className="container-x">
        <span className="section-eyebrow">{copy.eyebrow}</span>
        <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-slate-300">{copy.subtitle}</p>

        {authLoading ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !user ? (
          <GuestOverview />
        ) : user.role === 'worker' ? (
          <WorkerProgress />
        ) : (
          <ClientProgress />
        )}
      </div>

      {(paymentResult === 'success' || paymentResult === 'failed') && (
        <PaymentResultModal result={paymentResult} onClose={() => setSearchParams({})} />
      )}
    </PageShell>
  );
}

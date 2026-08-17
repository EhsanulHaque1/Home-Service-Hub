import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  MapPin,
  Wrench,
  Mail,
  Loader2,
  Check,
  ArrowRight,
  Shield,
  Trash2,
  AlertTriangle,
  Send,
  CheckCircle,
  X,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/context/AuthContext';
import { apiPut, requestAccountDeletion, sendForgotPasswordLink } from '@/lib/api';
import { CATEGORIES } from '@/lib/marketplace';
import '@/styles/auth-form.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, refreshUser, logout } = useAuth();
  const isWorker = user?.role === 'worker';

  const [form, setForm] = useState({ name: '', phone: '', location: '', expertise: [] });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  // Password reset from profile state
  const [resetStatus, setResetStatus] = useState('idle');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  // Account deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  // Live polling while account deletion email is pending confirmation
  useEffect(() => {
    if (!deleteModalOpen || !deleteSuccessMsg) return;

    const interval = setInterval(async () => {
      try {
        const u = await refreshUser();
        if (!u) {
          await logout();
          navigate('/sign-in?account_deleted=1');
        }
      } catch (e) {
        await logout();
        navigate('/sign-in?account_deleted=1');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [deleteModalOpen, deleteSuccessMsg, refreshUser, logout, navigate]);

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

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setResetStatus('loading');
    setResetSuccessMsg('');
    setResetErrorMsg('');
    try {
      const res = await sendForgotPasswordLink(user.email);
      setResetSuccessMsg(res?.message || 'Password reset link sent to your email.');
    } catch (err) {
      setResetErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setResetStatus('idle');
    }
  };

  const handleRequestDeletion = async () => {
    setDeleteStatus('loading');
    setDeleteSuccessMsg('');
    setDeleteErrorMsg('');
    try {
      const res = await requestAccountDeletion();
      setDeleteSuccessMsg(res?.message || 'Verification link sent! Check your inbox to confirm deletion.');
    } catch (err) {
      setDeleteErrorMsg(err.message || 'Failed to request account deletion.');
    } finally {
      setDeleteStatus('idle');
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
      <div className="container-x pb-20">
        <span className="section-eyebrow">Account</span>
        <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Your profile</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          {isWorker
            ? 'Keep your expertise and service area current so you only see tasks that fit.'
            : 'Keep your contact details current for the tasks you post.'}
        </p>

        <div className="mx-auto mt-10 max-w-xl flex flex-col gap-8">
          {/* Main Profile Info Card */}
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
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${selected
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

          {/* Security & Password Card */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Password & Security</h3>
                <p className="text-xs text-slate-400">Manage your password via email verification</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                To reset or change your password, an email verification link will be sent to{' '}
                <strong className="text-white">{user.email}</strong>.
              </p>

              {resetSuccessMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {resetErrorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{resetErrorMsg}</span>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetStatus === 'loading'}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  {resetStatus === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 spin text-brand-400" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-brand-400" />
                  )}
                  Send Password Reset Link
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="card border-red-500/20 bg-red-950/10 p-6 sm:p-8">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-300">Danger Zone</h3>
                <p className="text-xs text-red-400/70">Permanently delete your account</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Deleting your account is permanent. All your posted tasks, applications, chat messages, and profile information will be wiped immediately.
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSuccessMsg('');
                    setDeleteErrorMsg('');
                    setDeleteModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Email Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-ink-950 p-6 sm:p-7 shadow-2xl shadow-red-950/50">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Account</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To verify account ownership, an email verification link will be sent to{' '}
              <strong className="text-white">{user.email}</strong>. Clicking the link in your email will permanently delete your account.
            </p>

            {deleteSuccessMsg && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="block text-emerald-200 mb-0.5">Verification Link Sent!</strong>
                    <span>{deleteSuccessMsg}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400/80">Didn't get the email?</span>
                  <button
                    type="button"
                    onClick={handleRequestDeletion}
                    disabled={deleteStatus === 'loading'}
                    className="flex items-center gap-1 font-semibold text-emerald-300 hover:text-white underline"
                  >
                    {deleteStatus === 'loading' ? <Loader2 className="h-3 w-3 spin" /> : <RefreshCw className="h-3 w-3" />}
                    Resend Link
                  </button>
                </div>
              </div>
            )}

            {deleteErrorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              {!deleteSuccessMsg && (
                <button
                  type="button"
                  onClick={handleRequestDeletion}
                  disabled={deleteStatus === 'loading'}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500 disabled:opacity-50"
                >
                  {deleteStatus === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send Verification Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

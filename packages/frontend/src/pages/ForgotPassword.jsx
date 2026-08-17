import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Wrench, CheckCircle, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { useCardTilt } from '@/hooks/useCardTilt';
import { createRipple } from '@/lib/ripple';
import { sendForgotPasswordLink } from '@/lib/api';
import './SignIn.css';

export default function ForgotPassword() {
  const cardRef = useCardTilt();
  const submitBtnRef = useRef(null);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [status, setStatus] = useState('idle');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleRipple = (e) => createRipple(e, submitBtnRef.current);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');
    setServerError('');
    setFeedbackMsg('');

    try {
      const res = await sendForgotPasswordLink(email);
      setStatus('idle');
      setSentSuccess(true);
      setFeedbackMsg(res?.message || 'Password reset link sent! Please check your email inbox.');
    } catch (err) {
      setStatus('idle');
      setServerError(err.message || 'Failed to send password reset email. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!validate()) return;
    setResendStatus('loading');
    setServerError('');
    try {
      const res = await sendForgotPasswordLink(email);
      setFeedbackMsg(res?.message || 'A new reset link has been sent to your email.');
    } catch (err) {
      setServerError(err.message || 'Failed to resend reset email.');
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
        <div ref={cardRef} className="login-container">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <KeyRound className="h-6 w-6" />
          </div>

          <h2>Reset Password</h2>
          <p className="-mt-4 mb-6 text-center text-xs text-slate-400">
            Enter your account email and we'll send you an email verification link to reset your password.
          </p>

          {sentSuccess && feedbackMsg && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block text-emerald-200 mb-0.5">Verification Link Sent!</strong>
                  <span>{feedbackMsg}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400/80">Didn't receive email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === 'loading'}
                  className="flex items-center gap-1 font-semibold text-emerald-300 hover:text-white underline"
                >
                  {resendStatus === 'loading' ? (
                    <Loader2 className="h-3 w-3 spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Resend Link
                </button>
              </div>
            </div>
          )}

          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {!sentSuccess ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className={`input-group${error ? ' has-error' : ''}`}>
                <Mail className="input-icon h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                    if (serverError) setServerError('');
                  }}
                />
                <label htmlFor="email">Email Address</label>
                {error && <p className="input-error">{error}</p>}
              </div>

              <button
                ref={submitBtnRef}
                type="submit"
                className="submit-btn"
                disabled={status === 'loading'}
                onClick={handleRipple}
              >
                {status === 'loading' ? <Loader2 className="h-4 w-4 spin" /> : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <Link to="/sign-in" className="submit-btn text-center block">
                Return to Sign In
              </Link>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Link to="/sign-in" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>

        <p className="signin-footer">
          Don't have an account? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

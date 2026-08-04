import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Menu, X, ShieldAlert, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const links = [
  { label: 'How it works', href: '#how' },
  { label: 'Services', href: '#services' },
  { label: 'Live tasks', href: '#tasks' },
  { label: 'Top workers', href: '#workers' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-ink-950/80 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
            <Wrench className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-700 tracking-tight text-white">
            Home<span className="text-brand-400">Service</span>Hub
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/report-worker"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ShieldAlert className="h-4 w-4" />
            Report an issue
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
                <UserIcon className="h-4 w-4 text-brand-400" />
                <span className="font-medium">{user.name}</span>
                {user.role && (
                  <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold capitalize text-brand-400">
                    {user.role}
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link to="/sign-in" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-ink-950/95 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/report-worker"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              <ShieldAlert className="h-4 w-4" />
              Report an issue
            </Link>

            {user ? (
              <div className="mt-2 border-t border-white/10 pt-3">
                <div className="mb-2 flex items-center gap-2 px-3 text-sm font-medium text-slate-200">
                  <UserIcon className="h-4 w-4 text-brand-400" />
                  <span>{user.name}</span>
                  <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold capitalize text-brand-400">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
                >
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary mt-2">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

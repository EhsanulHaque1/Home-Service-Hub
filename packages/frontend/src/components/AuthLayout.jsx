import { Link } from 'react-router-dom';
import { Wrench, ShieldCheck, Star, Zap } from 'lucide-react';

const perks = [
  { icon: ShieldCheck, label: 'Background-checked workers' },
  { icon: Star, label: 'Ratings on every job' },
  { icon: Zap, label: 'Direct, instant payment' },
];

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 mesh-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 grid-glow" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <header className="container-x relative flex h-16 items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
            <Wrench className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-700 tracking-tight text-white">
            Home<span className="text-brand-400">Service</span>Hub
          </span>
        </Link>
      </header>

      <main className="container-x relative flex flex-1 items-center py-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden animate-fade-up lg:block">
            <span className="section-eyebrow">{eyebrow}</span>
            <h1 className="mt-6 font-display text-4xl font-800 leading-[1.1] tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-300">{subtitle}</p>

            <div className="mt-10 flex flex-col gap-3">
              {perks.map((p) => (
                <div key={p.label} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-brand-400">
                    <p.icon className="h-4 w-4" />
                  </span>
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]">
            <div className="mb-6 text-center lg:hidden">
              <span className="section-eyebrow">{eyebrow}</span>
              <h1 className="mt-4 font-display text-2xl font-800 tracking-tight text-white">{title}</h1>
            </div>

            <div className="card relative overflow-hidden p-6 shadow-card sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-[80px]" />
              <div className="relative">{children}</div>
            </div>

            {footer && <p className="mt-6 text-center text-sm text-slate-400">{footer}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

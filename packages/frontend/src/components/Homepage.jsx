import { useEffect, useState } from 'react';
import {
  Wrench,
  Sparkles,
  Zap,
  ShieldCheck,
  Star,
  ArrowRight,
  MapPin,
  Search,
  User,
  Clock,
  ArrowUpRight,
  BadgeCheck,
  Quote,
  Check,
} from 'lucide-react';

const categories = [
  { id: 'plumbing', name: 'Plumbing', icon: Wrench, tagline: 'Leaks, fittings & fixtures', tasks: 1284, accent: 'from-sky-500/20 to-sky-500/5' },
  { id: 'cleaning', name: 'Cleaning', icon: Sparkles, tagline: 'Maidens & deep cleans', tasks: 2103, accent: 'from-teal-500/20 to-teal-500/5' },
  { id: 'electrical', name: 'Electrical', icon: Zap, tagline: 'Wiring, switches & repairs', tasks: 967, accent: 'from-brand-500/20 to-brand-500/5' },
];

const liveTasks = [
  { id: 't1', title: 'Kitchen sink leaking under cabinet', category: 'Plumbing', budget: 85, location: 'Downtown, 2.1 mi', posted: '4 min ago', status: 'open' },
  { id: 't2', title: 'Full apartment deep clean (2BR)', category: 'Cleaning', budget: 140, location: 'Riverside, 5.4 mi', posted: '11 min ago', status: 'matching' },
  { id: 't3', title: 'Replace two faulty light switches', category: 'Electrical', budget: 60, location: 'Old Town, 1.8 mi', posted: '22 min ago', status: 'open' },
];

const topWorkers = [
  { id: 'w1', name: 'Marcus Reed', trade: 'Plumber', rating: 4.9, jobs: 312, rate: '$45/hr', initials: 'MR', badge: 'top' },
  { id: 'w2', name: 'Aisha Bello', trade: 'Maiden', rating: 5.0, jobs: 428, rate: '$30/hr', initials: 'AB', badge: 'verified' },
  { id: 'w3', name: 'Diego Torres', trade: 'Electrician', rating: 4.8, jobs: 207, rate: '$55/hr', initials: 'DT', badge: 'top' },
];

const stepsCustomer = [
  { n: '01', title: 'Post your task', desc: 'Describe what you need, set your budget, and pick a time. It takes under a minute.' },
  { n: '02', title: 'Get matched', desc: 'Nearby workers in the right category see your task and apply if interested.' },
  { n: '03', title: 'Track the work', desc: 'Chat, confirm arrival, and follow progress until the job is done.' },
  { n: '04', title: 'Pay securely', desc: 'Release direct payment through HomeServiceHub once you are satisfied.' },
];

const stepsWorker = [
  { n: '01', title: 'Build your profile', desc: 'Add your trade, service area, hourly rate, and availability.' },
  { n: '02', title: 'Browse open tasks', desc: 'See live tasks in your category filtered by distance and budget.' },
  { n: '03', title: 'Apply with one tap', desc: 'Send a quick offer to the tasks that fit your schedule.' },
  { n: '04', title: 'Get paid fast', desc: 'Direct payment lands in your wallet the moment a task completes.' },
];

const testimonials = [
  { quote: 'I posted a burst pipe at 7am and had a plumber at my door by 9. Payment through the app meant no awkward haggling.', name: 'Priya Shankar', role: 'Homeowner', initials: 'PS' },
  { quote: 'As an electrician, my schedule used to be feast or famine. Now I open the app, pick the jobs I want, and get paid same day.', name: 'Diego Torres', role: 'Electrician', initials: 'DT' },
  { quote: 'Cleaning three apartments a week through HomeServiceHub replaced my old agency income. The ratings keep me booked.', name: 'Aisha Bello', role: 'Maiden', initials: 'AB' },
];

const stats = [
  { label: 'Tasks completed', value: '48K+' },
  { label: 'Verified workers', value: '6,200' },
  { label: 'Avg. match time', value: '23 min' },
  { label: 'Paid out to workers', value: '$3.1M' },
];

const trustBadges = [
  { icon: ShieldCheck, label: 'Background-checked workers' },
  { icon: Star, label: 'Ratings on every job' },
  { icon: Zap, label: 'Direct, instant payment' },
];

const badgeMap = {
  top: { label: 'Top rated', cls: 'bg-brand-500/15 text-brand-300 border-brand-500/20' },
  verified: { label: 'Verified', cls: 'bg-teal-500/15 text-teal-300 border-teal-500/20' },
  new: { label: 'New', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
};

const statusStyles = {
  open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  matching: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
};

const rotating = ['plumber', 'maiden', 'electrician'];

const perks = ['No subscription', 'Pay only when a job is done', 'Cancel a task anytime'];

function Hero() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % rotating.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 mesh-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 grid-glow" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              Live marketplace for home services
            </span>

            <h1 className="mt-6 font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find a trusted{' '}
                <span className="relative inline-block">
                  <span className="text-gradient inline-block animate-fade-up">
                    {rotating[idx]}
                  </span>
                </span>
              <br />
              in minutes, not days.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Post your task, get matched with nearby workers, and pay securely the moment the job is done. No phone
              tag, no cash, no surprises.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#cta" className="btn-primary">
                Post a task
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#workers" className="btn-ghost">
                I'm a worker
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-sm text-slate-400">
                  <b.icon className="h-4 w-4 text-brand-400" />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-brand-500/20 via-transparent to-teal-500/10 blur-2xl" />
            <div className="relative card shadow-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Matching now
                </div>
                <span className="text-xs text-slate-400">Posted 4 min ago</span>
              </div>

              <h3 className="mt-4 font-display text-lg font-700 text-white">Kitchen sink leaking under cabinet</h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-brand-400" /> Downtown · 2.1 mi away
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-ink-900 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Budget</span>
                  <span className="font-display text-2xl font-700 text-white">$85</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-brand-500 to-brand-300" />
                </div>
                <p className="mt-2 text-xs text-slate-400">3 plumbers viewing · 1 offer placed</p>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { n: 'Marcus R.', r: 4.9, d: '2.1 mi', s: 'Available now' },
                  { n: 'Sofia L.', r: 4.7, d: '3.4 mi', s: 'Available in 1h' },
                ].map((w) => (
                  <div
                    key={w.n}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-brand-400/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950">
                        {w.n.split(' ').map((p) => p[0]).join('')}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{w.n}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Star className="h-3 w-3 fill-brand-400 text-brand-400" /> {w.r} · {w.d}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {w.s}
                    </span>
                  </div>
                ))}
              </div>

              <button className="btn-primary mt-5 w-full">
                <Search className="h-4 w-4" /> See all matches
              </button>
            </div>

            <div className="absolute -left-6 bottom-10 hidden animate-floaty rounded-2xl border border-white/10 bg-ink-850/90 px-4 py-3 shadow-card backdrop-blur sm:block">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Payment held securely</p>
                  <p className="text-[11px] text-slate-400">Released when you approve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-white/10 bg-ink-900/50">
      <div className="container-x grid grid-cols-2 gap-px overflow-hidden rounded-none lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-8 text-center">
            <p className="font-display text-3xl font-800 text-white sm:text-4xl">{s.value}</p>
            <p className="mt-1.5 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="py-20 sm:py-28">
      <div className="container-x">
        <div className="max-w-2xl">
          <span className="section-eyebrow">Categories</span>
          <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
            Whatever needs fixing, there's a worker for that.
          </h2>
          <p className="mt-4 text-slate-300">
            Browse the trades our workers cover. Each category is a live queue of tasks waiting to be claimed.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <a
              key={c.id}
              href="#cta"
              className={`card group relative overflow-hidden p-6 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-card ${
                i === 0 ? 'lg:row-span-1' : ''
              }`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-400 transition-colors group-hover:bg-brand-500 group-hover:text-ink-950">
                  <c.icon className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {c.tasks.toLocaleString()} tasks
                </span>
              </div>
              <h3 className="relative mt-5 font-display text-xl font-700 text-white">{c.name}</h3>
              <p className="relative mt-1.5 text-sm text-slate-400">{c.tagline}</p>
              <div className="relative mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Browse tasks <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const [role, setRole] = useState('customer');
  const steps = role === 'customer' ? stepsCustomer : stepsWorker;

  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-60" />
      <div className="container-x relative">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="section-eyebrow">How it works</span>
            <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
              Two sides of the same seamless flow.
            </h2>
            <p className="mt-4 text-slate-300">
              Whether you need something fixed or you fix things for a living, HomeServiceHub keeps it simple.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-white/10 bg-ink-850 p-1">
            <button
              onClick={() => setRole('customer')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                role === 'customer' ? 'bg-brand-500 text-ink-950 shadow-glow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" /> Customer
            </button>
            <button
              onClick={() => setRole('worker')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                role === 'worker' ? 'bg-brand-500 text-ink-950 shadow-glow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wrench className="h-4 w-4" /> Worker
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="card group p-6 hover:border-brand-400/40"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl font-800 text-ink-700 transition-colors group-hover:text-brand-500/60">
                  {s.n}
                </span>
                <span className="h-8 w-8 rounded-full border border-brand-400/30 bg-brand-500/10" />
              </div>
              <h3 className="mt-4 font-display text-lg font-700 text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveTasks() {
  return (
    <section id="tasks" className="py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live task board
            </span>
            <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
              Real tasks, waiting to be claimed right now.
            </h2>
          </div>
          <a href="#cta" className="btn-ghost">
            View all tasks <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
          <div className="hidden grid-cols-[1.6fr_0.8fr_1fr_0.8fr_auto] gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 md:grid">
            <span>Task</span>
            <span>Category</span>
            <span>Location</span>
          </div>

          <div className="divide-y divide-white/5">
            {liveTasks.map((t) => (
              <div
                key={t.id}
                className="group grid grid-cols-1 gap-3 px-6 py-5 transition-colors hover:bg-white/[0.03] md:grid-cols-[1.6fr_0.8fr_1fr_0.8fr_auto] md:items-center"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                  <div>
                    <p className="font-semibold text-white">{t.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 md:hidden">
                      <MapPin className="h-3 w-3" /> {t.location} · {t.category}
                    </p>
                  </div>
                </div>

                <span className="hidden text-sm text-slate-300 md:block">{t.category}</span>

                <span className="hidden items-center gap-1.5 text-sm text-slate-400 md:flex">
                  <MapPin className="h-4 w-4 text-brand-400" /> {t.location}
                </span>

                <div className="flex items-center justify-between md:block">
                  <span className="font-display text-lg font-700 text-white">${t.budget}</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[t.status]}`}
                  >
                    {t.status === 'open' ? 'Open' : 'Matching'}
                  </span>
                </div>

                <div className="flex items-center justify-between md:justify-end">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> {t.posted}
                  </span>
                  <button className="ml-4 hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:border-brand-400/50 group-hover:bg-brand-500 group-hover:text-ink-950 md:inline-flex">
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Workers() {
  return (
    <section id="workers" className="py-20 sm:py-28">
      <div className="container-x">
        <div className="max-w-2xl">
          <span className="section-eyebrow">Top workers</span>
          <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
            Rated by neighbors. Vetted by us.
          </h2>
          <p className="mt-4 text-slate-300">
            Every worker is background-checked and rated on every job. These are the pros your neighbors keep calling
            back.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {topWorkers.map((w) => {
            const b = badgeMap[w.badge];
            return (
              <div key={w.id} className="card group p-6 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-card">
                <div className="flex items-center justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-800 text-ink-950">
                    {w.initials}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${b.cls}`}>
                    {b.label}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg font-700 text-white">{w.name}</h3>
                <p className="text-sm text-slate-400">{w.trade}</p>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-brand-400 text-brand-400" />
                    <span className="font-semibold text-white">{w.rating}</span>
                    <span className="text-xs text-slate-500">({w.jobs} jobs)</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-300">{w.rate}</span>
                </div>

                <button className="mt-5 w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white transition-colors group-hover:border-brand-400/50 group-hover:bg-brand-500 group-hover:text-ink-950">
                  <span className="inline-flex items-center gap-1.5">
                    View profile <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
          <BadgeCheck className="h-4 w-4 text-teal-400" />
          Every worker passes ID and background verification before joining.
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-teal-500/10 blur-[100px]" />
      <div className="container-x relative">
        <div className="max-w-2xl">
          <span className="section-eyebrow">Loved on both sides</span>
          <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
            Customers get speed. Workers get steady work.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={t.name}
              className="card flex flex-col p-7 hover:border-brand-400/30"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <Quote className="h-8 w-8 text-brand-500/40" />
              <blockquote className="mt-4 flex-1 text-slate-200 leading-relaxed">"{t.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-ink-950">
                  {t.initials}
                </span>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-slate-400">{t.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <section id="cta" className="py-20 sm:py-28">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-850 to-ink-900 p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-teal-500/10 blur-[100px]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-800 leading-tight tracking-tight text-white sm:text-4xl">
                Ready to post a task or <span className="text-gradient">start earning?</span>
              </h2>
              <p className="mt-4 max-w-md text-slate-300">
                Join thousands of customers and workers on HomeServiceHub. Tell us which side you're on and we'll get
                you going in minutes.
              </p>

              <ul className="mt-6 space-y-2.5">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6 sm:p-8">
              <div className="inline-flex rounded-full border border-white/10 bg-ink-900 p-1">
                {['customer', 'worker'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all ${
                      role === r ? 'bg-brand-500 text-ink-950 shadow-glow' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    I'm a {r}
                  </button>
                ))}
              </div>

              {sent ? (
                <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                  <p className="font-semibold text-white">You're on the list!</p>
                  <p className="mt-1 text-sm text-slate-300">
                    We'll send {role === 'customer' ? 'your first task guide' : 'open tasks in your area'} to{' '}
                    <span className="font-medium text-brand-300">{email}</span>.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim()) setSent(true);
                  }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {role === 'customer' ? 'Where do you need help?' : 'What do you do?'}
                    </label>
                    <select
                      className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-400"
                      defaultValue=""
                    >
                      <option value="" disabled>Select an option…</option>
                      {role === 'customer'
                        ? ['Plumbing', 'Cleaning', 'Electrical'].map((o) => (
                            <option key={o}>{o}</option>
                          ))
                        : ['Plumber', 'Maiden', 'Electrician'].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400"
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full">
                    {role === 'customer' ? 'Post my first task' : 'Find work near me'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Homepage() {
  return (
    <main>
      <Hero />
      <Stats />
      <Services />
      <HowItWorks />
      <LiveTasks />
      <Workers />
      <Testimonials />
      <CTA />
    </main>
  );
}
